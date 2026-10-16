/**
 * orkestrator's `core/model/model.test.ts`, run against the phone's ports, plus
 * what the phone adds: its tighter policy, skipping the hash for bytes read
 * back from the cache, and knowing when a motion has settled.
 */

import {describe, expect, it, jest} from '@jest/globals';

// expo-crypto's digest is native; Node's hashes the same bytes the same way.
jest.mock('expo-crypto', () => ({
  ...jest.requireActual<object>('expo-crypto'),
  CryptoDigestAlgorithm: {SHA256: 'SHA-256'},
  digest: async (_algorithm: string, data: Uint8Array) => {
    const out: Uint8Array = require('crypto').createHash('sha256').update(data).digest();
    return out.buffer.slice(out.byteOffset, out.byteOffset + out.byteLength);
  },
}));

import {
  DEFAULT_MODEL_POLICY,
  ModelRefused,
  modelRef,
  PHONE_MODEL_POLICY,
  phonePolicy,
  validateModel,
  type ModelPolicy,
} from '../glb';
import {resolveJoints} from '../joints';
import {clipMotion, EASE_TAU, initialMotion, isMotionSettled, stepMotion, stillMotion, type MotionInput} from '../motion';
import {buildGlb, pngHeader, triangleModel} from '../testing';
import {parseAxis, parseVector, toBaseUnit, wavelengthToColor} from '../units';
import {findWriterConflicts, parseNodeAddress} from '../writers';

const refusal = async (bytes: Uint8Array, policy: Partial<ModelPolicy> = {}, ref?: string) => {
  try {
    await validateModel(bytes, ref ?? (await modelRef(bytes)), {...DEFAULT_MODEL_POLICY, ...policy});
  } catch (error) {
    if (error instanceof ModelRefused) return error.code;
    throw error;
  }
  return 'accepted';
};

describe('validateModel', () => {
  it('accepts a plain model and describes it', async () => {
    const bytes = buildGlb(...triangleModel());
    const report = await validateModel(bytes, await modelRef(bytes));
    expect(report.nodes).toEqual(['stage_x', 'turret']);
    expect(report.stats).toEqual({nodes: 2, triangles: 1, textures: 0, animations: 0});
    expect(report.joints).toEqual([]);
    expect(report.warnings).toEqual([]);
  });

  it('holds the bytes to their reference', async () => {
    const bytes = buildGlb(...triangleModel());
    expect(await refusal(bytes, {}, 'sha256:' + '0'.repeat(64))).toBe('hash_mismatch');
    expect(await refusal(bytes, {}, 'md5:abc')).toBe('bad_reference');
    expect(await refusal(bytes, {maxSize: 16})).toBe('too_large');
  });

  it('refuses a container that is not a version 2 GLB of its own length', async () => {
    const bytes = buildGlb(...triangleModel());
    const notGlb = bytes.slice();
    notGlb[0] = 0x7b;
    expect(await refusal(notGlb)).toBe('bad_header');
    const longer = new Uint8Array(bytes.length + 4);
    longer.set(bytes);
    expect(await refusal(longer)).toBe('bad_header');
  });

  it('refuses structure that points outside the file or outside the model', async () => {
    const [document, binary] = triangleModel();
    expect(await refusal(buildGlb({...document, asset: {version: '1.0'}}, binary))).toBe('bad_structure');
    expect(await refusal(buildGlb({...document, buffers: [{byteLength: binary.length + 64}]}, binary))).toBe(
      'bad_structure',
    );
    const oversized = [{bufferView: 0, componentType: 5126, count: 4, type: 'VEC3'}];
    expect(await refusal(buildGlb({...document, accessors: oversized}, binary))).toBe('bad_structure');
    expect(await refusal(buildGlb({...document, images: [{uri: 'data:image/png;base64,AAAA'}]}, binary))).toBe(
      'external_reference',
    );
    expect(await refusal(buildGlb({...document, extensionsRequired: ['VENDOR_secret']}, binary))).toBe(
      'unsupported_extension',
    );
  });

  it('budgets counts and texture sizes', async () => {
    const bytes = buildGlb(...triangleModel());
    expect(await refusal(bytes, {maxNodes: 1})).toBe('over_budget');
    expect(await refusal(bytes, {maxTriangles: 0})).toBe('over_budget');

    const [document, mesh] = triangleModel();
    const png = pngHeader(8192, 64);
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
        images: [{bufferView: 1, mimeType: 'image/png'}],
      },
      binary,
    );
    expect(await refusal(textured)).toBe('over_budget');
    expect(await refusal(textured, {maxTextureSize: 8192})).toBe('accepted');
    expect(await refusal(textured, {maxTextureSize: 8192, maxTextureMemory: 1024})).toBe('over_budget');
  });

  it('reads a joint table and refuses one that does not fit the model', async () => {
    const elbow = {name: 'elbow', node: 'stage_x', type: 'revolute', axis: [0, 0, 1], limit: {lower: -2, upper: 2}};
    const wrist = {name: 'wrist', node: 'turret', type: 'continuous', axis: [1, 0, 0], mimic: {joint: 'elbow', multiplier: -1}};
    const withJoints = (joints: unknown[]) =>
      buildGlb(...triangleModel({extras: {arkitekt: {version: 1, joints}}}));
    const bytes = withJoints([elbow, wrist]);
    const report = await validateModel(bytes, await modelRef(bytes));
    expect(report.joints.map(joint => joint.name)).toEqual(['elbow', 'wrist']);
    expect(report.joints[1].mimic).toEqual({joint: 'elbow', multiplier: -1, offset: 0});

    expect(await refusal(withJoints([{...elbow, node: 'missing'}]))).toBe('bad_extras');
    expect(await refusal(withJoints([{...elbow, type: 'floating'}]))).toBe('bad_extras');
    expect(await refusal(withJoints([{...elbow, axis: [0, 0, 2]}]))).toBe('bad_extras');
    expect(await refusal(withJoints([elbow, {...wrist, node: 'stage_x'}]))).toBe('bad_extras');
    expect(await refusal(buildGlb(...triangleModel({extras: {arkitekt: {version: 2}}})))).toBe('bad_extras');
  });
});

describe('stepMotion', () => {
  const run = (input: MotionInput, seconds: number, state = initialMotion(input)) => {
    for (let elapsed = 0; elapsed < seconds; elapsed += 1 / 60) state = stepMotion(state, input, 1 / 60);
    return state;
  };

  it('eases toward a new value and settles in about 300 ms', () => {
    const start = initialMotion({value: 0});
    const afterOne = stepMotion(start, {value: 1}, EASE_TAU);
    expect(afterOne.displayed).toBeCloseTo(1 - Math.exp(-1), 6);
    expect(run({value: 1}, 0.3, start).displayed).toBeGreaterThan(0.94);
  });

  it('snaps when smoothing is off', () => {
    expect(stepMotion(initialMotion({value: 0}), {value: 1, smooth: false}, 1 / 60).displayed).toBe(1);
  });

  it('moves to a target at the published speed and stops there', () => {
    const input = {value: 0, target: 1, speed: 0.5};
    expect(run(input, 1).displayed).toBeCloseTo(0.5, 1);
    expect(run(input, 3).displayed).toBe(1);
  });

  it('derives its speed from a duration when the target changes', () => {
    const input = {value: 0, target: 2, duration: 4};
    expect(run(input, 2).displayed).toBeCloseTo(1, 1);
  });

  it('is pulled back toward a new measurement without passing the target', () => {
    const input = {value: 0, target: 1, speed: 0.5};
    const halfway = run(input, 1);
    const corrected = run({...input, value: 0.2}, 0.5, halfway);
    const uncorrected = run(input, 0.5, halfway);
    expect(corrected.displayed).toBeLessThan(uncorrected.displayed);
    expect(run({...input, value: 5}, 2, halfway).displayed).toBe(1);
  });

  it('stands where it was measured when the view is a moment, not a running device', () => {
    const moving = {value: 0.2, target: 1, speed: 0.5};
    expect(stillMotion(moving)).toEqual({value: 0.2, target: undefined, speed: 0.5});
    expect(run(stillMotion(moving), 3).displayed).toBeCloseTo(0.2, 6);
    const resting = {value: 0.2};
    expect(stillMotion(resting)).toBe(resting);
  });
});

describe('clipMotion', () => {
  it('reads progress as a share of the clip and time as seconds', () => {
    expect(clipMotion({progress: 0.5, animateTo: 1, duration: 2}, 4)).toEqual({value: 2, target: 4, duration: 2});
    expect(clipMotion({time: 1.5, animateTo: 3}, 4)).toEqual({value: 1.5, target: 3, duration: undefined});
    expect(clipMotion({}, 4)).toEqual({value: 0, target: undefined, duration: undefined});
  });

  it('shows where a clip was playing to when the view is still', () => {
    expect(clipMotion({animateTo: 1, duration: 2}, 4, true)).toEqual({value: 4});
    expect(clipMotion({progress: 0.25, animateTo: 1}, 4, true)).toEqual({value: 1});
  });
});

describe('units', () => {
  it('takes plain numbers as base units and converts quantities', () => {
    expect(toBaseUnit(0.25, 'length')).toEqual({ok: true, value: 0.25});
    expect(toBaseUnit({magnitude: 250, unit: 'um'}, 'length')).toEqual({ok: true, value: 250e-6});
    const degrees = toBaseUnit({value: 180, unit: 'deg'}, 'angle');
    expect(degrees.ok && degrees.value).toBeCloseTo(Math.PI, 9);
  });

  it('refuses a unit of the wrong dimension instead of moving the node', () => {
    expect(toBaseUnit({magnitude: 3, unit: 'deg'}, 'length').ok).toBe(false);
    expect(toBaseUnit('fast', 'length').ok).toBe(false);
    expect(toBaseUnit(Number.NaN, 'angle').ok).toBe(false);
  });

  it('parses vectors, axes and wavelengths', () => {
    expect(parseVector('0.6 0 0')).toEqual([0.6, 0, 0]);
    expect(parseVector('1 2')).toBeUndefined();
    expect(parseAxis('y')).toEqual([0, 1, 0]);
    expect(parseAxis('0 0 2')).toEqual([0, 0, 1]);
    expect(parseAxis('0 0 0')).toBeUndefined();
    expect(wavelengthToColor(488)).toMatch(/^#00[0-9a-f]{2}ff$/);
    expect(wavelengthToColor(640)).toMatch(/^#ff[0-9a-f]{2}00$/);
  });
});

describe('resolveJoints', () => {
  const joints = [
    {name: 'finger_l', node: 'finger_l', type: 'prismatic' as const, axis: [1, 0, 0] as [number, number, number], limit: {lower: 0, upper: 0.04}},
    {name: 'finger_r', node: 'finger_r', type: 'prismatic' as const, axis: [1, 0, 0] as [number, number, number], limit: {lower: -0.04, upper: 0}, mimic: {joint: 'finger_l', multiplier: -1, offset: 0}},
    {name: 'wrist', node: 'wrist', type: 'continuous' as const, axis: [0, 0, 1] as [number, number, number]},
  ];

  it('drives mimic joints, clamps to limits and names unknown joints', () => {
    const {poses, unknown} = resolveJoints(joints, {finger_l: 0.1, elbow: 1});
    expect(poses.get('finger_l')).toEqual({value: 0.04, clamped: true});
    expect(poses.get('finger_r')).toEqual({value: -0.04, clamped: true});
    expect(poses.has('wrist')).toBe(false);
    expect(unknown).toEqual(['elbow']);
  });

  it('keeps the last value of a joint a partial map leaves out', () => {
    const first = resolveJoints(joints, {wrist: 7, finger_l: 0.01});
    const second = resolveJoints(joints, {finger_l: 0.02}, first.poses);
    expect(second.poses.get('wrist')).toEqual({value: 7, clamped: false});
    expect(second.poses.get('finger_r')).toEqual({value: -0.02, clamped: false});
  });
});

describe('findWriterConflicts', () => {
  const binding = (id: string, component: string, node: string) => ({
    id,
    component,
    props: [{key: 'node', static_value: node}],
  });

  it('allows one translation and one rotation per node', () => {
    expect(
      findWriterConflicts([binding('a', 'Move', 'stage_x'), binding('b', 'Rotate', 'stage_x'), binding('c', 'Show', 'stage_x')]),
    ).toEqual([]);
  });

  it('names a second writer and a binding on a joint-driven node', () => {
    const errors = findWriterConflicts(
      [binding('a', 'Move', 'stage_x'), {id: 'g', component: 'Group', children: [binding('b', 'Move', 'stage_x')]}, binding('c', 'Rotate', 'elbow')],
      new Set(['elbow']),
    );
    expect(errors).toHaveLength(2);
    expect(errors[0]).toContain("second translation binding on node 'stage_x'");
    expect(errors[1]).toContain('which a joint of this robot drives');
  });

  it('splits a cross-model address', () => {
    expect(parseNodeAddress('arm:tool0')).toEqual({model: 'arm', node: 'tool0'});
    expect(parseNodeAddress('tool0')).toEqual({node: 'tool0'});
  });
});

describe('the phone', () => {
  it('refuses the compressions it cannot decode, with that reason', async () => {
    const bytes = buildGlb(...triangleModel({extensionsUsed: ['KHR_draco_mesh_compression'], extensionsRequired: ['KHR_draco_mesh_compression']}));
    await expect(validateModel(bytes, await modelRef(bytes), PHONE_MODEL_POLICY)).rejects.toMatchObject({
      code: 'unsupported_extension',
    });
    expect(await refusal(bytes)).toBe('accepted');
  });

  it('holds a model to the stricter of the server and itself', () => {
    const server: ModelPolicy = {...DEFAULT_MODEL_POLICY, maxTriangles: 500_000, maxTextureSize: 8192, extensions: ['KHR_lights_punctual', 'KHR_draco_mesh_compression']};
    const policy = phonePolicy(server);
    expect(policy.maxTriangles).toBe(500_000);
    expect(policy.maxTextureSize).toBe(PHONE_MODEL_POLICY.maxTextureSize);
    expect(policy.extensions).toEqual(['KHR_lights_punctual']);
    expect(phonePolicy(null)).toBe(PHONE_MODEL_POLICY);
  });

  it('does not hash again what it read back from its cache, and still checks the rest', async () => {
    const bytes = buildGlb(...triangleModel());
    const other = 'sha256:' + '0'.repeat(64);
    await expect(validateModel(bytes, other, DEFAULT_MODEL_POLICY, {hashed: true})).resolves.toMatchObject({ref: other});
    await expect(validateModel(bytes, other, {...DEFAULT_MODEL_POLICY, maxNodes: 1}, {hashed: true})).rejects.toMatchObject({
      code: 'over_budget',
    });
  });
});

describe('isMotionSettled', () => {
  const run = (input: MotionInput, seconds: number) => {
    let state = initialMotion(input);
    for (let elapsed = 0; elapsed < seconds; elapsed += 1 / 60) state = stepMotion(state, input, 1 / 60);
    return state;
  };

  it('is false while a part is on its way and true once it arrived', () => {
    const going = {value: 0, target: 1, speed: 0.5};
    expect(isMotionSettled(run(going, 1), going)).toBe(false);
    expect(isMotionSettled(run(going, 3), going)).toBe(true);
    const easing = {value: 1};
    expect(isMotionSettled(stepMotion(initialMotion({value: 0}), easing, 1 / 60), easing)).toBe(false);
    expect(isMotionSettled(initialMotion(easing), easing)).toBe(true);
  });

  it('settles an eased move to micrometer precision within a few seconds', () => {
    const input = {value: 250e-6};
    let state = initialMotion({value: 0});
    let frames = 0;
    while (!isMotionSettled(state, input) && frames < 600) {
      state = stepMotion(state, input, 1 / 60);
      frames += 1;
    }
    expect(frames).toBeLessThan(600);
  });
});
