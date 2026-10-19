/**
 * Copyright (c) 2026, RTE (http://www.rte-france.com)
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 * SPDX-License-Identifier: MPL-2.0
 */

import DefaultSldComponents from '../resources/sld-default-library/components.json';
import { LibraryComponent, Orientation } from '../common/library-component';

const SVG_NS = 'http://www.w3.org/2000/svg';
const UNKNOWN_COMPONENT = 'UNKNOWN_COMPONENT';

const ROTATION_ANGLE: Record<Orientation, number> = { UP: 0, RIGHT: 90, DOWN: 180, LEFT: 270 };

const svgModules = import.meta.glob<string>('../resources/sld-default-library/*.svg', {
    query: '?raw',
    import: 'default',
    eager: true,
});

const DefaultSldComponentSvgContent: Record<string, string> = Object.fromEntries(
    Object.entries(svgModules).map(([modulePath, content]) => [modulePath.split('/').at(-1)!, content])
);

// Library files are immutable: parsed once, cloned for every symbol.
const elementsCache = new Map<string, Element[]>();

export const DefaultSldLibraryComponents: LibraryComponent[] = DefaultSldComponents as LibraryComponent[];

export interface SldComponentOptions {
    orientation?: Orientation;
    open?: boolean;
}

export function createSldComponentElement(componentType: string, options: SldComponentOptions = {}): SVGGElement {
    const group = document.createElementNS(SVG_NS, 'g');
    const component = findComponent(componentType) ?? findComponent(UNKNOWN_COMPONENT);
    if (!component) {
        return group;
    }
    group.setAttribute('class', component.styleClass);
    if (options.open !== undefined) {
        group.classList.add(options.open ? 'sld-open' : 'sld-closed');
    }
    const transform = getOrientationTransform(component, options.orientation);
    for (const subComponent of component.subComponents ?? []) {
        for (const element of getSubComponentElements(subComponent.fileName)) {
            const clone = element.cloneNode(true) as Element;
            clone.removeAttribute('id');
            if (subComponent.styleClass) {
                clone.classList.add(subComponent.styleClass);
            }
            if (transform) {
                clone.setAttribute('transform', transform);
            }
            group.appendChild(clone);
        }
    }
    return group;
}

function findComponent(componentType: string): LibraryComponent | undefined {
    return DefaultSldLibraryComponents.find((component) => component.type === componentType);
}

function getSubComponentElements(fileName: string): Element[] {
    let elements = elementsCache.get(fileName);
    if (!elements) {
        const svgContent = DefaultSldComponentSvgContent[fileName] ?? '';
        const root = new DOMParser().parseFromString(svgContent, 'image/svg+xml').documentElement;
        elements = Array.from(root.children);
        elementsCache.set(fileName, elements);
    }
    return elements;
}

function getOrientationTransform(component: LibraryComponent, orientation?: Orientation): string | undefined {
    const transformation = orientation ? component.transformations?.[orientation] : undefined;
    if (!transformation) {
        return undefined;
    }
    const { width, height } = component.size;
    switch (transformation) {
        case 'ROTATION':
            return `rotate(${ROTATION_ANGLE[orientation!]},${width / 2},${height / 2})`;
        case 'FLIP':
            return `scale(1,-1) translate(0,${-height})`;
        default:
            return undefined;
    }
}
