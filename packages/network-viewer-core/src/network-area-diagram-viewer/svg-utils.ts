/**
 * Copyright (c) 2025, RTE (http://www.rte-france.com)
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 * SPDX-License-Identifier: MPL-2.0
 */

import { Point } from '@svgdotjs/svg.js';
import { getAngle, getDistance, getFormattedPoint } from './diagram-utils';
import { ElementType, ViewBox } from './diagram-types';

export type NearbyElement = {
    element: SVGElement;
    position: Point;
};

// Find the closest voltage-level node whose rendered bounds are within precision.
export function findNearbyNode(
    svgRoot: ParentNode,
    mousePosition: Point,
    precision: number
): NearbyElement | undefined {
    const nodes = svgRoot.querySelectorAll<SVGGraphicsElement>('.nad-vl-nodes > [id]');
    let closest: (NearbyElement & { distance: number }) | undefined;

    nodes.forEach((node) => {
        const bounds = node.getBoundingClientRect();
        if ((bounds.width === 0 && bounds.height === 0) || !isVoltageLevelElement(node)) {
            return;
        }

        // Clamp the pointer to the bounds to get the closest point on the node.
        const position = new Point(
            Math.max(bounds.left, Math.min(mousePosition.x, bounds.right)),
            Math.max(bounds.top, Math.min(mousePosition.y, bounds.bottom))
        );
        const distance = getDistance(mousePosition, position);
        if (distance <= precision && (!closest || distance < closest.distance)) {
            closest = { element: node, position, distance };
        }
    });

    return closest;
}

export function findNearbyEdge(
    svgRoot: ParentNode,
    mousePosition: Point,
    precision: number
): NearbyElement | undefined {
    const edgePaths = svgRoot.querySelectorAll<SVGGeometryElement>(
        '.nad-branch-edges .nad-edge-path, .nad-3wt-edges .nad-edge-path'
    );
    let closest: (NearbyElement & { distance: number }) | undefined;

    edgePaths.forEach((edgePath) => {
        const element = getHoverableFrom(edgePath);
        const matrix = edgePath.getScreenCTM();
        if (!element || !matrix || typeof edgePath.getTotalLength !== 'function') {
            return;
        }

        // Skip paths whose bounds are too far away before sampling their geometry.
        const bounds = edgePath.getBoundingClientRect();
        const dx = Math.max(bounds.left - mousePosition.x, 0, mousePosition.x - bounds.right);
        const dy = Math.max(bounds.top - mousePosition.y, 0, mousePosition.y - bounds.bottom);
        if (Math.hypot(dx, dy) > precision) {
            return;
        }

        const totalLength = edgePath.getTotalLength();
        const scale = Math.max(Math.hypot(matrix.a, matrix.b), Math.hypot(matrix.c, matrix.d));
        const steps = Math.max(1, Math.ceil((totalLength * scale) / 5));
        let previousPoint: Point | undefined;

        // Sample at roughly 5 screen-pixel intervals so the precision check works at any zoom.
        for (let step = 0; step <= steps; step++) {
            const localPoint = edgePath.getPointAtLength((totalLength * step) / steps);
            // Convert each path sample from local coordinates to screen coordinates.
            const point = new Point(
                matrix.a * localPoint.x + matrix.c * localPoint.y + matrix.e,
                matrix.b * localPoint.x + matrix.d * localPoint.y + matrix.f
            );

            if (previousPoint) {
                const segmentX = point.x - previousPoint.x;
                const segmentY = point.y - previousPoint.y;
                const segmentLengthSquared = segmentX * segmentX + segmentY * segmentY;
                // Project the pointer onto this segment and clamp to its endpoints.
                const projection = segmentLengthSquared
                    ? Math.max(
                          0,
                          Math.min(
                              1,
                              ((mousePosition.x - previousPoint.x) * segmentX +
                                  (mousePosition.y - previousPoint.y) * segmentY) /
                                  segmentLengthSquared
                          )
                      )
                    : 0;
                const nearestPoint = new Point(
                    previousPoint.x + projection * segmentX,
                    previousPoint.y + projection * segmentY
                );
                const distance = getDistance(mousePosition, nearestPoint);
                // Keep the closest segment hit within the configured precision.
                if (distance <= precision && (!closest || distance < closest.distance)) {
                    closest = { element, position: nearestPoint, distance };
                }
            }
            previousPoint = point;
        }
    });

    return closest;
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
        (hasId(element) &&
            element.parentNode != null &&
            (element.parentNode as SVGElement).classList.contains('nad-vl-nodes')) ||
        isTextNode(element)
    );
}

function hasId(element: SVGElement): boolean {
    return element.id != undefined && element.id != '';
}

function classIsContainerOfDraggables(element: SVGElement): boolean {
    return (
        element.classList.contains('nad-vl-nodes') ||
        element.classList.contains('nad-boundary-nodes') ||
        element.classList.contains('nad-3wt-nodes')
    );
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

function classIsContainerOfHoverables(element: SVGElement): boolean {
    return (
        element.classList.contains('nad-branch-edges') ||
        element.classList.contains('nad-3wt-edges') ||
        element.classList.contains('nad-vl-nodes') ||
        element.classList.contains('nad-injections')
    );
}

export function getBendableFrom(element: SVGElement): SVGElement | undefined {
    if (isBendable(element)) {
        return element;
    } else if (element.parentElement) {
        return getBendableFrom(element.parentNode as SVGElement);
    }
}

export function isBendable(element: SVGElement): boolean {
    return element.classList.contains('nad-line-point');
}

export function getBendableLineFrom(element: SVGElement, bendableIds: string[]): SVGElement | undefined {
    if (isBendableLine(element, bendableIds)) {
        return element;
    } else if (element.parentElement) {
        return getBendableLineFrom(element.parentNode as SVGElement, bendableIds);
    }
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

export function getRightClickableFrom(element: SVGElement): SVGElement | undefined {
    if (isDraggable(element) || isHoverable(element)) {
        return element;
    } else if (element.parentElement) {
        return getRightClickableFrom(element.parentNode as SVGElement);
    }
}

// check if a DOM element is a text node
export function isTextNode(element: SVGElement | null): boolean {
    return element?.parentElement?.classList.contains('nad-text-nodes') ?? false;
}

/**
 * Checks if an SVG element can be highlighted (text node or voltage level element)
 */
export function isHighlightableElement(element: SVGElement | null): boolean {
    return isTextNode(element) || isVoltageLevelElement(element);
}

export function createLinePointElement(
    edgeId: string,
    linePoint: Point,
    index: number,
    previewPoint?: boolean,
    linePointIndexMap?: Map<string, { edgeId: string; index: number }>
): SVGElement {
    const linePointElement = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    linePointElement.setAttribute('transform', 'translate(' + getFormattedPoint(linePoint) + ')');

    const squareElement = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
    squareElement.setAttribute('width', '16');
    squareElement.setAttribute('height', '16');
    squareElement.setAttribute('x', '-8');
    squareElement.setAttribute('y', '-8');

    if (previewPoint) {
        linePointElement.classList.add('nad-line-point-preview');
    }

    linePointElement.appendChild(squareElement);

    if (!previewPoint && linePointIndexMap) {
        linePointElement.id = crypto.randomUUID();
        linePointElement.classList.add('nad-line-point');
        linePointIndexMap.set(linePointElement.id, { edgeId: edgeId, index: index });
    }
    return linePointElement;
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

function getAttribute(element: HTMLElement, tagName: string, attribute: string): string | null {
    if (element.tagName !== tagName) {
        return null;
    }
    return element.getAttribute(attribute);
}

// get points of a polyline
export function getPolylinePoints(polyline: HTMLElement | null): Point[] | null {
    if (!polyline) {
        return null;
    }
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

// get angle of first 2 points of a path
export function getPathAngle(path: HTMLElement): number | null {
    const pathPoints = getAttribute(path, 'path', 'd');
    const points: Point[] | null = getPathPoints(pathPoints);
    if (points == null) {
        return null;
    }
    return getAngle(points[0], points[1]);
}

export function getPathPoints(pathPoints: string | null): Point[] | null {
    if (pathPoints == null) {
        return null;
    }

    const stringPoints: string[] = pathPoints.split(' ');
    if (stringPoints.length < 2) {
        return null;
    }

    const startsWithLetter = (str: string): boolean => /^[a-zA-Z]/.test(str);

    const points: Point[] = [];
    for (let index = 0; index < 5; index++) {
        const coordinates: string[] = stringPoints[index].split(',');
        if (startsWithLetter(coordinates[0])) {
            coordinates[0] = coordinates[0].substring(1);
        }
        const point = new Point(+coordinates[0], +coordinates[1]);
        points.push(point);
    }
    return points;
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

// Get text node size
export function getTextNodeSize(textNode: SVGGraphicsElement | null): { width: number; height: number } {
    return {
        width: textNode?.firstElementChild?.scrollWidth ?? 0,
        height: textNode?.firstElementChild?.scrollHeight ?? 0,
    };
}

// Get the top left corner position of a text box using the box's center position
export function getTextNodeTopLeftCornerFromCenter(textNode: SVGGraphicsElement | null, centrePosition: Point): Point {
    const textNodeSize = getTextNodeSize(textNode);
    return new Point(centrePosition.x - textNodeSize.width / 2, centrePosition.y - textNodeSize.height / 2);
}

// get the position of a translated text box
export function getTextNodeTranslatedPosition(textNode: SVGGraphicsElement | null, translation: Point): Point {
    const textNodePosition = getTextNodePosition(textNode);
    return new Point(textNodePosition.x + translation.x, textNodePosition.y + translation.y);
}

// get text node position
export function getTextNodePosition(textNode: SVGGraphicsElement | null): Point {
    const textNodeX = textNode?.getAttribute('x') ?? '0';
    const textNodeY = textNode?.getAttribute('y') ?? '0';
    return new Point(+textNodeX, +textNodeY);
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
    return `data:image/svg+xml;base64,${globalThis.btoa(encodedSvg)}`;
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
    const byteString = globalThis.atob(png.split(',')[1]);
    const mimeString = png.split(',')[0].split(':')[1].split(';')[0];
    const buffer = new ArrayBuffer(byteString.length);
    const intArray = new Uint8Array(buffer);
    for (let i = 0; i < byteString.length; i++) {
        intArray[i] = byteString.codePointAt(i) ?? Number.NaN;
    }
    return new Blob([buffer], { type: mimeString });
}

// compute the visible area box, considering that it may extend beyond the viewBox
// when the container and the viewBox have different aspect ratio
export function computeVisibleArea(
    vbox: ViewBox | undefined,
    containerWidth: number,
    containerHeight: number
): ViewBox | undefined {
    if (!vbox) return;

    if (vbox.width == 0 || vbox.height == 0 || containerWidth == 0 || containerHeight == 0) return;

    const scaleWidth = containerWidth / vbox.width;
    const scaleHeight = containerHeight / vbox.height;
    const scale = Math.min(scaleWidth, scaleHeight);

    const dx = (containerWidth / scale - vbox.width) / 2;
    const dy = (containerHeight / scale - vbox.height) / 2;

    return {
        x: vbox.x - dx,
        y: vbox.y - dy,
        width: vbox.width + dx * 2,
        height: vbox.height + dy * 2,
    };
}
