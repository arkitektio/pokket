import * as React from 'react';
import type * as THREE from 'three';
import {
  BlokRuntimeProvider,
  BlokScopeProvider,
  BlokTreeProvider,
  useBlok,
  useBlokRuntimeStoreApi,
  useBlokScope,
  useBlokTree,
  useEventAction,
  useValue,
  type BlokRender,
} from '@arkitektio/bsx/runtime';
import {useModel, useSceneNotice, useSceneOverlay, useSceneStoreApi} from './context';
import {useBlokTray} from '../run/host';
import {useBlokSceneHost} from './host';
import type {sceneCatalog} from '@arkitektio/bsx/catalogs';

type Scene = typeof sceneCatalog.components;

/**
 * orkestrator's `bloks/scene/interaction.tsx`, for a touch screen: a click is
 * a tap, and a popout that opens on hover opens on a tap here, since nothing
 * hovers over a phone.
 */

/** The clicked spot, kept in the node's own coordinates so the card points at it while the node moves. */
const localPoint = (node: THREE.Object3D, world: THREE.Vector3): THREE.Vector3 => node.worldToLocal(world.clone());

export const OnClickRender: BlokRender<Scene['OnClick']> = ({component, schema}) => {
  const blok = useBlok(component, schema);
  const model = useModel();
  const host = useBlokSceneHost();
  const name = useValue(blok.node);
  const open = useValue(blok.open);
  const title = useValue(blok.title);
  const description = useValue(blok.description);
  const mode = useValue(blok.mode) ?? 'popout';
  const onClick = useEventAction(blok, 'onClick');
  const node = name ? model.instance.nodes.get(name) : model.instance.root;
  useSceneNotice(name && !node ? 'Unknown node' : null, `The model has no node '${name}'.`);

  const store = useSceneStoreApi();
  // Where the card points while open; null while closed.
  const [opened, setOpened] = React.useState<THREE.Vector3 | null>(null);
  const openedRef = React.useRef(opened);
  React.useEffect(() => {
    openedRef.current = opened;
  }, [opened]);
  React.useEffect(() => {
    if (!node) return;
    return model.addClickable(node, {
      onClick: ({point}) => {
        onClick?.({node: name, point: point.toArray()});
        if (!open) return;
        if (openedRef.current) {
          setOpened(null);
          return;
        }
        // One card at a time: opening this one closes the others, except those pinned.
        store.getState().dismiss();
        setOpened(localPoint(node, point));
      },
    });
  }, [model, name, node, onClick, open, store]);

  const anchor = React.useCallback(() => node ?? null, [node]);
  const close = React.useCallback(() => setOpened(null), []);
  const content = React.useMemo(() => (open ? host.renderBlok(open) : null), [host, open]);
  useSceneOverlay({
    visible: opened !== null && Boolean(open),
    anchor,
    point: mode === 'popout' ? opened : null,
    title: title ?? name,
    description,
    content,
    mode,
    dismissable: true,
    onDismiss: close,
  });
  return null;
};

export const PopoutRender: BlokRender<Scene['Popout']> = ({component, buildChild, schema}) => {
  const blok = useBlok(component, schema);
  const model = useModel();
  const name = useValue(blok.node);
  const trigger = useValue(blok.trigger) ?? 'click';
  const controlled = useValue(blok.open);
  const title = useValue(blok.title);
  const description = useValue(blok.description);
  const node = name ? model.instance.nodes.get(name) : model.instance.root;
  useSceneNotice(name && !node ? 'Unknown node' : null, `The model has no node '${name}'.`);
  // Under an `Anchor` whose device the space does not place: nothing to point at,
  // so the card shows in the side tray, as long as it would show at all.
  const tray = useBlokTray();

  const store = useSceneStoreApi();
  const [toggled, setToggled] = React.useState(false);
  // The spot a click opened the card on; the node's origin otherwise.
  const [point, setPoint] = React.useState<THREE.Vector3 | null>(null);
  const [hovered, setHovered] = React.useState(false);
  const interactive = controlled === undefined && trigger !== 'always' && tray === null;
  // Nothing hovers on a touch screen: a hover card opens on a tap, as a click card does.
  const tapped = trigger !== 'always';
  const openRef = React.useRef(toggled);
  React.useEffect(() => {
    openRef.current = toggled;
  }, [toggled]);
  React.useEffect(() => {
    if (!node || !interactive) return;
    return model.addClickable(node, {
      onClick: ({point: hit}) => {
        if (!tapped) return;
        if (openRef.current) {
          setToggled(false);
          return;
        }
        // One card at a time: opening this one closes the others, except those pinned.
        store.getState().dismiss();
        setPoint(localPoint(node, hit));
        setToggled(true);
      },
      onHover: setHovered,
    });
  }, [interactive, model, node, store, tapped]);

  const visible =
    controlled ??
    (tray !== null || trigger === 'always' ? true : trigger === 'hover' ? hovered || toggled : toggled);
  const anchor = React.useCallback(() => node ?? null, [node]);
  const close = React.useCallback(() => setToggled(false), []);

  // The card is rendered by the view half of the scene, outside the canvas;
  // the scope it was declared in (a foreach item, say) is carried across.
  // So are the blok's runtime and tree: in a scene shared by several bloks
  // that half is outside each of them.
  const scope = useBlokScope();
  const runtime = useBlokRuntimeStoreApi();
  const tree = useBlokTree();
  const content = React.useMemo(
    () => (
      <BlokRuntimeProvider store={runtime}>
        <BlokTreeProvider tree={tree}>
          <BlokScopeProvider aliases={scope.aliases} values={scope.values} basePath={scope.basePath}>
            {(component.children ?? []).map(child => (
              <React.Fragment key={child.id}>{buildChild(child.id)}</React.Fragment>
            ))}
          </BlokScopeProvider>
        </BlokTreeProvider>
      </BlokRuntimeProvider>
    ),
    [buildChild, component, runtime, scope, tree],
  );
  useSceneOverlay({
    visible: Boolean(node) && visible,
    anchor,
    point: tapped ? point : null,
    title: title ?? name ?? tray ?? undefined,
    description,
    content,
    mode: tray === null ? 'popout' : 'panel',
    dismissable: tray === null && controlled === undefined && tapped,
    onDismiss: close,
  });
  return null;
};
