/**
 * Copyright (c) 2026, RTE (http://www.rte-france.com)
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 * SPDX-License-Identifier: MPL-2.0
 */

export const NB_TRANSITION_STEPS = 20;

export interface FlowTransitionState {
    prevStates: Map<string, number>;
    nextStates: Map<string, number>;
    prevFlows: Map<string, number>;
    nextFlows: Map<string, number>;
    currentStates: Map<string, number>;
    currentFlows: Map<string, number>;
    step: number;
}

export function interpolateStep(prev: number, next: number, step: number, totalSteps: number): number {
    return (next * step + prev * (totalSteps - step)) / totalSteps;
}

// create initial state
export function createFlowTransitionState(
    states: Map<string, number>,
    flows: Map<string, number>
): FlowTransitionState {
    return {
        prevStates: new Map(states),
        nextStates: new Map(states),
        currentStates: new Map(states),
        prevFlows: new Map(flows),
        nextFlows: new Map(flows),
        currentFlows: new Map(flows),
        step: NB_TRANSITION_STEPS,
    };
}

export function isTransitionDone(ts: FlowTransitionState): boolean {
    return ts.step >= NB_TRANSITION_STEPS;
}

export function transitFlowsState(ts: FlowTransitionState): void {
    if (ts.step >= NB_TRANSITION_STEPS) return;
    ts.step++;
    const { step, prevStates, nextStates, currentStates, prevFlows, nextFlows, currentFlows } = ts;
    for (const [bus, prev] of prevStates) {
        currentStates.set(bus, interpolateStep(prev, nextStates.get(bus) ?? prev, step, NB_TRANSITION_STEPS));
    }
    for (const [key, prev] of prevFlows) {
        currentFlows.set(key, interpolateStep(prev, nextFlows.get(key) ?? prev, step, NB_TRANSITION_STEPS));
    }
}

export function updateFlows(
    ts: FlowTransitionState,
    newStates: Map<string, number>,
    newFlows: Map<string, number>
): void {
    for (const [bus, v] of ts.currentStates) ts.prevStates.set(bus, v);
    for (const [key, v] of ts.currentFlows) ts.prevFlows.set(key, v);
    for (const [bus, v] of newStates) ts.nextStates.set(bus, v);
    for (const [key, v] of newFlows) ts.nextFlows.set(key, v);
    ts.step = 0;
}
