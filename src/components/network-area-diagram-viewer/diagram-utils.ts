/**
 * Copyright (c) 2024, RTE (http://www.rte-france.com)
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

import { Point } from '@svgdotjs/svg.js';
import { EdgeMetadata, BusNodeMetadata, NodeMetadata, TextNodeMetadata } from './diagram-metadata';
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
        hasId(element) && element.parentNode != null && classIsContainerOfDraggables(element.parentNode as SVGElement)
    );
}

function isSelectable(element: SVGElement): boolean {
    return (
        hasId(element) &&
        element.parentNode != null &&
        (element.parentNode as SVGElement).classList.contains('nad-vl-nodes')
    );
}

function hasId(element: SVGElement): boolean {
    return typeof element.id != 'undefined' && element.id != '';
}

function classIsContainerOfDraggables(element: SVGElement): boolean {
    return (
        element.classList.contains('nad-vl-nodes') ||
        element.classList.contains('nad-boundary-nodes') ||
        element.classList.contains('nad-3wt-nodes') ||
        element.classList.contains('nad-text-nodes')
    );
}

function classIsContainerOfHoverables(element: SVGElement): boolean {
    return element.classList.contains('nad-branch-edges') || element.classList.contains('nad-3wt-edges');
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
    const coordinates: string[] = polylinePoints.split(/,| /);
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
export function isTextNode(element: SVGGraphicsElement | null): boolean {
    return (
        element != null && element.parentElement != null && element.parentElement.classList.contains('nad-text-nodes')
    );
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

// Get the top left corner position of a text box using the box's center position
export function getTextNodeTopLeftCornerFromCenter(textNode: SVGGraphicsElement | null, centrePosition: Point): Point {
    const textNodeWidth = textNode?.firstElementChild?.scrollWidth ?? 0;
    const textNodeHeight = textNode?.firstElementChild?.scrollHeight ?? 0;
    return new Point(centrePosition.x - textNodeWidth / 2, centrePosition.y - textNodeHeight / 2);
}

// Get the center position of a text box using the box's top left corner position
export function getTextNodeCenterFromTopLeftCorner(
    textNode: SVGGraphicsElement | null,
    topLeftCornerPosition: Point
): Point {
    const textNodeWidth = textNode?.firstElementChild?.scrollWidth ?? 0;
    const textNodeHeight = textNode?.firstElementChild?.scrollHeight ?? 0;
    return new Point(topLeftCornerPosition.x + textNodeWidth / 2, topLeftCornerPosition.y + textNodeHeight / 2);
}

// get the position of a translated text box
export function getTextNodeTranslatedPosition(textNode: SVGGraphicsElement | null, translation: Point): Point {
    const textNodeX = textNode?.getAttribute('x') ?? '0';
    const textNodeY = textNode?.getAttribute('y') ?? '0';
    return new Point(+textNodeX + translation.x, +textNodeY + translation.y);
}

// get text node position
export function getTextNodePosition(textNode: SVGGraphicsElement | null): Point {
    const textNodeX = textNode?.getAttribute('x') ?? '0';
    const textNodeY = textNode?.getAttribute('y') ?? '0';
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

function getElementType(element: SVGElement | null): ElementType {
    if (element?.parentElement?.classList.contains('nad-text-nodes')) {
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

function getButton(svg: string, title: string): HTMLButtonElement {
    const button = document.createElement('button');
    button.innerHTML = svg;
    button.title = title;
    button.style.height = '25px';
    button.style.width = '25px';
    button.style.marginRight = '1px';
    button.style.marginLeft = '1px';
    button.style.marginTop = '1px';
    button.style.marginBottom = '1px';
    button.style.borderRadius = '5px';
    button.style.padding = '0px';
    button.style.border = 'none';
    button.style.display = 'flex';
    button.style.alignItems = 'center';
    button.style.justifyContent = 'center';
    return button;
}

export function getZoomToFitButton(): HTMLButtonElement {
    return getButton(
        '<svg xmlns="http://www.w3.org/2000/svg" height="15px" viewBox="0 -960 960 960" width="15px" fill="#5f6368"><path d="M200-120q-33 0-56.5-23.5T120-200v-160h80v160h160v80H200Zm400 0v-80h160v-160h80v160q0 33-23.5 56.5T760-120H600ZM120-600v-160q0-33 23.5-56.5T200-840h160v80H200v160h-80Zm640 0v-160H600v-80h160q33 0 56.5 23.5T840-760v160h-80Z"/></svg>',
        'Zoom to fit'
    );
}
