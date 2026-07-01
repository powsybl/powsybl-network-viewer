/**
 * Copyright (c) 2026, RTE (http://www.rte-france.com)
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 * SPDX-License-Identifier: MPL-2.0
 */

function n(v: number): string {
    return String(Number.parseFloat(v.toPrecision(10)));
}

export function bandPath(x1: number, x2: number, y1: number, y2: number, width: number, isHorizontal: boolean): string {
    const w2 = width / 2;
    if (isHorizontal) {
        // horizontal layout: SVG X = -voltage_angle so flow runs left-to-right
        const cp1x = -((2 * x1 + x2) / 3);
        const cp2x = -((x1 + 2 * x2) / 3);
        return `M ${n(-x1)} ${n(y1 - w2)} C ${n(cp1x)} ${n(y1 - w2)} ${n(cp2x)} ${n(y2 - w2)} ${n(-x2)} ${n(y2 - w2)} L ${n(-x2)} ${n(y2 + w2)} C ${n(cp2x)} ${n(y2 + w2)} ${n(cp1x)} ${n(y1 + w2)} ${n(-x1)} ${n(y1 + w2)} Z`;
    }
    // vertical layout: coordinate axes are transposed
    const cp1y = -((2 * x1 + x2) / 3);
    const cp2y = -((x1 + 2 * x2) / 3);
    return `M ${n(y1 - w2)} ${n(-x1)} C ${n(y1 - w2)} ${n(cp1y)} ${n(y2 - w2)} ${n(cp2y)} ${n(y2 - w2)} ${n(-x2)} L ${n(y2 + w2)} ${n(-x2)} C ${n(y2 + w2)} ${n(cp2y)} ${n(y1 + w2)} ${n(cp1y)} ${n(y1 + w2)} ${n(-x1)} Z`;
}

export function trianglePath(x: number, y1: number, y2: number, width: number, isHorizontal: boolean): string {
    if (isHorizontal) {
        return `M ${n(-x)} ${n(y1)} L ${n(-x + width)} ${n((y1 + y2) / 2)} L ${n(-x)} ${n(y2)} Z`;
    }
    return `M ${n(y1)} ${n(-x)} L ${n((y1 + y2) / 2)} ${n(-x - width)} L ${n(y2)} ${n(-x)} Z`;
}

export function overloadBandPath(
    x1: number,
    x2: number,
    y1: number,
    y2: number,
    p: number,
    pMax: number,
    isHorizontal: boolean
): string | null {
    if (p <= pMax) return null;
    const pOverload = p - pMax;
    const offset = pMax / 2;
    return bandPath(x1, x2, y1 + offset, y2 + offset, pOverload, isHorizontal);
}

export function linearScale(domain: [number, number], range: [number, number]): (v: number) => number {
    const [d0, d1] = domain;
    const [r0, r1] = range;
    const k = (r1 - r0) / (d1 - d0);
    return (v: number) => r0 + (v - d0) * k;
}
