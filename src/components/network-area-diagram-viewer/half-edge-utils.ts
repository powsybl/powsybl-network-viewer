/**
 * Copyright (c) 2025, RTE (http://www.rte-france.com)
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 * SPDX-License-Identifier: MPL-2.0
 */

import { Point } from '@svgdotjs/svg.js';
import { SvgParameters } from './svg-parameters';
import { DiagramMetadata, EdgeMetadata, NodeMetadata, PointMetadata } from './diagram-metadata';
import {
    getAngle,
    getEdgeFork,
    getMidPosition,
    getPointAtDistance,
    getFormattedPolyline,
    isTransformerEdge,
    radToDeg,
} from './diagram-utils';
import { getBusNodeMetadata, getEdgePoints, getEdgeType, getNodeMetadata, getNodeRadius } from './metadata-utils';
import { HalfEdge } from './diagram-types';

// get the angle between first two points of a halfEdge
export function getEdgeStartAngle(halfEdge: HalfEdge): number {
    return getAngle(halfEdge.edgePoints[0], halfEdge.edgePoints[1]);
}

// get the rotation angle of an halfEdge arrow
export function getArrowRotation(halfEdge: HalfEdge): number {
    const angle = getArrowEdgeAngle(halfEdge);
    return radToDeg(angle + (angle > Math.PI / 2 ? (-3 * Math.PI) / 2 : Math.PI / 2));
}

// get the angle of the edge part corresponding to an halfEdge arrow
export function getArrowEdgeAngle(halfEdge: HalfEdge): number {
    return halfEdge.fork
        ? getAngle(halfEdge.edgePoints[1], halfEdge.edgePoints[2])
        : getAngle(halfEdge.edgePoints[0], halfEdge.edgePoints[1]);
}

export function getArrowCenter(halfEdge: HalfEdge, svgParameters: SvgParameters): Point {
    if (halfEdge.fork) {
        return getPointAtDistance(halfEdge.edgePoints[1], halfEdge.edgePoints[2], svgParameters.getArrowShift());
    } else {
        const arrowShiftFromEdgeStart =
            svgParameters.getArrowShift() + (halfEdge.voltageLevelRadius - halfEdge.busOuterRadius);
        return getPointAtDistance(halfEdge.edgePoints[0], halfEdge.edgePoints[1], arrowShiftFromEdgeStart);
    }
}

// get the data [angle, shift, text anchor] of a label
// between two points of an edge polyline
export function getLabelData(halfEdge: HalfEdge, arrowLabelShift: number): [number, number, string | null] {
    const angle = getArrowEdgeAngle(halfEdge);
    const textFlipped = Math.cos(angle) < 0;
    return [
        radToDeg(textFlipped ? angle - Math.PI : angle),
        textFlipped ? -arrowLabelShift : arrowLabelShift,
        textFlipped ? 'text-anchor:end' : null,
    ];
}

// get the points of a converter station of an HVDC line edge
function getConverterStationPoints(halfEdge: HalfEdge, converterStationWidth: number): [Point, Point] {
    const halfWidth = converterStationWidth / 2;
    const middlePoint = halfEdge.edgePoints.at(-1)!;
    const point1 = getPointAtDistance(middlePoint, halfEdge.edgePoints.at(-2)!, halfWidth);
    const point2 = getPointAtDistance(point1, middlePoint, converterStationWidth);
    return [point1, point2];
}

// get the polyline of a converter station of an HVDC line edge
export function getConverterStationPolyline(
    halfEdge1: HalfEdge | null,
    halfEdge2: HalfEdge | null,
    converterStationWidth: number
): string {
    if (halfEdge1) {
        const points = getConverterStationPoints(halfEdge1, converterStationWidth);
        return getFormattedPolyline(points);
    } else if (halfEdge2) {
        const points = getConverterStationPoints(halfEdge2, converterStationWidth);
        return getFormattedPolyline(points);
    } else {
        return ''; // should never occur
    }
}
export function getThreeWtHalfEdge(
    points: Point[] | null,
    edgeMetadata: EdgeMetadata,
    threeWtMoved: boolean,
    initialPosition: Point | null,
    diagramMetadata: DiagramMetadata | null,
    svgParameters: SvgParameters
): HalfEdge | undefined {
    if (!points) return;

    const busNode = getBusNodeMetadata(edgeMetadata.busNode1, diagramMetadata);
    const vlNode = getNodeMetadata(edgeMetadata.node1, diagramMetadata);
    const twtNode = getNodeMetadata(edgeMetadata.node2, diagramMetadata);
    if (!vlNode || !twtNode) return;

    const pointVl = new Point(vlNode.x, vlNode.y);
    const pointTwt = new Point(twtNode.x, twtNode.y);
    const nodeRadius = getNodeRadius(busNode, vlNode, svgParameters);
    const edgeStart = getEdgeStart(edgeMetadata.busNode1, pointVl, pointTwt, nodeRadius.busOuterRadius, svgParameters);
    const edgeEnd =
        threeWtMoved && initialPosition
            ? new Point(
                  points.at(-1)!.x + pointTwt.x - initialPosition.x,
                  points.at(-1)!.y + pointTwt.y - initialPosition.y
              )
            : points.at(-1)!;
    return {
        side: '1',
        fork: false,
        busOuterRadius: nodeRadius.busOuterRadius,
        voltageLevelRadius: nodeRadius.voltageLevelRadius,
        edgeInfoId: edgeMetadata.edgeInfo1?.svgId,
        edgePoints: [edgeStart, edgeEnd],
    };
}

export function getHalfVisibleHalfEdges(
    polylinePoints: Point[] | null,
    edgeMetadata: EdgeMetadata,
    visibleSide: string,
    fork: boolean,
    diagramMetadata: DiagramMetadata | null,
    initialPosition: Point | null,
    svgParameters: SvgParameters
): [HalfEdge | null, HalfEdge | null] {
    if (!polylinePoints || polylinePoints.length == 0) return [null, null];

    // Get the metadata for the nodes
    const visibleNodeId = visibleSide == '1' ? edgeMetadata.node1 : edgeMetadata.node2;
    const visibleNodeMetadata = diagramMetadata?.nodes.find((node) => node.svgId === visibleNodeId);
    if (!visibleNodeMetadata) return [null, null];

    // Calculate translation from initialPosition to metadata node position
    if (initialPosition) {
        polylinePoints = getTranslatedPolyline(polylinePoints, visibleNodeMetadata, initialPosition);
    }

    const busNode = getBusNodeMetadata(
        visibleSide == '1' ? edgeMetadata.busNode1 : edgeMetadata.busNode2,
        diagramMetadata
    );
    const vlNode = getNodeMetadata(visibleSide == '1' ? edgeMetadata.node1 : edgeMetadata.node2, diagramMetadata);
    const nodeRadius = getNodeRadius(busNode, vlNode, svgParameters);

    // Updating the first point of the edge in case of bus connection change
    const point = new Point(visibleNodeMetadata.x, visibleNodeMetadata.y);
    const visibleBusNode = visibleSide == '1' ? edgeMetadata.busNode1 : edgeMetadata.busNode2;
    polylinePoints[0] = getEdgeStart(
        visibleBusNode,
        point,
        polylinePoints[1],
        nodeRadius.busOuterRadius,
        svgParameters
    );

    // Create half edges
    const halfEdges: [HalfEdge | null, HalfEdge | null] = [null, null];
    const visibleHalfEdge: HalfEdge = {
        side: visibleSide,
        fork: fork,
        busOuterRadius: nodeRadius.busOuterRadius,
        voltageLevelRadius: nodeRadius.voltageLevelRadius,
        edgePoints: polylinePoints,
    };
    if (visibleSide == '1') {
        halfEdges[0] = visibleHalfEdge;
        visibleHalfEdge.edgeInfoId = edgeMetadata.edgeInfo1?.svgId;
    } else {
        halfEdges[1] = visibleHalfEdge;
        visibleHalfEdge.edgeInfoId = edgeMetadata.edgeInfo2?.svgId;
    }

    return halfEdges;
}

export function getHalfEdges(
    edge: EdgeMetadata,
    iEdge: number,
    groupedEdgesCount: number,
    diagramMetadata: DiagramMetadata | null,
    svgParameters: SvgParameters
): HalfEdge[] | null[] {
    const edgeType = getEdgeType(edge);
    const busNode1 = getBusNodeMetadata(edge.busNode1, diagramMetadata);
    const busNode2 = getBusNodeMetadata(edge.busNode2, diagramMetadata);
    const node1 = getNodeMetadata(edge.node1, diagramMetadata);
    const node2 = getNodeMetadata(edge.node2, diagramMetadata);
    if (node1 == null || node2 == null) {
        return [null, null];
    }

    const point1 = new Point(node1.x, node1.y);
    const point2 = new Point(node2.x, node2.y);
    let edgeFork1: Point | undefined;
    let edgeFork2: Point | undefined;
    if (groupedEdgesCount > 1) {
        const angle = getAngle(point1, point2);
        const angleStep = svgParameters.getEdgesForkAperture() / (groupedEdgesCount - 1);
        const alpha = -svgParameters.getEdgesForkAperture() / 2 + iEdge * angleStep;
        const angleFork1 = angle - alpha;
        const angleFork2 = angle + Math.PI + alpha;
        edgeFork1 = getEdgeFork(point1, svgParameters.getEdgesForkLength(), angleFork1);
        edgeFork2 = getEdgeFork(point2, svgParameters.getEdgesForkLength(), angleFork2);
    }

    const edgeDirection1 = getEdgeDirection(point2, edgeFork1, edge.bendingPoints?.at(0));
    const nodeRadius1 = getNodeRadius(busNode1, node1, svgParameters);
    const edgeStart1 = getEdgeStart(edge.busNode1, point1, edgeDirection1, nodeRadius1.busOuterRadius, svgParameters);

    const edgeDirection2 = getEdgeDirection(point1, edgeFork2, edge.bendingPoints?.at(-1));
    const nodeRadius2 = getNodeRadius(busNode2, node2, svgParameters);
    const edgeStart2 = getEdgeStart(edge.busNode2, point2, edgeDirection2, nodeRadius2.busOuterRadius, svgParameters);

    const edgeMiddle =
        edgeFork1 && edgeFork2 ? getMidPosition(edgeFork1, edgeFork2) : getMidPosition(edgeStart1, edgeStart2);

    // if transformer edge, reduce edge polyline, leaving space for the transformer
    let edgeEnd1 = edgeMiddle;
    let edgeEnd2 = edgeMiddle;
    if (isTransformerEdge(edgeType)) {
        const endShift = 1.5 * svgParameters.getTransformerCircleRadius();
        edgeEnd1 = getPointAtDistance(edgeMiddle, edgeFork1 ?? edgeStart1, endShift);
        edgeEnd2 = getPointAtDistance(edgeMiddle, edgeFork2 ?? edgeStart2, endShift);
    }

    const edgePoints = getEdgePoints(
        edgeStart1,
        edgeFork1,
        edgeEnd1,
        edgeStart2,
        edgeFork2,
        edgeEnd2,
        edge.bendingPoints
    );
    const halfEdge1: HalfEdge = {
        side: '1',
        fork: groupedEdgesCount > 1,
        busOuterRadius: nodeRadius1.busOuterRadius,
        voltageLevelRadius: nodeRadius1.voltageLevelRadius,
        edgeInfoId: edge.edgeInfo1?.svgId,
        edgePoints: edgePoints[0],
    };
    const halfEdge2: HalfEdge = {
        side: '2',
        fork: groupedEdgesCount > 1,
        busOuterRadius: nodeRadius2.busOuterRadius,
        voltageLevelRadius: nodeRadius2.voltageLevelRadius,
        edgeInfoId: edge.edgeInfo2?.svgId,
        edgePoints: edgePoints[1],
    };
    return [halfEdge1, halfEdge2];
}

function getTranslatedPolyline(polylinePoints: Point[], nodeMetadata: NodeMetadata, initialPosition: Point): Point[] {
    const translation = new Point(nodeMetadata.x - initialPosition.x, nodeMetadata.y - initialPosition.y);

    // Apply translation to polyline points
    return polylinePoints.map((point) => new Point(point.x + translation.x, point.y + translation.y));
}

function getEdgeStart(
    busNodeId: string | undefined,
    vlPoint: Point,
    direction: Point,
    busOuterRadius: number,
    svgParameters: SvgParameters
): Point {
    const unknownBusNode1 = busNodeId?.length == 0;
    const rho = unknownBusNode1 ? busOuterRadius + svgParameters.getUnknownBusNodeExtraRadius() : busOuterRadius;
    return getPointAtDistance(vlPoint, direction, rho);
}

function getEdgeDirection(
    nodePoint: Point,
    edgeFork: Point | undefined,
    firstBendingPoint: PointMetadata | undefined
): Point {
    if (firstBendingPoint) return new Point(firstBendingPoint.x, firstBendingPoint.y);
    if (edgeFork) return edgeFork;
    return nodePoint;
}
