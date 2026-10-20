/**
 * Copyright (c) 2024, RTE (http://www.rte-france.com)
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 * SPDX-License-Identifier: MPL-2.0
 */

import { NadViewerParametersOptions } from './nad-viewer-parameters';
import { NetworkAreaDiagramViewer } from './network-area-diagram-viewer';
import * as SvgUtils from './svg-utils.ts';
import { Point } from '@svgdotjs/svg.js';
import * as DiagramUtils from './diagram-utils.ts';
import { EdgeMetadata } from './diagram-metadata.ts';
import * as MetadataUtils from './metadata-utils.ts';
import { EdgeType } from './diagram-types.ts';

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
        const nad: NetworkAreaDiagramViewer = Object.assign(NetworkAreaDiagramViewer.prototype, {
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
