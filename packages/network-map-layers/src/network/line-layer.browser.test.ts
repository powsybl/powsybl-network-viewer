/**
 * Copyright (c) 2026, RTE (http://www.rte-france.com)
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

import { afterEach, test } from 'vitest';
import { expectElement, SCREENSHOT_OPTIONS, setupBrowserLayerRenderer } from '../testUtils/browser-render';
import {
    createGeoData,
    createLargeGeoData,
    createLargeMapLinesWithType,
    createLargeNetwork,
    createLineForLineLayer,
    createNetwork,
} from '../testUtils/network-fixtures';
import { getNominalVoltageColor } from '../utils/colors';
import { LineLayer } from './line-layer';

const { renderLayers, cleanup } = setupBrowserLayerRenderer();

afterEach(cleanup);

test('line-layer-basic', async () => {
    const line = createLineForLineLayer();
    const network = createNetwork(line);
    const geoData = createGeoData(line);

    const canvas = await renderLayers([
        new LineLayer({
            id: 'line-layer',
            data: [line],
            network,
            geoData,
            updatedLines: [],
            areFlowsValid: true,
            labelsVisible: true,
            labelColor: [255, 255, 255],
            getNominalVoltageColor: () => [200, 200, 200] as [number, number, number],
        }),
    ]);

    await expectElement(canvas).toMatchScreenshot('line-layer-basic', SCREENSHOT_OPTIONS);
});

test('line-layer-large-network', async () => {
    const data = createLargeMapLinesWithType();
    const network = createLargeNetwork();
    const geoData = createLargeGeoData();

    const canvas = await renderLayers(
        [
            new LineLayer({
                id: 'line-layer-large-network',
                data,
                network,
                geoData,
                updatedLines: [],
                areFlowsValid: true,
                labelsVisible: true,
                labelColor: [0, 0, 0],
                getNominalVoltageColor: getNominalVoltageColor,
            }),
        ],
        {
            zoom: 7,
            longitude: 1.8305,
            latitude: 49.0434,
        }
    );

    await expectElement(canvas).toMatchScreenshot('line-layer-large-network', SCREENSHOT_OPTIONS);
});
