/**
 * Copyright (c) 2026, RTE (http://www.rte-france.com)
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 * SPDX-License-Identifier: MPL-2.0
 */

import type { BranchRecord, Sfpd } from './types.js';

export function branchKey(br: BranchRecord): string {
    return br.id === undefined ? `${br.from_bus}->${br.to_bus}` : `${br.from_bus}->${br.to_bus}->${br.id}`;
}

export function parseSfpd(busIds: string[], branches: BranchRecord[], flows: Map<string, number>): Map<string, Sfpd> {
    const result = new Map<string, Sfpd>();
    for (const busId of busIds) {
        const outgoing: string[] = [];
        const incoming: string[] = [];
        for (const br of branches) {
            if (br.from_bus !== busId && br.to_bus !== busId) continue;
            const key = branchKey(br);
            const p = flows.get(key) ?? 0;
            if (p === 0) {
                outgoing.push(key);
                incoming.push(key);
            } else if ((br.from_bus === busId && p > 0) || (br.to_bus === busId && p < 0)) {
                outgoing.push(key);
            } else {
                incoming.push(key);
            }
        }
        result.set(busId, { outgoing, incoming });
    }
    return result;
}

export function createMaxpmax(sfpd: Map<string, Sfpd>, flows: Map<string, number>): Map<string, number> {
    const result = new Map<string, number>();
    for (const [busId, sp] of sfpd) {
        const sumList = (keys: string[]): number => keys.reduce((acc, k) => acc + Math.abs(flows.get(k) ?? 0), 0);
        const maxpmax = Math.max(sumList(sp.outgoing), sumList(sp.incoming));
        result.set(busId, maxpmax);
    }
    return result;
}

export function loadRatio(flow: number, pMax: number): number {
    return Math.abs(flow) / pMax;
}

export function bandColor(ratio: number): string {
    if (ratio <= 0.8) return 'green';
    if (ratio <= 1) return 'orange';
    return 'red';
}
