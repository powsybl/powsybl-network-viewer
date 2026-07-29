/**
 * Copyright (c) 2026, RTE (http://www.rte-france.com)
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 * SPDX-License-Identifier: MPL-2.0
 */

import { describe, beforeEach, test, expect, vi, it } from 'vitest';
import { LineLayer } from './line-layer';
import { MapEquipments } from './map-equipments';
import { MapSubstation } from '../equipment-types';

describe('Test LineLayer', () => {
    let lineLayer: LineLayer;
    let equipment: MapEquipments;
    const substations: MapSubstation[] = [
        {
            id: 's0',
            voltageLevels: [
                { id: 'v0', nominalV: 400, substationId: 's0' },
                { id: 'v1', nominalV: 225, substationId: 's0' },
            ],
        },
        { id: 's1', voltageLevels: [{ id: 'v2', nominalV: 90, substationId: 's1' }] },
    ];

    beforeEach(() => {
        lineLayer = new LineLayer();
        equipment = new MapEquipments();
        equipment.updateSubstations(substations, true);
        lineLayer.props = { network: equipment } as any;
        vi.clearAllMocks();
    });

    test('getVoltageLevelIndex should succeed when getVoltageLevel is defined', () => {
        expect(lineLayer.getVoltageLevelIndex('v0')).toBe(2); // s0 [ 225, 400 ]
        expect(lineLayer.getVoltageLevelIndex('v1')).toBe(1); // s0 [ 225, 400 ]
        expect(lineLayer.getVoltageLevelIndex('v2')).toBe(1); // s1 [ 90 ]
    });

    it.each([[null], [undefined]])(
        'getVoltageLevelIndex should succeed when getVoltageLevel is undefined/null',
        (value) => {
            // Given
            vi.spyOn(lineLayer.props.network, 'getVoltageLevel').mockReturnValue(value as any);
            // When Then
            expect(lineLayer.getVoltageLevelIndex('v0')).toBe(0);
        }
    );

    it.each([[null], [undefined]])(
        'getVoltageLevelIndex should succeed when getSubstation is undefined/null',
        (value) => {
            // Given
            vi.spyOn(lineLayer.props.network, 'getSubstation').mockReturnValue(value as any);
            // When Then
            expect(lineLayer.getVoltageLevelIndex('v0')).toBe(0);
        }
    );
});
