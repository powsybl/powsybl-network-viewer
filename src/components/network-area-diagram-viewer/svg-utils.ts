/**
 * Copyright (c) 2025, RTE (http://www.rte-france.com)
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 * SPDX-License-Identifier: MPL-2.0
 */

import { Point } from '@svgdotjs/svg.js';
import { getAngle, getFormattedPoint } from './diagram-utils';
import { ElementType } from './diagram-types';

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
    return element != null && hasId(element) && element.classList.contains('nad-label-box');
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
    const points: Point[] = [];
    for (let index = 0; index < 2; index++) {
        const coordinates: string[] = stringPoints[index].substring(1).split(',');
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
    return { width: textNode?.scrollWidth ?? 0, height: textNode?.scrollHeight ?? 0 };
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
    const textNodeX = textNode?.style.left.replace('px', '') ?? '0';
    const textNodeY = textNode?.style.top.replace('px', '') ?? '0';
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
        intArray[i] = byteString.charCodeAt(i);
    }
    return new Blob([buffer], { type: mimeString });
}
