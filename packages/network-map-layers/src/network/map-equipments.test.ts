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
        const equipment: MapEquipments = new MapEquipments();
        const substation1: MapSubstation = { id: 's0', voltageLevels: [] };
        // When MapSubstation
        equipment.completeSubstationsInfos([substation1]);
        // Then
        expect(equipment.substationsById.size).toBe(1);
        expect(equipment.substationsById.has('s0')).toBe(true);

        // When undefined MapSubstation
        equipment.completeSubstationsInfos(undefined);
        // Then
        expect(equipment.substationsById.size).toBe(0);
    });
});
