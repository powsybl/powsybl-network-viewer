/**
 * Copyright (c) 2024, RTE (http://www.rte-france.com)
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 * SPDX-License-Identifier: MPL-2.0
 */

import { NadViewerParametersOptions } from './nad-viewer-parameters';
import { NetworkAreaDiagramViewer } from './network-area-diagram-viewer';
import { NadStyleProvider, NadStyleRegistry } from './nad-style-registry';
import { DiagramMetadata } from './diagram-metadata';

describe('Test network-area-diagram-viewer', () => {
    // SVG aren't loaded properly in DOM with Vitest. Has to be enriched...
    test('nad creation', () => {
        const container: HTMLDivElement = document.createElement('div');

        const nadViewerParametersOptions: NadViewerParametersOptions = {
            minWidth: 0,
            minHeight: 0,
            maxWidth: 0,
            maxHeight: 0,
            enableDragInteraction: false,
            enableLevelOfDetail: false,
            addButtons: false,
            onMoveNodeCallback: null,
            onMoveTextNodeCallback: null,
            onSelectNodeCallback: null,
            onToggleHoverCallback: null,
            onRightClickCallback: null,
        };
        const nad: NetworkAreaDiagramViewer = new NetworkAreaDiagramViewer(
            container,
            '',
            null,
            nadViewerParametersOptions
        );

        nad.moveNodeToCoordinates('', 0, 0);
        expect(container.getElementsByTagName('svg').length).toBe(0);
        expect(nad.getContainer().outerHTML).toBe('<div></div>');
        expect(nad.getSvgContent()).toBe('');
    });

    test('NAD - style provider feature test', () => {
        const container: HTMLDivElement = document.createElement('div');

        const nadViewerParametersOptions: NadViewerParametersOptions = {
            minWidth: 0,
            minHeight: 0,
            maxWidth: 0,
            maxHeight: 0,
            enableDragInteraction: false,
            enableLevelOfDetail: false,
            addButtons: false,
            onMoveNodeCallback: null,
            onMoveTextNodeCallback: null,
            onSelectNodeCallback: null,
            onToggleHoverCallback: null,
            onRightClickCallback: null,
        };
        const svgMetadata: Partial<DiagramMetadata> = {
            nodes: [],
            busNodes: [
                {
                    svgId: '10',
                    equipmentId: 'VL1_0',
                    nbNeighbours: 0,
                    index: 0,
                    vlNode: '0',
                    legend: '1.1 kV / 0.0°',
                },
            ],
        };
        const svgContent = `<g class="nad-vl-nodes"><g id="10" class="nad-vl70to120"><circle r="15" id="111" class="nad-bus-0 nad-busnode"/></g></g>`;
        const nad: NetworkAreaDiagramViewer = new NetworkAreaDiagramViewer(
            Object.assign(container, { innerHTML: svgContent, svgMetadata: svgMetadata }),
            svgContent,
            svgMetadata as any,
            nadViewerParametersOptions
        );
        expect(nad.getSvgContent()).toBe(svgContent);
        const registry = new NadStyleRegistry()
            .addStyleProvider('test1', customStyleProvider1)
            .addStyleProvider('test2', customStyleProvider2);

        // test2
        nad.setStyle(registry.getStyleProvider('test2'));

        expect(nad.getSvgContent()).toEqual(svgContent);
        nad.refreshStyle();
        expect(nad.getSvgContent()).toEqual(
            `<g class="nad-vl-nodes"><g id="10" class="nad-vl70to120" style="fill: green;"><circle r="15" id="111" class="nad-bus-0 nad-busnode"></circle></g></g>`
        );

        // test1
        // nad.setStyle(registry.getStyleProvider('test1'));
        // expect(nad.getSvgContent()).toEqual(svgContent);
        // nad.refreshStyle();
        // expect(nad.getSvgContent()).toEqual(svgContent);
    });

    const customStyleProvider1: NadStyleProvider = {
        getBusNodeStyle: () => undefined,
    };

    const customStyleProvider2: NadStyleProvider = {
        getBusNodeStyle: () => ({ equipmentId: 'equipmentId1', fill: 'green' }),
    };
});
