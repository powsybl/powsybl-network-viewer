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
import { LineStatus } from '../line-layer';
import ArrowLayer, { ArrowDirection } from './arrow-layer';

const { renderLayers, cleanup } = setupBrowserLayerRenderer();

afterEach(cleanup);

test('arrow-layer-basic', async () => {
    const line = createMapLineWithType();

    const canvas = await renderLayers([
        new ArrowLayer({
            id: 'arrows',
            data: [{ line, distance: 1.5 }],
            sizeMinPixels: 3,
            sizeMaxPixels: 7,
            getDistance: (value: { line: MapAnyLineWithType; distance: number }) => value.distance,
            getLine: (value: { line: MapAnyLineWithType; distance: number }) => value.line as never,
            getLinePositions: (value: MapAnyLineWithType) => value.positions,
            getDirection: () => ArrowDirection.FROM_SIDE_1_TO_SIDE_2,
            getColor: [255, 0, 0, 255],
            animated: false,
        } as never),
    ]);

    await expectElement(canvas).toMatchScreenshot('arrow-layer-basic', SCREENSHOT_OPTIONS);
});

test('arrow-layer-large-network', async () => {
    const lines = createLargeMapLinesWithType();

    const canvas = await renderLayers([
        new ArrowLayer({
            id: 'arrows-large-network',
            data: lines.map((line, index) => ({ line, distance: 0.2 + (index % 4) * 0.2 })),
            sizeMinPixels: 3,
            sizeMaxPixels: 7,
            getDistance: (value: { line: MapAnyLineWithType; distance: number }) => value.distance,
            getLine: (value: { line: MapAnyLineWithType; distance: number }) => value.line as never,
            getLinePositions: (value: MapAnyLineWithType) => value.positions,
            getDirection: (value: { line: MapAnyLineWithType; distance: number }) =>
                value.line.p1 !== undefined && value.line.p1 < 0
                    ? ArrowDirection.FROM_SIDE_2_TO_SIDE_1
                    : ArrowDirection.FROM_SIDE_1_TO_SIDE_2,
            getLineParallelIndex: (value: { line: MapAnyLineWithType; distance: number }) => value.line.parallelIndex,
            getLineAngles: (value: { line: MapAnyLineWithType; distance: number }) => [
                value.line.angleStart ?? 0,
                value.line.angle ?? 0,
                value.line.angleEnd ?? 0,
            ],
            getColor: (value: { line: MapAnyLineWithType; distance: number }) =>
                value.line.operatingStatus === LineStatus.FORCED_OUTAGE ? [255, 0, 0, 255] : [255, 200, 0, 255],
            animated: false,
        } as never),
    ]);

    await expectElement(canvas).toMatchScreenshot('arrow-layer-large-network', SCREENSHOT_OPTIONS);
});
