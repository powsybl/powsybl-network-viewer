/**
 * Copyright (c) 2026, RTE (http://www.rte-france.com)
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

import { afterEach, test } from 'vitest';
import { expectElement, SCREENSHOT_OPTIONS, setupBrowserLayerRenderer } from '../../testUtils/browser-render';
import { createLargeGeoData } from '../../testUtils/network-fixtures';
import ScatterplotLayerExt from './scatterplot-layer-ext';

const { renderLayers, cleanup } = setupBrowserLayerRenderer();

afterEach(cleanup);

test('scatterplot-layer-ext-basic', async () => {
    const points = [
        { id: 's1', position: [2.35, 48.85] as [number, number], radius: 1, maxPixels: 5 },
        { id: 's2', position: [2.37, 48.87] as [number, number], radius: 2, maxPixels: 9 },
    ];

    const canvas = await renderLayers([
        new ScatterplotLayerExt({
            id: 'scatterplot-layer-ext',
            data: points,
            radiusMinPixels: 1,
            getRadiusMaxPixels: (point: (typeof points)[number]) => point.maxPixels,
            getPosition: (point: (typeof points)[number]) => point.position,
            getFillColor: [107, 178, 40],
            getRadius: (point: (typeof points)[number]) => 500 * point.radius,
            stroked: false,
        } as never),
    ]);

    await expectElement(canvas).toMatchScreenshot('scatterplot-layer-ext-basic', SCREENSHOT_OPTIONS);
});

test('scatterplot-layer-ext-large-network', async () => {
    const geoData = createLargeGeoData();
    const points = Array.from(geoData.substationPositionsById.entries()).map(([id, coordinate], index) => ({
        id,
        position: [coordinate.lon, coordinate.lat] as [number, number],
        radius: 1 + (index % 3),
        maxPixels: 5 + (index % 3) * 2,
    }));

    const canvas = await renderLayers([
        new ScatterplotLayerExt({
            id: 'scatterplot-layer-ext-large-network',
            data: points,
            radiusMinPixels: 1,
            getRadiusMaxPixels: (point: (typeof points)[number]) => point.maxPixels,
            getPosition: (point: (typeof points)[number]) => point.position,
            getFillColor: [107, 178, 40],
            getRadius: (point: (typeof points)[number]) => 500 * point.radius,
            stroked: false,
        } as never),
    ]);

    await expectElement(canvas).toMatchScreenshot('scatterplot-layer-ext-large-network', SCREENSHOT_OPTIONS);
});
