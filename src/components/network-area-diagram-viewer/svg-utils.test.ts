/**
 * Copyright (c) 2025, RTE (http://www.rte-france.com)
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 * SPDX-License-Identifier: MPL-2.0
 */

import { Point, SVG } from '@svgdotjs/svg.js';
import * as SvgUtils from './svg-utils';
import { radToDeg } from './diagram-utils';

test('getDraggableFrom', () => {
    let draggagleElement = SvgUtils.getDraggableFrom(getSvgNode());
    expect(draggagleElement).not.toBeUndefined();
    draggagleElement = SvgUtils.getDraggableFrom(getSvgTextNode());
    expect(draggagleElement).not.toBeUndefined();

    draggagleElement = SvgUtils.getDraggableFrom(getSvgLinePointElement());
    expect(draggagleElement).not.toBeUndefined();

    draggagleElement = SvgUtils.getDraggableFrom(getSvgLoopEdge());
    expect(draggagleElement).toBeUndefined();
});

test('getSelectableFrom', () => {
    let selectableElement = SvgUtils.getSelectableFrom(getSvgNode());
    expect(selectableElement).not.toBeUndefined();
    selectableElement = SvgUtils.getSelectableFrom(getSvgTextNode());
    expect(selectableElement).toBeUndefined();
    selectableElement = SvgUtils.getSelectableFrom(getSvgLoopEdge());
    expect(selectableElement).toBeUndefined();
});

test('getPolylinePoints', () => {
    const points = SvgUtils.getPolylinePoints(getSvgPolyline());
    expect(points?.length).toBe(2);
    expect(points?.at(0)?.x).toBe(173.73);
    expect(points?.at(0)?.y).toBe(100.97);
    expect(points?.at(1)?.x).toBe(-8.21);
    expect(points?.at(1)?.y).toBe(-210.51);
});

test('getPolylineAngle', () => {
    const angle = radToDeg(SvgUtils.getPolylineAngle(getSvgPolyline()) ?? 0);
    expect(angle).toBeCloseTo(-120, 0);
});

test('getPathAngle', () => {
    const angle = radToDeg(SvgUtils.getPathAngle(getSvgPath()) ?? 0);
    expect(angle).toBeCloseTo(-51, 0);
});

test('getPathPoints', () => {
    const points = SvgUtils.getPathPoints(getSvgPath().getAttribute('d'));
    expect(points?.length).toBe(5);
    expect(points?.at(0)?.x).toBe(350.33);
    expect(points?.at(0)?.y).toBe(-167.48);
    expect(points?.at(1)?.x).toBe(364.63);
    expect(points?.at(1)?.y).toBe(-184.85);
    expect(points?.at(2)?.x).toBe(390.06);
    expect(points?.at(2)?.y).toBe(-215.73);
    expect(points?.at(3)?.x).toBe(412.13);
    expect(points?.at(3)?.y).toBe(-202.64);
    expect(points?.at(4)?.x).toBe(415.64);
    expect(points?.at(4)?.y).toBe(-193.28);
});

test('isTextNode', () => {
    const isTextNode = SvgUtils.isTextNode(getSvgTextNode());
    expect(isTextNode).toBe(true);
});

test('getTextNodeSize', () => {
    // In the tests, the scrollWidth and scrollHeight of the foreignObject's div elements are not correctly detected.
    // We have to mock them to test the getTextNodeSize function.

    // Mock the SVGGraphicsElement and its scroll dimensions
    const mockGetSvgTextNode = getSvgTextNode();

    // Mock the scrollWidth and scrollHeight
    Object.defineProperty(mockGetSvgTextNode, 'scrollWidth', { value: 100, writable: true });
    Object.defineProperty(mockGetSvgTextNode, 'scrollHeight', { value: 50, writable: true });

    const textNodeSize = SvgUtils.getTextNodeSize(mockGetSvgTextNode);
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

    const textNodeTopLeftCorner = SvgUtils.getTextNodeTopLeftCornerFromCenter(mockGetSvgTextNode, new Point(240, -310));
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

    const textNodeCenter = SvgUtils.getTextNodeCenterFromTopLeftCorner(mockGetSvgTextNode, new Point(290, -285));
    expect(textNodeCenter.x).toBe(290 + 100 / 2);
    expect(textNodeCenter.y).toBe(-285 + 50 / 2);
});

test('getTextNodeTranslatedPosition', () => {
    const textNodePosition = SvgUtils.getTextNodeTranslatedPosition(getSvgTextNode(), new Point(10, 10));
    expect(textNodePosition.x).toBe(-343);
    expect(textNodePosition.y).toBe(-304);
});

test('getTextNodePosition', () => {
    const textNodePosition = SvgUtils.getTextNodePosition(getSvgTextNode());
    expect(textNodePosition.x).toBe(-353);
    expect(textNodePosition.y).toBe(-314);
});

test('getHoverableFrom', () => {
    let hoverableElement = SvgUtils.getHoverableFrom(getSvgNode());
    expect(hoverableElement).not.toBeUndefined();
    hoverableElement = SvgUtils.getHoverableFrom(getSvgTextNode());
    expect(hoverableElement).not.toBeUndefined();
    hoverableElement = SvgUtils.getHoverableFrom(getSvgLoopEdge());
    expect(hoverableElement).not.toBeUndefined();
});

test('getBendableFrom', () => {
    let bendableElement = SvgUtils.getBendableFrom(getSvgNode());
    expect(bendableElement).toBeUndefined();
    bendableElement = SvgUtils.getBendableFrom(getSvgLinePointElement());
    expect(bendableElement).not.toBeUndefined();
    bendableElement = SvgUtils.getBendableFrom(getSvgLoopEdge());
    expect(bendableElement).toBeUndefined();
});

test('getBendableLineFrom', () => {
    let bendableLine = SvgUtils.getBendableLineFrom(getSvgNode(), ['14']);
    expect(bendableLine).toBeUndefined();
    bendableLine = SvgUtils.getBendableLineFrom(getSvgLineEdge(), ['14']);
    expect(bendableLine).not.toBeUndefined();
    bendableLine = SvgUtils.getBendableLineFrom(getSvgLineEdge(), ['16']);
    expect(bendableLine).toBeUndefined();
});

test('getStyle', () => {
    const expectedStyle =
        '.nad-branch-edges .nad-edge-path, .nad-3wt-edges .nad-edge-path {stroke: var(--nad-vl-color, lightgrey); stroke-width: 5; fill: none;}\n' +
        '.nad-branch-edges .nad-winding, .nad-3wt-nodes .nad-winding {stroke: var(--nad-vl-color, lightgrey); stroke-width: 5; fill: none;}';
    const styleEl = document.createElement('style');
    styleEl.innerHTML = expectedStyle + '\n.nad-text-edges {stroke: black; stroke-width: 3; stroke-dasharray: 6,7}';
    document.head.appendChild(styleEl);
    const style = SvgUtils.getStyle(document.styleSheets, getSvgLoopEdge());
    expect(style.textContent).toBe(expectedStyle);
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
        '<g class="nad-line-points">' +
        '<g id="67-point" class="nad-line-point" transform="translate(-679.99,-11.42)"><circle r="10"></circle></g></g>';
    return <SVGGraphicsElement>SVG().svg(linePointSvg).node.firstElementChild?.firstElementChild;
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

test('computeVisibleArea', () => {
    //viewbox and container aspect ratios are the same: the viewbox does not extend
    let result = SvgUtils.computeVisibleArea({ x: 0, y: 0, width: 100, height: 100 }, 250, 250);
    expect(result).toEqual({ x: 0, y: 0, width: 100, height: 100 });

    //viewbox and container aspect ratios differ (container is wider): the viewbox extends horizontally
    result = SvgUtils.computeVisibleArea({ x: 100, y: 100, width: 200, height: 150 }, 1000, 500);
    expect(result).toEqual({ x: 50, y: 100, width: 300, height: 150 });

    //viewbox and container aspect ratios differ (container is taller): the viewbox extends vertically
    result = SvgUtils.computeVisibleArea({ x: -500, y: 1500, width: 1000, height: 1000 }, 500, 1500);
    expect(result).toEqual({ x: -500, y: 500, width: 1000, height: 3000 });
});
