/**
 * Copyright (c) 2026, RTE (http://www.rte-france.com)
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 * SPDX-License-Identifier: MPL-2.0
 */

import { LibraryComponent } from './library-component';
import { SVG } from '@svgdotjs/svg.js';

const svgModules = import.meta.glob('../resources/default-library/*.svg', {
    query: '?url',
    import: 'default',
    eager: true,
});

const DefaultComponentSvgMapping: Record<string, string> = Object.fromEntries(
    Object.entries(svgModules).map(([modulePath, url]) => {
        const fileName = modulePath.split('/').at(-1)!;
        return [fileName, url as string];
    })
);

export function getComponent(componentLibrary: LibraryComponent[], type: string): LibraryComponent | undefined {
    return componentLibrary.find((component) => component.type == type);
}

export async function getComponentPath(
    componentFilename: string,
    svgUrlResolver?: (fileName: string) => string
): Promise<SVGPathElement> {
    const url = svgUrlResolver ? svgUrlResolver(componentFilename) : DefaultComponentSvgMapping[componentFilename];
    const response = await fetch(url);
    const svgContent = await response.text();
    const path = <SVGPathElement>SVG().svg(svgContent).node.firstElementChild?.firstElementChild;
    return path;
}
