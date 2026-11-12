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
import * as SvgUtils from './svg-utils';
import { Point } from '@svgdotjs/svg.js';
import * as DiagramUtils from './diagram-utils';
import { EdgeMetadata } from './diagram-metadata';
import * as MetadataUtils from './metadata-utils';
import { EdgeType } from './diagram-types';
import { NadStyleProvider, NadStyleRegistry } from './nad-style-registry';
import { DiagramMetadata } from './diagram-metadata';

describe('Test network-area-diagram-viewer', () => {
    const container: HTMLDivElement = document.createElement('div');
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

    test('moveNodeToCoordinates with the same position must not change edge connections', () => {
        // Minimal SVG: extracted from nad-scada.svg: 1 VL node (id '0') and 1 3wt edge (id '16') with its polyline.
        const svgContent = `<svg width="100" height="100" viewBox="-512.98 -717.87 1172.34 1320.65" xmlns="http://www.w3.org/2000/svg">
          <g class="nad-vl-nodes">
            <g transform="translate(189.53,123.47)" id="0"></g>
          </g>
          <g class="nad-3wt-edges">
            <g id="16"><polyline class="nad-edge-path" points="173.73,100.97 -8.21,-210.51"/></g>
          </g>
        </svg>`;
        // Minimal metadata, extracted from nad-scada_metadata.json
        const metadata = {
            nodes: [
                { svgId: '0', equipmentId: 'vl', x: 189.53, y: 123.47 },
                { svgId: '15', equipmentId: 't3wt', x: -39.15, y: -202.32, type: 'THREEWT' },
            ],
            busNodes: [],
            edges: [
                {
                    svgId: '16',
                    equipmentId: 't3wt',
                    node1: '0',
                    node2: '15',
                    busNode1: '3',
                    busNode2: '15',
                    type: 'ThreeWtEdge',
                    side: 'ONE',
                },
            ],
        };
        const nad: NetworkAreaDiagramViewer = Object.assign(Object.create(NetworkAreaDiagramViewer.prototype), {
            container: Object.assign(container, { innerHTML: svgContent }),
            svgDiv: Object.assign(container, { innerHTML: svgContent }),
            svgContent: svgContent,
            diagramMetadata: metadata,
            svgParameters: { getInterAnnulusSpace: () => 0 },
            edgeAngles1: new Map(),
        });
        vi.spyOn(SvgUtils, 'getPosition').mockReturnValue(new Point(10, 10));
        vi.spyOn(DiagramUtils, 'getVoltageLevelCircleRadius').mockReturnValue(1);
        vi.spyOn(MetadataUtils, 'getEdgeType').mockReturnValue(EdgeType.THREE_WINDINGS_TRANSFORMER);
        const edge = metadata.edges.find((e: EdgeMetadata) => e.svgId === '16')!;
        const vlNode = metadata.nodes.find((n) => n.svgId === edge.node1)!;
        const edgeBefore = getEndPoint(nad, edge.svgId);
        // When: move the node to its current coordinate
        nad.moveNodeToCoordinates(vlNode.equipmentId, vlNode.x, vlNode.y);
        // Then
        const edgeAfter = getEndPoint(nad, edge.svgId);
        expect(edgeAfter.x).toEqual(edgeBefore.x);
        expect(edgeAfter.y).toEqual(edgeBefore.y);
    });

    function getEndPoint(nad: NetworkAreaDiagramViewer, edgeSvgId: string) {
        const polyline = nad
            .getContainer()
            .querySelector<SVGPolylineElement>(`[id='${edgeSvgId}'] polyline.nad-edge-path`);
        const coords = (polyline?.getAttribute('points') ?? '').trim().split(/[ ,]+/).map(Number);
        return { x: coords.at(2)!, y: coords.at(3)! };
    }

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
            `<g id="10" class="nad-vl70to120" style="background: green; fill: green;"><circle r="15" id="111" class="nad-bus-0 nad-busnode"></circle></g>`
        );
        expect(nad.getSvgContent()).toContain(
            `<g id="11" class="nad-vl70to120" style="background: green; fill: green;"><circle r="15" id="222" class="nad-bus-1 nad-busnode"></circle></g>`
        );
        // test1
        nad.setStyle(registry.getStyleProvider('test1'));
        expect(nad.getSvgContent()).toEqual(svgContent);
        // test2
        nad.setStyle(registry.getStyleProvider('test3'));
        expect(nad.getSvgContent()).toContain(
            `<g id="10" class="nad-vl70to120" style="background: red; fill: red;"><circle r="15" id="111" class="nad-bus-0 nad-busnode"></circle></g>`
        );
        expect(nad.getSvgContent()).toContain(
            `<g id="11" class="nad-vl70to120" style="background: yellow; fill: yellow;"><circle r="15" id="222" class="nad-bus-1 nad-busnode"></circle></g>`
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
            if (node == 'VL1_0') return { fill: 'red' };
            if (node == 'VL1_1') return { fill: 'yellow' };
            return null as any;
        },
    };
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
