/**
 * Copyright (c) 2026, RTE (http://www.rte-france.com)
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 * SPDX-License-Identifier: MPL-2.0
 */

export class RafLoop {
    private running = false;
    private rafId: number | null = null;
    private lastTs = 0;

    constructor(private readonly tick: (dt: number) => void) {}

    start(): void {
        if (this.running) return;
        this.running = true;
        this.lastTs = 0;
        const loop = (ts: DOMHighResTimeStamp): void => {
            if (!this.running) return;
            const dt = this.lastTs === 0 ? 16.67 : Math.min(Math.max(ts - this.lastTs, 1), 100);
            this.lastTs = ts;
            this.tick(dt);
            this.rafId = requestAnimationFrame(loop);
        };
        this.rafId = requestAnimationFrame(loop);
    }

    stop(): void {
        this.running = false;
        if (this.rafId !== null) {
            cancelAnimationFrame(this.rafId);
            this.rafId = null;
        }
    }

    isRunning(): boolean {
        return this.running;
    }
}
