/**
 * Copyright (c) 2026, RTE (http://www.rte-france.com)
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 * SPDX-License-Identifier: MPL-2.0
 */

import { describe, test, expect, beforeEach, vi } from 'vitest';
import { SubstationLayer } from './substation-layer';
import { MapEquipments } from './map-equipments';
import { GeoData } from './geo-data';
import type { MapSubstation } from '../equipment-types';
import { testLayer } from '@deck.gl/test-utils/vitest';

describe('Test SubstationLayer', () => {
    // Test related to
    // https://github.com/powsybl/powsybl-network-viewer/issues/64
    // https://github.com/powsybl/powsybl-incubator/pull/267#discussion_r1393939164
    describe('Test updateState', () => {
        const network: MapEquipments = new MapEquipments();
        const geoData = new GeoData(new Map(), new Map());
        const substation1: MapSubstation = {
            id: 's0',
            voltageLevels: [{ id: 'v0', nominalV: 220, substationId: 's0' }],
        };

        beforeEach(() => {
            vi.clearAllMocks();
        });

        test('updateState handle nullable network, geoData, filter', () => {
            testLayer({
                Layer: SubstationLayer,
                spies: ['updateState', 'setState'],
                onError: (err) => expect(err).toBeFalsy(),
                testCases: [
                    {
                        title: 'build meta voltage level when network and geoData are defined',
                        props: { data: [substation1], network, geoData, getNameOrId: () => '' },
                        onAfterUpdate({ spies }) {
                            expect(spies.updateState).toHaveBeenCalledTimes(1);
                            expect(spies.setState).toHaveBeenCalledTimes(2);
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
                            expect(spies.setState).toHaveBeenNthCalledWith(1, {
                                metaVoltageLevelsByNominalVoltage: [expected],
                            });
                        },
                    },
                    {
                        title: 'skip meta voltage level when network and geoData are undefined',
                        updateProps: { data: [substation1], network: undefined, geoData: undefined },
                        onAfterUpdate({ spies }) {
                            expect(spies.setState).toHaveBeenCalledTimes(2);
                            expect(spies.setState).toHaveBeenNthCalledWith(1, {
                                metaVoltageLevelsByNominalVoltage: [],
                            });
                        },
                    },
                    {
                        title: 'skip meta voltage level when network and geoData are null',
                        updateProps: { data: [substation1], network: null as any, geoData: null as any },
                        onAfterUpdate({ spies }) {
                            expect(spies.setState).toHaveBeenCalledTimes(2);
                            expect(spies.setState).toHaveBeenNthCalledWith(1, {
                                metaVoltageLevelsByNominalVoltage: [],
                            });
                        },
                    },
                    {
                        title: 'filter substation labels when filteredNominalVoltages is defined',
                        updateProps: { data: [substation1], network, geoData, filteredNominalVoltages: [400] },
                        onAfterUpdate({ spies }) {
                            expect(spies.setState).toHaveBeenCalledTimes(2);
                            expect(spies.setState).toHaveBeenLastCalledWith({ substationsLabels: [] }); //filter applied => empty list (nominalV 400 not exist)
                        },
                    },
                    {
                        title: 'does not filter when filteredNominalVoltages is undefined',
                        updateProps: { data: [substation1], network, geoData, filteredNominalVoltages: undefined },
                        onAfterUpdate({ spies }) {
                            expect(spies.setState).toHaveBeenCalledTimes(2);
                            expect(spies.setState).toHaveBeenLastCalledWith({ substationsLabels: [substation1] }); // no filter applied, same as props.data
                        },
                    },
                    {
                        title: 'does not filter when filteredNominalVoltages is null',
                        updateProps: {
                            data: [substation1, { ...substation1, id: 's1' }],
                            network,
                            geoData,
                            filteredNominalVoltages: null,
                        },
                        onAfterUpdate({ spies }) {
                            expect(spies.setState).toHaveBeenCalledTimes(2);
                            expect(spies.setState).toHaveBeenLastCalledWith({
                                substationsLabels: [substation1, { ...substation1, id: 's1' }],
                            });
                            // no filter applied, same as props.data
                        },
                    },
                ],
            });
        });
    });
});
