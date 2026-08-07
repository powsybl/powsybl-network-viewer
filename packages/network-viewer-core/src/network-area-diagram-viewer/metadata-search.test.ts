/**
 * Copyright (c) 2026, RTE (http://www.rte-france.com)
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 * SPDX-License-Identifier: MPL-2.0
 */

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
});
