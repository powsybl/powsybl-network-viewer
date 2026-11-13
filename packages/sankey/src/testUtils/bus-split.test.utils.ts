/**
 * Copyright (c) 2026, RTE (http://www.rte-france.com)
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 * SPDX-License-Identifier: MPL-2.0
 */

import type { SankeyScenario } from '../core/types.js';

export const busSplitSmall: SankeyScenario = {
    buses: [
        { id: 'A', voltage_angle: 0.0 },
        { id: 'B', voltage_angle: 0.1 },
        { id: 'C', voltage_angle: -0.1 },
        { id: 'D', voltage_angle: 0.05 },
    ],
    branches: [
        { from_bus: 'A', to_bus: 'B', flow: 100, p_max: 200, id: 'L-AB' },
        { from_bus: 'A', to_bus: 'C', flow: -80, p_max: 150, id: 'L-AC' },
        { from_bus: 'A', to_bus: 'D', flow: 40, p_max: 100, id: 'L-AD' },
        { from_bus: 'B', to_bus: 'C', flow: 30, p_max: 120, id: 'L-BC' },
    ],
};

export const busSplitResult: SankeyScenario = {
    buses: [
        { id: 'A1', voltage_angle: 0.0 },
        { id: 'A2', voltage_angle: 0.002 },
        { id: 'B', voltage_angle: 0.1 },
        { id: 'C', voltage_angle: -0.1 },
        { id: 'D', voltage_angle: 0.05 },
    ],
    branches: [
        { from_bus: 'A1', to_bus: 'B', flow: 100, p_max: 200, id: 'L-AB' },
        { from_bus: 'A2', to_bus: 'C', flow: -80, p_max: 150, id: 'L-AC' },
        { from_bus: 'A1', to_bus: 'D', flow: 40, p_max: 100, id: 'L-AD' },
        { from_bus: 'B', to_bus: 'C', flow: 30, p_max: 120, id: 'L-BC' },
        { from_bus: 'A1', to_bus: 'A2', flow: 0, p_max: 500, id: 'COUPLER', outage: true },
    ],
    bus_breaker_map: {
        A1: ['VL1_A'],
        A2: ['VL1_B'],
        B: ['VL2_A'],
        C: ['VL3_A'],
        D: ['VL4_A'],
    },
    inherited_positions: { A1: 'A', A2: 'A' },
};
