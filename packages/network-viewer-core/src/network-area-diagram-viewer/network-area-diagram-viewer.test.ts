/**
 * Copyright (c) 2024, RTE (http://www.rte-france.com)
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 * SPDX-License-Identifier: MPL-2.0
 */

import { NadViewerParametersOptions } from './nad-viewer-parameters';
import { NetworkAreaDiagramViewer } from './network-area-diagram-viewer';
import { BusNodeMetadata, DiagramMetadata, NodeMetadata, TextNodeMetadata } from './diagram-metadata';
import { PolygonSelection } from './polygon-selection';
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
            onMoveNodesCallback: null,
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
            draggedNodes: new Map(),
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

describe('Test network-area-diagram-viewer multi-selection', () => {
    // VL0 and VL1 with their legends, the boundary node and the loop line of VL1, and a three windings transformer
    // between VL0, VL1 and the invisible VL3
    const svgContent = `<svg xmlns="http://www.w3.org/2000/svg">
      <g class="nad-vl-nodes">
        <g id="0" transform="translate(0,0)"><circle class="nad-busnode" r="10"/></g>
        <g id="1" transform="translate(100,0)"><circle class="nad-busnode" r="10"/></g>
        <g id="2" class="nad-boundary-node" transform="translate(200,0)"><path class="nad-busnode"/></g>
      </g>
      <g class="nad-3wt-nodes">
        <g id="4" transform="translate(50,50)"><circle class="nad-winding" r="10"/></g>
      </g>
      <g class="nad-branch-edges">
        <g id="9"><path class="nad-edge-path"/></g>
      </g>
      <g class="nad-text-nodes">
        <foreignObject id="0-textnode" x="0" y="-50" height="1" width="1"><div class="nad-label-box">VL0</div></foreignObject>
        <foreignObject id="1-textnode" x="100" y="-50" height="1" width="1"><div class="nad-label-box">VL1</div></foreignObject>
      </g>
    </svg>`;

    afterEach(() => {
        vi.restoreAllMocks();
    });

    function createViewer(options: NadViewerParametersOptions): NetworkAreaDiagramViewer {
        const metadata = {
            nodes: [
                { svgId: '0', equipmentId: 'VL0', x: 0, y: 0, legendSvgId: '0-textnode' },
                { svgId: '1', equipmentId: 'VL1', x: 100, y: 0, legendSvgId: '1-textnode' },
                { svgId: '2', equipmentId: 'DL2', x: 200, y: 0, type: 'BOUNDARY' },
                { svgId: '3', equipmentId: 'VL3', x: 300, y: 0, invisible: true },
                { svgId: '4', equipmentId: 'T3WT', x: 50, y: 50, type: 'THREEWT' },
            ],
            textNodes: [textNode('0-textnode', 'VL0', '0'), textNode('1-textnode', 'VL1', '1')],
            busNodes: [],
            edges: [
                { svgId: '5', equipmentId: 'DL2', type: 'BoundaryLineEdge', node1: '1', node2: '2' },
                { svgId: '6', equipmentId: 'T3WT', type: 'ThreeWtEdge', node1: '0', node2: '4' },
                { svgId: '7', equipmentId: 'T3WT', type: 'ThreeWtEdge', node1: '1', node2: '4' },
                { svgId: '8', equipmentId: 'T3WT', type: 'ThreeWtEdge', node1: '3', node2: '4' },
                { svgId: '9', equipmentId: 'L9', type: 'LineEdge', node1: '1', node2: '1' },
            ],
        } as unknown as DiagramMetadata;
        const nad = new NetworkAreaDiagramViewer(document.createElement('div'), '', metadata, {
            enableMultiSelection: true,
            ...options,
        });
        nad.svgDiv.innerHTML = svgContent;
        return nad;
    }

    function textNode(svgId: string, equipmentId: string, vlNode: string): TextNodeMetadata {
        return { svgId, equipmentId, vlNode, shiftX: 0, shiftY: -50, connectionShiftX: 0, connectionShiftY: 0 };
    }

    function getElement(nad: NetworkAreaDiagramViewer, svgId: string): Element {
        return nad.svgDiv.querySelector(`[id='${svgId}']`)!;
    }

    function isSelected(nad: NetworkAreaDiagramViewer, svgId: string): boolean {
        return getElement(nad, svgId).classList.contains('nad-selected');
    }

    test('setSelectedNodeIds', () => {
        const onSelectionChange = vi.fn();
        const nad = createViewer({ onSelectionChangeCallback: onSelectionChange });

        // only the voltage level nodes can be selected
        nad.setSelectedNodeIds(['0', '1', '2', '3', '4', 'unknown']);
        expect([...nad.selectedNodeIds]).toEqual(['0', '1']);
        expect(isSelected(nad, '0')).toBe(true);
        expect(isSelected(nad, '0-textnode')).toBe(true);
        expect(isSelected(nad, '2')).toBe(false);
        expect(onSelectionChange).toHaveBeenCalledWith([
            { equipmentId: 'VL0', nodeId: '0' },
            { equipmentId: 'VL1', nodeId: '1' },
        ]);

        // same selection, no callback
        nad.setSelectedNodeIds(['1', '0']);
        expect(onSelectionChange).toHaveBeenCalledTimes(1);

        nad.setSelectedNodeIds(['1']);
        expect(isSelected(nad, '0')).toBe(false);
        expect(isSelected(nad, '0-textnode')).toBe(false);
        expect(onSelectionChange).toHaveBeenLastCalledWith([{ equipmentId: 'VL1', nodeId: '1' }]);
    });

    test('select with a polygon', () => {
        const nad = createViewer({});
        nad.setSelectedNodeIds(['0']);
        // VL1 is not drawn
        getElement(nad, '1').remove();

        // with Ctrl, the selection of the voltage levels in the polygon, VL0 and VL1, is inverted
        nad.polygonSelection = {
            contains: (point: Point) => point.x < 150,
            stop: vi.fn(),
        } as unknown as PolygonSelection;
        nad['onPolygonSelectionClose'](true);
        expect([...nad.selectedNodeIds]).toEqual(['1']);
        expect(nad.polygonSelection).toBeNull();

        // without Ctrl, they are added: all the nodes but VL1 are in the polygon, only VL0 can be selected
        nad.polygonSelection = {
            contains: (point: Point) => point.x != 100,
            stop: vi.fn(),
        } as unknown as PolygonSelection;
        nad['onPolygonSelectionClose'](false);
        expect([...nad.selectedNodeIds]).toEqual(['1', '0']);
    });

    test('move the selected nodes', () => {
        const onMoveNodes = vi.fn();
        const nad = createViewer({
            enableDragInteraction: true,
            adaptiveTextZoom: { enabled: true },
            onMoveNodesCallback: onMoveNodes,
        });
        const adaptiveZoomViewboxUpdate = vi
            .spyOn(nad as any, 'adaptiveZoomViewboxUpdate')
            .mockImplementation(() => {});
        nad.setSelectedNodeIds(['0', '1']);
        // VL1 is not drawn
        getElement(nad, '1').remove();

        // VL0 dragged to (10, 20)
        vi.spyOn(SvgUtils, 'getPosition').mockReturnValue(new Point(0, 0));
        vi.spyOn(SvgUtils, 'getTransform').mockReturnValue(undefined);
        nad['initDrag'](getElement(nad, '0') as SVGElement);
        nad['onMouseMove'](new MouseEvent('mousemove', { clientX: 10, clientY: 20 }));
        nad['onMouseLeftUpOrLeave'](new MouseEvent('mouseup', { button: 0 }));

        // with the boundary node of VL1, and the three windings transformer whose visible voltage levels all move
        expect(onMoveNodes).toHaveBeenCalledWith([
            { equipmentId: 'VL0', nodeId: '0', x: 10, y: 20, xOrig: 0, yOrig: 0 },
            { equipmentId: 'VL1', nodeId: '1', x: 110, y: 20, xOrig: 100, yOrig: 0 },
            { equipmentId: 'DL2', nodeId: '2', x: 210, y: 20, xOrig: 200, yOrig: 0 },
            { equipmentId: 'T3WT', nodeId: '4', x: 60, y: 70, xOrig: 50, yOrig: 50 },
        ]);
        expect(getElement(nad, '0').getAttribute('transform')).toBe('translate(10.00,20.00)');
        expect(getElement(nad, '1-textnode').getAttribute('y')).toBe('-30.00');
        expect(getElement(nad, '9').getAttribute('transform')).toBe('translate(10.00,20.00)');
        expect(getElement(nad, '4').getAttribute('transform')).toBe('translate(60.00,70.00)');
        expect(adaptiveZoomViewboxUpdate).toHaveBeenCalledTimes(1);
    });
});
