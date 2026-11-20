/**
 * Copyright (c) 2026, RTE (http://www.rte-france.com)
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 * SPDX-License-Identifier: MPL-2.0
 */

import IEE14CdfNetworkMetadata from '../resources/test-data/nad-ieee14cdf-solved_metadata.json';
import { MetadataSearch } from './metadata-search';
import { getDiagramMetadata } from './test-utils';

test('MetadataSearch', () => {
    const metadataSearch = new MetadataSearch(getDiagramMetadata());
    expect(metadataSearch.getNode('4')).not.toBe(undefined);
    expect(metadataSearch.getNode('4')?.equipmentId).toBe('VLHV1');
    expect(metadataSearch.getBus('11')).not.toBe(undefined);
    expect(metadataSearch.getBus('11')?.equipmentId).toBe('VLHV2_0');
    expect(metadataSearch.getNodeBuses('4').length).toBe(1);
    expect(metadataSearch.getNodeBuses('4').at(0)?.svgId).toBe('7');
    expect(metadataSearch.getTextNode('5')?.vlNode).toBe('4');
    expect(metadataSearch.getTextNode('4')).toBe(undefined);
    expect(metadataSearch.getNodeEdges('4').map((edge) => edge.svgId)).toEqual(['16', '18', '20', '22']);
    expect(metadataSearch.getNodeEdges('12').map((edge) => edge.svgId)).toEqual(['24']);
    expect(metadataSearch.getNodeEdges('3').length).toBe(0);
});

test('MetadataSearch loop edges', () => {
    const metadataSearch = new MetadataSearch(IEE14CdfNetworkMetadata);
    const loopEdges = IEE14CdfNetworkMetadata.edges.filter((edge) => edge.node1 == edge.node2);
    expect(loopEdges.length).toBeGreaterThan(0);
    for (const loopEdge of loopEdges) {
        const nodeEdges = metadataSearch.getNodeEdges(loopEdge.node1);
        expect(nodeEdges.filter((edge) => edge.svgId == loopEdge.svgId).length).toBe(1);
    }
});
