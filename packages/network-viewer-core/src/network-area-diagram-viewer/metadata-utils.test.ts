/**
 * Copyright (c) 2025, RTE (http://www.rte-france.com)
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 * SPDX-License-Identifier: MPL-2.0
 */

import { Point } from '@svgdotjs/svg.js';
import {
    BusNodeMetadata,
    DiagramPaddingMetadata,
    EdgeMetadata,
    NodeMetadata,
    PointMetadata,
    SvgParametersMetadata,
    TextNodeMetadata,
} from './diagram-metadata';
import * as MetadataUtils from './metadata-utils';
import { SvgParameters } from './svg-parameters';
import { EdgeType, ElementType } from './diagram-types';

test('getNodeRadius', () => {
    const diagramPaddingMetadata: DiagramPaddingMetadata = {
        bottom: 0,
        left: 0,
        right: 0,
        top: 0,
    };
    const svgParametersMetadata: SvgParametersMetadata = {
        angleValuePrecision: 0,
        arrowLabelShift: 0,
        arrowPathIn: '',
        arrowPathOut: '',
        arrowShift: 0,
        converterStationWidth: 0,
        cssLocation: '',
        currentValuePrecision: 0,
        diagramPadding: diagramPaddingMetadata,
        edgesForkAperture: 0,
        edgesForkLength: 0,
        insertNameDesc: false,
        interAnnulusSpace: 5,
        nodeHollowWidth: 0,
        powerValuePrecision: 0,
        transformerCircleRadius: 0,
        unknownBusNodeExtraRadius: 0,
        voltageValuePrecision: 0,
        voltageLevelCircleRadius: 30,
        fictitiousVoltageLevelCircleRadius: 15,
        svgWidthAndHeightAdded: false,
        sizeConstraint: '',
        fixedWidth: 0,
        fixedHeight: 0,
        fixedScale: 0,
        edgeStartShift: 0,
        loopDistance: 0,
        loopEdgesAperture: 0,
        loopControlDistance: 0,
        edgeInfoAlongEdge: false,
        svgPrefix: '',
        languageTag: '',
        percentageValuePrecision: 0,
        pstArrowHeadSize: 0,
        undefinedValueSymbol: '',
        highlightGraph: false,
        injectionAperture: 0,
        injectionEdgeLength: 0,
        injectionCircleRadius: 0,
        voltageLevelLegendsIncluded: false,
        edgeInfosIncluded: false,
    };
    const svgParameters = new SvgParameters(svgParametersMetadata);

    const busNode: BusNodeMetadata = {
        equipmentId: '',
        index: 0,
        nbNeighbours: 0,
        svgId: '',
        vlNode: '',
    };
    const node: NodeMetadata = {
        svgId: '4',
        equipmentId: '',
        x: 0,
        y: 0,
    };
    let nodeRadius = MetadataUtils.getNodeRadius(busNode, node, svgParameters);
    expect(nodeRadius.busInnerRadius).toBe(0);
    expect(nodeRadius.busOuterRadius).toBe(27.5);
    expect(nodeRadius.voltageLevelRadius).toBe(30);

    busNode.nbNeighbours = 1;
    nodeRadius = MetadataUtils.getNodeRadius(busNode, node, svgParameters);
    expect(nodeRadius.busInnerRadius).toBe(0);
    expect(nodeRadius.busOuterRadius).toBe(27.5);
    expect(nodeRadius.voltageLevelRadius).toBe(60);

    busNode.index = 1;
    nodeRadius = MetadataUtils.getNodeRadius(busNode, node, svgParameters);
    expect(nodeRadius.busInnerRadius).toBe(32.5);
    expect(nodeRadius.busOuterRadius).toBe(57.5);
    expect(nodeRadius.voltageLevelRadius).toBe(60);

    busNode.nbNeighbours = 2;
    busNode.index = 0;
    nodeRadius = MetadataUtils.getNodeRadius(busNode, node, svgParameters);
    expect(nodeRadius.busInnerRadius).toBe(0);
    expect(nodeRadius.busOuterRadius).toBe(17.5);
    expect(nodeRadius.voltageLevelRadius).toBe(60);

    busNode.index = 1;
    nodeRadius = MetadataUtils.getNodeRadius(busNode, node, svgParameters);
    expect(nodeRadius.busInnerRadius).toBe(22.5);
    expect(nodeRadius.busOuterRadius).toBe(37.5);
    expect(nodeRadius.voltageLevelRadius).toBe(60);

    busNode.index = 2;
    nodeRadius = MetadataUtils.getNodeRadius(busNode, node, svgParameters);
    expect(nodeRadius.busInnerRadius).toBe(42.5);
    expect(nodeRadius.busOuterRadius).toBe(57.5);
    expect(nodeRadius.voltageLevelRadius).toBe(60);
});

test('getSortedBusNodes', () => {
    const bus1: BusNodeMetadata = {
        svgId: '4',
        equipmentId: 'VL2_0',
        nbNeighbours: 2,
        index: 0,
        vlNode: '3',
    };
    const bus2: BusNodeMetadata = {
        svgId: '5',
        equipmentId: 'VL2_1',
        nbNeighbours: 2,
        index: 1,
        vlNode: '3',
    };
    const bus3: BusNodeMetadata = {
        svgId: '6',
        equipmentId: 'VL2_2',
        nbNeighbours: 2,
        index: 2,
        vlNode: '3',
    };
    let sorteBus: BusNodeMetadata[] = MetadataUtils.getSortedBusNodes([bus1, bus3, bus2]);
    expect(sorteBus[0].index).toBe(0);
    expect(sorteBus[1].index).toBe(1);
    expect(sorteBus[2].index).toBe(2);
    sorteBus = MetadataUtils.getSortedBusNodes([bus2, bus3, bus1]);
    expect(sorteBus[0].index).toBe(0);
    expect(sorteBus[1].index).toBe(1);
    expect(sorteBus[2].index).toBe(2);
});

test('getGroupedEdgesIndexKey', () => {
    const edges: EdgeMetadata[] = [
        {
            svgId: '4',
            equipmentId: 'VL1L1VL2',
            node1: '0',
            node2: '2',
            busNode1: '1',
            busNode2: '3',
            type: 'LineEdge',
        },
        {
            svgId: '5',
            equipmentId: 'VL1L2VL2',
            node1: '2',
            node2: '0',
            busNode1: '3',
            busNode2: '1',
            type: 'LineEdge',
        },
        {
            svgId: '11',
            equipmentId: 'VL3L1VL4',
            node1: '4',
            node2: '0',
            busNode1: '7',
            busNode2: '5',
            type: 'LineEdge',
        },
    ];
    expect(MetadataUtils.getGroupedEdgesIndexKey(edges[0])).toBe('0_2');
    expect(MetadataUtils.getGroupedEdgesIndexKey(edges[1])).toBe('0_2');
    expect(MetadataUtils.getGroupedEdgesIndexKey(edges[2])).toBe('0_4');
});

test('getNodeMove', () => {
    const node: NodeMetadata = {
        svgId: '0',
        equipmentId: 'VLGEN',
        x: -452.59,
        y: -274.01,
    };
    const nodePosition = new Point(-395.1338734, -352.76892014);
    const nodeMove = MetadataUtils.getNodeMove(node, nodePosition);
    expect(nodeMove.xOrig).toBe(-452.59);
    expect(nodeMove.yOrig).toBe(-274.01);
    expect(nodeMove.xNew).toBe(-395.13);
    expect(nodeMove.yNew).toBe(-352.77);
});

test('getTextNodeMoves', () => {
    const textNode: TextNodeMetadata = {
        svgId: '0-textnode',
        equipmentId: 'VLGEN',
        vlNode: '0',
        shiftX: 100.0,
        shiftY: -40.0,
        connectionShiftX: 100.0,
        connectionShiftY: -15.0,
    };
    const node: NodeMetadata = {
        svgId: '0',
        equipmentId: 'VLGEN',
        x: -452.59,
        y: -274.01,
    };
    const textPosition = new Point(-295.1338734, -352.76892014);
    const connectionPosition = new Point(-295.1338734, -327.76892014);
    const textNodeMove = MetadataUtils.getTextNodeMoves(textNode, node, textPosition, connectionPosition);
    expect(textNodeMove[0].xOrig).toBe(100);
    expect(textNodeMove[0].yOrig).toBe(-40);
    expect(textNodeMove[0].xNew).toBe(157.46);
    expect(textNodeMove[0].yNew).toBe(-78.76);
    expect(textNodeMove[1].xOrig).toBe(100);
    expect(textNodeMove[1].yOrig).toBe(-15);
    expect(textNodeMove[1].xNew).toBe(157.46);
    expect(textNodeMove[1].yNew).toBe(-53.76);
});

test('getRightClickableElementData', () => {
    const nodes: NodeMetadata[] = [
        {
            svgId: '0',
            equipmentId: 'VLGEN',
            x: -452.59,
            y: -274.01,
        },
        {
            svgId: '2',
            equipmentId: 'VLHV1',
            x: -245.26,
            y: 34.3,
        },
    ];
    const textNodes: TextNodeMetadata[] = [
        {
            svgId: '0-textnode',
            equipmentId: 'VLGEN',
            vlNode: '0',
            shiftX: 100.0,
            shiftY: -40.0,
            connectionShiftX: 100.0,
            connectionShiftY: -15.0,
        },
        {
            svgId: '2-textnode',
            equipmentId: 'VLHV1',
            vlNode: '2',
            shiftX: 100.0,
            shiftY: -40.0,
            connectionShiftX: 100.0,
            connectionShiftY: -15.0,
        },
    ];
    const edges: EdgeMetadata[] = [
        {
            svgId: '15',
            equipmentId: 'L6-4-0',
            node1: '12',
            node2: '0',
            busNode1: '13',
            busNode2: '2',
            type: 'LineEdge',
        },
        {
            svgId: '16',
            equipmentId: 'T4-1-0',
            node1: '0',
            node2: '0',
            busNode1: '2',
            busNode2: '1',
            type: 'TwoWtEdge',
        },
    ];
    let elementData = MetadataUtils.getRightClickableElementData(
        '0',
        ElementType.VOLTAGE_LEVEL,
        nodes,
        textNodes,
        edges
    );
    expect(elementData?.svgId).toBe('0');
    expect(elementData?.equipmentId).toBe('VLGEN');
    expect(elementData?.type).toBe(ElementType[ElementType.VOLTAGE_LEVEL]);
    elementData = MetadataUtils.getRightClickableElementData(
        '0-textnode',
        ElementType.TEXT_NODE,
        nodes,
        textNodes,
        edges
    );
    expect(elementData?.svgId).toBe('0-textnode');
    expect(elementData?.equipmentId).toBe('VLGEN');
    expect(elementData?.type).toBe(ElementType[ElementType.TEXT_NODE]);
    elementData = MetadataUtils.getRightClickableElementData('16', ElementType.BRANCH, nodes, textNodes, edges);
    expect(elementData?.svgId).toBe('16');
    expect(elementData?.equipmentId).toBe('T4-1-0');
    expect(elementData?.type).toBe(EdgeType[EdgeType.TWO_WINDINGS_TRANSFORMER]);
});

test('getViewBox', () => {
    const nodes: NodeMetadata[] = [
        {
            svgId: '0',
            equipmentId: 'VL1',
            x: -500.0,
            y: 0.0,
        },
        {
            svgId: '1',
            equipmentId: 'VL2',
            x: 0,
            y: -500.0,
        },
        {
            svgId: '2',
            equipmentId: 'VL3',
            x: 500.0,
            y: 0.0,
        },
        {
            svgId: '3',
            equipmentId: 'VL4',
            x: 0,
            y: 500.0,
        },
    ];
    const textNodes: TextNodeMetadata[] = [
        {
            svgId: '0-textnode',
            equipmentId: 'VL1',
            vlNode: '0',
            shiftX: 100.0,
            shiftY: -40.0,
            connectionShiftX: 100.0,
            connectionShiftY: -15.0,
        },
        {
            svgId: '1-textnode',
            equipmentId: 'VL2',
            vlNode: '1',
            shiftX: 100.0,
            shiftY: -40.0,
            connectionShiftX: 100.0,
            connectionShiftY: -15.0,
        },
        {
            svgId: '2-textnode',
            equipmentId: 'VL3',
            vlNode: '2',
            shiftX: 100.0,
            shiftY: -40.0,
            connectionShiftX: 100.0,
            connectionShiftY: -15.0,
        },
        {
            svgId: '3-textnode',
            equipmentId: 'VL4',
            vlNode: '3',
            shiftX: 100.0,
            shiftY: -40.0,
            connectionShiftX: 100.0,
            connectionShiftY: -15.0,
        },
    ];
    const viewBox = MetadataUtils.getViewBox(nodes, textNodes, new SvgParameters(undefined));
    expect(viewBox.x).toBe(-700);
    expect(viewBox.y).toBe(-740);
    expect(viewBox.width).toBe(1700);
    expect(viewBox.height).toBe(1500);
});

test('getBendableLines', () => {
    const edges: EdgeMetadata[] = [
        {
            svgId: '100',
            equipmentId: 'L15-37-1',
            node1: '36',
            node2: '0',
            busNode1: '39',
            busNode2: '5',
            invisible2: true,
            type: 'LineEdge',
        },
        {
            svgId: '103',
            equipmentId: 'L37-38-1',
            node1: '0',
            node2: '41',
            busNode1: '5',
            busNode2: '44',
            invisible1: true,
            type: 'LineEdge',
        },
        {
            svgId: '181',
            equipmentId: 'L9006-9007-1',
            node1: '21',
            node2: '26',
            busNode1: '24',
            busNode2: '29',
            type: 'LineEdge',
        },
        {
            svgId: '178',
            equipmentId: 'T9003-9038-1',
            node1: '13',
            node2: '77',
            busNode1: '20',
            busNode2: '86',
            type: 'TwoWtEdge',
        },
    ];

    const lines = MetadataUtils.getBendableLines(edges);
    expect(lines.length).toBe(1);
    expect(lines[0].svgId).toBe('181');
});

test('addPointToList', () => {
    const node1 = new Point(25, 0);
    const node2 = new Point(100, 100);

    const edge: EdgeMetadata = {
        svgId: '77',
        equipmentId: 'L9006-9007-1',
        node1: '7',
        node2: '10',
        busNode1: '8',
        busNode2: '11',
        type: 'LineEdge',
    };
    let bendPoint = new Point(75, 75);
    let linePoints = MetadataUtils.addPointToList(edge.bendingPoints?.slice(), node1, node2, bendPoint);
    expect(linePoints.index).toBe(0);
    expect(linePoints.linePoints.length).toBe(1);
    expect(linePoints.linePoints[0].x).toBe(75);
    expect(linePoints.linePoints[0].y).toBe(75);

    edge.bendingPoints = [{ x: 75, y: 75 }];
    bendPoint = new Point(90, 90);
    linePoints = MetadataUtils.addPointToList(edge.bendingPoints.slice(), node1, node2, bendPoint);
    expect(linePoints.index).toBe(1);
    expect(linePoints.linePoints.length).toBe(2);
    expect(linePoints.linePoints[0].x).toBe(75);
    expect(linePoints.linePoints[0].y).toBe(75);
    expect(linePoints.linePoints[1].x).toBe(90);
    expect(linePoints.linePoints[1].y).toBe(90);

    edge.bendingPoints.push({ x: 90, y: 90 });
    bendPoint = new Point(80, 80);
    linePoints = MetadataUtils.addPointToList(edge.bendingPoints.slice(), node1, node2, bendPoint);
    expect(linePoints.index).toBe(1);
    expect(linePoints.linePoints.length).toBe(3);
    expect(linePoints.linePoints[0].x).toBe(75);
    expect(linePoints.linePoints[0].y).toBe(75);
    expect(linePoints.linePoints[1].x).toBe(80);
    expect(linePoints.linePoints[1].y).toBe(80);
    expect(linePoints.linePoints[2].x).toBe(90);
    expect(linePoints.linePoints[2].y).toBe(90);
});

test('getEdgePoints', () => {
    const edgeStart1 = new Point(0, 0);
    const edgeStart2 = new Point(1000, 0);
    const edgeEnd1 = new Point(0, 0);
    const edgeEnd2 = new Point(0, 0);

    const pointsMetadata: PointMetadata[] = [];
    let edgePoints = MetadataUtils.getEdgePoints(
        edgeStart1,
        undefined,
        edgeEnd1,
        edgeStart2,
        undefined,
        edgeEnd2,
        pointsMetadata.slice()
    );
    expect(edgePoints[0].length).toBe(2);
    expect(edgePoints[0][0].x).toBe(0);
    expect(edgePoints[0][0].y).toBe(0);
    expect(edgePoints[0][1].x).toBe(500);
    expect(edgePoints[0][1].y).toBe(0);
    expect(edgePoints[1].length).toBe(2);
    expect(edgePoints[1][0].x).toBe(1000);
    expect(edgePoints[1][0].y).toBe(0);
    expect(edgePoints[1][1].x).toBe(500);
    expect(edgePoints[1][1].y).toBe(0);

    pointsMetadata.push({ x: 100, y: 0 });
    edgePoints = MetadataUtils.getEdgePoints(
        edgeStart1,
        undefined,
        edgeEnd1,
        edgeStart2,
        undefined,
        edgeEnd2,
        pointsMetadata.slice()
    );
    expect(edgePoints[0].length).toBe(3);
    expect(edgePoints[0][0].x).toBe(0);
    expect(edgePoints[0][0].y).toBe(0);
    expect(edgePoints[0][1].x).toBe(100);
    expect(edgePoints[0][1].y).toBe(0);
    expect(edgePoints[0][2].x).toBe(500);
    expect(edgePoints[0][2].y).toBe(0);
    expect(edgePoints[1].length).toBe(2);
    expect(edgePoints[1][0].x).toBe(1000);
    expect(edgePoints[1][0].y).toBe(0);
    expect(edgePoints[1][1].x).toBe(500);
    expect(edgePoints[1][1].y).toBe(0);

    pointsMetadata.push({ x: 300, y: 0 });
    edgePoints = MetadataUtils.getEdgePoints(
        edgeStart1,
        undefined,
        edgeEnd1,
        edgeStart2,
        undefined,
        edgeEnd2,
        pointsMetadata.slice()
    );
    expect(edgePoints[0].length).toBe(4);
    expect(edgePoints[0][0].x).toBe(0);
    expect(edgePoints[0][0].y).toBe(0);
    expect(edgePoints[0][1].x).toBe(100);
    expect(edgePoints[0][1].y).toBe(0);
    expect(edgePoints[0][2].x).toBe(300);
    expect(edgePoints[0][2].y).toBe(0);
    expect(edgePoints[0][3].x).toBe(500);
    expect(edgePoints[0][3].y).toBe(0);
    expect(edgePoints[1].length).toBe(2);
    expect(edgePoints[1][0].x).toBe(1000);
    expect(edgePoints[1][0].y).toBe(0);
    expect(edgePoints[1][1].x).toBe(500);
    expect(edgePoints[1][1].y).toBe(0);

    pointsMetadata.push({ x: 600, y: 0 });
    edgePoints = MetadataUtils.getEdgePoints(
        edgeStart1,
        undefined,
        edgeEnd1,
        edgeStart2,
        undefined,
        edgeEnd2,
        pointsMetadata.slice()
    );
    expect(edgePoints[0].length).toBe(4);
    expect(edgePoints[0][0].x).toBe(0);
    expect(edgePoints[0][0].y).toBe(0);
    expect(edgePoints[0][1].x).toBe(100);
    expect(edgePoints[0][1].y).toBe(0);
    expect(edgePoints[0][2].x).toBe(300);
    expect(edgePoints[0][2].y).toBe(0);
    expect(edgePoints[0][3].x).toBe(500);
    expect(edgePoints[0][3].y).toBe(0);
    expect(edgePoints[1].length).toBe(3);
    expect(edgePoints[1][0].x).toBe(1000);
    expect(edgePoints[1][0].y).toBe(0);
    expect(edgePoints[1][1].x).toBe(600);
    expect(edgePoints[1][1].y).toBe(0);
    expect(edgePoints[1][2].x).toBe(500);
    expect(edgePoints[1][2].y).toBe(0);
});

test('getEdgeType', () => {
    const edge: EdgeMetadata = {
        svgId: '8',
        equipmentId: 'NGEN_NHV1',
        node1: '0',
        node2: '2',
        busNode1: '1',
        busNode2: '3',
        type: 'TwoWtEdge',
    };
    expect(MetadataUtils.getEdgeType(edge)).toBe(EdgeType.TWO_WINDINGS_TRANSFORMER);
    expect(MetadataUtils.getStringEdgeType(edge)).toBe('TWO_WINDINGS_TRANSFORMER');
});
