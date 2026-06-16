/**
 * Copyright (c) 2026, RTE (http://www.rte-france.com)
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 * SPDX-License-Identifier: MPL-2.0
 */

// Vite config that produces a single self-contained IIFE bundle for use in Jupyter notebooks.
// Unlike the library build, this config inlines all dependencies (svg.js, svg.panzoom.js)
// so the output file can be loaded with a plain <script> tag without any imports.

import * as path from 'node:path';
import { defineConfig } from 'vite';

export default defineConfig({
    resolve: {
        alias: {
            '@svgdotjs/svg.panzoom.js': path.resolve(
                '../../node_modules/@svgdotjs/svg.panzoom.js/src/svg.panzoom.js'
            ),
        },
    },
    build: {
        minify: false,
        outDir: 'demo/dist-notebook',
        emptyOutDir: true,
        lib: {
            entry: path.resolve('demo/notebook_bundle_entry.ts'),
            formats: ['iife'],
            name: 'PowsyblSankey',
            fileName: () => 'sankey-notebook.js',
        },
    },
});
