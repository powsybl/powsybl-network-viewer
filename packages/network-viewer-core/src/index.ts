/**
 * Copyright (c) 2024, RTE (http://www.rte-france.com)
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

// Network Area Diagram Viewer exports
export { NetworkAreaDiagramViewer } from './network-area-diagram-viewer/network-area-diagram-viewer';
export type { BranchState } from './network-area-diagram-viewer/network-area-diagram-viewer';
export type {
    BusNodeMetadata,
    DiagramMetadata,
    EdgeMetadata,
    LayoutParametersMetadata,
    NodeMetadata,
    SvgParametersMetadata,
    TextNodeMetadata,
} from './network-area-diagram-viewer/diagram-metadata';
export type {
    OnMoveNodeCallbackType,
    OnMoveTextNodeCallbackType,
    OnSelectNodeCallbackType,
    OnToggleNadHoverCallbackType,
    OnRightClickCallbackType,
    OnBendLineCallbackType,
    NadViewerParametersOptions,
    NadViewerParameters,
} from './network-area-diagram-viewer/nad-viewer-parameters';
export { LayoutParameters } from './network-area-diagram-viewer/layout-parameters';
export { SvgParameters } from './network-area-diagram-viewer/svg-parameters';

// Single Line Diagram Viewer exports
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
} from './single-line-diagram-viewer/single-line-diagram-viewer';
