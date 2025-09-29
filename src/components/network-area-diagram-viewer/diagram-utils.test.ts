/**
 * Copyright (c) 2024, RTE (http://www.rte-france.com)
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 * SPDX-License-Identifier: MPL-2.0
 */

import * as DiagramUtils from './diagram-utils';
import { EdgeMetadata, BusNodeMetadata, NodeMetadata, TextNodeMetadata, EdgePointMetadata } from './diagram-metadata';
import { SVG, Point } from '@svgdotjs/svg.js';
import { SvgParameters } from './svg-parameters';

test('getFormattedValue', () => {
    expect(DiagramUtils.getFormattedValue(12)).toBe('12.00');
    expect(DiagramUtils.getFormattedValue(7.417)).toBe('7.42');
    expect(DiagramUtils.getFormattedValue(145.9532834)).toBe('145.95');
});

test('getFormattedPoint', () => {
    expect(DiagramUtils.getFormattedPoint(new Point(144, 34.836))).toBe('144.00,34.84');
});

test('getFormattedPolyline', () => {
    expect(DiagramUtils.getFormattedPolyline(new Point(144, 34.836), null, new Point(213.892, 74))).toBe(
        '144.00,34.84 213.89,74.00'
    );
    expect(
        DiagramUtils.getFormattedPolyline(new Point(144, 34.836), new Point(192.83, 55.1475), new Point(213.892, 74))
    ).toBe('144.00,34.84 192.83,55.15 213.89,74.00');
});

test('degToRad', () => {
    expect(DiagramUtils.degToRad(60)).toBe(1.0471975511965976);
});

test('radToDeg', () => {
    expect(DiagramUtils.radToDeg(1.0471975511965976)).toBeCloseTo(60, 3);
});

test('round', () => {
    expect(DiagramUtils.round(147.672)).toBe(147.67);
    expect(DiagramUtils.round(8.7)).toBe(8.7);
    expect(DiagramUtils.round(19.2894)).toBe(19.29);
    expect(DiagramUtils.round(643)).toBe(643);
});

test('getMidPosition', () => {
    const midPoint = DiagramUtils.getMidPosition(new Point(10.46, 5.818), new Point(45.24, 90.122));
    expect(midPoint.x).toBe(27.85);
    expect(midPoint.y).toBe(47.97);
});

test('getPointAtDistance', () => {
    const pointAtDistance = DiagramUtils.getPointAtDistance(new Point(10, 10), new Point(36, 48), 30);
    expect(pointAtDistance.x).toBeCloseTo(26.94, 2);
    expect(pointAtDistance.y).toBeCloseTo(34.76, 2);
});

test('getAngle', () => {
    expect(DiagramUtils.getAngle(new Point(10, 10), new Point(50, 50))).toBe(0.7853981633974483);
    expect(DiagramUtils.getAngle(new Point(10, 10), new Point(10, 50))).toBe(1.5707963267948966);
    expect(DiagramUtils.getAngle(new Point(10, 10), new Point(50, 10))).toBe(0);
    expect(DiagramUtils.getAngle(new Point(50, 50), new Point(10, 10))).toBe(-2.356194490192345);
});

test('getArrowAngle', () => {
    expect(DiagramUtils.getArrowAngle(new Point(10, 10), new Point(50, 50))).toBe(135);
    expect(DiagramUtils.getArrowAngle(new Point(10, 10), new Point(10, 50))).toBe(180);
    expect(DiagramUtils.getArrowAngle(new Point(10, 10), new Point(50, 10))).toBe(90);
    expect(DiagramUtils.getArrowAngle(new Point(50, 50), new Point(10, 10))).toBe(-45);
});

test('getLabelData', () => {
    const labelData = DiagramUtils.getLabelData(new Point(10, 10), new Point(50, 50), 19);
    expect(labelData[0]).toBe(45);
    expect(labelData[1]).toBe(19);
    expect(labelData[2]).toBeNull();
    const flippedLabelData = DiagramUtils.getLabelData(new Point(10, 10), new Point(-30, 50), 19);
    expect(flippedLabelData[0]).toBe(-45);
    expect(flippedLabelData[1]).toBe(-19);
    expect(flippedLabelData[2]).toBe('text-anchor:end');
});

test('getEdgeFork', () => {
    const edgeFork = DiagramUtils.getEdgeFork(new Point(10, 10), 80, 0.2618);
    expect(edgeFork.x).toBeCloseTo(87.274, 3);
    expect(edgeFork.y).toBeCloseTo(30.7055, 3);
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
    expect(DiagramUtils.getEdgeType(edge)).toBe(DiagramUtils.EdgeType.TWO_WINDINGS_TRANSFORMER);
    expect(DiagramUtils.getStringEdgeType(edge)).toBe('TWO_WINDINGS_TRANSFORMER');
});

test('getTransformerArrowMatrixString', () => {
    expect(
        DiagramUtils.getTransformerArrowMatrixString(new Point(10, 10), new Point(110, 110), new Point(60, 60), 20)
    ).toBe('0.71,0.71,-0.71,0.71,60.00,17.57');
});

test('getConverterStationPolyline', () => {
    expect(
        DiagramUtils.getConverterStationPolyline(
            new Point(10, 10),
            new Point(110, 110),
            new Point(210, 210),
            new Point(60, 60),
            70
        )
    ).toBe('85.25,85.25 84.75,84.75');
});

test('getDraggableFrom', () => {
    let draggagleElement = DiagramUtils.getDraggableFrom(getSvgNode());
    expect(draggagleElement).not.toBeUndefined();
    draggagleElement = DiagramUtils.getDraggableFrom(getSvgTextNode());
    expect(draggagleElement).not.toBeUndefined();
    draggagleElement = DiagramUtils.getDraggableFrom(getSvgLoopEdge());
    expect(draggagleElement).toBeUndefined();
});

test('getSelectableFrom', () => {
    let selectableElement = DiagramUtils.getSelectableFrom(getSvgNode());
    expect(selectableElement).not.toBeUndefined();
    selectableElement = DiagramUtils.getSelectableFrom(getSvgTextNode());
    expect(selectableElement).toBeUndefined();
    selectableElement = DiagramUtils.getSelectableFrom(getSvgLoopEdge());
    expect(selectableElement).toBeUndefined();
});

test('getVoltageLevelCircleRadius', () => {
    expect(DiagramUtils.getVoltageLevelCircleRadius(0, 30)).toBe(30);
    expect(DiagramUtils.getVoltageLevelCircleRadius(1, 30)).toBe(60);
    expect(DiagramUtils.getVoltageLevelCircleRadius(2, 30)).toBe(60);
});

test('getNodeRadius', () => {
    let nodeRadius = DiagramUtils.getNodeRadius(0, 30, 0, 5);
    expect(nodeRadius[0]).toBe(0);
    expect(nodeRadius[1]).toBe(27.5);
    expect(nodeRadius[2]).toBe(30);
    nodeRadius = DiagramUtils.getNodeRadius(1, 30, 0, 5);
    expect(nodeRadius[0]).toBe(0);
    expect(nodeRadius[1]).toBe(27.5);
    expect(nodeRadius[2]).toBe(60);
    nodeRadius = DiagramUtils.getNodeRadius(1, 30, 1, 5);
    expect(nodeRadius[0]).toBe(32.5);
    expect(nodeRadius[1]).toBe(57.5);
    expect(nodeRadius[2]).toBe(60);
    nodeRadius = DiagramUtils.getNodeRadius(2, 30, 0, 5);
    expect(nodeRadius[0]).toBe(0);
    expect(nodeRadius[1]).toBe(17.5);
    expect(nodeRadius[2]).toBe(60);
    nodeRadius = DiagramUtils.getNodeRadius(2, 30, 1, 5);
    expect(nodeRadius[0]).toBe(22.5);
    expect(nodeRadius[1]).toBe(37.5);
    expect(nodeRadius[2]).toBe(60);
    nodeRadius = DiagramUtils.getNodeRadius(2, 30, 2, 5);
    expect(nodeRadius[0]).toBe(42.5);
    expect(nodeRadius[1]).toBe(57.5);
    expect(nodeRadius[2]).toBe(60);
});

test('getFragmentedAnnulusPath', () => {
    expect(DiagramUtils.getFragmentedAnnulusPath([-2.38, 0.75, 1.4], [42.5, 57.5, 60], 15)).toBe(
        'M-36.101,-44.755 A57.500,57.500 164.389 0 1 46.813,33.389 L35.700,23.061 A42.500,42.500 -159.114 0 0 -25.132,-34.273 Z M36.617,44.333 A57.500,57.500 22.296 0 1 17.060,54.911 L14.464,39.963 A42.500,42.500 -17.020 0 0 25.528,33.979 Z '
    );
});

test('getPolylinePoints', () => {
    const points = DiagramUtils.getPolylinePoints(getSvgPolyline());
    expect(points?.length).toBe(2);
    expect(points?.at(0)?.x).toBe(173.73);
    expect(points?.at(0)?.y).toBe(100.97);
    expect(points?.at(1)?.x).toBe(-8.21);
    expect(points?.at(1)?.y).toBe(-210.51);
});

test('getPolylineAngle', () => {
    const angle = DiagramUtils.radToDeg(DiagramUtils.getPolylineAngle(getSvgPolyline()) ?? 0);
    expect(angle).toBeCloseTo(-120, 0);
});

test('getPathAngle', () => {
    const angle = DiagramUtils.radToDeg(DiagramUtils.getPathAngle(getSvgPath()) ?? 0);
    expect(angle).toBeCloseTo(-51, 0);
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
    let sorteBus: BusNodeMetadata[] = DiagramUtils.getSortedBusNodes([bus1, bus3, bus2]);
    expect(sorteBus[0].index).toBe(0);
    expect(sorteBus[1].index).toBe(1);
    expect(sorteBus[2].index).toBe(2);
    sorteBus = DiagramUtils.getSortedBusNodes([bus2, bus3, bus1]);
    expect(sorteBus[0].index).toBe(0);
    expect(sorteBus[1].index).toBe(1);
    expect(sorteBus[2].index).toBe(2);
});

test('getBoundarySemicircle', () => {
    expect(DiagramUtils.getBoundarySemicircle(1.0471975511965976, 60)).toBe(
        'M51.962,-30.000 A60.000,60.000 180.000 0 1 -51.962,30.000'
    );
});

test('getEdgeNameAngle', () => {
    expect(DiagramUtils.getEdgeNameAngle(new Point(60, 60), new Point(110, 110))).toBe(45);
    expect(DiagramUtils.getEdgeNameAngle(new Point(60, 60), new Point(10, 110))).toBe(-45);
});

test('isTextNode', () => {
    const isTextNode = DiagramUtils.isTextNode(getSvgTextNode());
    expect(isTextNode).toBe(true);
});

test('getTextNodeId', () => {
    expect(DiagramUtils.getTextNodeId('1')).toBe('1-textnode');
});

test('getTextEdgeId', () => {
    expect(DiagramUtils.getTextEdgeId('1')).toBe('1-textedge');
});

test('getVoltageLevelNodeId', () => {
    expect(DiagramUtils.getVoltageLevelNodeId('1-textnode')).toBe('1');
});

test('getTextEdgeEnd', () => {
    let textEdgeEnd = DiagramUtils.getTextEdgeEnd(new Point(110, 110), new Point(60, 60), 25, 50, 80);
    expect(textEdgeEnd.x).toBe(110);
    expect(textEdgeEnd.y).toBe(135);
    textEdgeEnd = DiagramUtils.getTextEdgeEnd(new Point(110, 10), new Point(60, 60), 25, 50, 80);
    expect(textEdgeEnd.x).toBe(110);
    expect(textEdgeEnd.y).toBe(35);
    textEdgeEnd = DiagramUtils.getTextEdgeEnd(new Point(10, 10), new Point(60, 60), 25, 50, 80);
    expect(textEdgeEnd.x).toBe(35);
    expect(textEdgeEnd.y).toBe(60);
    textEdgeEnd = DiagramUtils.getTextEdgeEnd(new Point(10, 110), new Point(60, 60), 25, 50, 80);
    expect(textEdgeEnd.x).toBe(35);
    expect(textEdgeEnd.y).toBe(110);
});

test('getTextNodeSize', () => {
    // In the tests, the scrollWidth and scrollHeight of the foreignObject's div elements are not correctly detected.
    // We have to mock them to test the getTextNodeSize function.

    // Mock the SVGGraphicsElement and its scroll dimensions
    const mockGetSvgTextNode = getSvgTextNode();

    // Mock the scrollWidth and scrollHeight
    Object.defineProperty(mockGetSvgTextNode, 'scrollWidth', { value: 100, writable: true });
    Object.defineProperty(mockGetSvgTextNode, 'scrollHeight', { value: 50, writable: true });

    const textNodeSize = DiagramUtils.getTextNodeSize(mockGetSvgTextNode);
    expect(textNodeSize.height).toBe(50);
    expect(textNodeSize.width).toBe(100);
});

test('getTextNodeTopLeftCornerFromCenter', () => {
    // In the tests, the scrollWidth and scrollHeight of the foreignObject's div elements are not correctly detected.
    // We have to mock them to test the getTextNodeTopLeftCornerFromCenter function.

    // Mock the SVGGraphicsElement and its scroll dimensions
    const mockGetSvgTextNode = getSvgTextNode();

    // Mock the scrollWidth and scrollHeight
    Object.defineProperty(mockGetSvgTextNode, 'scrollWidth', { value: 100, writable: true });
    Object.defineProperty(mockGetSvgTextNode, 'scrollHeight', { value: 50, writable: true });

    const textNodeTopLeftCorner = DiagramUtils.getTextNodeTopLeftCornerFromCenter(
        mockGetSvgTextNode,
        new Point(240, -310)
    );
    expect(textNodeTopLeftCorner.x).toBe(240 - 100 / 2);
    expect(textNodeTopLeftCorner.y).toBe(-310 - 50 / 2);
});

test('getTextNodeCenterFromTopLeftCorner', () => {
    // In the tests, the scrollWidth and scrollHeight of the foreignObject's div elements are not correctly detected.
    // We have to mock them to test the getTextNodeCenterFromTopLeftCorner function.

    // Mock the SVGGraphicsElement and its scroll dimensions
    const mockGetSvgTextNode = getSvgTextNode();

    // Mock the scrollWidth and scrollHeight
    Object.defineProperty(mockGetSvgTextNode, 'scrollWidth', { value: 100, writable: true });
    Object.defineProperty(mockGetSvgTextNode, 'scrollHeight', { value: 50, writable: true });

    const textNodeCenter = DiagramUtils.getTextNodeCenterFromTopLeftCorner(mockGetSvgTextNode, new Point(290, -285));
    expect(textNodeCenter.x).toBe(290 + 100 / 2);
    expect(textNodeCenter.y).toBe(-285 + 50 / 2);
});

test('getTextNodeTranslatedPosition', () => {
    const textNodePosition = DiagramUtils.getTextNodeTranslatedPosition(getSvgTextNode(), new Point(10, 10));
    expect(textNodePosition.x).toBe(-343);
    expect(textNodePosition.y).toBe(-304);
});

test('getTextNodePosition', () => {
    const textNodePosition = DiagramUtils.getTextNodePosition(getSvgTextNode());
    expect(textNodePosition.x).toBe(-353);
    expect(textNodePosition.y).toBe(-314);
});

test('getNodeMove', () => {
    const node: NodeMetadata = {
        svgId: '0',
        equipmentId: 'VLGEN',
        x: -452.59,
        y: -274.01,
    };
    const nodePosition = new Point(-395.1338734, -352.76892014);
    const nodeMove = DiagramUtils.getNodeMove(node, nodePosition);
    expect(nodeMove.xOrig).toBe(-452.59);
    expect(nodeMove.yOrig).toBe(-274.01);
    expect(nodeMove.xNew).toBe(-395.13);
    expect(nodeMove.yNew).toBe(-352.77);
});

test('getHoverableFrom', () => {
    let hoverableElement = DiagramUtils.getHoverableFrom(getSvgNode());
    expect(hoverableElement).not.toBeUndefined();
    hoverableElement = DiagramUtils.getHoverableFrom(getSvgTextNode());
    expect(hoverableElement).not.toBeUndefined();
    hoverableElement = DiagramUtils.getHoverableFrom(getSvgLoopEdge());
    expect(hoverableElement).not.toBeUndefined();
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
    const textNodeMove = DiagramUtils.getTextNodeMoves(textNode, node, textPosition, connectionPosition);
    expect(textNodeMove[0].xOrig).toBe(100);
    expect(textNodeMove[0].yOrig).toBe(-40);
    expect(textNodeMove[0].xNew).toBe(157.46);
    expect(textNodeMove[0].yNew).toBe(-78.76);
    expect(textNodeMove[1].xOrig).toBe(100);
    expect(textNodeMove[1].yOrig).toBe(-15);
    expect(textNodeMove[1].xNew).toBe(157.46);
    expect(textNodeMove[1].yNew).toBe(-53.76);
});

test('getArrowClass', () => {
    expect(DiagramUtils.getArrowClass(12)).toBe('nad-state-out');
    expect(DiagramUtils.getArrowClass(-12)).toBe('nad-state-in');
});

test('isVlNodeFictitious', () => {
    const nodes: NodeMetadata[] = [
        {
            svgId: '0',
            equipmentId: 'vl',
            x: 189.53,
            y: 123.47,
        },
        {
            svgId: '2',
            equipmentId: 'vl2',
            x: -171.8,
            y: 131.88,
            fictitious: true,
        },
    ];
    expect(DiagramUtils.isVlNodeFictitious('0', nodes)).toBe(false);
    expect(DiagramUtils.isVlNodeFictitious('2', nodes)).toBe(true);
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
    let elementData = DiagramUtils.getRightClickableElementData(getSvgNode(), nodes, textNodes, edges);
    expect(elementData?.svgId).toBe('0');
    expect(elementData?.equipmentId).toBe('VLGEN');
    expect(elementData?.type).toBe(DiagramUtils.ElementType[DiagramUtils.ElementType.VOLTAGE_LEVEL]);
    elementData = DiagramUtils.getRightClickableElementData(getSvgTextNode(), nodes, textNodes, edges);
    expect(elementData?.svgId).toBe('0-textnode');
    expect(elementData?.equipmentId).toBe('VLGEN');
    expect(elementData?.type).toBe(DiagramUtils.ElementType[DiagramUtils.ElementType.TEXT_NODE]);
    elementData = DiagramUtils.getRightClickableElementData(getSvgLoopEdge(), nodes, textNodes, edges);
    expect(elementData?.svgId).toBe('16');
    expect(elementData?.equipmentId).toBe('T4-1-0');
    expect(elementData?.type).toBe(DiagramUtils.EdgeType[DiagramUtils.EdgeType.TWO_WINDINGS_TRANSFORMER]);
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
    const viewBox = DiagramUtils.getViewBox(nodes, textNodes, new SvgParameters(undefined));
    expect(viewBox.x).toBe(-700);
    expect(viewBox.y).toBe(-740);
    expect(viewBox.width).toBe(1700);
    expect(viewBox.height).toBe(1500);
});

test('getStyle', () => {
    const expectedStyle =
        '.nad-branch-edges .nad-edge-path, .nad-3wt-edges .nad-edge-path {stroke: var(--nad-vl-color, lightgrey); stroke-width: 5; fill: none;}\n' +
        '.nad-branch-edges .nad-winding, .nad-3wt-nodes .nad-winding {stroke: var(--nad-vl-color, lightgrey); stroke-width: 5; fill: none;}';
    const styleEl = document.createElement('style');
    styleEl.innerHTML = expectedStyle + '\n.nad-text-edges {stroke: black; stroke-width: 3; stroke-dasharray: 6,7}';
    document.head.appendChild(styleEl);
    const style = DiagramUtils.getStyle(document.styleSheets, getSvgLoopEdge());
    expect(style.textContent).toBe(expectedStyle);
});

test('getBendableFrom', () => {
    let bendableElement = DiagramUtils.getBendableFrom(getSvgNode());
    expect(bendableElement).toBeUndefined();
    bendableElement = DiagramUtils.getBendableFrom(getSvgLinePointElement());
    expect(bendableElement).not.toBeUndefined();
    bendableElement = DiagramUtils.getBendableFrom(getSvgLoopEdge());
    expect(bendableElement).toBeUndefined();
});

test('getLinePointId', () => {
    expect(DiagramUtils.getLinePointId('1', 0)).toBe('1-point-0');
    expect(DiagramUtils.getLinePointId('10', 2)).toBe('10-point-2');
    expect(DiagramUtils.getLinePointId('5', 12)).toBe('5-point-12');
});

test('getEdgeId', () => {
    expect(DiagramUtils.getEdgeId('1-point-0')).toBe('1');
    expect(DiagramUtils.getEdgeId('10-point-2')).toBe('10');
    expect(DiagramUtils.getEdgeId('5-point-12')).toBe('5');
});

test('getBendableLines', () => {
    const edges: EdgeMetadata[] = [
        {
            svgId: '60',
            equipmentId: 'T9001-9012-1',
            node1: '0',
            node2: '7',
            busNode1: '2',
            busNode2: '9',
            type: 'TwoWtEdge',
        },
        {
            svgId: '61',
            equipmentId: 'L9012-9002-1',
            node1: '7',
            node2: '3',
            busNode1: '9',
            busNode2: '4',
            type: 'LineEdge',
        },
        {
            svgId: '62',
            equipmentId: 'L9012-9002-2',
            node1: '7',
            node2: '3',
            busNode1: '9',
            busNode2: '4',
            type: 'LineEdge',
        },
        {
            svgId: '77',
            equipmentId: 'L9006-9007-1',
            node1: '7',
            node2: '10',
            busNode1: '8',
            busNode2: '11',
            type: 'LineEdge',
        },
        {
            svgId: '58',
            equipmentId: 'T37-9001-1',
            node1: '0',
            node2: '0',
            busNode1: '1',
            busNode2: '2',
            type: 'TwoWtEdge',
        },
    ];
    const lines = DiagramUtils.getBendableLines(edges);
    expect(lines.length).toBe(1);
    expect(lines[0].svgId).toBe('77');
});

test('getEdgeMidPoint', () => {
    const midPoint = DiagramUtils.getEdgeMidPoint(getSvgHalfEdge());
    expect(midPoint).not.toBeNull();
    expect(midPoint?.x).toBe(-423.41);
    expect(midPoint?.y).toBe(184.65);
});

test('createLinePointElement', () => {
    const linePointMap = new Map<SVGGElement, number>();
    const linePoint = DiagramUtils.createLinePointElement('1', new Point(-5.15, 4.23), -1, false, linePointMap);
    expect(linePoint).not.toBeUndefined();
    expect(linePoint.id).toBe('1-point-0');
    expect(linePoint.getAttribute('transform')).toBe('translate(-5.15,4.23)');
    expect(linePointMap.get(linePoint as SVGGElement)).toBe(-1);
    expect(linePointMap.has(linePoint as SVGGElement)).toBe(true);
});

test('getBendableLineFrom', () => {
    let bendableLine = DiagramUtils.getBendableLineFrom(getSvgNode(), ['14']);
    expect(bendableLine).toBeUndefined();
    bendableLine = DiagramUtils.getBendableLineFrom(getSvgLineEdge(), ['14']);
    expect(bendableLine).not.toBeUndefined();
    bendableLine = DiagramUtils.getBendableLineFrom(getSvgLineEdge(), ['16']);
    expect(bendableLine).toBeUndefined();
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
    let linePoints = DiagramUtils.addPointToList(edge.points?.slice(), node1, node2, bendPoint);
    expect(linePoints.index).toBe(0);
    expect(linePoints.linePoints.length).toBe(1);
    expect(linePoints.linePoints[0].x).toBe(75);
    expect(linePoints.linePoints[0].y).toBe(75);

    edge.points = [{ x: 75, y: 75 }];
    bendPoint = new Point(90, 90);
    linePoints = DiagramUtils.addPointToList(edge.points.slice(), node1, node2, bendPoint);
    expect(linePoints.index).toBe(1);
    expect(linePoints.linePoints.length).toBe(2);
    expect(linePoints.linePoints[0].x).toBe(75);
    expect(linePoints.linePoints[0].y).toBe(75);
    expect(linePoints.linePoints[1].x).toBe(90);
    expect(linePoints.linePoints[1].y).toBe(90);

    edge.points.push({ x: 90, y: 90 });
    bendPoint = new Point(80, 80);
    linePoints = DiagramUtils.addPointToList(edge.points.slice(), node1, node2, bendPoint);
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

    const pointsMetadata: EdgePointMetadata[] = [];
    let edgePoints = DiagramUtils.getEdgePoints(edgeStart1, edgeStart2, pointsMetadata.slice());
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
    edgePoints = DiagramUtils.getEdgePoints(edgeStart1, edgeStart2, pointsMetadata.slice());
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
    edgePoints = DiagramUtils.getEdgePoints(edgeStart1, edgeStart2, pointsMetadata.slice());
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
    edgePoints = DiagramUtils.getEdgePoints(edgeStart1, edgeStart2, pointsMetadata.slice());
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

function getSvgNode(): SVGGraphicsElement {
    const nodeSvg =
        '<g class="nad-vl-nodes"><g transform="translate(-452.59,-274.01)" id="0">' +
        '<circle r="27.50" id="1" class="nad-vl0to30-0 nad-busnode"/></g></g>';
    return <SVGGraphicsElement>SVG().svg(nodeSvg).node.firstElementChild?.firstElementChild;
}

function getSvgTextNode(): SVGGraphicsElement {
    const textNodeSvg =
        '<foreignObject height="1" width="1" class="nad-text-nodes"><div xmlns="http://www.w3.org/1999/xhtml">' +
        '<div class="nad-label-box" style="position: absolute; top: -314px; left: -353px" id="0-textnode">' +
        '<div>vl</div><div><span class="nad-vl300to500-0 nad-legend-square"/> kV / °</div></div></div></foreignObject>';
    return <SVGGraphicsElement>SVG().svg(textNodeSvg).node.firstElementChild?.firstElementChild?.firstElementChild;
}

function getSvgLoopEdge(): SVGGraphicsElement {
    const edgeSvg =
        '<g class="nad-branch-edges">' +
        '<g id="16" transform="translate(-11.33,-34.94)">' +
        '<g id="16.1" class="nad-vl70to120-line">' +
        '<path class="nad-edge-path" d="M350.33,-167.48 L364.63,-184.85 C390.06,-215.73 412.13,-202.64 415.64,-193.28"/>' +
        '<g class="nad-edge-infos" transform="translate(364.63,-184.85)">' +
        '<g class="nad-active"><g transform="rotate(39.46)"><path class="nad-arrow-in" transform="scale(10.00)" d="M-1 -1 H1 L0 1z"/>' +
        '<path class="nad-arrow-out" transform="scale(10.00)" d="M-1 1 H1 L0 -1z"/></g><text transform="rotate(-50.54)" x="19.00"></text></g></g></g>' +
        '<g id="16.2" class="nad-vl70to120-line">' +
        '<path class="nad-edge-path" d="M340.91,-118.57 L392.70,-109.93 C432.16,-103.36 440.19,-127.73 436.69,-137.09"/>' +
        '<g class="nad-edge-infos" transform="translate(392.70,-109.93)">' +
        '<g class="nad-active"><g transform="rotate(99.46)"><path class="nad-arrow-in" transform="scale(10.00)" d="M-1 -1 H1 L0 1z"/>' +
        '<path class="nad-arrow-out" transform="scale(10.00)" d="M-1 1 H1 L0 -1z"/></g><text transform="rotate(9.46)" x="19.00"></text></g></g></g>' +
        '<g class="nad-glued-center"><circle class="nad-vl70to120-line nad-winding" cx="422.65" cy="-174.55" r="20.00"/>' +
        '<circle class="nad-vl70to120-line nad-winding" cx="429.67" cy="-155.82" r="20.00"/></g></g></g>';
    return <SVGGraphicsElement>SVG().svg(edgeSvg).node.firstElementChild?.firstElementChild;
}

function getSvgPolyline(): HTMLElement {
    const edgeSvg =
        '<g id="8" class="nad-vl300to500-line">' +
        '<polyline class="nad-edge-path nad-stretchable" points="173.73,100.97 -8.21,-210.51"/>' +
        '<g class="nad-glued-1 nad-edge-infos" transform="translate(157.34,72.90)">' +
        '<g class="nad-active"><g transform="rotate(-30.29)">' +
        '<path class="nad-arrow-in" transform="scale(10.00)" d="M-1 -1 H1 L0 1z"/>' +
        '<path class="nad-arrow-out" transform="scale(10.00)" d="M-1 1 H1 L0 -1z"/></g>' +
        '<text transform="rotate(-300.29)" x="-19.00" style="text-anchor:end"></text></g></g></g>';
    return <HTMLElement>SVG().svg(edgeSvg).node.firstElementChild?.firstElementChild;
}

function getSvgPath(): HTMLElement {
    const edgeSvg =
        '<g id="16.1" class="nad-vl70to120-line">' +
        '<path class="nad-edge-path" d="M350.33,-167.48 L364.63,-184.85 C390.06,-215.73 412.13,-202.64 415.64,-193.28"/>' +
        '<g class="nad-edge-infos" transform="translate(364.63,-184.85)"><g class="nad-active">' +
        '<g transform="rotate(39.46)"><path class="nad-arrow-in" transform="scale(10.00)" d="M-1 -1 H1 L0 1z"/>' +
        '<path class="nad-arrow-out" transform="scale(10.00)" d="M-1 1 H1 L0 -1z"/></g>' +
        '<text transform="rotate(-50.54)" x="19.00"></text></g></g></g>';
    return <HTMLElement>SVG().svg(edgeSvg).node.firstElementChild?.firstElementChild;
}

function getSvgLinePointElement(): SVGGraphicsElement {
    const linePointSvg =
        '<g id="lines-points">' +
        '<g id="67-point" transform="translate(-679.99,-11.42)"><circle r="10"></circle></g></g>';
    return <SVGGraphicsElement>SVG().svg(linePointSvg).node.firstElementChild?.firstElementChild;
}

function getSvgHalfEdge(): SVGGraphicsElement {
    const halfEdgeSvg =
        '<g id="77"><g id="77.1" class="nad-vl0to30-line">' +
        '<polyline class="nad-edge-path nad-stretchable nad-glued-1" points="-208.75,170.93 -423.41,184.65"></polyline>' +
        '<g class="nad-glued-1 nad-edge-infos" transform="translate(-271.12,174.92)">' +
        '<g class="nad-active"><g transform="rotate(-93.66)">' +
        '<path class="nad-arrow-in" transform="scale(10.00)" d="M-1 -1 H1 L0 1z"></path>' +
        '<path class="nad-arrow-out" transform="scale(10.00)" d="M-1 1 H1 L0 -1z"></path></g>' +
        '<text transform="rotate(-3.66)" x="-19.00" style="text-anchor:end"></text></g></g></g></g>';
    return <SVGGraphicsElement>SVG().svg(halfEdgeSvg).node.firstElementChild?.firstElementChild;
}

function getSvgLineEdge(): SVGGraphicsElement {
    const halfEdgeSvg =
        '<g class="nad-branch-edges">' +
        '<g id="14"><g id="14.1" class="nad-vl70to120-line">' +
        '<polyline class="nad-edge-path" points="31.90,-354.04 150.61,-256.79"/>' +
        '<g class="nad-edge-infos" transform="translate(57.04,-333.44)">' +
        '<g class="nad-active"><g transform="rotate(129.33)">' +
        '<path class="nad-arrow-in" transform="scale(10.00)" d="M-1 -1 H1 L0 1z"/>' +
        '<path class="nad-arrow-out" transform="scale(10.00)" d="M-1 1 H1 L0 -1z"/>' +
        '</g><text transform="rotate(39.33)" x="19.00"></text></g></g></g>' +
        '<g id="14.2" class="nad-vl70to120-line">' +
        '<polyline class="nad-edge-path" points="269.31,-159.53 150.61,-256.79"/>' +
        '<g class="nad-edge-infos" transform="translate(244.17,-180.13)">' +
        '<g class="nad-active"><g transform="rotate(-50.67)">' +
        '<path class="nad-arrow-in" transform="scale(10.00)" d="M-1 -1 H1 L0 1z"/>' +
        '<path class="nad-arrow-out" transform="scale(10.00)" d="M-1 1 H1 L0 -1z"/>' +
        '</g><text transform="rotate(-320.67)" x="-19.00" style="text-anchor:end"></text></g></g></g>' +
        '<g><g class="nad-edge-label" transform="translate(150.61,-256.79)">' +
        '<text transform="rotate(39.33)" x="0.00" style="text-anchor:middle">L5-4-0</text></g></g></g></g>';
    return <SVGGraphicsElement>SVG().svg(halfEdgeSvg).node.firstElementChild?.firstElementChild;
}
