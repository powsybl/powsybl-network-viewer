/**
 * Copyright (c) 2026, RTE (http://www.rte-france.com)
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 * SPDX-License-Identifier: MPL-2.0
 */

import {
    getInfoLabelValue,
    getThreeWTInfoLabel,
    InfoLabel,
    ThreeWindingsTranformerLabels,
} from './diagram-label-types';

test('getInfoLabelValue', () => {
    let infoLabel: InfoLabel = {
        labelA: '20',
        labelB: '609',
        direction: 'OUT',
        infoTypeA: 'ReactivePower',
        infoTypeB: 'ActivePower',
    };
    expect(getInfoLabelValue(infoLabel)).toBe(609);
    infoLabel = {
        labelA: '20',
        labelB: 'L_NEW',
        direction: 'OUT',
        infoTypeA: 'ReactivePower',
        infoTypeB: 'Name',
    };
    expect(getInfoLabelValue(infoLabel)).toBe('L_NEW');
});

test('getThreeWTInfoLabel', () => {
    const threeWTsLabels: ThreeWindingsTranformerLabels = {
        transformerId: 't3wt',
        side1Label: {
            labelA: '20',
            labelB: '609',
            direction: 'OUT',
            infoTypeA: 'ReactivePower',
            infoTypeB: 'ActivePower',
        },
        side2Label: { labelA: '10', labelB: '-611', directionA: 'IN', directionB: 'IN' },
        side3Label: { labelA: '25', labelB: '200', direction: 'IN', infoTypeA: 'ReactivePower', infoTypeB: 'Current' },
    };
    let infoLabel: InfoLabel | undefined = getThreeWTInfoLabel(threeWTsLabels, 'ONE');
    expect(infoLabel).toBeDefined();
    expect(infoLabel?.labelA).toBe('20');
    expect(infoLabel?.labelB).toBe('609');
    expect(infoLabel?.direction).toBe('OUT');
    expect(infoLabel?.infoTypeA).toBe('ReactivePower');
    expect(infoLabel?.infoTypeB).toBe('ActivePower');
    infoLabel = getThreeWTInfoLabel(threeWTsLabels, 'TWO');
    expect(infoLabel).toBeDefined();
    expect(infoLabel?.labelA).toBe('10');
    expect(infoLabel?.labelB).toBe('-611');
    expect(infoLabel?.directionA).toBe('IN');
    expect(infoLabel?.directionB).toBe('IN');
    infoLabel = getThreeWTInfoLabel(threeWTsLabels, 'THREE');
    expect(infoLabel).toBeDefined();
    expect(infoLabel?.labelA).toBe('25');
    expect(infoLabel?.labelB).toBe('200');
    expect(infoLabel?.direction).toBe('IN');
    expect(infoLabel?.infoTypeA).toBe('ReactivePower');
    expect(infoLabel?.infoTypeB).toBe('Current');
    infoLabel = getThreeWTInfoLabel(threeWTsLabels, 'FOUR');
    expect(infoLabel).toBeUndefined();
});
