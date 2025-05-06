/**
 * Copyright (c) 2024, RTE (http://www.rte-france.com)
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 * SPDX-License-Identifier: MPL-2.0
 */

export interface DiagramMetadata {
    layoutParameters: LayoutParametersMetadata;
    svgParameters: SvgParametersMetadata;
    busNodes: BusNodeMetadata[];
    nodes: NodeMetadata[];
    edges: EdgeMetadata[];
    textNodes: TextNodeMetadata[];
}

export interface LayoutParametersMetadata {
    textNodeEdgeConnectionYShift: number;
}

export interface SvgParametersMetadata {
    diagramPadding: DiagramPaddingMetadata;
    voltageLevelCircleRadius: number;
    interAnnulusSpace: number;
    transformerCircleRadius: number;
    edgesForkAperture: number;
    edgesForkLength: number;
    arrowShift: number;
    arrowLabelShift: number;
    converterStationWidth: number;
    nodeHollowWidth: number;
    unknownBusNodeExtraRadius: number;
    edgeNameDisplayed: boolean;
    fictitiousVoltageLevelCircleRadius: number;
    edgeInfoDisplayed: string;
    powerValuePrecision: number;
    currentValuePrecision: number;
    angleValuePrecision: number;
    voltageValuePrecision: number;
    insertNameDesc: boolean;
    cssLocation: string;
}

export interface DiagramPaddingMetadata {
    left: number;
    top: number;
    right: number;
    bottom: number;
}

export interface BusNodeMetadata {
    svgId: string;
    equipmentId: string;
    nbNeighbours: number;
    index: number;
    vlNode: string;
}

export interface NodeMetadata {
    svgId: string;
    equipmentId: string;
    x: number;
    y: number;
    fictitious?: boolean;
}

export interface EdgeMetadata {
    svgId: string;
    equipmentId: string;
    node1: string;
    node2: string;
    busNode1: string;
    busNode2: string;
    type: string;
    points?: EdgePointMetadata[];
}

export interface EdgePointMetadata {
    x: number;
    y: number;
}

export interface TextNodeMetadata {
    svgId: string;
    equipmentId: string;
    vlNode: string;
    shiftX: number;
    shiftY: number;
    connectionShiftX: number;
    connectionShiftY: number;
}
