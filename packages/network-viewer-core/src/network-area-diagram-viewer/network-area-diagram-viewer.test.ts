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
            edges: [],
            busNodes: [
                {
                    svgId: '10',
                    equipmentId: 'VL1_0',
                    nbNeighbours: 0,
                    index: 0,
                    vlNode: '0',
                    legend: '1.1 kV / 0.0°',
                },
                {
                    svgId: '11',
                    equipmentId: 'VL1_1',
                    nbNeighbours: 0,
                    index: 0,
                    vlNode: '0',
                    legend: '1.1 kV / 0.0°',
                },
            ],
        };
        const svgBusNode1 = `<g id="10" class="nad-vl70to120"><circle r="15" id="111" class="nad-bus-0 nad-busnode"></circle></g>`;
        const svgBusNode2 = `<g id="11" class="nad-vl70to120"><circle r="15" id="222" class="nad-bus-1 nad-busnode"></circle></g>`;
        const svgContent = `<g class="nad-vl-nodes">` + svgBusNode1 + svgBusNode2 + `</g>`;
        const nad: NetworkAreaDiagramViewer = new NetworkAreaDiagramViewer(
            Object.assign(container, { innerHTML: svgContent, svgMetadata: svgMetadata }),
            svgContent,
            svgMetadata as any,
            nadViewerParametersOptions
        );
        expect(nad.getSvgContent()).toBe(svgContent);
        const registry = new NadStyleRegistry()
            .addStyleProvider('test1', customStyleProvider1)
            .addStyleProvider('test2', customStyleProvider2)
            .addStyleProvider('test3', customStyleProvider3);

        // test2
        nad.setStyle(registry.getStyleProvider('test2'));
        expect(nad.getSvgContent()).toContain(
            `<g id="10" class="nad-vl70to120" style="fill: green;"><circle r="15" id="111" class="nad-bus-0 nad-busnode"></circle></g>`
        );
        expect(nad.getSvgContent()).toContain(
            `<g id="11" class="nad-vl70to120" style="fill: green;"><circle r="15" id="222" class="nad-bus-1 nad-busnode"></circle></g>`
        );
        //
        // test1
        nad.setStyle(registry.getStyleProvider('test1'));
        expect(nad.getSvgContent()).toEqual(svgContent);
        // test2
        nad.setStyle(registry.getStyleProvider('test3'));
        expect(nad.getSvgContent()).toContain(
            `<g id="10" class="nad-vl70to120" style="fill: red;"><circle r="15" id="111" class="nad-bus-0 nad-busnode"></circle></g>`
        );
        expect(nad.getSvgContent()).toContain(
            `<g id="11" class="nad-vl70to120" style="fill: yellow;"><circle r="15" id="222" class="nad-bus-1 nad-busnode"></circle></g>`
        );
    });

    const customStyleProvider1: NadStyleProvider = {
        getBusNodeStyle: () => ({}),
    };

    const customStyleProvider2: NadStyleProvider = {
        getBusNodeStyle: () => ({ fill: 'green' }),
    };

    const customStyleProvider3: NadStyleProvider = {
        getBusNodeStyle: (node) => {
            if (node.svgId == '10') return { fill: 'red' };
            if (node.svgId == '11') return { fill: 'yellow' };
            return null as any;
        },
    };
});
