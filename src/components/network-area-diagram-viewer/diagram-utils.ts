/**
 * Copyright (c) 2024, RTE (http://www.rte-france.com)
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

import { Point } from '@svgdotjs/svg.js';
import { SvgParameters } from './svg-parameters';
import { EdgeType, NodeRadius } from './diagram-types';

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

// get fork position of a multibranch edge
export function getPointAtDistanceWithAngle(point: Point, distance: number, angle: number) {
    return new Point(point.x + distance * Math.cos(angle), point.y + distance * Math.sin(angle));
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

function getCirclePath(radius: number, angleStart: number, angleEnd: number, clockWise: boolean): string {
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
export function getFragmentedAnnulusPath(angles: number[], nodeRadius: NodeRadius, nodeHollowWidth: number): string {
    let path: string = '';
    if (angles.length == 0) {
        path =
            'M' +
            getCirclePath(nodeRadius.busOuterRadius, 0, Math.PI, true) +
            ' M' +
            getCirclePath(nodeRadius.busOuterRadius, Math.PI, 0, true);
        if (nodeRadius.busInnerRadius > 0) {
            // going the other way around (counter-clockwise) to subtract the inner circle
            path +=
                ' M' +
                getCirclePath(nodeRadius.busInnerRadius, 0, Math.PI, false) +
                ' M' +
                getCirclePath(nodeRadius.busInnerRadius, Math.PI, 0, false);
        }
        return path;
    }
    const halfWidth = nodeHollowWidth / 2;
    const deltaAngle0 = halfWidth / nodeRadius.busOuterRadius;
    const deltaAngle1 = halfWidth / nodeRadius.busInnerRadius;
    for (let index = 0; index < angles.length; index++) {
        const outerArcStart = angles[index] + deltaAngle0;
        const outerArcEnd = angles[index + 1] - deltaAngle0;
        const innerArcStart = angles[index + 1] - deltaAngle1;
        const innerArcEnd = angles[index] + deltaAngle1;
        if (outerArcEnd > outerArcStart && innerArcEnd < innerArcStart) {
            path =
                path +
                'M' +
                getCirclePath(nodeRadius.busOuterRadius, outerArcStart, outerArcEnd, true) +
                ' L' +
                getCirclePath(nodeRadius.busInnerRadius, innerArcStart, innerArcEnd, false) +
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

export function isTransformerEdge(edgeType: EdgeType): boolean {
    return edgeType == EdgeType.TWO_WINDINGS_TRANSFORMER || edgeType == EdgeType.PHASE_SHIFT_TRANSFORMER;
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

export function completeEdgeAngles(traversingBusEdgesAngles: number[]): number[] {
    if (traversingBusEdgesAngles.length == 0) {
        return [];
    }
    const edgeAngles = Object.assign(
        [],
        traversingBusEdgesAngles.slice().sort(function (a, b) {
            return a - b;
        })
    );
    edgeAngles.push(edgeAngles[0] + 2 * Math.PI);
    return edgeAngles;
}
