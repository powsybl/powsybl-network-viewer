/**
 * Copyright (c) 2024, RTE (http://www.rte-france.com)
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

import { Point } from '@svgdotjs/svg.js';
import { EdgeMetadata, BusNodeMetadata, NodeMetadata, TextNodeMetadata, EdgePointMetadata } from './diagram-metadata';
import { SvgParameters } from './svg-parameters';
import ZoomToFitSvg from '../../resources/material-icons/zoom-to-fit.svg';
import ZoomInSvg from '../../resources/material-icons/zoom-in.svg';
import ZoomOutSvg from '../../resources/material-icons/zoom-out.svg';
import SaveSvg from '../../resources/material-icons/save_svg.svg';
import SavePng from '../../resources/material-icons/save_png.svg';
import ScreenshotSvg from '../../resources/material-icons/screenshot.svg';
import BendLinesSvg from '../../resources/material-icons/bend-lines.svg';

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
    HVDC_LINE,
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

const EdgeTypeMapping: { [key: string]: EdgeType } = {
    LineEdge: EdgeType.LINE,
    TwoWtEdge: EdgeType.TWO_WINDINGS_TRANSFORMER,
    PstEdge: EdgeType.PHASE_SHIFT_TRANSFORMER,
    HvdcLineEdge: EdgeType.HVDC_LINE,
    DanglingLineEdge: EdgeType.DANGLING_LINE,
    TieLineEdge: EdgeType.TIE_LINE,
    ThreeWtEdge: EdgeType.THREE_WINDINGS_TRANSFORMER,
};

const TEXT_BOX_WIDTH_DEFAULT = 200.0;
const TEXT_BOX_HEIGHT_DEFAULT = 100.0;

export function getBendableFrom(element: SVGElement): SVGElement | undefined {
    if (isBendable(element)) {
        return element;
    } else if (element.parentElement) {
        return getBendableFrom(element.parentNode as SVGElement);
    }
}

export function isBendable(element: SVGElement): boolean {
    return hasId(element) && element.parentNode != null && idIs(element.parentNode as SVGElement);
}

function idIs(element: SVGElement): boolean {
    return element.id == 'lines-points';
}

export function getLinePointId(edgeId: string | undefined, index: number): string {
    return edgeId + '-point-' + index;
}

export function getEdgeId(
    linePointIndexMap: Map<SVGGElement, { edgeId: string; index: number }>,
    linePoint: SVGGElement
): string | undefined {
    return linePointIndexMap.get(linePoint)?.edgeId;
}

export function getLinePointMapKey(edgeId: string, index: number): string {
    return `${edgeId}:${index}`;
}

export function getBendableLines(edges: EdgeMetadata[] | undefined): EdgeMetadata[] {
    // group edges by edge ends
    const groupedEdges: Map<string, EdgeMetadata[]> = new Map<string, EdgeMetadata[]>();
    for (const edge of edges ?? []) {
        let edgeGroup: EdgeMetadata[] = [];
        // filter out loop edges
        if (edge.node1 != edge.node2) {
            const edgeGroupId = edge.node1.concat('_', edge.node2);
            if (groupedEdges.has(edgeGroupId)) {
                edgeGroup = groupedEdges.get(edgeGroupId) ?? [];
            }
            edgeGroup.push(edge);
            groupedEdges.set(edgeGroupId, edgeGroup);
        }
    }
    const lines: EdgeMetadata[] = [];
    for (const edgeGroup of groupedEdges.values()) {
        lines.push(...edgeGroup);
    }
    return lines;
}

export function getEdgeMidPoint(halfEdge: SVGGraphicsElement | null): Point | null {
    if (halfEdge == null) {
        return null;
    }
    const polyline = <Element>halfEdge.querySelector('polyline');
    const points = getPolylinePoints(<HTMLElement>polyline);
    return points == null ? null : points[1];
}

export function createLinePointElement(
    edgeId: string,
    linePoint: Point,
    index: number,
    previewPoint?: boolean,
    linePointIndexMap?: Map<SVGGElement, { edgeId: string; index: number }>,
    linePointByEdgeIndexMap?: Map<string, SVGElement>
): SVGElement {
    const linePointElement = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    linePointElement.setAttribute('transform', 'translate(' + getFormattedPoint(linePoint) + ')');

    const squareElement = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
    squareElement.setAttribute('width', '16');
    squareElement.setAttribute('height', '16');
    squareElement.setAttribute('x', '-8');
    squareElement.setAttribute('y', '-8');

    if (previewPoint) {
        linePointElement.id = `preview-${edgeId}-${index}`;
        linePointElement.classList.add('nad-line-point-preview');
    }

    linePointElement.appendChild(squareElement);

    if (!previewPoint && linePointIndexMap && linePointByEdgeIndexMap) {
        linePointElement.id = getLinePointId(edgeId, index);
        linePointIndexMap.set(linePointElement, { edgeId: edgeId, index: index });
        linePointByEdgeIndexMap.set(getLinePointMapKey(edgeId, index), linePointElement);
    }
    return linePointElement;
}

export function getBendableLineFrom(element: SVGElement, bendableIds: string[]): SVGElement | undefined {
    if (isBendableLine(element, bendableIds)) {
        return element;
    } else if (element.parentElement) {
        return getBendableLineFrom(element.parentNode as SVGElement, bendableIds);
    }
}

export function getParallelEdgeGroupId(edge: EdgeMetadata): string {
    return edge.node1.concat('_', edge.node2);
}

export function getParallelEdgeGroup(edgeId: string, edges: EdgeMetadata[] | undefined): EdgeMetadata[] | undefined {
    const edge = edges?.find((e) => e.svgId === edgeId);
    if (!edge || edge.node1 === edge.node2) {
        return undefined;
    }

    const groupId = getParallelEdgeGroupId(edge);
    const group = edges?.filter((e) => {
        if (e.node1 == edge.node2) return false;
        return getParallelEdgeGroupId(e) === groupId;
    });
    return group && group.length > 1 ? group : undefined;
}

export function calculateParallelOffset(edge1Middle: Point, edge2Middle: Point): Point {
    return new Point(edge2Middle.x - edge1Middle.x, edge2Middle.y - edge1Middle.y);
}

export function isBendableLine(element: SVGElement, bendableIds: string[]): boolean {
    return (
        hasId(element) &&
        element.parentNode != null &&
        classIsContainerOfLines(element.parentNode as SVGElement) &&
        bendableIds.includes(element.id)
    );
}

function classIsContainerOfLines(element: SVGElement): boolean {
    return element.classList.contains('nad-branch-edges');
}

export function getBendLinesButton(): HTMLButtonElement {
    const b = getButton(BendLinesSvg, 'Enable line bending', '25px');
    b.style.borderRadius = '5px 5px 5px 5px';
    return b;
}

// insert a point in the edge point list
// it return the new list, and the index of the added point
export function addPointToList(
    pointsMetadata: EdgePointMetadata[] | undefined,
    node1: Point,
    node2: Point,
    bendPoint: Point
): { linePoints: EdgePointMetadata[]; index: number } {
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
            const distance = getDistanceFromSegment(bendPoint, point1, point2);
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

function getDistanceFromSegment(p: Point, a: Point, b: Point): number {
    const param =
        ((p.x - a.x) * (b.x - a.x) + (p.y - a.y) * (b.y - a.y)) / (Math.pow(b.x - a.x, 2) + Math.pow(b.y - a.y, 2));
    const xx = getValue(param, a.x, b.x);
    const yy = getValue(param, a.y, b.y);
    return Math.sqrt(Math.pow(p.x - xx, 2) + Math.pow(p.y - yy, 2));
}

function getValue(param: number, firstValue: number, secondValue: number): number {
    if (param < 0) {
        return firstValue;
    }
    return param > 1 ? secondValue : firstValue + param * (secondValue - firstValue);
}

function getDistance(point1: Point, point2: Point): number {
    const deltax = point1.x - point2.x;
    const deltay = point1.y - point2.y;
    return Math.hypot(deltax, deltay);
}

export function getEdgePoints(
    edgeStart1: Point,
    edgeStart2: Point,
    pointsMetadata: EdgePointMetadata[]
): [Point[], Point[]] {
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

export function getEdgeMidPointPosition(edgeId: string, svgContainer: HTMLElement): Point | null {
    const halfEgde1: SVGGraphicsElement | null = svgContainer.querySelector("[id='" + edgeId + ".1']");
    const halfEgde2: SVGGraphicsElement | null = svgContainer.querySelector("[id='" + edgeId + ".2']");
    const middle1: Point | null = getEdgeMidPoint(halfEgde1);
    const middle2: Point | null = getEdgeMidPoint(halfEgde2);

    if (middle1 && middle2) {
        return getMidPosition(middle1, middle2);
    }
    return null;
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
export function getFormattedPolyline(startPolyline: Point, middlePolyline: Point | null, endPolyline: Point): string {
    let polyline: string = getFormattedPoint(startPolyline);
    if (middlePolyline != null) {
        polyline += ' ' + getFormattedPoint(middlePolyline);
    }
    polyline += ' ' + getFormattedPoint(endPolyline);
    return polyline;
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

// get the transform element of an SVG graphic element
export function getTransform(element: SVGGraphicsElement | null): SVGTransform | undefined {
    let transforms = element?.transform.baseVal;
    if (transforms?.length === 0 || transforms?.getItem(0).type !== SVGTransform.SVG_TRANSFORM_TRANSLATE) {
        element?.setAttribute('transform', 'translate(0,0)');
        transforms = element?.transform.baseVal;
    }
    return transforms?.getItem(0);
}

// get the position of an SVG graphic element
export function getPosition(element: SVGGraphicsElement | null): Point {
    const transform = getTransform(element);
    return new Point(transform?.matrix.e ?? 0, transform?.matrix.f ?? 0);
}

// get the middle position between two points
export function getMidPosition(point1: Point, point2: Point): Point {
    return new Point(0.5 * (point1.x + point2.x), 0.5 * (point1.y + point2.y));
}

// get a point at a distance between two points
export function getPointAtDistance(point1: Point, point2: Point, radius: number): Point {
    const deltax = point1.x - point2.x;
    const deltay = point1.y - point2.y;
    const distance = Math.sqrt(deltax * deltax + deltay * deltay);
    const r = radius / distance;
    return new Point(point1.x + r * (point2.x - point1.x), point1.y + r * (point2.y - point1.y));
}

// get the angle between two points
export function getAngle(point1: Point, point2: Point): number {
    return Math.atan2(point2.y - point1.y, point2.x - point1.x);
}

// get the angle of an arrow between two points of an edge polyline
export function getArrowAngle(point1: Point, point2: Point): number {
    const angle = getAngle(point1, point2);
    return radToDeg(angle + (angle > Math.PI / 2 ? (-3 * Math.PI) / 2 : Math.PI / 2));
}

// get the data [angle, shift, text anchor] of a label
// between two points of an edge polyline
export function getLabelData(point1: Point, point2: Point, arrowLabelShift: number): [number, number, string | null] {
    const angle = getAngle(point1, point2);
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

// get the type of edge
export function getEdgeType(edge: EdgeMetadata): EdgeType {
    if (edge.type == null) {
        return EdgeType.UNKNOWN;
    }
    return EdgeTypeMapping[edge.type];
}

// get the matrix used for the position of the arrow drawn in a PS transformer
function getTransformerArrowMatrix(
    startPolyline: Point,
    endPolyline: Point,
    transformerCenter: Point,
    transfomerCircleRadius: number
): number[] {
    const arrowSize = 3 * transfomerCircleRadius;
    const rotationAngle = getAngle(startPolyline, endPolyline);
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
    startPolyline: Point,
    endPolyline: Point,
    transformerCenter: Point,
    transfomerCircleRadius: number
): string {
    const matrix: number[] = getTransformerArrowMatrix(
        startPolyline,
        endPolyline,
        transformerCenter,
        transfomerCircleRadius
    );
    return matrix.map((e) => getFormattedValue(e)).join(',');
}

// get the points of a converter station of an HVDC line edge
function getConverterStationPoints(
    startPolyline1: Point,
    endPolyline1: Point,
    startPolyline2: Point,
    endPolyline2: Point,
    converterStationWidth: number
): [Point, Point] {
    const halfWidth = converterStationWidth / 2;
    const point1: Point = getPointAtDistance(endPolyline1, startPolyline1, halfWidth);
    const point2: Point = getPointAtDistance(endPolyline2, startPolyline2, halfWidth);
    return [point1, point2];
}

// get the polyline of a converter station of an HVDC line edge
export function getConverterStationPolyline(
    startPolyline1: Point,
    endPolyline1: Point,
    startPolyline2: Point,
    endPolyline2: Point,
    converterStationWidth: number
): string {
    const points: [Point, Point] = getConverterStationPoints(
        startPolyline1,
        endPolyline1,
        startPolyline2,
        endPolyline2,
        converterStationWidth
    );
    return getFormattedPolyline(points[0], null, points[1]);
}

// get the draggable element, if present,
// from the element selected using the mouse
export function getDraggableFrom(element: SVGElement): SVGElement | undefined {
    if (isDraggable(element)) {
        return element;
    } else if (element.parentElement) {
        return getDraggableFrom(element.parentNode as SVGElement);
    }
}

// get the selectable element, if present,
// from the element selected using the mouse
export function getSelectableFrom(element: SVGElement): SVGElement | undefined {
    if (isSelectable(element)) {
        return element;
    } else if (element.parentElement) {
        return getSelectableFrom(element.parentNode as SVGElement);
    }
}

function isDraggable(element: SVGElement): boolean {
    return (
        (hasId(element) &&
            element.parentNode != null &&
            classIsContainerOfDraggables(element.parentNode as SVGElement)) ||
        isTextNode(element) ||
        isBendable(element)
    );
}

function isSelectable(element: SVGElement): boolean {
    return (
        hasId(element) &&
        element.parentNode != null &&
        (element.parentNode as SVGElement).classList.contains('nad-vl-nodes')
    );
}

/**
 * Checks if an SVG element can be highlighted (text node or voltage level element)
 */
export function isHighlightableElement(element: SVGElement | null): boolean {
    return isTextNode(element) || isVoltageLevelElement(element);
}

function hasId(element: SVGElement): boolean {
    return typeof element.id != 'undefined' && element.id != '';
}

function classIsContainerOfDraggables(element: SVGElement): boolean {
    return (
        element.classList.contains('nad-vl-nodes') ||
        element.classList.contains('nad-boundary-nodes') ||
        element.classList.contains('nad-3wt-nodes')
    );
}

function classIsContainerOfHoverables(element: SVGElement): boolean {
    return (
        element.classList.contains('nad-branch-edges') ||
        element.classList.contains('nad-3wt-edges') ||
        element.classList.contains('nad-vl-nodes') ||
        element.classList.contains('nad-injections')
    );
}
// get radius of voltage level
export function getVoltageLevelCircleRadius(nbNeighbours: number, voltageLevelCircleRadius: number): number {
    return Math.min(Math.max(nbNeighbours + 1, 1), 2) * voltageLevelCircleRadius;
}

// get inner and outer radius of bus node and radius of voltage level
export function getNodeRadius(
    nbNeighbours: number,
    voltageLevelCircleRadius: number,
    busIndex: number,
    interAnnulusSpace: number
): [number, number, number] {
    const vlCircleRadius: number = getVoltageLevelCircleRadius(nbNeighbours, voltageLevelCircleRadius);
    const unitaryRadius = vlCircleRadius / (nbNeighbours + 1);
    return [
        busIndex == 0 ? 0 : busIndex * unitaryRadius + interAnnulusSpace / 2,
        (busIndex + 1) * unitaryRadius - interAnnulusSpace / 2,
        vlCircleRadius,
    ];
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

function getAttribute(element: HTMLElement, tagName: string, attribute: string): string | null {
    if (element.tagName !== tagName) {
        return null;
    }
    return element.getAttribute(attribute);
}

// get points of a polyline
export function getPolylinePoints(polyline: HTMLElement): Point[] | null {
    const polylinePoints = getAttribute(polyline, 'polyline', 'points');
    if (polylinePoints == null) {
        return null;
    }
    const coordinates: string[] = polylinePoints.split(/[, ]/);
    if (coordinates.length < 4) {
        return null;
    }
    const points: Point[] = [];
    for (let index = 0; index < coordinates.length; index = index + 2) {
        const point = new Point(+coordinates[index], +coordinates[index + 1]);
        points.push(point);
    }
    return points;
}

// get angle of first 2 points of a polyline
export function getPolylineAngle(polyline: HTMLElement): number | null {
    const points: Point[] | null = getPolylinePoints(polyline);
    if (points == null) {
        return null;
    }
    return getAngle(points[0], points[1]);
}

function getPathPoints(pathPoints: string): Point[] | null {
    const stringPoints: string[] = pathPoints.split(' ');
    if (stringPoints.length < 2) {
        return null;
    }
    const points: Point[] = [];
    for (let index = 0; index < 2; index++) {
        const coordinates: string[] = stringPoints[index].substring(1).split(',');
        const point = new Point(+coordinates[0], +coordinates[1]);
        points.push(point);
    }
    return points;
}

// get angle of first 2 points of a path
export function getPathAngle(path: HTMLElement): number | null {
    const pathPoints = getAttribute(path, 'path', 'd');
    if (pathPoints == null) {
        return null;
    }
    const points: Point[] | null = getPathPoints(pathPoints);
    if (points == null) {
        return null;
    }
    return getAngle(points[0], points[1]);
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

// check if a DOM element is a text node
export function isTextNode(element: SVGElement | null): boolean {
    return element != null && hasId(element) && element.classList.contains('nad-label-box');
}

// check if a DOM element is an injection
export function isInjection(element: SVGElement | null): boolean {
    return (
        (element != null &&
            hasId(element) &&
            element.parentElement?.parentElement?.parentElement?.classList.contains('nad-injections')) ??
        false
    );
}

// check if a DOM element is a voltage level
export function isVoltageLevelElement(element: SVGElement | null): boolean {
    return element != null && hasId(element) && element.parentElement?.classList.contains('nad-vl-nodes') === true;
}

// get text node id of a vl node
export function getTextNodeId(voltageLevelNodeId: string | undefined): string {
    return voltageLevelNodeId + '-textnode';
}

// get text edge id of a vl node
export function getTextEdgeId(voltageLevelNodeId: string | undefined): string {
    return voltageLevelNodeId + '-textedge';
}

// get vl node id of a text node
export function getVoltageLevelNodeId(textNodeId: string | undefined): string {
    return textNodeId !== undefined ? textNodeId.replace('-textnode', '') : '-1';
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

// Get text node size
export function getTextNodeSize(textNode: SVGGraphicsElement | null): { width: number; height: number } {
    return { width: textNode?.scrollWidth ?? 0, height: textNode?.scrollHeight ?? 0 };
}

// Get the top left corner position of a text box using the box's center position
export function getTextNodeTopLeftCornerFromCenter(textNode: SVGGraphicsElement | null, centrePosition: Point): Point {
    const textNodeSize = getTextNodeSize(textNode);
    return new Point(centrePosition.x - textNodeSize.width / 2, centrePosition.y - textNodeSize.height / 2);
}

// Get the center position of a text box using the box's top left corner position
export function getTextNodeCenterFromTopLeftCorner(
    textNode: SVGGraphicsElement | null,
    topLeftCornerPosition: Point
): Point {
    const textNodeSize = getTextNodeSize(textNode);
    return new Point(
        topLeftCornerPosition.x + textNodeSize.width / 2,
        topLeftCornerPosition.y + textNodeSize.height / 2
    );
}

// get the position of a translated text box
export function getTextNodeTranslatedPosition(textNode: SVGGraphicsElement | null, translation: Point): Point {
    const textNodePosition = getTextNodePosition(textNode);
    return new Point(textNodePosition.x + translation.x, textNodePosition.y + translation.y);
}

// get text node position
export function getTextNodePosition(textNode: SVGGraphicsElement | null): Point {
    const textNodeX = textNode?.style.left.replace('px', '') ?? '0';
    const textNodeY = textNode?.style.top.replace('px', '') ?? '0';
    return new Point(+textNodeX, +textNodeY);
}

// get node move (original and new position)
export function getNodeMove(node: NodeMetadata, nodePosition: Point): NODEMOVE {
    const xNew = round(nodePosition.x);
    const yNew = round(nodePosition.y);
    return { xOrig: node.x, yOrig: node.y, xNew: xNew, yNew: yNew };
}

// Checks if the element is hoverable
// Function to check if the element is hoverable
function isHoverable(element: SVGElement): boolean {
    if (isTextNode(element)) {
        return true;
    }
    if (isInjection(element)) {
        return true;
    }
    return (
        hasId(element) && element.parentNode != null && classIsContainerOfHoverables(element.parentNode as SVGElement)
    );
}

export function getHoverableFrom(element: SVGElement): SVGElement | undefined {
    if (isHoverable(element)) {
        return element;
    } else if (element.parentElement) {
        return getHoverableFrom(element.parentNode as SVGElement);
    }
}
export function getStringEdgeType(edge: EdgeMetadata): string {
    return EdgeType[getEdgeType(edge)];
}

// get moves (original and new position) of position and connetion of text node
export function getTextNodeMoves(
    textNode: TextNodeMetadata,
    vlNode: NodeMetadata,
    textPosition: Point,
    connectionPosition: Point
): [NODEMOVE, NODEMOVE] {
    const xNew = round(textPosition.x - vlNode.x);
    const yNew = round(textPosition.y - vlNode.y);
    const connXNew = round(connectionPosition.x - vlNode.x);
    const connYNew = round(connectionPosition.y - vlNode.y);
    return [
        { xOrig: textNode.shiftX, yOrig: textNode.shiftY, xNew: xNew, yNew: yNew },
        { xOrig: textNode.connectionShiftX, yOrig: textNode.connectionShiftY, xNew: connXNew, yNew: connYNew },
    ];
}

// get arrow element class, based on p value
export function getArrowClass(p: number): string {
    return p < 0 ? 'nad-state-in' : 'nad-state-out';
}

export function isVlNodeFictitious(vlNodeId: string, nodes: NodeMetadata[] | undefined): boolean {
    const node: NodeMetadata | undefined = nodes?.find((node) => node.svgId == vlNodeId);
    return node?.fictitious ?? false;
}

// get the element data from the element selected using the rigth button of the mouse
export function getRightClickableElementData(
    clickedElement: SVGElement,
    nodes: NodeMetadata[] | undefined,
    textNodes: TextNodeMetadata[] | undefined,
    edges: EdgeMetadata[] | undefined
): ElementData | undefined {
    const element = getRightClickableFrom(clickedElement);
    if (!element) {
        return undefined;
    }
    const elementType: ElementType = getElementType(element);
    switch (elementType) {
        case ElementType.VOLTAGE_LEVEL:
        case ElementType.THREE_WINDINGS_TRANSFORMER: {
            const node: NodeMetadata | undefined = nodes?.find((node) => node.svgId == element.id);
            return node != null
                ? { svgId: node.svgId, equipmentId: node.equipmentId, type: ElementType[elementType] }
                : undefined;
        }
        case ElementType.TEXT_NODE: {
            const textNode: TextNodeMetadata | undefined = textNodes?.find((textNode) => textNode.svgId == element.id);
            return textNode != null
                ? { svgId: textNode.svgId, equipmentId: textNode.equipmentId, type: ElementType[elementType] }
                : undefined;
        }
        case ElementType.BRANCH: {
            const edge: EdgeMetadata | undefined = edges?.find((edge) => edge.svgId == element.id);
            return edge != null
                ? { svgId: edge.svgId, equipmentId: edge.equipmentId, type: getStringEdgeType(edge) }
                : undefined;
        }
        default:
            return undefined;
    }
}

function getRightClickableFrom(element: SVGElement): SVGElement | undefined {
    if (isDraggable(element) || isHoverable(element)) {
        return element;
    } else if (element.parentElement) {
        return getRightClickableFrom(element.parentNode as SVGElement);
    }
}

export function getElementType(element: SVGElement | null): ElementType {
    if (isTextNode(element)) {
        return ElementType.TEXT_NODE;
    }
    if (element?.parentElement?.classList.contains('nad-3wt-nodes')) {
        return ElementType.THREE_WINDINGS_TRANSFORMER;
    }
    if (
        element?.parentElement?.classList.contains('nad-vl-nodes') ||
        element?.parentElement?.classList.contains('nad-boundary-nodes')
    ) {
        return ElementType.VOLTAGE_LEVEL;
    }
    if (
        element?.parentElement?.classList.contains('nad-branch-edges') ||
        element?.parentElement?.classList.contains('nad-3wt-edges')
    ) {
        return ElementType.BRANCH;
    }
    return ElementType.UNKNOWN;
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

function getStyleCData(css: string): SVGStyleElement {
    const styleElement = document.createElementNS('http://www.w3.org/2000/svg', 'style');
    const xmlDocument = document.implementation.createDocument(null, null); // used to create CDATA
    const styleCData = xmlDocument.createCDATASection(css);
    styleElement.appendChild(styleCData);
    return styleElement;
}

// get SVG style element starting from CSSs and the SVG element
export function getStyle(styleSheets: StyleSheetList, svgElement: SVGElement | undefined): SVGStyleElement {
    const nadCssRules: string[] = [];
    Array.from(styleSheets).forEach((sheet) => {
        Array.from(sheet.cssRules).forEach((rule) => {
            const cssRule = <CSSStyleRule>rule;
            const ruleElement = svgElement?.querySelector(cssRule.selectorText);
            if (ruleElement) {
                nadCssRules.push(rule.cssText.replace('foreignobject', 'foreignObject'));
            }
        });
    });
    return getStyleCData(nadCssRules.join('\n'));
}

export function getSvgXml(svg: string | null): string {
    const doctype =
        '<?xml version="1.0" standalone="no"?><!DOCTYPE svg PUBLIC "-//W3C//DTD SVG 1.1//EN" "http://www.w3.org/Graphics/SVG/1.1/DTD/svg11.dtd" [<!ENTITY nbsp "&#160;">]>';
    const bytes = new TextEncoder().encode(doctype + svg);
    const encodedSvg = Array.from(bytes, (byte) => String.fromCodePoint(byte)).join('');
    return `data:image/svg+xml;base64,${window.btoa(encodedSvg)}`;
}

export function getPngFromImage(image: HTMLImageElement): string {
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    const pixelRatio = window.devicePixelRatio || 1;
    canvas.width = image.width * pixelRatio;
    canvas.height = image.height * pixelRatio;
    canvas.style.width = `${canvas.width}px`;
    canvas.style.height = `${canvas.height}px`;
    context?.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
    context?.drawImage(image, 0, 0);
    return canvas.toDataURL('image/png', 0.8);
}

export function getBlobFromPng(png: string): Blob {
    const byteString = window.atob(png.split(',')[1]);
    const mimeString = png.split(',')[0].split(':')[1].split(';')[0];
    const buffer = new ArrayBuffer(byteString.length);
    const intArray = new Uint8Array(buffer);
    for (let i = 0; i < byteString.length; i++) {
        intArray[i] = byteString.charCodeAt(i);
    }
    return new Blob([buffer], { type: mimeString });
}

function getButton(inputImg: string, title: string, size: string): HTMLButtonElement {
    const button = document.createElement('button');
    button.style.backgroundImage = `url("${inputImg}")`;
    button.style.backgroundRepeat = 'no-repeat';
    button.style.backgroundPosition = 'center center';
    button.title = title;
    button.style.height = size;
    button.style.width = size;
    button.style.padding = '0px';
    button.style.border = 'none';
    button.style.display = 'flex';
    button.style.alignItems = 'center';
    button.style.justifyContent = 'center';
    return button;
}

export function getZoomToFitButton(): HTMLButtonElement {
    const b = getButton(ZoomToFitSvg, 'Zoom to fit', '25px');
    // button at the bottom: rounded bottom corners and top margin
    b.style.borderRadius = '0 0 5px 5px';
    b.style.marginTop = '1px';
    return b;
}

export function getZoomInButton(): HTMLButtonElement {
    const b = getButton(ZoomInSvg, 'Zoom in', '25px');
    // button at the top: rounded top corners (and no margin)
    b.style.borderRadius = '5px 5px 0 0';
    return b;
}

export function getZoomOutButton(): HTMLButtonElement {
    const b = getButton(ZoomOutSvg, 'Zoom out', '25px');
    // button in the middle: top margin (and no rounded corners)
    b.style.marginTop = '1px';
    return b;
}

export function getSaveSvgButton(): HTMLButtonElement {
    const b = getButton(SaveSvg, 'Save SVG', '30px');
    // button at the left: rounded left corners and right margin
    b.style.borderRadius = '5px 0 0 5px';
    b.style.marginRight = '1px';
    return b;
}

export function getSavePngButton(): HTMLButtonElement {
    const b = getButton(SavePng, 'Save PNG', '30px');
    // button in the middle: no rounded corners and right margin
    b.style.borderRadius = '0 0 0 0';
    b.style.marginRight = '1px';
    return b;
}

export function getScreenshotButton(enabled: boolean): HTMLButtonElement {
    const b = getButton(ScreenshotSvg, 'Screenshot', '30px');
    // button at the right: rounded right corners and no margin
    b.style.borderRadius = '0 5px 5px 0';
    if (!enabled) {
        b.disabled = true;
        b.style.cursor = 'not-allowed';
    }
    return b;
}
