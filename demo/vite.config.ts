/**
 * Copyright (c) 2025, RTE (http://www.rte-france.com)
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import * as path from 'node:path';
const workspaceRoot = path.resolve(__dirname, '..');
export default defineConfig({
    root: __dirname,
    plugins: [react()],
    resolve: {
        alias: {
            // Use source files from the workspace package during demo dev for HMR
            '@powsybl/network-map-layers': path.resolve(workspaceRoot, 'packages/network-map-layers/src'),
            // Also allow importing the library src directly from the demo if needed
            '@powsybl/network-viewer': path.resolve(workspaceRoot, 'src'),
        },
        // Ensure symlinks from workspaces don't confuse module resolution
        preserveSymlinks: true,
    },
    server: {
        // Allow the dev server to serve files from the monorepo root (outside demo/)
        fs: {
            allow: [workspaceRoot],
        },
    },
    optimizeDeps: {
        // Do not prebundle the workspace package; we want it treated as source for HMR
        exclude: ['@powsybl/network-map-layers'],
    },
});
