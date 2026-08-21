/**
 * Copyright (c) 2026, RTE (http://www.rte-france.com)
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 * SPDX-License-Identifier: MPL-2.0
 */

export interface NadLineStyle {
    stroke?: string;
    strokeWidth?: string;
    strokeDasharray?: string;
}

export interface NadBusNodeStyle extends NadLineStyle {
    equipmentId?: string;
    fill?: string;
}

export interface NadElementStyle extends NadLineStyle {
    fill?: string;
}

export interface NadBranchStyle {
    side1?: NadElementStyle;
    side2?: NadElementStyle;
}

export interface NadThreeWtStyle {
    equipmentId?: string;
    side1?: NadLineStyle;
    side2?: NadLineStyle;
    side3?: NadLineStyle;
}

//https://github.com/powsybl/powsybl-diagram/blob/main/network-area-diagram/src/main/java/com/powsybl/nad/svg/CustomStyleProvider.java#L49
export interface NadStyleProvider {
    getBusNodeStyle?(equipmentId: string): NadBusNodeStyle;
    getBranchStyle?(equipmentId: string): NadBranchStyle;
    getThreeWtStyle?(equipmentId: string): NadThreeWtStyle;
    // TODO add injections
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
