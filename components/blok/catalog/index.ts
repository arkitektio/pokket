import {createBlokCatalog} from '@/lib/ports/blok/runtime';
import {standardBlokFunctions} from '@/lib/ports/blok/functions';
import {controlBlokComponents} from './control';
import {dataBlokComponents} from './data';
import {feedbackBlokComponents} from './feedback';
import {formBlokComponents} from './forms';
import {htmlBlokComponents} from './html';
import {iconBlokComponents} from './icons';
import {layoutBlokComponents} from './layout';
import {navigationBlokComponents} from './navigation';
import {typographyBlokComponents} from './typography';

/**
 * What pokket can draw of orkestrator's catalog (`core/blok/renderer/catalog.tsx`):
 * the same component names and prop schemas, rendered with React Native.
 * A blok naming a component left out here (the 3D scene, charts, overlays,
 * resizable panels…) still renders, with an "Unknown component" card in
 * that node's place.
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
  ],
  standardBlokFunctions,
);
