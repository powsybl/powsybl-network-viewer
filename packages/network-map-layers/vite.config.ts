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
import svgr from 'vite-plugin-svgr';
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
        svgr(),
    ],
    build: {
        minify: false,
        lib: {
            entry: path.resolve(__dirname, 'src/index.ts'),
            formats: ['es', 'cjs'],
            name: 'PowsyblNetworkMapLayers',
            fileName: 'powsybl-network-map-layers',
        },
        rollupOptions: {
            external: [...Object.keys(pkg.peerDependencies), ...Object.keys(pkg.dependencies), /^node:.*/],
            output: {
                globals: {
                    '@deck.gl/core': 'DeckGlCore',
                    '@deck.gl/extensions': 'DeckGlExtensions',
                    '@deck.gl/layers': 'DeckGlLayers',
                    '@luma.gl/constants': 'LumaGlConstants',
                    '@luma.gl/core': 'LumaGlCore',
                    '@luma.gl/engine': 'LumaGlEngine',
                },
            },
        },
    },
});
