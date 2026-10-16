import {createBlokCatalog} from '@/lib/ports/blok/runtime';
import {standardBlokFunctions} from '@/lib/ports/blok/functions';
import {controlBlokComponents} from './control';
import {dataBlokComponents} from './data';
import {feedbackBlokComponents} from './feedback';
import {formBlokComponents} from './forms';
import {htmlBlokComponents} from './html';
import {iconBlokComponents} from './icons';
import {layoutBlokComponents} from './layout';
import {logoBlokComponents} from './logo';
import {lovekitBlokComponents} from './lovekit';
import {navigationBlokComponents} from './navigation';
import {sceneBlokComponents} from './scene';
import {typographyBlokComponents} from './typography';

/**
 * What pokket can draw of orkestrator's catalog (`core/blok/renderer/catalog.tsx`):
 * the same component names and prop schemas, rendered with React Native.
 * A blok naming a component left out here (charts, overlays, resizable
 * panels…) still renders, with an "Unknown component" card in that node's
 * place.
 *
 * The SVG components (`logo.tsx`) draw logo bloks: an agent's, an action's.
 * The 3D components (`scene/`) draw scene bloks with three.js on WebGPU.
 */
export const pokketBlokCatalog = createBlokCatalog(
  'https://arkitekt.live/catalogs/v1.json',
  [
    ...layoutBlokComponents,
    ...typographyBlokComponents,
    ...htmlBlokComponents,
    ...formBlokComponents,
    ...navigationBlokComponents,
    ...feedbackBlokComponents,
    ...dataBlokComponents,
    ...iconBlokComponents,
    ...controlBlokComponents,
    ...logoBlokComponents,
    ...lovekitBlokComponents,
    ...sceneBlokComponents,
  ],
  standardBlokFunctions,
);
