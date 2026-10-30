// three.js objects (nodes, materials, uniforms) are mutable by design: they are
// changed here in effects and frame callbacks, never while rendering.
/* eslint-disable react-hooks/immutability */
import * as React from 'react';
import * as THREE from 'three';
import {useFrame, useThree} from '@react-three/fiber';
import {clipMotion, initialMotion, isMotionSettled, stepMotion, stillMotion, type MotionState} from '@/lib/scene/motion';
import {parseAxis, toBaseUnit, wavelengthToColor, type Dimension} from '@/lib/scene/units';
import {parseNodeAddress} from '@/lib/scene/writers';
import {useBlok, useValue, type BlokRender} from '@arkitektio/bsx/runtime';
import {useModel, useSceneModelKey, useSceneNotice, useSceneState, type ModelContextValue} from './context';
import {useThemeColour} from './colour';
import {useBlokSceneStill} from './host';
import {ownMaterials} from '@/lib/scene/loadModel';
import type {sceneCatalog} from '@arkitektio/bsx/catalogs';

type Scene = typeof sceneCatalog.components;

/**
 * orkestrator's `bloks/scene/bindings.tsx`. The scene draws on demand, so a
 * binding asks for a frame whenever what it shows changes, and for the next
 * one for as long as a part is still on its way.
 */

/** The node a binding names, and a notice beside the scene while the model has no such node. */
const useNode = (name: string | undefined): THREE.Object3D | undefined => {
  const model = useModel();
  const node = name ? model.instance.nodes.get(name) : undefined;
  useSceneNotice(name && !node ? 'Unknown node' : null, `The model has no node '${name}'.`);
  return node;
};

/** The node a binding names, or the whole model when it names none. */
const useNodeOrRoot = (name: string | undefined): THREE.Object3D | undefined => {
  const model = useModel();
  const node = name ? model.instance.nodes.get(name) : model.instance.root;
  useSceneNotice(name && !node ? 'Unknown node' : null, `The model has no node '${name}'.`);
  return node;
};

/** A node of this model, or `arm:tool0` for a node of the model whose id is `arm`. */
const useAddressedNode = (address: string | undefined): THREE.Object3D | undefined => {
  const model = useModel();
  const parsed = address ? parseNodeAddress(address) : undefined;
  const modelKey = useSceneModelKey();
  const other = useSceneState(state => (parsed?.model ? state.models.get(modelKey(parsed.model)) : undefined));
  const instance = parsed?.model ? other : model.instance;
  const node = parsed ? instance?.nodes.get(parsed.node) : undefined;
  useSceneNotice(address && !node ? 'Unknown node' : null, `Nothing in the scene is addressed by '${address}'.`);
  return node;
};

const direction = new THREE.Vector3();
const turn = new THREE.Quaternion();

/**
 * Drives one channel of one node. React delivers what the agent published;
 * the frame loop moves the node, so a part glides between state updates
 * without a render per frame.
 */
const useMotionBinding = (
  model: ModelContextValue,
  props: {
    node: string | undefined;
    axis: string | undefined;
    value: unknown;
    animateTo: unknown;
    speed: number | undefined;
    duration: number | undefined;
    scale: number | undefined;
    offset: number | undefined;
    gain: number | undefined;
    smooth: boolean | undefined;
  },
  dimension: Dimension,
): void => {
  const node = useNode(props.node);
  const axis = parseAxis(props.axis);
  const scale = props.scale ?? 1;
  const offset = props.offset ?? 0;
  const measured = props.value === undefined || props.value === null ? undefined : toBaseUnit(props.value, dimension);
  const target =
    props.animateTo === undefined || props.animateTo === null ? undefined : toBaseUnit(props.animateTo, dimension);

  const problem =
    props.axis !== undefined && !axis
      ? `'${props.axis}' is not an axis.`
      : measured && !measured.ok
        ? measured.reason
        : target && !target.ok
          ? target.reason
          : null;
  useSceneNotice(problem ? `Cannot move '${props.node}'` : null, problem ?? undefined);

  const still = useBlokSceneStill();
  const input = React.useMemo(() => {
    if (!measured?.ok) return undefined;
    const moving = {
      value: measured.value * scale + offset,
      target: target?.ok ? target.value * scale + offset : undefined,
      speed: props.speed,
      duration: props.duration,
      smooth: props.smooth,
    };
    return still ? stillMotion(moving) : moving;
  }, [measured, offset, props.duration, props.smooth, props.speed, scale, still, target]);
  const state = React.useRef<MotionState | undefined>(undefined);
  const gain = props.gain ?? 1;
  const invalidate = useThree(three => three.invalidate);
  React.useEffect(() => invalidate(), [axis?.join(' '), gain, input, invalidate, node]);

  useFrame((_state, delta) => {
    const rest = node ? model.instance.rest.get(node) : undefined;
    if (!node || !rest || !axis || !input) return;
    state.current = stepMotion(state.current ?? initialMotion(input), input, Math.min(delta, 0.1));
    if (!isMotionSettled(state.current, input)) invalidate();
    const displayed = state.current.displayed * gain;
    direction.set(...axis);
    if (dimension === 'length') {
      node.position.copy(rest.position).addScaledVector(direction.applyQuaternion(rest.quaternion), displayed);
    } else {
      node.quaternion.copy(rest.quaternion).multiply(turn.setFromAxisAngle(direction, displayed));
    }
  });

  // An unmounted binding leaves the node where the model was authored.
  React.useEffect(
    () => () => {
      const rest = node ? model.instance.rest.get(node) : undefined;
      if (!node || !rest) return;
      if (dimension === 'length') node.position.copy(rest.position);
      else node.quaternion.copy(rest.quaternion);
      invalidate();
    },
    [dimension, invalidate, model, node],
  );
};

const motionRender = (dimension: Dimension): BlokRender<Scene['Move']> =>
  function MotionBinding({component, schema}) {
    const blok = useBlok(component, schema);
    useMotionBinding(
      useModel(),
      {
        node: useValue(blok.node),
        axis: useValue(blok.axis),
        value: useValue(blok.value),
        animateTo: useValue(blok.animateTo),
        speed: useValue(blok.speed),
        duration: useValue(blok.duration),
        scale: useValue(blok.scale),
        offset: useValue(blok.offset),
        gain: useValue(blok.gain),
        smooth: useValue(blok.smooth),
      },
      dimension,
    );
    return null;
  };

export const MoveRender = motionRender('length');
export const RotateRender = motionRender('angle');

export const VisibleRender: BlokRender<Scene['Visible']> = ({component, schema}) => {
  const blok = useBlok(component, schema);
  const node = useNode(useValue(blok.node));
  const on = useValue(blok.on);
  const invalidate = useThree(three => three.invalidate);
  React.useEffect(() => {
    if (!node) return;
    const authored = node.visible;
    node.visible = on ?? authored;
    invalidate();
    return () => {
      node.visible = authored;
      invalidate();
    };
  }, [invalidate, node, on]);
  return null;
};

type Emissive = THREE.Material & {emissive?: THREE.Color; emissiveIntensity?: number};
type Colored = THREE.Material & {color?: THREE.Color};

export const GlowRender: BlokRender<Scene['Glow']> = ({component, schema}) => {
  const blok = useBlok(component, schema);
  const node = useNodeOrRoot(useValue(blok.node));
  const on = useValue(blok.on) ?? false;
  const intensity = useValue(blok.intensity);
  const color = useThemeColour(useValue(blok.color));
  const invalidate = useThree(three => three.invalidate);
  React.useEffect(() => {
    if (!node) return;
    const lights: Array<[THREE.Light, number]> = [];
    node.traverse(object => {
      const light = object as THREE.Light;
      if (light.isLight) lights.push([light, light.intensity]);
    });
    const materials = ownMaterials(node).filter((material): material is Emissive => 'emissive' in material);
    const authored = materials.map(material => [material.emissive?.clone(), material.emissiveIntensity] as const);
    lights.forEach(([light, original]) => {
      light.intensity = on ? (intensity ?? original) : 0;
    });
    materials.forEach(material => {
      if (!material.emissive) return;
      if (on) {
        if (color) material.emissive.set(color);
        else if (material.emissive.getHex() === 0) material.emissive.set('#ffffff');
        material.emissiveIntensity = intensity ?? 1;
      } else {
        material.emissiveIntensity = 0;
      }
    });
    invalidate();
    return () => {
      lights.forEach(([light, original]) => {
        light.intensity = original;
      });
      materials.forEach((material, index) => {
        const [emissive, emissiveIntensity] = authored[index];
        if (emissive && material.emissive) material.emissive.copy(emissive);
        material.emissiveIntensity = emissiveIntensity;
      });
      invalidate();
    };
  }, [color, intensity, invalidate, node, on]);
  return null;
};

export const TintRender: BlokRender<Scene['Tint']> = ({component, schema}) => {
  const blok = useBlok(component, schema);
  const node = useNode(useValue(blok.node));
  const color = useThemeColour(useValue(blok.color));
  const invalidate = useThree(three => three.invalidate);
  React.useEffect(() => {
    if (!node || !color) return;
    const materials = ownMaterials(node).filter((material): material is Colored => 'color' in material);
    const authored = materials.map(material => material.color?.clone());
    materials.forEach(material => material.color?.set(color));
    invalidate();
    return () => {
      materials.forEach((material, index) => {
        const original = authored[index];
        if (original) material.color?.copy(original);
      });
      invalidate();
    };
  }, [color, invalidate, node]);
  return null;
};

export const AttachRender: BlokRender<Scene['Attach']> = ({component, schema}) => {
  const blok = useBlok(component, schema);
  const model = useModel();
  const node = useNode(useValue(blok.node));
  const target = useAddressedNode(useValue(blok.to));
  const on = useValue(blok.on) ?? false;
  const invalidate = useThree(three => three.invalidate);
  React.useEffect(() => {
    const home = node ? model.instance.rest.get(node)?.parent : undefined;
    if (!node || !target || !home || !on) return;
    target.attach(node);
    invalidate();
    return () => {
      home.attach(node);
      invalidate();
    };
  }, [invalidate, model, node, target, on]);
  return null;
};

const from = new THREE.Vector3();
const to = new THREE.Vector3();
const up = new THREE.Vector3(0, 1, 0);
const orientation = new THREE.Quaternion();

export const BeamRender: BlokRender<Scene['Beam']> = ({component, schema}) => {
  const blok = useBlok(component, schema);
  const start = useNode(useValue(blok.start));
  const end = useAddressedNode(useValue(blok.end));
  const length = useValue(blok.length);
  const on = useValue(blok.on) ?? true;
  const wavelength = useValue(blok.wavelength);
  const color = useThemeColour(useValue(blok.color)) ?? (wavelength ? wavelengthToColor(wavelength) : '#ff3b30');
  const width = useValue(blok.width) ?? 0.002;
  const mesh = React.useRef<THREE.Mesh>(null);
  // It follows its anchors in the frames they move in; a change of its own asks for one.
  const invalidate = useThree(three => three.invalidate);
  React.useEffect(() => invalidate(), [color, end, invalidate, length, on, start, width]);

  useFrame(() => {
    const beam = mesh.current;
    if (!beam) return;
    if (!on || !start || (!end && !length)) {
      beam.visible = false;
      return;
    }
    start.getWorldPosition(from);
    if (end) end.getWorldPosition(to);
    else to.set(0, 0, length ?? 0).applyQuaternion(start.getWorldQuaternion(orientation)).add(from);
    const span = from.distanceTo(to);
    beam.visible = span > 0;
    if (!beam.visible) return;
    // The mesh lives in the model's group; the anchors are measured in the world.
    beam.parent?.worldToLocal(from);
    beam.parent?.worldToLocal(to);
    beam.position.copy(from).add(to).multiplyScalar(0.5);
    beam.quaternion.setFromUnitVectors(up, to.sub(from).normalize());
    beam.scale.set(width, from.distanceTo(beam.position) * 2, width);
  });

  return (
    <mesh ref={mesh} visible={false} raycast={() => null}>
      <cylinderGeometry args={[0.5, 0.5, 1, 12, 1, true]} />
      <meshBasicMaterial color={color} transparent opacity={0.75} toneMapped={false} depthWrite={false} />
    </mesh>
  );
};

export const AnimateRender: BlokRender<Scene['Animate']> = ({component, schema}) => {
  const blok = useBlok(component, schema);
  const model = useModel();
  const clipName = useValue(blok.clip);
  const progress = useValue(blok.progress);
  const time = useValue(blok.time);
  const animateTo = useValue(blok.animateTo);
  const duration = useValue(blok.duration);

  const clip = React.useMemo(
    () => model.instance.clips.find(candidate => candidate.name === clipName),
    [clipName, model],
  );
  useSceneNotice(clipName && !clip ? 'Unknown animation clip' : null, `The model has no clip '${clipName}'.`);

  // Started in the effect that also stops it: a memo would start the clip once, and the
  // first cleanup (React runs effects twice in development) would stop it for good.
  const playback = React.useRef<{mixer: THREE.AnimationMixer; action: THREE.AnimationAction} | undefined>(undefined);
  const state = React.useRef<MotionState | undefined>(undefined);
  React.useEffect(() => {
    if (!clip) return;
    const root = model.instance.root;
    const mixer = new THREE.AnimationMixer(root);
    const action = mixer.clipAction(clip);
    action.play();
    action.paused = true;
    playback.current = {mixer, action};
    // A clip bound to state can change: the new clip starts from its own position, not
    // from where the previous one was left.
    state.current = undefined;
    return () => {
      playback.current = undefined;
      mixer.stopAllAction();
      mixer.uncacheRoot(root);
    };
  }, [clip, model]);

  const still = useBlokSceneStill();
  const invalidate = useThree(three => three.invalidate);
  React.useEffect(() => invalidate(), [animateTo, clip, duration, invalidate, progress, still, time]);
  useFrame((_state, delta) => {
    const playing = playback.current;
    if (!playing || !clip) return;
    const input = clipMotion({time, progress, animateTo, duration}, clip.duration, still);
    state.current = stepMotion(state.current ?? initialMotion(input), input, Math.min(delta, 0.1));
    if (!isMotionSettled(state.current, input)) invalidate();
    playing.action.time = Math.min(Math.max(state.current.displayed, 0), clip.duration);
    playing.mixer.update(0);
  });
  return null;
};
