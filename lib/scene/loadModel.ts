import '@/lib/gpu/polyfills';
import * as THREE from 'three';
import {GLTFLoader, type GLTF, type GLTFParser} from 'three/addons/loaders/GLTFLoader.js';
import {clone as cloneSkinned} from 'three/addons/utils/SkeletonUtils.js';
import {PHONE_MODEL_POLICY, validateModel, type ModelPolicy, type ModelReport} from './glb';

/**
 * From verified bytes to a scene graph: orkestrator's `bloks/scene/loadModel.ts`.
 *
 * Every load runs the full rule table before a decoder sees the bytes. The
 * parsed result is cached by reference: a hash names its content, so it never
 * goes stale, and every copy of a model placed in any scene shares one parse
 * and one upload of its geometry and textures.
 *
 * What differs on the phone:
 * - no Draco or meshopt decoder (no Web Workers, no WebAssembly): the phone's
 *   policy refuses a model that needs one, with that reason;
 * - images inside the GLB are decoded with react-native-webgpu's
 *   `createImageBitmap`, which takes the encoded bytes: GLTFLoader's own way
 *   goes through a `blob:` URL, which React Native cannot make from bytes.
 */

export type LoadedModel = {gltf: GLTF; report: ModelReport};

/** Bytes to load, and what to do with them once they proved to be the model. */
export type ModelBytes = {
  bytes: Uint8Array;
  /** Read back from where only bytes that hashed to their reference are kept: the hash is skipped. */
  verified?: boolean;
  /** Keep the bytes (on disk): called once they passed. */
  keep?: () => void;
  /** Drop the bytes: called when they did not pass. */
  discard?: () => void;
};

const LOAD_TIMEOUT_MS = 30_000;

const cache = new Map<string, Promise<LoadedModel>>();

type ImageSourceLoader = (sourceIndex: number, loader: unknown) => Promise<THREE.Texture>;

/** GLTFLoader's parser, as far as the image plugin reaches into it. */
type ParserInternals = GLTFParser & {
  sourceCache: Record<number, Promise<THREE.Texture> | undefined>;
  loadImageSource: ImageSourceLoader;
};

/** Decodes the images a GLB carries from their bytes; anything else (there is nothing else, see glb.ts) as before. */
const embeddedImages = (parser: GLTFParser) => {
  const internals = parser as ParserInternals;
  const original = internals.loadImageSource.bind(parser);
  internals.loadImageSource = (sourceIndex, loader) => {
    const source = parser.json.images?.[sourceIndex] as {bufferView?: number; mimeType?: string} | undefined;
    if (source?.bufferView === undefined) return original(sourceIndex, loader);
    const known = internals.sourceCache[sourceIndex];
    if (known) return known.then(texture => texture.clone());
    const loading = parser
      .getDependency('bufferView', source.bufferView)
      .then((view: ArrayBuffer) =>
        createImageBitmap(view as unknown as Blob, {premultiplyAlpha: 'none', colorSpaceConversion: 'none'}),
      )
      .then(bitmap => {
        const texture = new THREE.Texture(bitmap);
        texture.needsUpdate = true;
        texture.userData.mimeType = source.mimeType;
        return texture;
      });
    internals.sourceCache[sourceIndex] = loading;
    return loading;
  };
  return {name: 'POKKET_embedded_images'};
};

const parse = (bytes: Uint8Array): Promise<GLTF> => {
  const manager = new THREE.LoadingManager();
  // Validation refuses a model with a `uri`; this is the second line: nothing is fetched.
  manager.setURLModifier(() => 'about:invalid');
  const loader = new GLTFLoader(manager).register(embeddedImages);
  const buffer = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer;
  let timer: ReturnType<typeof setTimeout> | undefined;
  return Promise.race([
    loader.parseAsync(buffer, ''),
    new Promise<never>((_resolve, reject) => {
      timer = setTimeout(() => reject(new Error('The model took too long to decode.')), LOAD_TIMEOUT_MS);
    }),
  ]).finally(() => clearTimeout(timer));
};

export const loadModel = (
  ref: string,
  getBytes: () => Promise<ModelBytes | Uint8Array>,
  policy: ModelPolicy = PHONE_MODEL_POLICY,
): Promise<LoadedModel> => {
  const cached = cache.get(ref);
  if (cached) return cached;
  const loading = (async () => {
    const got = await getBytes();
    const source: ModelBytes = got instanceof Uint8Array ? {bytes: got} : got;
    let report: ModelReport;
    try {
      report = await validateModel(source.bytes, ref, policy, {hashed: source.verified});
    } catch (error) {
      source.discard?.();
      throw error;
    }
    source.keep?.();
    const gltf = await parse(source.bytes);
    // glTF allows a file without scenes; there is nothing of it to place.
    if (!gltf.scene) throw new Error('The model has no scene to show.');
    return {gltf, report};
  })();
  cache.set(ref, loading);
  // A failure is not content: the next attempt (after an admin added the model, say) starts over.
  loading.catch(() => cache.delete(ref));
  return loading;
};

export type RestPose = {position: THREE.Vector3; quaternion: THREE.Quaternion; parent: THREE.Object3D | null};

/** One placed copy of a model: its own nodes and materials, and the pose it was authored in. */
export type ModelInstance = {
  root: THREE.Object3D;
  nodes: Map<string, THREE.Object3D>;
  rest: Map<THREE.Object3D, RestPose>;
  clips: THREE.AnimationClip[];
  report: ModelReport;
};

export const instantiate = (loaded: LoadedModel): ModelInstance => {
  const root = cloneSkinned(loaded.gltf.scene);
  const nodes = new Map<string, THREE.Object3D>();
  const rest = new Map<THREE.Object3D, RestPose>();
  root.traverse(object => {
    if (object.name && !nodes.has(object.name)) nodes.set(object.name, object);
    rest.set(object, {
      position: object.position.clone(),
      quaternion: object.quaternion.clone(),
      parent: object.parent,
    });
  });
  // GLTFLoader sanitizes names for animation tracks ("stage.x" -> "stagex"); the
  // binding contract is the authored name, which the report holds verbatim.
  for (const name of loaded.report.nodes) {
    if (nodes.has(name)) continue;
    const sanitized = THREE.PropertyBinding.sanitizeNodeName(name);
    const object = nodes.get(sanitized);
    if (object) nodes.set(name, object);
  }
  return {root, nodes, rest, clips: loaded.gltf.animations, report: loaded.report};
};

const owned = new WeakSet<THREE.Material>();

/**
 * The materials of a node's subtree, cloned once so that changing them does
 * not change another node, or another copy of the model, that shares them.
 */
export const ownMaterials = (node: THREE.Object3D): THREE.Material[] => {
  const materials: THREE.Material[] = [];
  node.traverse(object => {
    const mesh = object as THREE.Mesh;
    if (!mesh.isMesh) return;
    const claim = (material: THREE.Material): THREE.Material => {
      if (owned.has(material)) return material;
      const copy = material.clone();
      owned.add(copy);
      return copy;
    };
    mesh.material = Array.isArray(mesh.material) ? mesh.material.map(claim) : claim(mesh.material);
    materials.push(...(Array.isArray(mesh.material) ? mesh.material : [mesh.material]));
  });
  return materials;
};
