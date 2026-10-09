/**
 * Copyright (c) 2024, RTE (http://www.rte-france.com)
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 * SPDX-License-Identifier: MPL-2.0
 */

import { NadViewerParametersOptions } from './nad-viewer-parameters';
import { NetworkAreaDiagramViewer } from './network-area-diagram-viewer';
import { BusNodeMetadata, NodeMetadata, TextNodeMetadata } from './diagram-metadata';

describe('Test network-area-diagram-viewer', () => {
    const container: HTMLDivElement = document.createElement('div');
    // SVG aren't loaded properly in DOM with Vitest. Has to be enriched...
    test('nad creation', () => {
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

    const textNode: TextNodeMetadata = {
        svgId: '0-textnode',
        equipmentId: 'EQUIPMENT_ID_0',
        vlNode: '0',
        shiftX: 0,
        shiftY: 0,
        connectionShiftX: 0,
        connectionShiftY: 0,
    };

    test('legend boxes: bus nodes style attributes should be used, when defined in metadata', () => {
        const nadViewer: NetworkAreaDiagramViewer = new NetworkAreaDiagramViewer(container, '', null, null);
        const node: NodeMetadata = {
            svgId: '0',
            equipmentId: 'EQUIPMENT_ID_0',
            x: 0,
            y: 0,
        };
        const busNodes: BusNodeMetadata[] = [busNode(0, '400 kV', 'background:red; fill:red; stroke:black;')];
        const legendBox = nadViewer['createLegendBox'](textNode, busNodes, node);
        const busSquare = legendBox?.querySelector('.nad-legend-square');
        expect(busSquare).toBeDefined();
        expect(busSquare?.getAttribute('style')).toEqual('background:red; fill:red; stroke:black;');
    });

    test('legend boxes: node legendFooter should be used, when defined in metadata', () => {
        const nadViewer: NetworkAreaDiagramViewer = new NetworkAreaDiagramViewer(container, '', null, null);
        const node: NodeMetadata = {
            svgId: '0',
            equipmentId: 'EQUIPMENT_ID_0',
            x: 0,
            y: 0,
            legendFooter: ['footer line 1', 'footer line 2'],
        };

        const busNodes: BusNodeMetadata[] = [busNode(0, '400 kV')];
        const legendBox = nadViewer['createLegendBox'](textNode, busNodes, node);
        const legendElements = legendBox?.querySelector('.nad-label-box')?.children;
        expect(legendElements).toBeDefined();
        if (!legendElements) throw new Error('legend elements should be defined');
        const texts = Array.from(legendElements).map((child) => child.textContent);
        expect(texts).toEqual(['EQUIPMENT_ID_0', '400 kV', 'footer line 1', 'footer line 2']);
    });
});

function busNode(index: number, legend: string, style?: string): BusNodeMetadata {
    return {
        equipmentId: 'EQUIPMENT_ID_0',
        index,
        nbNeighbours: 0,
        svgId: '',
        vlNode: '0',
        legend,
        ...(style !== undefined ? { style } : {}),
    };
}
