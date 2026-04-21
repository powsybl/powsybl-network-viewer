/**
 * Copyright (c) 2026, RTE (http://www.rte-france.com)
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

import { defineConfig } from 'tsdown';

export default defineConfig({
    entry: ['./src/index.ts'],
    format: ['cjs', 'esm'],
    platform: 'browser',
    sourcemap: true,
    publint: true,
    attw: true,
    loader: { '.svg': 'asset', '.frag': 'text', '.vert': 'text' },
});
