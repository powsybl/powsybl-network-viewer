/**
 * Copyright (c) 2026, RTE (http://www.rte-france.com)
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

import { testLayer } from '@deck.gl/test-utils/vitest';
import { describe, beforeEach, test, expect, vi } from 'vitest';
import { createGeoData, createLineForLineLayer, createNetwork } from '../testUtils/network-fixtures.test.utils';
import { LineFlowMode, LineLayer } from './line-layer';
import { MapEquipments } from './map-equipments';
import { MapLineWithType } from '../equipment-types';
import { GeoData } from './geo-data.ts';

describe('Test LineLayer', () => {
    let line: MapLineWithType;
    let network: MapEquipments;
    let geoData: GeoData;

    beforeEach(() => {
        line = createLineForLineLayer();
        network = createNetwork(line);
        geoData = createGeoData(line);
        vi.clearAllMocks();
    });

    test('LineLayer lifecycle renders expected sublayers and applies updates', () => {
        testLayer({
            Layer: LineLayer,
            testCases: [
                {
                    title: 'initializes and renders map sublayers',
                    props: {
                        id: 'line-layer-under-test',
                        data: [line],
                        network,
                        geoData,
                        updatedLines: [],
                        areFlowsValid: true,
                        labelsVisible: true,
                        labelColor: [255, 255, 255],
                        getNominalVoltageColor: () => [200, 200, 200] as [number, number, number],
                    },
                    onAfterUpdate: ({ layer, subLayers }) => {
                        expect(layer.state.compositeData).toHaveLength(1);
                        expect(layer.state.compositeData[0].arrows).toHaveLength(2);
                        expect(subLayers).toHaveLength(6);
                        expect(subLayers.some((subLayer) => subLayer.id.includes('ArrowNominalVoltage400'))).toBe(true);
                        expect(subLayers.some((subLayer) => subLayer.id.includes('LineNominalVoltage400'))).toBe(true);
                    },
                },
                {
                    title: 'updates flow mode and cached line connectivity',
                    updateProps: {
                        lineFlowMode: LineFlowMode.ANIMATED_ARROWS,
                        updatedLines: [
                            {
                                ...line,
                                terminal1Connected: false,
                            },
                        ],
                    },
                    onAfterUpdate: ({ layer }: { layer: LineLayer }) => {
                        expect(layer.state.compositeData[0].arrows.length).toBeGreaterThanOrEqual(1);
                        expect(layer.state.linesConnection.get(line.id)?.terminal1Connected).toBe(false);
                    },
                },
            ],
        });
    });

    test('getVoltageLevelIndex tests', () => {
        testLayer({
            Layer: LineLayer,
            spies: ['getVoltageLevelIndex'],
            onError: (err) => expect(err).toBeFalsy(),
            testCases: [
                {
                    title: 'getVoltageLevelIndex return expected values when getVoltageLevel is defined',
                    props: { data: [line], network, geoData },
                    onAfterUpdate({ spies }) {
                        expect(spies.getVoltageLevelIndex).toHaveBeenCalledTimes(2);

                        expect(spies.getVoltageLevelIndex).toHaveBeenNthCalledWith(1, 'vl1');
                        expect(spies.getVoltageLevelIndex).toHaveNthReturnedWith(1, 1);

                        expect(spies.getVoltageLevelIndex).toHaveBeenNthCalledWith(2, 'vl2');
                        expect(spies.getVoltageLevelIndex).toHaveNthReturnedWith(2, 1);
                    },
                },
                {
                    title: 'getVoltageLevelIndex return 0 (default) when getVoltageLevel is undefined',
                    onBeforeUpdate: () => vi.spyOn(network, 'getVoltageLevel').mockReturnValue(null as any),
                    updateProps: { network: network },
                    onAfterUpdate({ layer }) {
                        expect(layer.getVoltageLevelIndex('vl1')).toBe(0);
                    },
                },
                {
                    title: 'getVoltageLevelIndex return 0 (default) when getSubstation is undefined',
                    onBeforeUpdate: () => vi.spyOn(network, 'getSubstation').mockReturnValue(null as any),
                    updateProps: { network: network },
                    onAfterUpdate({ layer }) {
                        expect(layer.getVoltageLevelIndex('vl1')).toBe(0);
                    },
                },
            ],
        });
    });
});
