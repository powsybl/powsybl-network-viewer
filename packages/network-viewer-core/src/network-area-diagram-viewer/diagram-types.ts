/**
 * Copyright (c) 2025, RTE (http://www.rte-france.com)
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 * SPDX-License-Identifier: MPL-2.0
 */

import { Point } from '@svgdotjs/svg.js';

export type Dimensions = { width: number; height: number; viewbox: ViewBox };
export type ViewBox = { x: number; y: number; width: number; height: number };

// node move: original and new position
export type NodeMove = {
    xOrig: number;
    yOrig: number;
    xNew: number;
    yNew: number;
};

export enum EdgeType {
    LINE,
    TWO_WINDINGS_TRANSFORMER,
    PHASE_SHIFT_TRANSFORMER,
    HVDC_LINE_VSC,
    HVDC_LINE_LCC,
    DANGLING_LINE,
    TIE_LINE,
    THREE_WINDINGS_TRANSFORMER,
    THREE_WINDINGS_PHASE_SHIFT_TRANSFORMER,
    UNKNOWN,
}

export enum ElementType {
    VOLTAGE_LEVEL,
    THREE_WINDINGS_TRANSFORMER,
    TEXT_NODE,
    BRANCH,
    UNKNOWN,
}

export type ElementData = {
    svgId: string;
    equipmentId: string;
    type: string;
};

export type HalfEdge = {
    side: string;
    fork: boolean;
    busOuterRadius: number;
    voltageLevelRadius: number;
    edgeInfoId?: string;
    edgePoints: Point[];
};

export type NodeRadius = {
    busInnerRadius: number;
    busOuterRadius: number;
    voltageLevelRadius: number;
};
