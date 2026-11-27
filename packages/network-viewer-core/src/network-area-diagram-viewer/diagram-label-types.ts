/**
 * Copyright (c) 2026, RTE (http://www.rte-france.com)
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 * SPDX-License-Identifier: MPL-2.0
 */

export type InfoLabel = {
    labelA?: string;
    labelB: string;
    direction?: string;
    infoTypeA?: string;
    infoTypeB?: string;
    directionA?: string;
    directionB?: string;
};

export type BranchLabels = {
    branchId: string;
    side1Label?: InfoLabel;
    side2Label?: InfoLabel;
    middleLabel?: InfoLabel;
};

export type VoltageLevelLabels = {
    voltageLevelId: string;
    legendHeader?: string[];
    legendFooter?: string[];
    busesLegends?: {
        busId: string;
        legend: string;
    }[];
};

export type ThreeWindingsTranformerLabels = {
    transformerId: string;
    side1Label?: InfoLabel;
    side2Label?: InfoLabel;
    side3Label?: InfoLabel;
};

export type DiagramLabels = {
    voltageLevelsLabels?: VoltageLevelLabels[];
    branchesLabels?: BranchLabels[];
    threeWindingsTranformersLabels?: ThreeWindingsTranformerLabels[];
};

export function getInfoLabelValue(infoLabel: InfoLabel): string | number {
    const numValue = Number(infoLabel.labelB);
    return Number.isNaN(numValue) ? infoLabel.labelB : numValue;
}

export function getThreeWTInfoLabel(
    threeWTsLabels: ThreeWindingsTranformerLabels,
    side: string | undefined
): InfoLabel | undefined {
    if (!side) {
        return undefined;
    }
    switch (side) {
        case 'ONE':
            return threeWTsLabels.side1Label;
        case 'TWO':
            return threeWTsLabels.side2Label;
        case 'THREE':
            return threeWTsLabels.side3Label;
        default:
            return undefined;
    }
}
