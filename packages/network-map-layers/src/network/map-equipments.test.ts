/**
 * Copyright (c) 2026, RTE (http://www.rte-france.com)
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 * SPDX-License-Identifier: MPL-2.0
 */

import { MapEquipments } from './map-equipments';
import { MapSubstation } from '../equipment-types';
import { describe } from 'vitest';

describe('Test MapEquipments', () => {
    test('completeSubstationsInfos with undefined should keep map empty', () => {
        // Given
        const equipment: MapEquipments = new MapEquipments();
        const substation1: MapSubstation = {
            id: 's0',
            voltageLevels: [{ id: 'v0', nominalV: 400, substationId: 's0' }],
        };
        const substation2: MapSubstation = {
            id: 's1',
            voltageLevels: [{ id: 'v1', nominalV: 220, substationId: 's1' }],
        };
        // When
        equipment.completeSubstationsInfos([substation1]);
        // Then
        expect(equipment.substationsById.size).toBe(1);
        expect(equipment.voltageLevelsById.size).toBe(1);
        expect(equipment.substationsById.has('s0')).toBe(true);
        expect(equipment.nominalVoltages).toStrictEqual([400]);

        // When
        equipment.completeSubstationsInfos([substation2]);
        // Then
        expect(equipment.substationsById.size).toBe(2);
        expect(equipment.voltageLevelsById.size).toBe(2);
        expect(equipment.substationsById.has('s0')).toBe(true);
        expect(equipment.substationsById.has('s1')).toBe(true);
        expect(equipment.nominalVoltages).toStrictEqual([400, 220]);

        // When undefined substations
        equipment.completeSubstationsInfos(undefined);
        // Then
        expect(equipment.substationsById.size).toBe(0);
        expect(equipment.voltageLevelsById.size).toBe(0);

        // When empty substations
        equipment.completeSubstationsInfos([]);
        // Then
        expect(equipment.substationsById.size).toBe(0);
        expect(equipment.voltageLevelsById.size).toBe(0);
    });
});
