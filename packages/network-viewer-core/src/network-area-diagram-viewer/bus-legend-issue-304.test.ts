/**
 * Copyright (c) 2026, RTE (http://www.rte-france.com)
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 * SPDX-License-Identifier: MPL-2.0
 */
import { BusNodeMetadata, NodeMetadata, TextNodeMetadata } from './diagram-metadata';
import { NetworkAreaDiagramViewer } from './network-area-diagram-viewer';

test('bus legend should not be generated when empty', () => {
    const nadViewer: NetworkAreaDiagramViewer = new NetworkAreaDiagramViewer(
        document.createElement('div'),
        '',
        null,
        null
    );
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
