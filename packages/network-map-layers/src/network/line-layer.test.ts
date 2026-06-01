/**
 * Copyright (c) 2026, RTE (http://www.rte-france.com)
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

import { testLayer } from '@deck.gl/test-utils/vitest';
import { expect, test } from 'vitest';
import { createGeoData, createLineForLineLayer, createNetwork } from '../testUtils/network-fixtures';
import { LineFlowMode, LineLayer } from './line-layer';

test('LineLayer lifecycle renders expected sublayers and applies updates', () => {
    const line = createLineForLineLayer();
    const network = createNetwork(line);
    const geoData = createGeoData(line);

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
                onAfterUpdate: ({ layer, subLayers }: { layer: LineLayer; subLayers: Array<{ id: string }> }) => {
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
