/**
 * Copyright (c) 2026, RTE (http://www.rte-france.com)
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 * SPDX-License-Identifier: MPL-2.0
 */

// Entry point for the self-contained IIFE bundle used by the Jupyter notebook.
// All dependencies (svg.js, svg.panzoom.js) are inlined — no external imports needed.
export { SankeyRenderer } from '../src/index.js';
export type { LayoutState, Orientation } from '../src/index.js';
