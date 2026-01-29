/**
 * Copyright (c) 2024, RTE (http://www.rte-france.com)
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

import { copyFileSync } from 'node:fs';
import * as path from 'node:path';
import { defineConfig } from 'vite';
import dts from 'vite-plugin-dts';
import eslint from 'vite-plugin-eslint';
import pkg from './package.json' with { type: 'json' };

export default defineConfig({
    plugins: [
        dts({
            rollupTypes: true,
            tsconfigPath: './tsconfig.json',
            afterBuild: () => {
                copyFileSync('dist/index.d.ts', 'dist/index.d.cts');
            },
        }),
        eslint(),
    ],
    build: {
        minify: false,
        lib: {
            entry: path.resolve(__dirname, 'src/index.ts'),
            formats: ['es', 'cjs'],
            name: 'PowsyblNetworkViewerCore',
            fileName: 'powsybl-network-viewer-core',
        },
        rollupOptions: {
            external: [...Object.keys(pkg.dependencies || {}), /^node:.*/],
            output: {
                globals: {
                    '@svgdotjs/svg.js': 'SVG',
                    '@svgdotjs/svg.panzoom.js': 'SVGPanZoom',
                    'lodash.debounce': 'debounce',
                },
            },
        },
    },
});
