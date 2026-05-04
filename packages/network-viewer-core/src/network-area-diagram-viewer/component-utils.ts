/**
 * Copyright (c) 2026, RTE (http://www.rte-france.com)
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 * SPDX-License-Identifier: MPL-2.0
 */

import { LibraryComponent } from './library-component';
import LockSvg from '../resources/default-library/lock.svg';
import FlashSvg from '../resources/default-library/flash.svg';
import UnknownComponentSvg from '../resources/default-library/unknown-component.svg';
import { SVG } from '@svgdotjs/svg.js';

const ComponentSvgMapping: { [key: string]: string } = {
    'lock.svg': LockSvg,
    'flash.svg': FlashSvg,
    'unknown-component.svg': UnknownComponentSvg,
};

export function getComponent(componentLibrary: LibraryComponent[], type: string): LibraryComponent | undefined {
    return componentLibrary.find((component) => component.type == type);
}

export async function getComponentPath(componentFilename: string): Promise<SVGPathElement> {
    const svg = ComponentSvgMapping[componentFilename];
    const response = await fetch(svg);
    const svgContent = await response.text();
    const path = <SVGPathElement>SVG().svg(svgContent).node.firstElementChild?.firstElementChild;
    return path;
}
