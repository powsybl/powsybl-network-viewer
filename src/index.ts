/**
 * Copyright (c) 2022, RTE (http://www.rte-france.com)
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

export { NetworkAreaDiagramViewer } from './components/network-area-diagram-viewer/network-area-diagram-viewer';
export type { BranchState } from './components/network-area-diagram-viewer/network-area-diagram-viewer';
export type {
    BusNodeMetadata,
    DiagramMetadata,
    EdgeMetadata,
    LayoutParametersMetadata,
    NodeMetadata,
    SvgParametersMetadata,
    TextNodeMetadata,
} from './components/network-area-diagram-viewer/diagram-metadata';
export type {
    OnMoveNodeCallbackType,
    OnMoveTextNodeCallbackType,
    OnSelectNodeCallbackType,
    OnToggleNadHoverCallbackType,
    OnRightClickCallbackType,
    OnBendLineCallbackType,
    NadViewerParametersOptions,
    NadViewerParameters,
} from './components/network-area-diagram-viewer/nad-viewer-parameters';
export { LayoutParameters } from './components/network-area-diagram-viewer/layout-parameters';
export { SvgParameters } from './components/network-area-diagram-viewer/svg-parameters';
export {
    SingleLineDiagramViewer,
    type OnBreakerCallbackType,
    type OnBusCallbackType,
    type OnFeederCallbackType,
    type OnNextVoltageCallbackType,
    type OnToggleSldHoverCallbackType,
    type SLDMetadata,
    type SLDMetadataComponent,
    type SLDMetadataComponentSize,
    type SLDMetadataNode,
} from './components/single-line-diagram-viewer/single-line-diagram-viewer';

export {
    GeoData,
    LineFlowColorMode,
    LineFlowMode,
    MapEquipments,
    type GeoDataEquipment,
    type GeoDataLine,
    type GeoDataSubstation,
} from '@powsybl/network-map-layers';

export { default as NetworkMap } from './components/network-map-viewer/network/network-map';

export {
    DRAW_EVENT,
    type MenuClickFunction,
    type NetworkMapProps,
    type NetworkMapRef,
} from './components/network-map-viewer/network/network-map';

export { DRAW_MODES } from './components/network-map-viewer/network/draw-control';

export {
    Country,
    EQUIPMENT_TYPES,
    type Coordinate,
    type LonLat,
    type MapAnyLine,
    type MapAnyLineWithType,
    type MapEquipment,
    type MapHvdcLine,
    type MapHvdcLineWithType,
    type MapLine,
    type MapLineWithType,
    type MapSubstation,
    type MapTieLine,
    type MapTieLineWithType,
    type MapVoltageLevel,
} from '@powsybl/network-map-layers';
