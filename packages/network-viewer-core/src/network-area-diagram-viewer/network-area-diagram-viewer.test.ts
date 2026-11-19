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

    test('hover callback can discover a nearby edge without a prior mouseover', () => {
        const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        const nodes = document.createElementNS('http://www.w3.org/2000/svg', 'g');
        nodes.classList.add('nad-vl-nodes');
        const node = document.createElementNS('http://www.w3.org/2000/svg', 'g');
        node.id = 'node-1';
        let nodeBounds = { left: 200, right: 210, top: 200, bottom: 210, width: 10, height: 10 } as DOMRect;
        Object.assign(node, { getBoundingClientRect: () => nodeBounds });
        nodes.appendChild(node);
        svg.appendChild(nodes);

        const edges = document.createElementNS('http://www.w3.org/2000/svg', 'g');
        edges.classList.add('nad-branch-edges');
        const edge = document.createElementNS('http://www.w3.org/2000/svg', 'g');
        edge.id = 'edge-1';
        const edgePath = document.createElementNS('http://www.w3.org/2000/svg', 'path') as SVGGeometryElement;
        edgePath.classList.add('nad-edge-path');
        Object.assign(edgePath, {
            getTotalLength: () => 100,
            getPointAtLength: (length: number) => ({ x: length, y: 0 }),
            getScreenCTM: () => ({ a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 }) as DOMMatrix,
            getBoundingClientRect: () => ({ left: 0, right: 100, top: 0, bottom: 0 }) as DOMRect,
        });
        edge.appendChild(edgePath);
        edges.appendChild(edge);
        svg.appendChild(edges);

        const cancelHoverCallback = vi.fn();
        const debouncedHoverCallback = Object.assign(vi.fn(), { cancel: cancelHoverCallback });
        const nadViewer = Object.assign(Object.create(NetworkAreaDiagramViewer.prototype), {
            svgDiv: svg,
            diagramMetadata: {
                nodes: [{ svgId: 'node-1', equipmentId: 'vl-1', x: 50, y: 5 }],
                busNodes: [],
                edges: [
                    {
                        svgId: 'edge-1',
                        equipmentId: 'line-1',
                        node1: 'node-1',
                        node2: 'node-2',
                        busNode1: 'bus-1',
                        busNode2: 'bus-2',
                        type: 'LineEdge',
                    },
                ],
                textNodes: [],
            },
            hoveredElement: null,
            hoveredElementPosition: new Point(0, 0),
            hoverPositionPrecision: 10,
            isHoverCallbackUsed: false,
            debounceToggleHoverCallback: debouncedHoverCallback,
        }) as NetworkAreaDiagramViewer;

        nadViewer['handleHoverCallBack']({ target: svg, clientX: 50, clientY: 5 } as MouseEvent);
        nadViewer['handleHoverCallBack']({ target: svg, clientX: 52, clientY: 5 } as MouseEvent);
        expect(debouncedHoverCallback).toHaveBeenCalledTimes(1);

        nadViewer['handleHoverCallBack']({ target: svg, clientX: 50, clientY: 20 } as MouseEvent);
        expect(cancelHoverCallback).toHaveBeenCalledTimes(1);

        nadViewer['handleHoverCallBack']({ target: svg, clientX: 50, clientY: 5 } as MouseEvent);
        expect(debouncedHoverCallback).toHaveBeenCalledTimes(2);

        nodeBounds = { left: 40, right: 60, top: -5, bottom: 15, width: 20, height: 20 } as DOMRect;
        nadViewer['handleHoverCallBack']({ target: svg, clientX: 50, clientY: 5 } as MouseEvent);
        expect(nadViewer.hoveredElement).toBe(node);
        expect(debouncedHoverCallback).toHaveBeenCalledTimes(3);
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
