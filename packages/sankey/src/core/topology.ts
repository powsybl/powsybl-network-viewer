/**
 * Copyright (c) 2026, RTE (http://www.rte-france.com)
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 * SPDX-License-Identifier: MPL-2.0
 */

import type { BranchRecord, BusRecord, SankeyScenario } from './types.js';
import { branchKey } from './datamodel.js';

export interface TopologyDiff {
    persistBusIds: string[];
    addedBuses: BusRecord[];
    removedBusIds: string[];
    persistBranchKeys: string[];
    addedBranches: BranchRecord[];
    removedBranchKeys: string[];
}

export function diffTopology(oldScenario: SankeyScenario, newScenario: SankeyScenario): TopologyDiff {
    const oldBusIds = new Set(oldScenario.buses.map((b) => b.id));
    const newBusIds = new Set(newScenario.buses.map((b) => b.id));
    const oldBranchKeys = new Set(oldScenario.branches.map(branchKey));
    const newBranchKeys = new Set(newScenario.branches.map(branchKey));

    return {
        persistBusIds: newScenario.buses.filter((b) => oldBusIds.has(b.id)).map((b) => b.id),
        addedBuses: newScenario.buses.filter((b) => !oldBusIds.has(b.id)),
        removedBusIds: oldScenario.buses.filter((b) => !newBusIds.has(b.id)).map((b) => b.id),
        persistBranchKeys: newScenario.branches.filter((br) => oldBranchKeys.has(branchKey(br))).map(branchKey),
        addedBranches: newScenario.branches.filter((br) => !oldBranchKeys.has(branchKey(br))),
        removedBranchKeys: oldScenario.branches.filter((br) => !newBranchKeys.has(branchKey(br))).map(branchKey),
    };
}
