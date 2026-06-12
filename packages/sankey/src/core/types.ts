/**
 * Copyright (c) 2026, RTE (http://www.rte-france.com)
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 * SPDX-License-Identifier: MPL-2.0
 */

export interface BusRecord {
    id: string;
    voltage_angle: number;
    label?: string;
    is_slack?: boolean;
}

export interface BranchRecord {
    from_bus: string;
    to_bus: string;
    flow: number;
    p_max: number;
    id?: string;
    outage?: boolean;
    label?: string;
}

export type Orientation = 'horizontal' | 'vertical';

export interface SankeyOptions {
    width?: number;
    height?: number;
}

export interface SankeyScenario {
    buses: BusRecord[];
    branches: BranchRecord[];
    meta?: {
        case_name?: string;
        timestamp?: string;
    };
}

export interface LayoutState {
    version: 1;
    params: {
        stretch: number;
        align: number;
        repulse: number;
    };
    layout: Record<string, number>;
}

export interface Sfpd {
    outgoing: string[]; // branch keys
    incoming: string[]; // branch keys
}
