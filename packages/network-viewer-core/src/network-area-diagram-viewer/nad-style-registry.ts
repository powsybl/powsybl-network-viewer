/**
 * Copyright (c) 2026, RTE (http://www.rte-france.com)
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 * SPDX-License-Identifier: MPL-2.0
 */

import { BusNodeMetadata } from './diagram-metadata';

export interface NadLineStyle {
    stroke?: string | null;
    strokeWidth?: string | null;
    strokeDasharray?: string | null;
}

export interface NadBusNodeStyle extends NadLineStyle {
    equipmentId: string;
    fill?: string | null;
}

export interface NadStyleProvider {
    getBusNodeStyle(node: BusNodeMetadata): NadBusNodeStyle | undefined;
    // TODO complete style for branch, t3t and injections
}

export class NadStyleRegistry {
    private readonly providers = new Map<string, NadStyleProvider>();

    addStyleProvider(name: string, provider: NadStyleProvider): this {
        if (this.providers.has(name)) {
            throw new Error(`NAD style provider "${name}" is already registered`);
        }
        this.providers.set(name, provider);
        return this;
    }

    getStyleProvider(name: string): NadStyleProvider {
        const provider = this.providers.get(name);
        if (!provider) {
            throw new Error(`NAD style provider "${name}" is not registered`);
        }
        return provider;
    }
}
