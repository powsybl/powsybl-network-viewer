/**
 * Copyright (c) 2026, RTE (http://www.rte-france.com)
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 * SPDX-License-Identifier: MPL-2.0
 */

import { MapEquipments } from './map-equipments';
import { EQUIPMENT_TYPES, MapLine, MapSubstation } from '../equipment-types';
import { describe, beforeEach, test, expect, vi, it } from 'vitest';

describe('Test MapEquipments', () => {
    let equipment: MapEquipments;

    beforeEach(() => {
        equipment = new MapEquipments();
        vi.clearAllMocks();
    });

    test('completeSubstationsInfos with undefined should keep map empty', () => {
        // Given
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
        let substations!: MapSubstation[];
        equipment.completeSubstationsInfos(substations);
        // Then
        expect(equipment.substationsById.size).toBe(0);
        expect(equipment.voltageLevelsById.size).toBe(0);

        // When empty substations
        equipment.completeSubstationsInfos([]);
        // Then
        expect(equipment.substationsById.size).toBe(0);
        expect(equipment.voltageLevelsById.size).toBe(0);
    });

    describe('removeEquipment', () => {
        beforeEach(() => {
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
            equipment.updateSubstations(substations, true);
            equipment.updateLines([line('l0', 'v0', 'v2'), line('l1', 'v1', 'v2')], true);

            expect(equipment.getSubstations()).toHaveLength(2);
            expect(equipment.getVoltageLevels()).toHaveLength(3);
            expect(equipment.getLines()).toHaveLength(2);

            vi.clearAllMocks();
        });

        test('removeEquipment of type Substation should remove it from the substations list', () => {
            // Given
            const substationToRemove = 's1';
            // When
            equipment.removeEquipment(EQUIPMENT_TYPES.SUBSTATION, substationToRemove);
            // Then
            expect(equipment.getSubstation(substationToRemove)).toBeUndefined();
            expect(equipment.substations.map((s) => s.id)).not.toContain(substationToRemove);
            expect(equipment.substationsById.size).toBe(1);
            expect(equipment.voltageLevelsById.size).toBe(2);
            expect(equipment.substationsById.has('s0')).toBe(true);
            expect(equipment.substationsById.has('s1')).toBe(false);
            expect(equipment.nominalVoltages).toStrictEqual([400, 225]);
        });

        it.each([[null], [undefined], [''], ['NOT EXIST']])(
            'removeEquipment unknown, undefined or null Substation',
            (equipmentId) => {
                const before = equipment.getVoltageLevels();
                expect(() => equipment.removeEquipment(EQUIPMENT_TYPES.SUBSTATION, equipmentId as any)).not.toThrow();
                expect(equipment.getVoltageLevels()).toStrictEqual(before);
            }
        );

        test('removeEquipment of type VoltageLevel should remove it from the VoltageLevels list', () => {
            // Given
            const voltageLevelToRemove = 'v1';
            const removeBranchesOfVoltageLevelMocked = vi.spyOn(equipment, 'removeBranchesOfVoltageLevel');
            // When
            equipment.removeEquipment(EQUIPMENT_TYPES.VOLTAGE_LEVEL, voltageLevelToRemove);
            // Then
            expect(equipment.getVoltageLevel(voltageLevelToRemove)).toBeUndefined();
            expect(equipment.getVoltageLevels().map((value) => value.id)).not.toContain([voltageLevelToRemove]);
            expect(removeBranchesOfVoltageLevelMocked).toHaveBeenCalledTimes(1);
            expect(removeBranchesOfVoltageLevelMocked).toHaveBeenCalledWith(equipment.getLines(), voltageLevelToRemove);
            expect(equipment.getNominalVoltages()).toStrictEqual([400, 90]);
        });

        it.each([[null], [undefined], [''], ['NOT EXIST']])(
            'removeEquipment unknown, undefined or null VoltageLevel',
            (equipmentId) => {
                const before = equipment.getVoltageLevels();
                expect(() =>
                    equipment.removeEquipment(EQUIPMENT_TYPES.VOLTAGE_LEVEL, equipmentId as any)
                ).not.toThrow();
                expect(equipment.getVoltageLevels()).toStrictEqual(before);
            }
        );

        test('removeEquipment of type Line should remove it from the Lines list', () => {
            // Given
            const lineToRemove = 'l0';
            // When
            equipment.removeEquipment(EQUIPMENT_TYPES.LINE, lineToRemove);
            // Then
            expect(equipment.getLine(lineToRemove)).toBeUndefined();
            expect(equipment.lines.map((l) => l.id)).not.toContain(lineToRemove);
            expect(equipment.linesById.has(lineToRemove)).toBe(false);
        });
    });
});

function line(id: string, vl1: string, vl2: string): MapLine {
    return {
        id,
        voltageLevelId1: vl1,
        voltageLevelId2: vl2,
        terminal1Connected: true,
        terminal2Connected: true,
        p1: 0,
        p2: 0,
    };
}
