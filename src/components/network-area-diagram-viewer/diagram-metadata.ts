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
    injections?: InjectionMetadata[];
    edges: EdgeMetadata[];
    textNodes: TextNodeMetadata[];
}

export interface LayoutParametersMetadata {
    textNodesForceLayout: boolean;
    textNodeFixedShift: PointMetadata;
    textNodeEdgeConnectionYShift: number;
    maxSteps: number;
    timeoutSeconds: number;
    injectionsAdded: boolean;
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
    fictitiousVoltageLevelCircleRadius: number;
    powerValuePrecision: number;
    currentValuePrecision: number;
    angleValuePrecision: number;
    voltageValuePrecision: number;
    insertNameDesc: boolean;
    cssLocation: string;
    arrowPathIn: string;
    arrowPathOut: string;
    svgWidthAndHeightAdded: boolean;
    sizeConstraint: string;
    fixedWidth: number;
    fixedHeight: number;
    fixedScale: number;
    edgeStartShift: number;
    loopDistance: number;
    loopEdgesAperture: number;
    loopControlDistance: number;
    edgeInfoAlongEdge: boolean;
    svgPrefix: string;
    languageTag: string;
    percentageValuePrecision: number;
    pstArrowHeadSize: number;
    undefinedValueSymbol: string;
    highlightGraph: boolean;
    injectionAperture: number;
    injectionEdgeLength: number;
    injectionCircleRadius: number;
    voltageLevelLegendsIncluded: boolean;
    edgeInfosIncluded: boolean;
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
    legend?: string;
}

export interface NodeMetadata {
    svgId: string;
    equipmentId: string;
    x: number;
    y: number;
    fictitious?: boolean;
    legendSvgId?: string;
    legendEdgeSvgId?: string;
    legendHeader?: string[];
    legendFooter?: string[];
}

export interface EdgeMetadata {
    svgId: string;
    equipmentId: string;
    node1: string;
    node2: string;
    busNode1: string;
    busNode2: string;
    type: string;
    bendingPoints?: PointMetadata[];
    edgeInfoMiddle?: EdgeInfoMetadata;
    edgeInfo1?: EdgeInfoMetadata;
    edgeInfo2?: EdgeInfoMetadata;
}

export interface PointMetadata {
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

export interface InjectionMetadata {
    svgId: string;
    equipmentId: string;
    componentType: string;
    busNodeId: string;
    vlNodeId: string;
    edgeInfo: EdgeInfoMetadata;
}

export interface EdgeInfoMetadata {
    svgId: string;
    infoTypeA?: string;
    infoTypeB?: string;
    direction?: string;
    labelA?: string;
    labelB?: string;
}
