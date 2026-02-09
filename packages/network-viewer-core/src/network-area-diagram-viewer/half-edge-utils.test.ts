/**
 * Copyright (c) 2025, RTE (http://www.rte-france.com)
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 * SPDX-License-Identifier: MPL-2.0
 */

import { Point } from '@svgdotjs/svg.js';
import { HalfEdge } from './diagram-types';
import * as HalfEdgeUtils from './half-edge-utils';

test('getArrowAngle', () => {
    const halfEdge1: HalfEdge = {
        side: '1',
        fork: false,
        busOuterRadius: 0,
        voltageLevelRadius: 0,
        edgePoints: [new Point(10, 10), new Point(50, 50)],
    };
    expect(HalfEdgeUtils.getArrowRotation(halfEdge1)).toBe(135);

    const halfEdge2: HalfEdge = {
        side: '2',
        fork: true,
        busOuterRadius: 0,
        voltageLevelRadius: 0,
        edgePoints: [new Point(0, 0), new Point(10, 10), new Point(10, 50)],
    };
    expect(HalfEdgeUtils.getArrowRotation(halfEdge2)).toBe(180);

    const halfEdge3: HalfEdge = {
        side: '2',
        fork: false,
        busOuterRadius: 0,
        voltageLevelRadius: 0,
        edgePoints: [new Point(10, 10), new Point(50, 10)],
    };
    expect(HalfEdgeUtils.getArrowRotation(halfEdge3)).toBe(90);

    const halfEdge4: HalfEdge = {
        side: '1',
        fork: true,
        busOuterRadius: 0,
        voltageLevelRadius: 0,
        edgePoints: [new Point(0, 10), new Point(50, 50), new Point(10, 10)],
    };
    expect(HalfEdgeUtils.getArrowRotation(halfEdge4)).toBe(-45);
});

test('getLabelData', () => {
    const halfEdge1: HalfEdge = {
        side: '1',
        fork: false,
        busOuterRadius: 0,
        voltageLevelRadius: 0,
        edgePoints: [new Point(10, 10), new Point(50, 50)],
    };
    const labelData = HalfEdgeUtils.getLabelData(halfEdge1, 19);
    expect(labelData[0]).toBe(45);
    expect(labelData[1]).toBe(19);
    expect(labelData[2]).toBeNull();

    const halfEdge2: HalfEdge = {
        side: '2',
        fork: true,
        busOuterRadius: 0,
        voltageLevelRadius: 0,
        edgePoints: [new Point(0, 0), new Point(10, 10), new Point(-30, 50)],
    };
    const flippedLabelData = HalfEdgeUtils.getLabelData(halfEdge2, 19);
    expect(flippedLabelData[0]).toBe(-45);
    expect(flippedLabelData[1]).toBe(-19);
    expect(flippedLabelData[2]).toBe('text-anchor:end');
});

test('getConverterStationPolyline', () => {
    const halfEdge1: HalfEdge = {
        side: '1',
        fork: false,
        busOuterRadius: 0,
        voltageLevelRadius: 0,
        edgePoints: [new Point(10, 10), new Point(85, 85)],
    };
    const halfEdge2: HalfEdge = {
        side: '1',
        fork: false,
        busOuterRadius: 0,
        voltageLevelRadius: 0,
        edgePoints: [new Point(160, 160), new Point(85, 85)],
    };
    expect(HalfEdgeUtils.getConverterStationPolyline(halfEdge1, halfEdge2, 70)).toBe('60.25,60.25 109.75,109.75');
});
