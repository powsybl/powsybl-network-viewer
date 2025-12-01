/**
 * Copyright (c) 2024, RTE (http://www.rte-france.com)
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

import { Point } from '@svgdotjs/svg.js';
import { DiagramMetadata, EdgeMetadata, NodeMetadata, PointMetadata } from './diagram-metadata';
import { SvgParameters } from './svg-parameters';

export type Dimensions = { width: number; height: number; viewbox: ViewBox };
export type ViewBox = { x: number; y: number; width: number; height: number };

// node move: original and new position
export type NODEMOVE = {
    xOrig: number;
    yOrig: number;
    xNew: number;
    yNew: number;
};

export enum EdgeType {
    LINE,
    TWO_WINDINGS_TRANSFORMER,
    PHASE_SHIFT_TRANSFORMER,
    HVDC_LINE_VSC,
    HVDC_LINE_LCC,
    DANGLING_LINE,
    TIE_LINE,
    THREE_WINDINGS_TRANSFORMER,
    UNKNOWN,
}

export enum ElementType {
    VOLTAGE_LEVEL,
    THREE_WINDINGS_TRANSFORMER,
    TEXT_NODE,
    BRANCH,
    UNKNOWN,
}

export type ElementData = {
    svgId: string;
    equipmentId: string;
    type: string;
};

export type HalfEdge = {
    side: string;
    fork: boolean;
    busOuterRadius: number;
    voltageLevelRadius: number;
    edgeInfoId?: string;
    edgePoints: Point[];
};

export function getDistance(point1: Point, point2: Point): number {
    const deltax = point1.x - point2.x;
    const deltay = point1.y - point2.y;
    return Math.hypot(deltax, deltay);
}

// format number to string
export function getFormattedValue(value: number): string {
    return value.toFixed(2);
}

// format point to string
export function getFormattedPoint(point: Point): string {
    return getFormattedValue(point.x) + ',' + getFormattedValue(point.y);
}

// format points to polyline string
export function getFormattedPolyline(points: Point[]): string {
    return points.map((point) => getFormattedPoint(point)).join(' ');
}

// transform angle degrees to radians
export function degToRad(deg: number): number {
    return deg * (Math.PI / 180.0);
}

// transform angle radians to degrees
export function radToDeg(rad: number): number {
    return (rad * 180.0) / Math.PI;
}

// round number to 2 decimals, for storing positions in metadata
export function round(num: number): number {
    return Math.round(num * 100) / 100;
}

// get the middle position between two points
export function getMidPosition(point1: Point, point2: Point): Point {
    return new Point(0.5 * (point1.x + point2.x), 0.5 * (point1.y + point2.y));
}

// get a point at a distance between two points
export function getPointAtDistance(point1: Point, point2: Point, radius: number): Point {
    const distance = getDistance(point1, point2);
    const r = radius / distance;
    return new Point(point1.x + r * (point2.x - point1.x), point1.y + r * (point2.y - point1.y));
}

// get the angle between two points
export function getAngle(point1: Point, point2: Point): number {
    return Math.atan2(point2.y - point1.y, point2.x - point1.x);
}

// get the angle between two points
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

// get fork position of a multibranch edge
export function getEdgeFork(point: Point, edgeForkLength: number, angleFork: number) {
    return new Point(point.x + edgeForkLength * Math.cos(angleFork), point.y + edgeForkLength * Math.sin(angleFork));
}

// get the matrix used for the position of the arrow drawn in a PS transformer
function getTransformerArrowMatrix(
    rotationAngle: number,
    transformerCenter: Point,
    transfomerCircleRadius: number
): number[] {
    const arrowSize = 3 * transfomerCircleRadius;
    const cosRo = Math.cos(rotationAngle);
    const sinRo = Math.sin(rotationAngle);
    const cdx = arrowSize / 2;
    const cdy = arrowSize / 2;
    const e1 = transformerCenter.x - cdx * cosRo + cdy * sinRo;
    const f1 = transformerCenter.y - cdx * sinRo - cdy * cosRo;
    return [+cosRo, sinRo, -sinRo, cosRo, e1, f1];
}

// get the string for the matrix used for the position of the arrow drawn in a PS transformer
export function getTransformerArrowMatrixString(
    rotationAngle: number,
    transformerCenter: Point,
    transfomerCircleRadius: number
): string {
    const matrix: number[] = getTransformerArrowMatrix(rotationAngle, transformerCenter, transfomerCircleRadius);
    return matrix.map((e) => getFormattedValue(e)).join(',');
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

// get radius of voltage level
export function getVoltageLevelCircleRadius(
    nbNeighbours: number,
    fictitiousVl: boolean | undefined,
    svgParameters: SvgParameters
): number {
    const voltageLevelCircleRadius = fictitiousVl
        ? svgParameters.getFictitiousVoltageLevelCircleRadius()
        : svgParameters.getVoltageLevelCircleRadius();
    return Math.min(Math.max(nbNeighbours + 1, 1), 2) * voltageLevelCircleRadius;
}

function getCirclePath(radius: number, angleStart: number, angleEnd: number, clockWise: boolean) {
    const arcAngle = angleEnd - angleStart;
    const xStart = radius * Math.cos(angleStart);
    const yStart = radius * Math.sin(angleStart);
    const xEnd = radius * Math.cos(angleEnd);
    const yEnd = radius * Math.sin(angleEnd);
    const largeArc = Math.abs(arcAngle) > Math.PI ? 1 : 0;
    return (
        xStart.toFixed(3) +
        ',' +
        yStart.toFixed(3) +
        ' A' +
        radius.toFixed(3) +
        ',' +
        radius.toFixed(3) +
        ' ' +
        radToDeg(arcAngle).toFixed(3) +
        ' ' +
        largeArc +
        ' ' +
        (clockWise ? 1 : 0) +
        ' ' +
        xEnd.toFixed(3) +
        ',' +
        yEnd.toFixed(3)
    );
}

// get path for bus annulus
export function getFragmentedAnnulusPath(
    angles: number[],
    busNodeRadius: [number, number, number],
    nodeHollowWidth: number
): string {
    let path: string = '';
    if (angles.length == 0) {
        path =
            'M' +
            getCirclePath(busNodeRadius[1], 0, Math.PI, true) +
            ' M' +
            getCirclePath(busNodeRadius[1], Math.PI, 0, true);
        if (busNodeRadius[0] > 0) {
            // going the other way around (counter-clockwise) to subtract the inner circle
            path +=
                ' M' +
                getCirclePath(busNodeRadius[0], 0, Math.PI, false) +
                ' M' +
                getCirclePath(busNodeRadius[0], Math.PI, 0, false);
        }
        return path;
    }
    const halfWidth = nodeHollowWidth / 2;
    const deltaAngle0 = halfWidth / busNodeRadius[1];
    const deltaAngle1 = halfWidth / busNodeRadius[0];
    for (let index = 0; index < angles.length; index++) {
        const outerArcStart = angles[index] + deltaAngle0;
        const outerArcEnd = angles[index + 1] - deltaAngle0;
        const innerArcStart = angles[index + 1] - deltaAngle1;
        const innerArcEnd = angles[index] + deltaAngle1;
        if (outerArcEnd > outerArcStart && innerArcEnd < innerArcStart) {
            path =
                path +
                'M' +
                getCirclePath(busNodeRadius[1], outerArcStart, outerArcEnd, true) +
                ' L' +
                getCirclePath(busNodeRadius[0], innerArcStart, innerArcEnd, false) +
                ' Z ';
        }
    }
    return path;
}

export function getBoundarySemicircle(edgeStartAngle: number, busOuterRadius: number): string {
    const startAngle = -Math.PI / 2 + edgeStartAngle;
    return 'M' + getCirclePath(busOuterRadius, startAngle, startAngle + Math.PI, true);
}

// get the angle of a edge name between two points
export function getEdgeNameAngle(point1: Point, point2: Point): number {
    const angle = getAngle(point1, point2);
    const textFlipped = Math.cos(angle) < 0;
    return radToDeg(textFlipped ? angle - Math.PI : angle);
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
    const edgeStart = getEdgeStart(edgeMetadata.busNode1, pointVl, pointTwt, nodeRadius[1], svgParameters);
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
        busOuterRadius: nodeRadius[1],
        voltageLevelRadius: nodeRadius[2],
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
    polylinePoints[0] = getEdgeStart(visibleBusNode, point, polylinePoints[1], nodeRadius[1], svgParameters);

    // Create half edges
    const halfEdges: [HalfEdge | null, HalfEdge | null] = [null, null];
    const visibleHalfEdge: HalfEdge = {
        side: visibleSide,
        fork: fork,
        busOuterRadius: nodeRadius[1],
        voltageLevelRadius: nodeRadius[2],
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
    const edgeStart1 = getEdgeStart(edge.busNode1, point1, edgeDirection1, nodeRadius1[1], svgParameters);

    const edgeDirection2 = getEdgeDirection(point1, edgeFork2, edge.bendingPoints?.at(-1));
    const nodeRadius2 = getNodeRadius(busNode2, node2, svgParameters);
    const edgeStart2 = getEdgeStart(edge.busNode2, point2, edgeDirection2, nodeRadius2[1], svgParameters);

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
        busOuterRadius: nodeRadius1[1],
        voltageLevelRadius: nodeRadius1[2],
        edgeInfoId: edge.edgeInfo1?.svgId,
        edgePoints: edgePoints[0],
    };
    const halfEdge2: HalfEdge = {
        side: '2',
        fork: groupedEdgesCount > 1,
        busOuterRadius: nodeRadius2[1],
        voltageLevelRadius: nodeRadius2[2],
        edgeInfoId: edge.edgeInfo2?.svgId,
        edgePoints: edgePoints[1],
    };
    return [halfEdge1, halfEdge2];
}

export function isTransformerEdge(edgeType: EdgeType): boolean {
    return edgeType == EdgeType.TWO_WINDINGS_TRANSFORMER || edgeType == EdgeType.PHASE_SHIFT_TRANSFORMER;
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

// compute text edge end w.r.t. textbox and vlnode positions (angle)
export function getTextEdgeEnd(
    textNodePosition: Point,
    vlNodePosition: Point,
    detailedTextNodeYShift: number,
    height: number,
    width: number
): Point {
    const angle = radToDeg(getAngle(vlNodePosition, textNodePosition));
    if (angle > 60 && angle < 175) {
        return new Point(textNodePosition.x + detailedTextNodeYShift, textNodePosition.y);
    }
    if (angle < -70 && angle > -155) {
        return new Point(textNodePosition.x + detailedTextNodeYShift, textNodePosition.y + height);
    }
    if (angle >= 175 || angle <= -155) {
        return new Point(textNodePosition.x + width, textNodePosition.y + detailedTextNodeYShift);
    }
    return new Point(textNodePosition.x, textNodePosition.y + detailedTextNodeYShift);
}

// get edge info element class, based on type
export function getEdgeInfoClass(edgeInfoType: string): string | null {
    const classMap: Record<string, string> = {
        ActivePower: 'nad-active',
        ReactivePower: 'nad-reactive',
        Current: 'nad-current',
    };
    return classMap[edgeInfoType];
}

// get arrow element direction, based on p value
export function getArrowDirection(p: number): string {
    return p < 0 ? 'IN' : 'OUT';
}

// get arrow element path, based on direction
export function getArrowPath(direction: string | undefined, svgParameters: SvgParameters): string | undefined {
    switch (direction) {
        case 'IN':
            return svgParameters.getArrowPathIn();
        case 'OUT':
            return svgParameters.getArrowPathOut();
        default:
            return undefined;
    }
}

// get arrow element path, based on direction
export function getArrowClass(direction: string | undefined): string | undefined {
    switch (direction) {
        case 'IN':
            return 'nad-arrow-in';
        case 'OUT':
            return 'nad-arrow-out';
        default:
            return undefined;
    }
}
