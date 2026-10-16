import {describe, expect, it, jest} from '@jest/globals';
import {readFileSync} from 'fs';
import {resolve} from 'path';
import * as THREE from 'three';
import {modelRef, ModelRefused, PHONE_MODEL_POLICY} from '../glb';
import {instantiate, loadModel, ownMaterials} from '../loadModel';
import {buildGlb, pngHeader, triangleModel} from '../testing';

/**
 * orkestrator's `bloks/scene/loadModel.test.ts`. `scope.fixture.glb` is what
 * kulisse writes for `testing/device_scene.urdf`: a microscope with a
 * prismatic XY stage and a continuous turret.
 */

jest.mock('expo-crypto', () => ({
  ...jest.requireActual<object>('expo-crypto'),
  CryptoDigestAlgorithm: {SHA256: 'SHA-256'},
  digest: async (_algorithm: string, data: Uint8Array) => {
    const out: Uint8Array = require('crypto').createHash('sha256').update(data).digest();
    return out.buffer.slice(out.byteOffset, out.byteOffset + out.byteLength);
  },
}));

const fixture = (): Uint8Array => new Uint8Array(readFileSync(resolve(__dirname, 'scope.fixture.glb')));

describe('loadModel', () => {
  it('decodes a model kulisse wrote and finds every node its joint table names', async () => {
    const bytes = fixture();
    const instance = instantiate(await loadModel(await modelRef(bytes), async () => bytes));

    expect(instance.report.joints.map(joint => joint.name)).toEqual(['stage_x', 'stage_y', 'turret']);
    for (const joint of instance.report.joints) {
      expect(instance.nodes.get(joint.node)).toBeInstanceOf(THREE.Object3D);
    }
    expect(instance.nodes.get('stage_x')?.position.toArray()).toEqual([0.02, 0, 0.06]);
    expect(instance.nodes.get('stage_x_carriage')?.parent).toBe(instance.nodes.get('stage_x'));
    expect(instance.nodes.get('laser_out')).toBeDefined();
    expect(instance.rest.get(instance.nodes.get('turret')!)?.parent?.name).toBe('column');
  });

  it('gives each placed copy its own nodes, and a node its own materials on demand', async () => {
    const bytes = fixture();
    const loaded = await loadModel(await modelRef(bytes), async () => bytes);
    const first = instantiate(loaded);
    const second = instantiate(loaded);
    expect(first.nodes.get('sample')).not.toBe(second.nodes.get('sample'));

    const meshOf = (object: THREE.Object3D): THREE.Mesh => {
      let found: THREE.Mesh | undefined;
      object.traverse(child => {
        if ((child as THREE.Mesh).isMesh) found ??= child as THREE.Mesh;
      });
      return found!;
    };
    const base = meshOf(first.nodes.get('base')!);
    const column = meshOf(first.nodes.get('column')!);
    expect(base.material).toBe(column.material);
    const [tinted] = ownMaterials(first.nodes.get('base')!);
    expect(tinted).not.toBe(column.material);
    expect(ownMaterials(first.nodes.get('base')!)[0]).toBe(tinted);
  });

  it('refuses bytes that are not the model the reference names, and tries again afterwards', async () => {
    const bytes = fixture();
    const other = 'sha256:' + '1'.repeat(64);
    await expect(loadModel(other, async () => bytes)).rejects.toBeInstanceOf(ModelRefused);
    let calls = 0;
    await expect(
      loadModel(other, async () => {
        calls += 1;
        return bytes;
      }),
    ).rejects.toMatchObject({code: 'hash_mismatch'});
    expect(calls).toBe(1);
  });

  it('keeps downloaded bytes only once they proved to be the model', async () => {
    const good = buildGlb(...triangleModel({scenes: [{nodes: [0, 1]}], scene: 0}));
    const keep = jest.fn();
    const discard = jest.fn();
    await loadModel(await modelRef(good), async () => ({bytes: good, keep, discard}));
    expect(keep).toHaveBeenCalledTimes(1);
    expect(discard).not.toHaveBeenCalled();

    const draco = buildGlb(...triangleModel({extensionsRequired: ['KHR_draco_mesh_compression']}));
    const dropped = jest.fn();
    await expect(
      loadModel(await modelRef(draco), async () => ({bytes: draco, discard: dropped}), PHONE_MODEL_POLICY),
    ).rejects.toMatchObject({code: 'unsupported_extension'});
    expect(dropped).toHaveBeenCalledTimes(1);
  });

  it('says so for a model with nothing to place', async () => {
    const empty = buildGlb(...triangleModel());
    await expect(loadModel(await modelRef(empty), async () => empty)).rejects.toThrow('no scene to show');
  });

  it('decodes an image the model carries from its bytes, without a blob URL', async () => {
    const [document, mesh] = triangleModel();
    const png = pngHeader(4, 4);
    const binary = new Uint8Array(mesh.length + png.length);
    binary.set(mesh);
    binary.set(png, mesh.length);
    const textured = buildGlb(
      {
        ...document,
        buffers: [{byteLength: binary.length}],
        bufferViews: [
          {buffer: 0, byteOffset: 0, byteLength: mesh.length},
          {buffer: 0, byteOffset: mesh.length, byteLength: png.length},
        ],
        meshes: [{primitives: [{attributes: {POSITION: 0}, material: 0}]}],
        materials: [{pbrMetallicRoughness: {baseColorTexture: {index: 0}}}],
        textures: [{source: 0}],
        images: [{bufferView: 1, mimeType: 'image/png'}],
        scenes: [{nodes: [0, 1]}],
        scene: 0,
      },
      binary,
    );
    const bitmap = {width: 4, height: 4, close: () => undefined};
    const decode = jest.fn(async (_bytes: ArrayBuffer) => bitmap);
    const globals = globalThis as unknown as {createImageBitmap?: unknown};
    const previous = globals.createImageBitmap;
    globals.createImageBitmap = decode;
    try {
      const instance = instantiate(await loadModel(await modelRef(textured), async () => textured));
      expect(decode).toHaveBeenCalledTimes(1);
      expect(new Uint8Array(decode.mock.calls[0][0])).toEqual(png);
      const material = (instance.nodes.get('stage_x') as THREE.Mesh).material as THREE.MeshStandardMaterial;
      expect(material.map).toBeInstanceOf(THREE.Texture);
      expect(material.map?.image).toBe(bitmap);
      expect(material.map?.flipY).toBe(false);
    } finally {
      globals.createImageBitmap = previous;
    }
  });
});
