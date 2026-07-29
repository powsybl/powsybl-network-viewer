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
import { ChangeFlags, LayerContext } from '@deck.gl/core';
import { MapEquipments } from './map-equipments';
import { GeoData } from './geo-data';
import type { MapSubstation } from '../equipment-types';

describe('Test SubstationLayer', () => {
    let substationLayer: SubstationLayer;

    const context: Partial<LayerContext> = {};
    const oldProps = {};

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
            const changeFlags: Partial<ChangeFlags> = { dataChanged: 'true' };
            const props: Partial<any> = {
                network: equipment,
                geoData: geoData,
                data: [substation1],
            };
            const params: any = { changeFlags, context, props, oldProps };
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
            expect(setStateMocked).toHaveBeenCalledTimes(2);
            expect(setStateMocked).toHaveBeenNthCalledWith(1, { metaVoltageLevelsByNominalVoltage: [expected] });
        });

        it.each([
            [null, null],
            [undefined, undefined],
        ])('updateState when props network=%s and geoData=%s should succeed', (equipment, geoData) => {
            // Given network and geoData are both null or undefined
            const changeFlags: Partial<ChangeFlags> = { dataChanged: 'true' };
            const props: any = {
                network: equipment,
                geoData: geoData,
                data: [substation1],
            };
            const params: any = { changeFlags, context, props, oldProps };
            const setStateMocked = vi.spyOn(substationLayer, 'setState').mockImplementation(() => {});
            // When
            substationLayer.updateState(params);
            // Then
            expect(setStateMocked).toHaveBeenCalledTimes(2);
            expect(setStateMocked).toHaveBeenNthCalledWith(1, { metaVoltageLevelsByNominalVoltage: [] });
        });

        test('updateState when props network, geoData and filteredNominalVoltages are not null/undefined should succeed', () => {
            // Given network, geoData and filteredNominalVoltages are not null and not undefined
            const changeFlags: Partial<ChangeFlags> = { dataChanged: 'true' };
            const props: any = {
                network: equipment,
                geoData: geoData,
                data: [substation1],
                filteredNominalVoltages: [400],
            };
            const params: any = { changeFlags, context, props, oldProps };
            const setStateMocked = vi.spyOn(substationLayer, 'setState');
            setStateMocked.mockImplementation(() => {});
            // When
            substationLayer.updateState(params);
            // Then
            expect(setStateMocked).toHaveBeenCalledTimes(2);
            expect(setStateMocked).toHaveBeenLastCalledWith({ substationsLabels: [] }); //filter applied => empty list (nominalV 400 not exist)
        });

        it.each([[null], [undefined]])(
            'updateState when filteredNominalVoltages=%s should succeed',
            (filteredNominalVoltages) => {
                // Given filteredNominalVoltages is null or undefined
                const changeFlags: Partial<ChangeFlags> = { dataChanged: 'true' };
                const props: any = {
                    network: equipment,
                    geoData: geoData,
                    data: [substation1],
                    filteredNominalVoltages: filteredNominalVoltages,
                };
                const params: any = {
                    changeFlags,
                    context,
                    props: props,
                    oldProps: props,
                };
                const setStateMocked = vi.spyOn(substationLayer, 'setState').mockImplementation(() => {});
                // When
                substationLayer.updateState(params);
                // Then
                expect(setStateMocked).toHaveBeenCalledTimes(2);
                expect(setStateMocked).toHaveBeenLastCalledWith({ substationsLabels: [substation1] }); // no filter applied, same as props.data
            }
        );
    });
});
