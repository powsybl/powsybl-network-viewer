/**
 * Copyright (c) 2026, RTE (http://www.rte-france.com)
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 * SPDX-License-Identifier: MPL-2.0
 */

import { DiagramMetadata } from './diagram-metadata.ts';
import {
    NadBranchStyle,
    NadBusNodeStyle,
    NadInjectionStyle,
    NadLineStyle,
    NadStyleProvider,
    NadThreeWtStyle,
} from './nad-style-registry.ts';

// Bus Node Style
export function updateBusNodesStyle(diagramMetadata: DiagramMetadata, container: HTMLElement, style: NadStyleProvider) {
    diagramMetadata?.busNodes.forEach((busNode) => {
        const busNodeStyle: NadBusNodeStyle | undefined = style?.getBusNodeStyle?.(busNode?.equipmentId);
        if (busNodeStyle) {
            const element = container.querySelector<SVGElement>(`[id="${busNode.svgId}"]`);
            if (element) {
                element.removeAttribute('style');
                applyBusNodeStyle(element, busNodeStyle);
            }
        }
    });
}

// Edge / Branch Style
export function updateEdgeStyle(diagramMetadata: DiagramMetadata, container: HTMLElement, style: NadStyleProvider) {
    diagramMetadata?.edges.forEach((edge) => {
        const branchStyle: NadBranchStyle | undefined = style?.getBranchStyle?.(edge?.equipmentId);
        if (branchStyle) {
            const element = container.querySelector<SVGElement>(`[id="${edge.svgId}"]`);
            if (element) {
                const paths = element.querySelectorAll(':scope > path');
                const polylines = element.querySelectorAll(':scope > polyline');
                const circles = element.querySelectorAll(':scope > g > circle');
                if (paths.length == 2) {
                    paths.forEach((elem) => elem.removeAttribute('style'));
                    applyStyleOnSides(paths, branchStyle);
                }
                if (polylines.length == 2) {
                    polylines.forEach((elem) => elem.removeAttribute('style'));
                    applyStyleOnSides(polylines, branchStyle);
                }
                if (circles.length == 2) {
                    circles.forEach((elem) => elem.removeAttribute('style'));
                    applyStyleOnSides(circles, branchStyle);
                }
            }
        }
        if (edge.type == 'ThreeWtEdge') {
            const threeEdgeStyle: NadThreeWtStyle | undefined = style?.getThreeWtStyle?.(edge.equipmentId);
            if (threeEdgeStyle) {
                const element = container.querySelector<SVGElement>(`[id="${edge.svgId}"]`);
                if (element) {
                    const polyline = element.querySelector(':scope > polyline') as SVGElement;
                    if (edge.side == 'ONE' && threeEdgeStyle.side1) {
                        polyline.removeAttribute('style');
                        applyLineStyle(polyline, threeEdgeStyle.side1);
                    }
                    if (edge.side == 'TWO' && threeEdgeStyle.side2) {
                        polyline.removeAttribute('style');
                        applyLineStyle(polyline, threeEdgeStyle.side2);
                    }
                    if (edge.side == 'THREE' && threeEdgeStyle.side3) {
                        polyline.removeAttribute('style');
                        applyLineStyle(polyline, threeEdgeStyle.side3);
                    }
                }
            }
        }
    });
}
// Injections Style
export function updateInjectionStyle(
    diagramMetadata: DiagramMetadata,
    container: HTMLElement,
    style: NadStyleProvider
) {
    if (diagramMetadata?.injections) {
        diagramMetadata.injections.forEach((injectionNode) => {
            const injectionNodeStyle: NadInjectionStyle | undefined = style?.getInjectionStyle?.(
                injectionNode?.equipmentId
            );
            if (injectionNodeStyle) {
                const element = container.querySelector<SVGElement>(`[id="${injectionNode.svgId}"]`) as SVGElement;
                const subElements = element.querySelectorAll('*');
                if (element) {
                    element.removeAttribute('style');
                    subElements.forEach((value) => applyInjectionNodeStyle(value as SVGElement, injectionNodeStyle));
                }
            }
        });
    }
}

// ThreeWT Node Style (just node, the branch done in EdgeStyle function)
export function updateThreeWTNodeStyle(
    diagramMetadata: DiagramMetadata,
    container: HTMLElement,
    style: NadStyleProvider
) {
    diagramMetadata?.nodes.forEach((node) => {
        const threeNodeStyle: NadThreeWtStyle | undefined = style?.getThreeWtStyle?.(node.equipmentId);
        if (node.type == 'THREEWT') {
            const element = container.querySelector<SVGElement>(`[id="${node.svgId}"]`) as SVGElement;
            const circles = element.querySelectorAll(':scope > circle');
            if (circles.length == 3 && threeNodeStyle) {
                circles.forEach((elem) => elem.removeAttribute('style'));
                if (threeNodeStyle.side1) applyLineStyle(circles.item(0) as SVGElement, threeNodeStyle.side1);
                if (threeNodeStyle.side2) applyLineStyle(circles.item(1) as SVGElement, threeNodeStyle.side2);
                if (threeNodeStyle.side3) applyLineStyle(circles.item(2) as SVGElement, threeNodeStyle.side3);
            }
        }
        // legend style linked to busNode (no information in metadata busNode section, look first in nodes section)
        const legendElement = container.querySelector<SVGElement>(`[id="${node.legendSvgId}"]`);
        if (legendElement) {
            const legendSquareElement = legendElement.querySelector(':scope .nad-legend-square') as SVGElement;
            if (legendSquareElement) {
                const busNode = diagramMetadata?.busNodes.find((bus) => bus.equipmentId.startsWith(node.equipmentId));
                if (busNode) {
                    const busNodeStyle: NadBusNodeStyle | undefined = style?.getBusNodeStyle?.(busNode?.equipmentId);
                    if (busNodeStyle) {
                        legendSquareElement.removeAttribute('style');
                        if (busNodeStyle.fill) {
                            legendSquareElement?.style.setProperty('background', busNodeStyle.fill);
                            legendSquareElement?.style.setProperty('fill', busNodeStyle.fill);
                            legendSquareElement?.style.setProperty('stroke', 'black');
                        }
                    }
                }
            }
        }
    });
}

function applyBusNodeStyle(element: SVGElement, busNodeStyle: NadBusNodeStyle) {
    if (busNodeStyle.fill) element?.style.setProperty('fill', busNodeStyle.fill);
    if (busNodeStyle.stroke) element?.style.setProperty('stroke', busNodeStyle.stroke);
    if (busNodeStyle.strokeWidth) element?.style.setProperty('stroke-width', busNodeStyle.strokeWidth);
    if (busNodeStyle.strokeDasharray) element?.style.setProperty('stroke-dasharray', busNodeStyle.strokeDasharray);
}

function applyStyleOnSides(elements: NodeListOf<Element>, nadBranchStyle: NadBranchStyle) {
    //side 1
    const side1Style = nadBranchStyle.side1;
    if (side1Style) {
        const sideElement = elements.item(0) as SVGElement;
        if (side1Style.stroke) sideElement?.style.setProperty('stroke', side1Style.stroke);
        if (side1Style.strokeWidth) sideElement?.style.setProperty('stroke-width', side1Style.strokeWidth);
        if (side1Style.strokeDasharray) sideElement?.style.setProperty('stroke-dasharray', side1Style.strokeDasharray);
    }
    //side 2
    const side2Style = nadBranchStyle.side2;
    if (side2Style) {
        const sideElement = elements.item(1) as SVGElement;
        if (side2Style.stroke) sideElement?.style.setProperty('stroke', side2Style.stroke);
        if (side2Style.strokeWidth) sideElement?.style.setProperty('stroke-width', side2Style.strokeWidth);
        if (side2Style.strokeDasharray) sideElement?.style.setProperty('stroke-dasharray', side2Style.strokeDasharray);
    }
}

function applyLineStyle(element: SVGElement, lineStyle: NadLineStyle) {
    if (lineStyle.stroke) element?.style.setProperty('stroke', lineStyle.stroke);
    if (lineStyle.strokeWidth) element?.style.setProperty('stroke-width', lineStyle.strokeWidth);
    if (lineStyle.strokeDasharray) element?.style.setProperty('stroke-dasharray', lineStyle.strokeDasharray);
}

function applyInjectionNodeStyle(element: SVGElement, injectionStyle: NadInjectionStyle) {
    if (injectionStyle.stroke) element?.style.setProperty('stroke', injectionStyle.stroke);
    if (injectionStyle.strokeWidth) element?.style.setProperty('stroke-width', injectionStyle.strokeWidth);
    if (injectionStyle.strokeDasharray) element?.style.setProperty('stroke-dasharray', injectionStyle.strokeDasharray);
}
