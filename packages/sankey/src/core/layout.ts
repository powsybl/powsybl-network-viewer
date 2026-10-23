/**
 * Copyright (c) 2026, RTE (http://www.rte-france.com)
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 * SPDX-License-Identifier: MPL-2.0
 */

import type { BranchRecord, Sfpd } from './types.js';

export type StackCoord = Map<string, number>;
export type StackCoordOffset = Map<string, Map<string, number>>;

function oppositeBus(key: string, bus: string): string {
    const parts = key.split('->');
    return parts[0] === bus ? parts[1] : parts[0];
}

export function initStackCoord(
    busIds: string[],
    branches: BranchRecord[]
): { stackCoord: StackCoord; stackCoordOffset: StackCoordOffset } {
    const stackCoord: StackCoord = new Map(busIds.map((b) => [b, 0]));
    const stackCoordOffset: StackCoordOffset = new Map(busIds.map((b) => [b, new Map()]));
    for (const br of branches) {
        stackCoordOffset.get(br.from_bus)?.set(br.to_bus, 0);
        stackCoordOffset.get(br.to_bus)?.set(br.from_bus, 0);
    }
    return { stackCoord, stackCoordOffset };
}

export function randomReset(stackCoord: StackCoord, scale = 1): void {
    for (const bus of stackCoord.keys()) {
        stackCoord.set(bus, (Math.random() - 0.5) * scale);
    }
}

export function rearrangeStackCoordOffset(
    stackCoordOffset: StackCoordOffset,
    states: Map<string, number>,
    flows: Map<string, number>,
    stackCoord: StackCoord,
    sfpd: Map<string, Sfpd>,
    maxpmax: Map<string, number>
): void {
    for (const [bus, sp] of sfpd) {
        const scBus = stackCoord.get(bus)!;
        const stBus = states.get(bus)!;
        const halfMpm = (maxpmax.get(bus) ?? 0) / 2;
        const offMap = stackCoordOffset.get(bus)!;

        for (const branchKeys of [sp.outgoing, sp.incoming]) {
            if (branchKeys.length === 0) continue;

            const items = branchKeys.map((key) => ({
                opp: oppositeBus(key, bus),
                fl: Math.abs(flows.get(key) ?? 0),
            }));

            items.sort((a, b) => {
                const slopeOf = (busop: string): number => {
                    const num = stackCoord.get(busop)! - scBus;
                    const den = Math.max(1e-10, Math.abs(stBus - states.get(busop)!));
                    return num / den;
                };
                return slopeOf(a.opp) - slopeOf(b.opp);
            });

            let y0 = -halfMpm;
            for (const { opp: busop, fl } of items) {
                offMap.set(busop, y0 + fl / 2);
                y0 += fl;
            }
        }
    }
}

export interface LayoutIndex {
    readonly busArr: string[];
    readonly busIndex: Map<string, number>;
    readonly mpmFlat: Float64Array;
    readonly adjOut: number[][];
    readonly adjIn: number[][];
    readonly N: number;
    readonly buf: Float64Array;
}

export function buildLayoutIndex(busIds: string[], sfpd: Map<string, Sfpd>, maxpmax: Map<string, number>): LayoutIndex {
    const N = busIds.length;
    const busIndex = new Map<string, number>(busIds.map((b, i) => [b, i]));
    const mpmFlat = new Float64Array(N);
    for (let i = 0; i < N; i++) mpmFlat[i] = maxpmax.get(busIds[i]) ?? 0;

    const adjOut: number[][] = Array.from({ length: N }, () => []);
    const adjIn: number[][] = Array.from({ length: N }, () => []);
    for (let i = 0; i < N; i++) {
        const sp = sfpd.get(busIds[i]);
        if (!sp) continue;
        const toIdx = (key: string): number => busIndex.get(oppositeBus(key, busIds[i])) ?? -1;
        for (const key of sp.outgoing) {
            const j = toIdx(key);
            if (j >= 0) adjOut[i].push(j);
        }
        for (const key of sp.incoming) {
            const j = toIdx(key);
            if (j >= 0) adjIn[i].push(j);
        }
    }

    return { busArr: busIds, busIndex, mpmFlat, adjOut, adjIn, N, buf: new Float64Array(N * 2) };
}

export function flatFromMap(idx: LayoutIndex, map: Map<string, number>, out: Float64Array): void {
    const { busArr, N } = idx;
    for (let i = 0; i < N; i++) out[i] = map.get(busArr[i]) ?? 0;
}

export function flatToMap(idx: LayoutIndex, flat: Float64Array, map: Map<string, number>): void {
    const { busArr, N } = idx;
    for (let i = 0; i < N; i++) map.set(busArr[i], flat[i]);
}

export function rearrangeStackCoord(
    idx: LayoutIndex,
    scFlat: Float64Array,
    stFlat: Float64Array,
    _flows: Map<string, number>,
    tanStrength: number,
    dRepulse: number
): void {
    const { N, mpmFlat, adjOut, adjIn, buf } = idx;

    const dTan = buf.subarray(0, N);
    const dRep = buf.subarray(N, 2 * N);

    // Pass 1: tangential force
    for (let i = 0; i < N; i++) {
        const sci = scFlat[i];
        let tan = 0;
        for (const j of adjOut[i]) tan += sci - scFlat[j];
        for (const j of adjIn[i]) tan += sci - scFlat[j];
        dTan[i] = tan;
    }

    // Pass 2: repulsive force
    dRep.fill(0);
    for (let i = 0; i < N; i++) {
        const sci = scFlat[i];
        const mpmi = mpmFlat[i];
        const sti = stFlat[i];
        for (let j = i + 1; j < N; j++) {
            const dy = sci - scFlat[j];
            const dst = sti - stFlat[j];
            const absDst = Math.abs(dst);
            const width = (mpmi + mpmFlat[j]) * 0.5;
            const absDy = Math.abs(dy);
            const absW = absDy - width;
            const absWC = Math.max(absW, 0);
            const D2raw = absWC * absWC + 10 * absDst * absDst;
            const D2 = Math.max(D2raw, 0.05);
            const sign = Math.sign(dy);
            const f = (mpmi * mpmFlat[j] * sign) / D2;
            dRep[i] += f;
            dRep[j] -= f;
        }
    }

    for (let i = 0; i < N; i++) {
        const maxStep = mpmFlat[i];
        let delta = -dTan[i] * tanStrength + dRep[i] * dRepulse;
        if (delta > maxStep) delta = maxStep;
        if (delta < -maxStep) delta = -maxStep;
        scFlat[i] = scFlat[i] + delta;
    }
}
