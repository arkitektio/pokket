import type { DimSliceFragment, LensWindowFragment, ListLensFragment, SceneSnapshotFragment } from "./api/graphql";

/** Where each kind of mikro object lives; the same paths as orkestrator, so links line up. */
export const mikroRoute = {
  arrayDataset: (id: string) => `/mikro/arraydatasets/${id}`,
  lens: (id: string) => `/mikro/lenses/${id}`,
  folder: (id: string) => `/mikro/folders/${id}`,
  file: (id: string) => `/mikro/files/${id}`,
  scene: (id: string) => `/mikro/scenes/${id}`,
  tableDataset: (id: string) => `/mikro/tabledatasets/${id}`,
  chart: (id: string) => `/mikro/charts/${id}`,
  annotation: (id: string) => `/mikro/annotations/${id}`,
};

/** `COORDINATE_FIELD` → `Coordinate field`. */
export const humanize = (value: string | null | undefined): string => {
  if (!value) return "";
  const words = value.replace(/_/g, " ").toLowerCase();
  return words.charAt(0).toUpperCase() + words.slice(1);
};

/** What a dataset structurally is: at most two of its specs, the rest would not fit a row. */
export const specLabel = (spec: readonly string[] | null | undefined): string =>
  (spec ?? []).slice(0, 2).map(humanize).join(" · ");

/** `c 3 × y 2048 × x 2048`; without matching axis names, just the sizes. */
export const shapeLabel = (
  shape: readonly number[] | null | undefined,
  axisNames?: readonly string[] | null,
): string => {
  if (!shape?.length) return "";
  const named = axisNames?.length === shape.length;
  return shape.map((size, i) => (named ? `${axisNames![i]} ${size}` : String(size))).join(" × ");
};

const UNITS = ["B", "kB", "MB", "GB", "TB"];

export const bytesLabel = (bytes: number | null | undefined): string => {
  if (bytes == null || !Number.isFinite(bytes) || bytes < 0) return "";
  let value = bytes;
  let unit = 0;
  while (value >= 1000 && unit < UNITS.length - 1) {
    value /= 1000;
    unit += 1;
  }
  return `${unit === 0 || value >= 100 ? Math.round(value) : value.toFixed(1)} ${UNITS[unit]}`;
};

/** A slice as numpy writes it: `z 4:10`, `t ::2`. */
export const sliceLabel = ({ axis, start, stop, step }: DimSliceFragment): string => {
  const range = `${start ?? ""}:${stop ?? ""}`;
  return `${axis} ${range}${step != null && step !== 1 ? `:${step}` : ""}`;
};

/** A window over a continuous axis; an open side reads as unbounded. */
export const windowLabel = ({ axis, min, max }: LensWindowFragment): string =>
  `${axis} ${min ?? "−∞"} – ${max ?? "∞"}`;

/** `picture.ome.tiff` → `tiff`. */
export const extensionOf = (name: string | null | undefined): string => {
  const match = /\.([a-z0-9]{1,6})$/i.exec(name ?? "");
  return match ? match[1].toLowerCase() : "";
};

/** The name of what a lens selects over: most lenses have no name and are known by this. */
export const lensSubjectName = (lens: ListLensFragment): string => {
  switch (lens.__typename) {
    case "ArrayLens":
      return lens.dataset.name;
    case "TableLens":
      return lens.tableDataset.name;
    case "SparseLens":
      return lens.sparseDataset.name;
    case "AnnotationLens":
      return lens.annotationCollection.name;
    case "MeshLens":
      return `Mesh collection v${lens.meshCollection.version}`;
    case "NetworkLens":
      return `Network collection v${lens.networkCollection.version}`;
    default:
      return "";
  }
};

export const lensTitle = (lens: ListLensFragment): string => lens.name || lensSubjectName(lens) || "Lens";

/** What the lens cuts out, in one line. */
export const lensCut = (lens: ListLensFragment): string =>
  lens.__typename === "ArrayLens"
    ? lens.slices.map(sliceLabel).join(", ")
    : "windows" in lens
      ? lens.windows.map(windowLabel).join(", ")
      : "";

export const lensDetail = (lens: ListLensFragment): string =>
  [humanize(lens.kind), lens.name ? lensSubjectName(lens) : "", lensCut(lens)].filter(Boolean).join(" · ");

/** The picture of a lens: its own for an array lens, else its default scene's. */
export const lensSnapshot = (lens: ListLensFragment): SceneSnapshotFragment | null =>
  (lens.__typename === "ArrayLens" ? lens.latestSnapshot : null) ?? lens.defaultScene?.latestSnapshot ?? null;

export const dayLabel = (iso: string | null | undefined): string => {
  if (!iso) return "";
  const date = new Date(iso);
  return Number.isNaN(date.getTime()) ? "" : date.toLocaleDateString(undefined, { dateStyle: "medium" });
};
