/**
 * Copyright (c) 2026, RTE (http://www.rte-france.com)
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 * SPDX-License-Identifier: MPL-2.0
 */

import '../../../../global.d.ts';
import IEE14CdfNetworkMetadata from '../resources/test-data/nad-ieee14cdf-solved_metadata.json';
import FourSubstationsNetworkCustomStyleMetadata from '../resources/test-data/nad-four-substations_custom_metadata.json';

import { SvgWriter } from './svg-writer';
import { MetadataSearch } from './metadata-search';
import { EdgeMetadata, NodeMetadata } from './diagram-metadata';
import { getSvgFromFile } from './test-utils';

test('testIEE14CdfNetwork', () => {
    const actual = new SvgWriter({ diagramMetadata: IEE14CdfNetworkMetadata }).getSvg({ width: 0, height: 0 });
    const expected = getSvgFromFile('../resources/test-data/nad-ieee14cdf-solved.svg');
    expect(actual).toEqualSvg(expected, { epsilon: 0.1 });
});

test('testFourSubstationsNetworkCustomStyle', () => {
    const actual = new SvgWriter({ diagramMetadata: FourSubstationsNetworkCustomStyleMetadata }).getSvg({
        width: 0,
        height: 0,
    });
    const expected = getSvgFromFile('../resources/test-data/nad-four-substations_custom.svg');
    expect(actual).toEqualSvg(expected, { epsilon: 0.1 });
});

test('testIEE14CdfNetworkElementSubsets', () => {
    // adaptive zoom only draws the elements entering the view: drawing a node alone, or an edge alone, routing the
    // edges of the nodes involved, must give the same element as drawing the whole diagram
    const metadataSearch = new MetadataSearch(IEE14CdfNetworkMetadata);
    const createGElement = () => document.createElementNS('http://www.w3.org/2000/svg', 'g');
    const getChildren = (element: Element) => new Map(Array.from(element.children).map((c) => [c.id, c.outerHTML]));
    const allNodesElement = createGElement();
    const allEdgesElement = createGElement();
    const writer = new SvgWriter({ diagramMetadata: IEE14CdfNetworkMetadata, metadataSearch: metadataSearch });
    writer.addNodes(allNodesElement);
    writer.addEdgesAndInfos(allEdgesElement);
    const allNodes = getChildren(allNodesElement);
    const allEdges = getChildren(allEdgesElement);

    const drawSubset = (elementList: { nodes: NodeMetadata[]; edges: EdgeMetadata[] }, nodeIds: string[]) => {
        const subsetWriter = new SvgWriter({
            diagramMetadata: IEE14CdfNetworkMetadata,
            elementList: elementList,
            routedEdges: [...new Set(nodeIds.flatMap((nodeId) => metadataSearch.getNodeEdges(nodeId)))],
            metadataSearch: metadataSearch,
        });
        const nodesElement = createGElement();
        const edgesElement = createGElement();
        subsetWriter.addNodes(nodesElement);
        subsetWriter.addEdgesAndInfos(edgesElement);
        return { nodes: getChildren(nodesElement), edges: getChildren(edgesElement) };
    };

    for (const node of IEE14CdfNetworkMetadata.nodes) {
        const subset = drawSubset({ nodes: [node], edges: [] }, [node.svgId]);
        expect(subset.nodes.get(node.svgId)).toBe(allNodes.get(node.svgId));
    }
    for (const edge of IEE14CdfNetworkMetadata.edges) {
        const subset = drawSubset({ nodes: [], edges: [edge] }, [edge.node1, edge.node2]);
        expect(subset.edges.get(edge.svgId)).toBe(allEdges.get(edge.svgId));
    }
});
