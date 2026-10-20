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

    test('bus legend should not be generated when empty', () => {
        const nadViewer: NetworkAreaDiagramViewer = new NetworkAreaDiagramViewer(container, '', null, null);
        const textNode: TextNodeMetadata = {
            svgId: '0-textnode',
            equipmentId: 'EQUIPMENT_ID_0',
            vlNode: '0',
            shiftX: 0,
            shiftY: 0,
            connectionShiftX: 0,
            connectionShiftY: 0,
        };
        const node: NodeMetadata = {
            svgId: '0',
            equipmentId: 'EQUIPMENT_ID_0',
            x: 0,
            y: 0,
        };
        const busNodes: BusNodeMetadata[] = [
            busNode(0, '400 kV'), // no empty legend
            busNode(1, ''), // empty legend
        ];
        const legendBox = nadViewer['createLegendBox'](textNode, busNodes, node);
        const buses = legendBox?.querySelectorAll('.nad-bus-descr');
        expect(buses).toBeDefined();
        if (!buses) throw new Error('buses should be defined');
        expect(buses.length).toEqual(1); // only one Bus legend displayed since is not empty
        expect(buses[0]?.textContent).toEqual('400 kV');
    });
});

function busNode(index: number, legend: string): BusNodeMetadata {
    return {
        equipmentId: 'EQUIPMENT_ID_0',
        index: index,
        nbNeighbours: 0,
        svgId: '',
        vlNode: '0',
        legend,
    };
}
