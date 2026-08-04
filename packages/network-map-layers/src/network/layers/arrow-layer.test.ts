/**
 * Copyright (c) 2026, RTE (http://www.rte-france.com)
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

import { testLayer } from '@deck.gl/test-utils/vitest';
import { expect, test } from 'vitest';
import { type MapAnyLineWithType } from '../../equipment-types';
import { createMapLineWithType } from '../../testUtils/network-fixtures';
import ArrowLayer, { type Arrow, ArrowDirection } from './arrow-layer';

function createProps() {
    const line = createMapLineWithType({
        id: 'line-1',
        voltageLevelId1: 'vl-1',
        voltageLevelId2: 'vl-2',
        p1: 10,
        p2: -10,
        cumulativeDistances: [0, 1500],
        positions: [
            [2.0, 48.0],
            [2.02, 48.02],
        ],
    });
    const arrows: Arrow[] = [{ line, distance: 0.4 }];

    return {
        id: 'arrow-layer-under-test',
        data: arrows,
        animated: false,
        getDistance: (arrow: Arrow) => arrow.distance,
        getLine: (arrow: Arrow) => arrow.line,
        getLinePositions: (currentLine: MapAnyLineWithType) => currentLine.positions ?? [],
        getDirection: () => ArrowDirection.NONE,
    };
}

test('ArrowLayer lifecycle updates textures and animation state', () => {
    testLayer({
        Layer: ArrowLayer,
        testCases: [
            {
                title: 'initializes textures and model',
                props: createProps(),
                onAfterUpdate: ({ layer }: { layer: ArrowLayer }) => {
                    expect(layer.state.lineAttributes?.size).toBe(1);
                    expect(layer.state.model).toBeDefined();
                    expect(layer.state.stop).toBe(true);
                    const attributes = layer.getArrowLineAttributes(layer.props.data[0]);
                    expect(attributes.pointCount).toBe(2);
                },
            },
            {
                title: 'updates animation state',
                updateProps: {
                    animated: true,
                    getDirection: () => ArrowDirection.FROM_SIDE_2_TO_SIDE_1,
                },
                onAfterUpdate: ({ layer }: { layer: ArrowLayer }) => {
                    expect(layer.state.stop).toBe(false);
                    expect(layer.state.linePositionsTexture).toBeDefined();
                    expect(layer.state.lineDistancesTexture).toBeDefined();
                },
            },
        ],
    });
});
