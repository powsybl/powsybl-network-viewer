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
import svgr from 'vite-plugin-svgr';
import pkg from './package.json' with { type: 'json' };
import { viteEslintChecker } from '../../utils/viteEslintChecker';

export default defineConfig((config) => ({
    plugins: [
        viteEslintChecker(config.isPreview, config.command),
        dts({
            rollupTypes: true,
            tsconfigPath: './tsconfig.json',
            afterBuild: () => {
                copyFileSync('dist/index.d.ts', 'dist/index.d.cts');
            },
        }),
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
            external: [...Object.keys(pkg.peerDependencies), /^node:.*/],
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
}));
