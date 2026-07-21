/**
 * Copyright (c) 2026, RTE (http://www.rte-france.com)
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 * SPDX-License-Identifier: MPL-2.0
 */

import { SubstationLayer } from './substation-layer';
import { UpdateParameters } from '@deck.gl/core';
import { describe, test, expect } from 'vitest';
import { vi } from 'vitest';
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-expect-error
import { ChangeFlags } from '@deck.gl/core/src/lib/layer-state';
import { MapEquipments } from './map-equipments';
import { GeoData } from './geo-data';
import type { MapSubstation } from '../equipment-types';

describe('Test SubstationLayer', () => {
    const substationLayer: SubstationLayer = new SubstationLayer();

    // Test related to
    // https://github.com/powsybl/powsybl-network-viewer/issues/64
    // https://github.com/powsybl/powsybl-incubator/pull/267#discussion_r1393939164
    test('updateState when props network and geoData are not null should succeed', () => {
        // When
        const changeFlagsMock: ChangeFlags = {
            dataChanged: true,
            extensionsChanged: false,
            propsChanged: undefined,
            propsOrDataChanged: false,
            somethingChanged: false,
            stateChanged: false,
            updateTriggersChanged: undefined,
            viewportChanged: false,
        };
        const equipment: MapEquipments = new MapEquipments();
        const geoData = new GeoData(new Map(), new Map());
        const substation1: MapSubstation = { id: 's0', voltageLevels: [] };
        const params: UpdateParameters<SubstationLayer> = {
            changeFlags: changeFlagsMock,
            context: {} as any,
            props: {
                network: equipment,
                geoData: geoData,
                data: [substation1],
            } as any,
            oldProps: {} as any,
        };
        const setStateMocked = vi.spyOn(substationLayer, 'setState');
        setStateMocked.mockImplementation(() => {});
        // When
        substationLayer.updateState(params);
        // Then
        expect(setStateMocked).toHaveBeenNthCalledWith(1, { metaVoltageLevelsByNominalVoltage: [] });
    });

    // TODO
    test('updateState when props network and geoData are null/undefined should succeed', () => {});
});
