/**
 * Copyright (c) 2026, RTE (http://www.rte-france.com)
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 * SPDX-License-Identifier: MPL-2.0
 */

import { describe, test, expect, beforeEach, it } from 'vitest';
import { vi } from 'vitest';
import { SubstationLayer } from './substation-layer';
import { UpdateParameters } from '@deck.gl/core';
import { ChangeFlags } from '@deck.gl/core/src/lib/layer-state';
import { MapEquipments } from './map-equipments';
import { GeoData } from './geo-data';
import type { MapSubstation } from '../equipment-types';

describe('Test SubstationLayer', () => {
    let substationLayer: SubstationLayer;
    // Test related to
    // https://github.com/powsybl/powsybl-network-viewer/issues/64
    // https://github.com/powsybl/powsybl-incubator/pull/267#discussion_r1393939164
    describe('Test updateState', () => {
        const equipment: MapEquipments = new MapEquipments();
        const geoData = new GeoData(new Map(), new Map());
        const substation1: MapSubstation = {
            id: 's0',
            voltageLevels: [{ id: 'v0', nominalV: 220, substationId: 's0' }],
        };

        beforeEach(() => {
            substationLayer = new SubstationLayer();
            vi.clearAllMocks();
        });

        test('updateState when props network and geoData are not null/undefined should succeed', () => {
            // Given network and geoData are both not null and not undefined
            const params: UpdateParameters<SubstationLayer> = {
                changeFlags: { dataChanged: true } as ChangeFlags,
                context: {} as any,
                props: {
                    network: equipment,
                    geoData: geoData,
                    data: [substation1],
                } as any,
                oldProps: {} as any,
            };
            const setStateMocked = vi.spyOn(substationLayer, 'setState');
            setStateMocked.mockImplementation(() => {});
            // When
            substationLayer.updateState(params);
            // Then
            const expected = {
                nominalV: 220,
                metaVoltageLevels: [
                    {
                        nominalVoltageIndex: 0,
                        voltageLevels: [
                            {
                                id: 'v0',
                                nominalV: 220,
                                substationId: 's0',
                            },
                        ],
                    },
                ],
            };
            expect(setStateMocked).toHaveBeenNthCalledWith(1, { metaVoltageLevelsByNominalVoltage: [expected] });
        });

        it.each([
            [null, null],
            [undefined, undefined],
        ])('updateState when props network=%s and geoData=%s should succeed', (equipment, geoData) => {
            // Given network and geoData are both null or undefined
            const params: UpdateParameters<SubstationLayer> = {
                changeFlags: { dataChanged: true } as ChangeFlags,
                context: {} as any,
                props: {
                    network: equipment,
                    geoData: geoData,
                    data: [substation1],
                } as any,
                oldProps: {} as any,
            };
            const setStateMock = vi.spyOn(substationLayer, 'setState').mockImplementation(() => {});
            // When
            substationLayer.updateState(params);
            // Then
            expect(setStateMock).toHaveBeenCalledWith({ metaVoltageLevelsByNominalVoltage: [] });
        });
    });
});
