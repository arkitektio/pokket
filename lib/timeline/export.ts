import { File, Paths } from "expo-file-system";
import * as Sharing from "expo-sharing";
import { allForExport } from "./db";

/**
 * The user's data, out: GPX for other map tools, JSON for everything. Written
 * to the cache and handed to the share sheet — where it goes is the user's
 * call, and nothing is sent anywhere by pokket.
 */

const escapeXml = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

export const toGpx = (data: Awaited<ReturnType<typeof allForExport>>): string => {
  const names = new Map(data.places.map((p) => [p.id, p.name]));
  const waypoints = data.visits
    .map((v) => {
      const name = (v.place_id && names.get(v.place_id)) || "Visit";
      return `  <wpt lat="${v.lat}" lon="${v.lon}"><time>${new Date(v.start_ts).toISOString()}</time><name>${escapeXml(name)}</name></wpt>`;
    })
    .join("\n");
  const points = data.points
    .map((p) => {
      const ele = p.alt != null ? `<ele>${p.alt}</ele>` : "";
      return `      <trkpt lat="${p.lat}" lon="${p.lon}">${ele}<time>${new Date(p.ts).toISOString()}</time></trkpt>`;
    })
    .join("\n");
  return `<?xml version="1.0" encoding="UTF-8"?>
<gpx version="1.1" creator="Orkestrator" xmlns="http://www.topografix.com/GPX/1/1">
${waypoints}
  <trk><name>Orkestrator timeline</name><trkseg>
${points}
  </trkseg></trk>
</gpx>
`;
};

const share = async (name: string, contents: string, mimeType: string) => {
  const file = new File(Paths.cache, name);
  if (file.exists) file.delete();
  file.create();
  file.write(contents);
  await Sharing.shareAsync(file.uri, { mimeType, dialogTitle: "Export timeline" });
};

export const exportTimeline = async (format: "gpx" | "json") => {
  const data = await allForExport();
  const stamp = new Date().toISOString().slice(0, 10);
  if (format === "gpx") await share(`orkestrator-timeline-${stamp}.gpx`, toGpx(data), "application/gpx+xml");
  else await share(`orkestrator-timeline-${stamp}.json`, JSON.stringify({ version: 1, ...data }, null, 2), "application/json");
};
