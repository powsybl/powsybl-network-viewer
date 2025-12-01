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
    DiagramMetadata,
    EdgeMetadata,
    NodeMetadata,
    PointMetadata,
    TextNodeMetadata,
} from './diagram-metadata';
import { SvgParameters } from './svg-parameters';
import { getDistance, getPointAtDistance, getVoltageLevelCircleRadius, round } from './diagram-utils';
import { EdgeType, ElementData, ElementType, NodeMove, NodeRadius, ViewBox } from './diagram-types';

const TEXT_BOX_WIDTH_DEFAULT = 200.0;
const TEXT_BOX_HEIGHT_DEFAULT = 100.0;

const EdgeTypeMapping: { [key: string]: EdgeType } = {
    LineEdge: EdgeType.LINE,
    TwoWtEdge: EdgeType.TWO_WINDINGS_TRANSFORMER,
    PstEdge: EdgeType.PHASE_SHIFT_TRANSFORMER,
    HvdcLineVscEdge: EdgeType.HVDC_LINE_VSC,
    HvdcLineLccEdge: EdgeType.HVDC_LINE_LCC,
    DanglingLineEdge: EdgeType.DANGLING_LINE,
    TieLineEdge: EdgeType.TIE_LINE,
    ThreeWtEdge: EdgeType.THREE_WINDINGS_TRANSFORMER,
};

export function getBendableLines(edges: EdgeMetadata[] | undefined, svg: SVGElement | undefined): EdgeMetadata[] {
    // group edges by edge ends
    const groupedEdges: Map<string, EdgeMetadata[]> = new Map<string, EdgeMetadata[]>();
    for (const edge of edges ?? []) {
        let edgeGroup: EdgeMetadata[] = [];
        // filter out loop edges
        if (edge.node1 != edge.node2) {
            const edgeGroupId = getGroupedEdgesIndexKey(edge);
            if (groupedEdges.has(edgeGroupId)) {
                edgeGroup = groupedEdges.get(edgeGroupId) ?? [];
            }
            edgeGroup.push(edge);
            groupedEdges.set(edgeGroupId, edgeGroup);
        }
    }
    const lines: EdgeMetadata[] = [];
    // filter edges
    for (const edgeGroup of groupedEdges.values()) {
        const edge = edgeGroup[0];

        // exclude parallel edges
        if (edgeGroup.length > 1) continue;

        // exclude edges that are not lines
        if (getEdgeType(edge) != EdgeType.LINE) continue;

        // exclude half-visible lines
        if (getInvisibleSide(edge, svg)) continue;

        lines.push(edge);
    }
    return lines;
}

export function getInvisibleSide(edge: EdgeMetadata, svg: SVGElement | undefined): string | undefined {
    const node1Element = svg?.querySelector('[id="' + edge.node1 + '"]');
    if (!node1Element) {
        return '1';
    }

    const node2Element = svg?.querySelector('[id="' + edge.node2 + '"]');
    if (!node2Element) {
        return '2';
    }
}

// insert a point in the edge point list
// it return the new list, and the index of the added point
export function addPointToList(
    pointsMetadata: PointMetadata[] | undefined,
    node1: Point,
    node2: Point,
    bendPoint: Point
): { linePoints: PointMetadata[]; index: number } {
    let index = 0;
    if (pointsMetadata == undefined) {
        pointsMetadata = [{ x: bendPoint.x, y: bendPoint.y }];
    } else {
        pointsMetadata.splice(0, 0, { x: node1.x, y: node1.y });
        pointsMetadata.push({ x: node2.x, y: node2.y });
        let minDistance = Number.MAX_VALUE;
        for (let i = 0; i < pointsMetadata.length - 1; i++) {
            const point1 = new Point(pointsMetadata[i].x, pointsMetadata[i].y);
            const point2 = new Point(pointsMetadata[i + 1].x, pointsMetadata[i + 1].y);
            const distance = getSquareDistanceFromSegment(bendPoint, point1, point2);
            if (distance < minDistance) {
                minDistance = distance;
                index = i;
            }
        }
        pointsMetadata.pop();
        pointsMetadata.splice(0, 1);
        pointsMetadata.splice(index, 0, { x: round(bendPoint.x), y: round(bendPoint.y) });
    }
    return { linePoints: pointsMetadata, index: index };
}

function getSquareDistanceFromSegment(p: Point, a: Point, b: Point): number {
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const param = ((p.x - a.x) * dx + (p.y - a.y) * dy) / (dx ** 2 + dy ** 2);
    const xx = getValue(param, a.x, b.x);
    const yy = getValue(param, a.y, b.y);
    const distX = p.x - xx;
    const distY = p.y - yy;

    return distX ** 2 + distY ** 2;
}

function getValue(param: number, firstValue: number, secondValue: number): number {
    if (param < 0) {
        return firstValue;
    }
    return param > 1 ? secondValue : firstValue + param * (secondValue - firstValue);
}

// sort list of bus nodes by index
export function getSortedBusNodes(busNodes: BusNodeMetadata[] | undefined): BusNodeMetadata[] {
    const sortedBusNodes: BusNodeMetadata[] = [];
    busNodes?.forEach((busNode) => {
        if (busNode.index >= 0) {
            sortedBusNodes[busNode.index] = busNode;
        }
    });
    return sortedBusNodes;
}

// create an index key for grouping the parallel edge
export function getGroupedEdgesIndexKey(edge: EdgeMetadata): string {
    // get a consistent key regardless of the node1 and node2 order position.
    // Note that we assume that the node1 and node2 strings do not contain an underscore character;
    // (true for metadata generated by default by the current powsybl-diagram implementation)
    return edge.node1 < edge.node2 ? edge.node1 + '_' + edge.node2 : edge.node2 + '_' + edge.node1;
}

export function getBusNodeMetadata(
    busNodeId: string,
    diagramMetadata: DiagramMetadata | null
): BusNodeMetadata | undefined {
    return diagramMetadata?.busNodes.find((busNode) => busNode.svgId == busNodeId);
}

export function getNodeMetadata(nodeId: string, diagramMetadata: DiagramMetadata | null): NodeMetadata | undefined {
    return diagramMetadata?.nodes.find((node) => node.svgId == nodeId);
}

// get node move (original and new position)
export function getNodeMove(node: NodeMetadata, nodePosition: Point): NodeMove {
    const xNew = round(nodePosition.x);
    const yNew = round(nodePosition.y);
    return { xOrig: node.x, yOrig: node.y, xNew: xNew, yNew: yNew };
}

// get moves (original and new position) of position and connetion of text node
export function getTextNodeMoves(
    textNode: TextNodeMetadata,
    vlNode: NodeMetadata,
    textPosition: Point,
    connectionPosition: Point
): [NodeMove, NodeMove] {
    const xNew = round(textPosition.x - vlNode.x);
    const yNew = round(textPosition.y - vlNode.y);
    const connXNew = round(connectionPosition.x - vlNode.x);
    const connYNew = round(connectionPosition.y - vlNode.y);
    return [
        { xOrig: textNode.shiftX, yOrig: textNode.shiftY, xNew: xNew, yNew: yNew },
        { xOrig: textNode.connectionShiftX, yOrig: textNode.connectionShiftY, xNew: connXNew, yNew: connYNew },
    ];
}

// get the element data from the element selected using the rigth button of the mouse
export function getRightClickableElementData(
    elementId: string | undefined,
    elementType: ElementType,
    nodes: NodeMetadata[] | undefined,
    textNodes: TextNodeMetadata[] | undefined,
    edges: EdgeMetadata[] | undefined
): ElementData | undefined {
    if (!elementId) {
        return undefined;
    }
    switch (elementType) {
        case ElementType.VOLTAGE_LEVEL:
        case ElementType.THREE_WINDINGS_TRANSFORMER: {
            const node: NodeMetadata | undefined = nodes?.find((node) => node.svgId == elementId);
            return node != null
                ? { svgId: node.svgId, equipmentId: node.equipmentId, type: ElementType[elementType] }
                : undefined;
        }
        case ElementType.TEXT_NODE: {
            const textNode: TextNodeMetadata | undefined = textNodes?.find((textNode) => textNode.svgId == elementId);
            return textNode != null
                ? { svgId: textNode.svgId, equipmentId: textNode.equipmentId, type: ElementType[elementType] }
                : undefined;
        }
        case ElementType.BRANCH: {
            const edge: EdgeMetadata | undefined = edges?.find((edge) => edge.svgId == elementId);
            return edge != null
                ? { svgId: edge.svgId, equipmentId: edge.equipmentId, type: getStringEdgeType(edge) }
                : undefined;
        }
        default:
            return undefined;
    }
}

// get view box computed starting from node and text positions
// defined in diagram metadata
export function getViewBox(
    nodes: NodeMetadata[] | undefined,
    textNodes: TextNodeMetadata[] | undefined,
    svgParameters: SvgParameters
): ViewBox {
    const size = { minX: Number.MAX_VALUE, maxX: -Number.MAX_VALUE, minY: Number.MAX_VALUE, maxY: -Number.MAX_VALUE };
    const nodesMap: Map<string, NodeMetadata> = new Map<string, NodeMetadata>();
    nodes?.forEach((node) => {
        nodesMap.set(node.equipmentId, node);
        size.minX = Math.min(size.minX, node.x);
        size.maxX = Math.max(size.maxX, node.x);
        size.minY = Math.min(size.minY, node.y);
        size.maxY = Math.max(size.maxY, node.y);
    });
    textNodes?.forEach((textNode) => {
        const node = nodesMap.get(textNode.equipmentId);
        if (node !== undefined) {
            size.minX = Math.min(size.minX, node.x + textNode.shiftX);
            size.maxX = Math.max(size.maxX, node.x + textNode.shiftX + TEXT_BOX_WIDTH_DEFAULT);
            size.minY = Math.min(size.minY, node.y + textNode.shiftY);
            size.maxY = Math.max(size.maxY, node.y + textNode.shiftY + TEXT_BOX_HEIGHT_DEFAULT);
        }
    });
    return {
        x: round(size.minX - svgParameters.getDiagramPadding().left),
        y: round(size.minY - svgParameters.getDiagramPadding().top),
        width: round(
            size.maxX - size.minX + svgParameters.getDiagramPadding().left + svgParameters.getDiagramPadding().right
        ),
        height: round(
            size.maxY - size.minY + svgParameters.getDiagramPadding().top + svgParameters.getDiagramPadding().bottom
        ),
    };
}

// get inner and outer radius of bus node and radius of voltage level
export function getNodeRadius(
    busNode: BusNodeMetadata | undefined,
    node: NodeMetadata | undefined,
    svgParameters: SvgParameters
): NodeRadius {
    const nbNeighbours = busNode?.nbNeighbours ?? 0;
    const busIndex = busNode?.index ?? 0;
    const vlCircleRadius: number = getVoltageLevelCircleRadius(nbNeighbours, node?.fictitious, svgParameters);
    const interAnnulusSpace = svgParameters.getInterAnnulusSpace();
    const unitaryRadius = vlCircleRadius / (nbNeighbours + 1);
    return {
        busInnerRadius: busIndex == 0 ? 0 : busIndex * unitaryRadius + interAnnulusSpace / 2,
        busOuterRadius: (busIndex + 1) * unitaryRadius - interAnnulusSpace / 2,
        voltageLevelRadius: vlCircleRadius,
    };
}

export function getEdgePoints(
    edgeStart1: Point,
    edgeFork1: Point | undefined,
    edgeEnd1: Point,
    edgeStart2: Point,
    edgeFork2: Point | undefined,
    edgeEnd2: Point,
    bendingPoints: PointMetadata[] | undefined
): [Point[], Point[]] {
    if (!bendingPoints) {
        const edgePoints1 = edgeFork1 ? [edgeStart1, edgeFork1, edgeEnd1] : [edgeStart1, edgeEnd1];
        const edgePoints2 = edgeFork2 ? [edgeStart2, edgeFork2, edgeEnd2] : [edgeStart2, edgeEnd2];
        return [edgePoints1, edgePoints2];
    }

    const pointsMetadata = bendingPoints.slice();
    pointsMetadata.splice(0, 0, { x: edgeStart1.x, y: edgeStart1.y });
    pointsMetadata.push({ x: edgeStart2.x, y: edgeStart2.y });
    let distance = 0;
    for (let i = 0; i < pointsMetadata.length - 1; i++) {
        distance += getDistance(
            new Point(pointsMetadata[i].x, pointsMetadata[i].y),
            new Point(pointsMetadata[i + 1].x, pointsMetadata[i + 1].y)
        );
    }
    const halfEdgePoints1: Point[] = [new Point(pointsMetadata[0].x, pointsMetadata[0].y)];
    const halfEdgePoints2: Point[] = [];
    let partialDistance = 0;
    let middleAdded: boolean = false;
    for (let i = 0; i < pointsMetadata.length - 1; i++) {
        const point = new Point(pointsMetadata[i].x, pointsMetadata[i].y);
        const nextPoint = new Point(pointsMetadata[i + 1].x, pointsMetadata[i + 1].y);
        partialDistance += getDistance(point, nextPoint);
        if (partialDistance < distance / 2) {
            halfEdgePoints1.push(nextPoint);
        } else {
            if (!middleAdded) {
                const edgeMiddle = getPointAtDistance(nextPoint, point, partialDistance - distance / 2);
                halfEdgePoints1.push(edgeMiddle);
                halfEdgePoints2.push(edgeMiddle);
                middleAdded = true;
            }
            halfEdgePoints2.push(nextPoint);
        }
    }
    return [halfEdgePoints1, halfEdgePoints2.reverse()];
}

// get the type of edge
export function getEdgeType(edge: EdgeMetadata): EdgeType {
    if (edge.type == null) {
        return EdgeType.UNKNOWN;
    }
    return EdgeTypeMapping[edge.type];
}

export function getStringEdgeType(edge: EdgeMetadata): string {
    return EdgeType[getEdgeType(edge)];
}
