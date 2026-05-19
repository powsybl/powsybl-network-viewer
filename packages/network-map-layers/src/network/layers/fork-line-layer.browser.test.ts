/**
 * Copyright (c) 2026, RTE (http://www.rte-france.com)
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

import { afterEach, test } from 'vitest';
import { expectElement, SCREENSHOT_OPTIONS, setupBrowserLayerRenderer } from '../../testUtils/browser-render';
import { createLargeMapLinesWithType } from '../../testUtils/network-fixtures';
import ForkLineLayer from './fork-line-layer';

const { renderLayers, cleanup } = setupBrowserLayerRenderer();

afterEach(cleanup);

test('fork-line-layer-basic', async () => {
    const forkLines = [
        {
            id: 'fork-1',
            source: [2.35, 48.85] as [number, number],
            target: [2.37, 48.87] as [number, number],
            lineParallelIndex: 0.5,
            lineAngle: 0.7,
            substationOffset: 1,
            proximityFactor: 0.35,
        },
    ];

    const canvas = await renderLayers([
        new ForkLineLayer({
            id: 'fork-line-layer',
            data: forkLines,
            getSourcePosition: (lineData) => lineData.source,
            getTargetPosition: (lineData) => lineData.target,
            getColor: [210, 179, 63],
            getWidth: 2,
            widthUnits: 'pixels',
            getLineParallelIndex: (lineData) => lineData.lineParallelIndex,
            getLineAngle: (lineData) => lineData.lineAngle,
            getSubstationOffset: (lineData) => lineData.substationOffset,
            getProximityFactor: (lineData) => lineData.proximityFactor,
            getDistanceBetweenLines: 1000,
            getMaxParallelOffset: 100,
            getMinParallelOffset: 3,
            getSubstationRadius: 500,
            getSubstationMaxPixel: 5,
            getMinSubstationRadiusPixel: 1,
            distanceBetweenLines: 1000,
            maxParallelOffset: 100,
            minParallelOffset: 3,
            substationRadius: 500,
            substationMaxPixel: 5,
            minSubstationRadiusPixel: 1,
        }),
    ]);

    await expectElement(canvas).toMatchScreenshot('fork-line-layer-basic', SCREENSHOT_OPTIONS);
});

test('fork-line-layer-large-network', async () => {
    const lines = createLargeMapLinesWithType();
    const forkLines = lines.map((line) => ({
        id: `fork-${line.id}`,
        source: line.positions![0],
        target: line.positions![1] ?? line.positions![line.positions!.length - 1],
        lineParallelIndex: line.parallelIndex ?? 0,
        lineAngle: line.angle ?? 0,
        substationOffset: 1,
        proximityFactor: line.proximityFactorStart ?? 1,
    }));

    const canvas = await renderLayers([
        new ForkLineLayer({
            id: 'fork-line-layer-large-network',
            data: forkLines,
            getSourcePosition: (lineData) => lineData.source,
            getTargetPosition: (lineData) => lineData.target,
            getColor: [210, 179, 63],
            getWidth: 2,
            widthUnits: 'pixels',
            getLineParallelIndex: (lineData) => lineData.lineParallelIndex,
            getLineAngle: (lineData) => lineData.lineAngle,
            getSubstationOffset: (lineData) => lineData.substationOffset,
            getProximityFactor: (lineData) => lineData.proximityFactor,
            getDistanceBetweenLines: 1000,
            getMaxParallelOffset: 100,
            getMinParallelOffset: 3,
            getSubstationRadius: 500,
            getSubstationMaxPixel: 5,
            getMinSubstationRadiusPixel: 1,
            distanceBetweenLines: 1000,
            maxParallelOffset: 100,
            minParallelOffset: 3,
            substationRadius: 500,
            substationMaxPixel: 5,
            minSubstationRadiusPixel: 1,
        }),
    ]);

    await expectElement(canvas).toMatchScreenshot('fork-line-layer-large-network', SCREENSHOT_OPTIONS);
});
