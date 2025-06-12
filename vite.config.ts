/**
 * Copyright (c) 2024, RTE (http://www.rte-france.com)
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

/// <reference types="./vite-plugin-checker.d.ts" />

import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import svgr from 'vite-plugin-svgr';
import checker from 'vite-plugin-checker';
import dts from 'vite-plugin-dts';
import * as path from 'node:path';

const eslintCmd = 'eslint --report-unused-disable-directives --report-unused-inline-configs warn';

export default defineConfig((config) => ({
    plugins: [
        !config.isPreview &&
            checker({
                overlay: { initialIsOpen: 'error', position: 'bl' },
                typescript: true,
                eslint: {
                    lintCommand:
                        config.command === 'build'
                            ? `${eslintCmd} .`
                            : process.env.VITEST
                              ? `${eslintCmd} "./src/**/*.{spec,test}.{js,jsx,ts,tsx}"`
                              : `${eslintCmd} --ignore-pattern "**/*.{test,spec}.*" "./src/**/*.{js,jsx,ts,tsx}"`,
                    useFlatConfig: true,
                    dev: {
                        logLevel: ['error'], // no warning in dev mode
                    },
                },
            }),
        react(),
        svgr(), // works on every import with the pattern "**/*.svg?react"
        dts({
            include: ['src'],
            exclude: ['**/*.{spec,test}.{ts,tsx}'],
        }),
    ],
    build: {
        minify: false, // easier to debug on the apps using this lib
        lib: {
            // Could also be a dictionary or array of multiple entry points
            entry: path.resolve(__dirname, 'src/index.ts'),
            name: 'PowSyBl network viewer',
            // the proper extensions will be added
            fileName: 'powsybl-network-viewer',
        },
        rollupOptions: {
            //https://stackoverflow.com/questions/59134241/using-deck-gl-as-webpack-external
            //https://github.com/visgl/deck.gl/blob/94bad4bb209a5da0686fb03f107e86b18199c108/website/webpack.config.js#L128-L141
            external: (id) => !id.startsWith('.') && !path.isAbsolute(id),
            output: {
                // preserveModules: true,
                // entryFileNames: '[name].js', // override vite and allow to keep the original tree and .js extension even in ESM
                // DO NOT define any external deps. External deps are dealt with externalizeDeps from vite-plugin-externalize-deps
                // defining externals manually will prevent this plugin from working
                // external:
                // Provide global variables to use in the UMD build
                // for externalized deps
                globals: {
                    'cheap-ruler': 'CheapRuler',
                    'deck.gl': 'DeckGl',
                    geolib: 'Geolib',
                    'mapbox-gl': 'MapboxGl',
                    'maplibre-gl': 'MaplibreGl',
                    'prop-types': 'PropTypes',
                    react: 'React',
                    'react/jsx-runtime': 'ReactJsxRuntime',
                    'react-intl': 'ReactIntl',
                    'react-map-gl/mapbox-legacy': 'ReactMapGl',
                    '@deck.gl/core': 'DeckGlCore',
                    '@deck.gl/extensions': 'DeckGlExtensions',
                    '@deck.gl/mapbox': 'DeckGlMapbox',
                    '@emotion/react': 'EmotionReact',
                    '@mui/icons-material': 'MuiIconsMaterial',
                    '@mui/material': 'MuiMaterial',
                    '@mui/system': 'MuiSystem',
                    '@luma.gl/constants': 'LumaGlConstants',
                    '@luma.gl/core': 'LumaGlCore',
                    '@svgdotjs/svg.js': 'SvgJs',
                    '@mapbox/mapbox-gl-draw': 'MapboxGlDraw',
                    '@turf/boolean-point-in-polygon': 'BooleanPointInPolygon',
                },
            },
        },
    },
}));
