/**
 * Copyright (c) 2026, RTE (http://www.rte-france.com)
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

import { createReadStream, existsSync } from 'node:fs';
import { basename, extname, resolve } from 'node:path';
import react from '@vitejs/plugin-react';
import { playwright } from '@vitest/browser-playwright';
import type { Plugin } from 'vite';
import type { BrowserCommandContext } from 'vitest/node';
import { defineConfig } from 'vitest/config';

const FIXTURE_MODULE_ID = 'virtual:nad-performance-fixture';
const RESOLVED_FIXTURE_MODULE_ID = `\0${FIXTURE_MODULE_ID}`;
const SVG_FIXTURE_URL = '/__nad-performance-fixture/diagram.svg';
const METADATA_FIXTURE_URL = '/__nad-performance-fixture/metadata.json';

type BenchmarkRow = {
    interaction: string;
    durationMs: number;
    frameCount: number;
    averageFps: number;
    p95FrameMs: number;
    worstFrameMs: number;
    stutterFrameCount: number;
    longFrameCount: number;
    stutterPercent: number;
};

const svgPathArgument = process.env.NAD_SVG;
if (!svgPathArgument) {
    throw new Error(
        'Missing NAD_SVG. Usage: NAD_SVG=demo/src/diagram-viewers/data/case1354pegase.svg npm run test:browser:performance'
    );
}

const svgPath = resolve(svgPathArgument);
const metadataPath = resolve(
    process.env.NAD_METADATA ?? `${svgPath.slice(0, svgPath.length - extname(svgPath).length)}_metadata.json`
);

for (const [kind, filePath] of [
    ['SVG', svgPath],
    ['metadata', metadataPath],
] as const) {
    if (!existsSync(filePath)) throw new Error(`Cannot find the NAD ${kind} file: ${filePath}`);
}
if (extname(svgPath).toLowerCase() !== '.svg') throw new Error(`NAD_SVG must reference an .svg file: ${svgPath}`);

const nadPerformanceFixture = (): Plugin => ({
    name: 'nad-performance-fixture',
    configureServer(server) {
        server.middlewares.use(SVG_FIXTURE_URL, (_request, response) => {
            response.statusCode = 200;
            response.setHeader('Content-Type', 'image/svg+xml; charset=utf-8');
            createReadStream(svgPath).pipe(response);
        });
        server.middlewares.use(METADATA_FIXTURE_URL, (_request, response) => {
            response.statusCode = 200;
            response.setHeader('Content-Type', 'application/json; charset=utf-8');
            createReadStream(metadataPath).pipe(response);
        });
    },
    resolveId(id) {
        return id === FIXTURE_MODULE_ID ? RESOLVED_FIXTURE_MODULE_ID : undefined;
    },
    load(id) {
        if (id !== RESOLVED_FIXTURE_MODULE_ID) return undefined;
        return [
            `export const benchmarkName = ${JSON.stringify(basename(svgPath))};`,
            `export const svgUrl = ${JSON.stringify(SVG_FIXTURE_URL)};`,
            `export const metadataUrl = ${JSON.stringify(METADATA_FIXTURE_URL)};`,
        ].join('\n');
    },
});

export default defineConfig({
    plugins: [nadPerformanceFixture(), react()],
    test: {
        include: ['demo/src/nad-svg-performance.browser.test.ts'],
        globals: true,
        testTimeout: 180_000,
        browser: {
            enabled: true,
            provider: playwright(),
            headless: true,
            commands: {
                async playwrightWheel(
                    { page, iframe }: BrowserCommandContext,
                    selector: string,
                    relativeX: number,
                    relativeY: number,
                    deltaY: number,
                    steps: number,
                    stepDelayMs: number
                ) {
                    const box = await iframe.locator(selector).boundingBox();
                    if (!box) throw new Error(`Cannot find the interaction target "${selector}"`);
                    await page.mouse.move(box.x + box.width * relativeX, box.y + box.height * relativeY);
                    for (let step = 0; step < steps; step += 1) {
                        await page.mouse.wheel(0, deltaY);
                        await page.waitForTimeout(stepDelayMs);
                    }
                },
                async playwrightDrag(
                    { page, iframe }: BrowserCommandContext,
                    selector: string,
                    relativeStartX: number,
                    relativeStartY: number,
                    deltaX: number,
                    deltaY: number,
                    steps: number,
                    stepDelayMs: number
                ) {
                    const box = await iframe.locator(selector).boundingBox();
                    if (!box) throw new Error(`Cannot find the interaction target "${selector}"`);
                    const startX = box.x + box.width * relativeStartX;
                    const startY = box.y + box.height * relativeStartY;
                    await page.mouse.move(startX, startY);
                    await page.waitForTimeout(stepDelayMs);
                    await page.mouse.down();
                    for (let step = 1; step <= steps; step += 1) {
                        await page.mouse.move(startX + (deltaX * step) / steps, startY + (deltaY * step) / steps);
                        await page.waitForTimeout(stepDelayMs);
                    }
                    await page.mouse.up();
                },
                reportNadPerformance(
                    _context: BrowserCommandContext,
                    name: string,
                    devicePixelRatio: number,
                    initialLoadMs: number,
                    visibleLabelCount: number,
                    rows: BenchmarkRow[]
                ) {
                    const tableRows = rows.map((row) => [
                        row.interaction,
                        `${row.durationMs.toFixed(1)} ms`,
                        String(row.frameCount),
                        row.averageFps.toFixed(1),
                        `${row.p95FrameMs.toFixed(1)} ms`,
                        `${row.worstFrameMs.toFixed(1)} ms`,
                        `${row.stutterFrameCount} (${row.stutterPercent.toFixed(1)}%)`,
                        String(row.longFrameCount),
                    ]);
                    const headers = [
                        'Interaction',
                        'Duration',
                        'Frames',
                        'Avg FPS',
                        'p95 frame',
                        'Worst frame',
                        'Stutters',
                        'Long frames',
                    ];
                    const widths = headers.map((header, index) =>
                        Math.max(header.length, ...tableRows.map((row) => row[index].length))
                    );
                    const formatRow = (row: string[]): string =>
                        row.map((cell, index) => cell.padEnd(widths[index])).join('  ');
                    const separator = widths.map((width) => '-'.repeat(width)).join('  ');

                    console.info(
                        [
                            '',
                            `NAD SVG performance benchmark: ${name}`,
                            `Browser: Chromium | Device pixel ratio: ${devicePixelRatio}`,
                            `Initial load: ${initialLoadMs.toFixed(1)} ms | Visible labels: ${visibleLabelCount}`,
                            '',
                            formatRow(headers),
                            separator,
                            ...tableRows.map(formatRow),
                            '',
                        ].join('\n')
                    );
                },
            },
            instances: [{ browser: 'chromium', viewport: { width: 1000, height: 1000 } }],
        },
    },
});
