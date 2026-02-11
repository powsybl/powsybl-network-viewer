/**
 * Copyright (c) 2026, RTE (http://www.rte-france.com)
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 * SPDX-License-Identifier: MPL-2.0
 */

import IEE14CdfNetworkMetadata from '../resources/test-data/nad-ieee14cdf-solved_metadata.json';

import { readFileSync } from 'fs';
import { join } from 'path';
import { SvgWriter } from './svg-writer';

test('testIEE14CdfNetwork', () => {
    const expectedSvg = normalizeXml(getSvgFromFile('../resources/test-data/nad-ieee14cdf-solved.svg'));
    const createdSvg = normalizeXml(new SvgWriter(IEE14CdfNetworkMetadata).getSvg());
    expect(createdSvg).toBe(expectedSvg);
});

function getSvgFromFile(file: string): string {
    const filePath = join(__dirname, file);
    const fileContent = readFileSync(filePath, 'utf8');
    return fileContent;
}

function normalizeXml(xml: string): string {
    const parser = new DOMParser();
    const doc = parser.parseFromString(xml, 'text/xml');
    removeWhitespaceNodes(doc);
    sortAttributes(doc);
    return new XMLSerializer().serializeToString(doc);
}

function removeWhitespaceNodes(node: Node): void {
    for (let i = node.childNodes.length - 1; i >= 0; i--) {
        const child = node.childNodes[i];
        if (child.nodeType === Node.TEXT_NODE && !child.nodeValue?.trim()) {
            node.removeChild(child);
        } else if (child.nodeType === Node.ELEMENT_NODE) {
            removeWhitespaceNodes(child);
        }
    }
}

function sortAttributes(doc: XMLDocument) {
    const walker = doc.createTreeWalker(doc, NodeFilter.SHOW_ELEMENT);
    while (walker.nextNode()) {
        const el = walker.currentNode as Element;
        const attrs = Array.from(el.attributes).sort((a, b) => a.name.localeCompare(b.name));
        for (const attr of attrs) {
            el.removeAttributeNode(attr);
        }
        for (const attr of attrs) {
            el.setAttributeNode(attr);
        }
    }
}
