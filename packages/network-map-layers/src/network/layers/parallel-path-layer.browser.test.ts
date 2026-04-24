/**
 * Copyright (c) 2026, RTE (http://www.rte-france.com)
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

import { afterEach, test } from 'vitest';
import { type MapAnyLineWithType } from '../../equipment-types';
import { expectElement, SCREENSHOT_OPTIONS, setupBrowserLayerRenderer } from '../../testUtils/browser-render';
import { createLargeMapLinesWithType, createMapLineWithType } from '../../testUtils/network-fixtures';
import ParallelPathLayer from './parallel-path-layer';

const { renderLayers, cleanup } = setupBrowserLayerRenderer();

afterEach(cleanup);

test('parallel-path-layer-basic', async () => {
    const line = createMapLineWithType();

    const canvas = await renderLayers([
        new ParallelPathLayer({
            id: 'parallel-lines',
            data: [line],
            getPath: (value: MapAnyLineWithType) => value.positions,
            getColor: [40, 120, 220],
            getWidth: 2,
            getLineParallelIndex: (value: MapAnyLineWithType) => value.parallelIndex,
            getExtraAttributes: (value: MapAnyLineWithType) => [
                value.angleStart,
                value.angle,
                value.angleEnd,
                value.parallelIndex! * 2 + 31,
            ],
            distanceBetweenLines: 1000,
            maxParallelOffset: 100,
            minParallelOffset: 3,
        } as never),
    ]);

    await expectElement(canvas).toMatchScreenshot('parallel-path-layer-basic', SCREENSHOT_OPTIONS);
});

test('parallel-path-layer-large-network', async () => {
    const lines = createLargeMapLinesWithType();

    const canvas = await renderLayers([
        new ParallelPathLayer({
            id: 'parallel-lines-large-network',
            data: lines,
            getPath: (value: MapAnyLineWithType) => value.positions,
            getColor: [40, 120, 220],
            getWidth: 2,
            getLineParallelIndex: (value: MapAnyLineWithType) => value.parallelIndex,
            getExtraAttributes: (value: MapAnyLineWithType) => [
                value.angleStart,
                value.angle,
                value.angleEnd,
                value.parallelIndex! * 2 + 31,
            ],
            distanceBetweenLines: 1000,
            maxParallelOffset: 100,
            minParallelOffset: 3,
        } as never),
    ]);

    await expectElement(canvas).toMatchScreenshot('parallel-path-layer-large-network', SCREENSHOT_OPTIONS);
});
