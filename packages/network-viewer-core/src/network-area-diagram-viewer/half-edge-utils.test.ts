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
import { EdgeMetadata } from './diagram-metadata';
import { SvgParameters } from './svg-parameters';
import { round } from './diagram-utils';
import { getEdgeNodePoints } from './metadata-utils';
import { MetadataSearch } from './metadata-search';
import { getDiagramMetadata } from './test-utils';

test('getArrowRotation', () => {
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

test('getHalfEdgeLabelData', () => {
    const halfEdge1: HalfEdge = {
        side: '1',
        fork: false,
        busOuterRadius: 0,
        voltageLevelRadius: 0,
        edgePoints: [new Point(10, 10), new Point(50, 50)],
    };
    const labelData = HalfEdgeUtils.getHalfEdgeLabelData(halfEdge1, 19);
    expect(labelData.angle).toBe(45);
    expect(labelData.external.shift).toBe(19);
    expect(labelData.external.style).toBe(undefined);
    expect(labelData.internal.shift).toBe(-19);
    expect(labelData.internal.style).toBe('text-anchor:end');

    const halfEdge2: HalfEdge = {
        side: '2',
        fork: true,
        busOuterRadius: 0,
        voltageLevelRadius: 0,
        edgePoints: [new Point(0, 0), new Point(10, 10), new Point(-30, 50)],
    };
    const flippedLabelData = HalfEdgeUtils.getHalfEdgeLabelData(halfEdge2, 19);
    expect(flippedLabelData.angle).toBe(-45);
    expect(flippedLabelData.external.shift).toBe(-19);
    expect(flippedLabelData.external.style).toBe('text-anchor:end');
    expect(flippedLabelData.internal.shift).toBe(19);
    expect(flippedLabelData.internal.style).toBe(undefined);
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

test('getMiddleArrowRotation', () => {
    let halfEdge1: HalfEdge = {
        side: '1',
        fork: false,
        busOuterRadius: 0,
        voltageLevelRadius: 0,
        edgePoints: [new Point(0, 0), new Point(100, 0)],
    };
    let halfEdge2: HalfEdge = {
        side: '2',
        fork: false,
        busOuterRadius: 0,
        voltageLevelRadius: 0,
        edgePoints: [new Point(200, 0), new Point(100, 0)],
    };
    expect(HalfEdgeUtils.getMiddleArrowRotation(halfEdge1, halfEdge2)).toBe(90);

    expect(HalfEdgeUtils.getMiddleArrowRotation(halfEdge1, null)).toBe(90);

    expect(HalfEdgeUtils.getMiddleArrowRotation(null, halfEdge2)).toBe(-270);

    halfEdge1 = {
        side: '1',
        fork: false,
        busOuterRadius: 0,
        voltageLevelRadius: 0,
        edgePoints: [new Point(0, 0), new Point(100, 100), new Point(120, 140), new Point(120, 100)],
    };
    halfEdge2 = {
        side: '2',
        fork: false,
        busOuterRadius: 0,
        voltageLevelRadius: 0,
        edgePoints: [new Point(200, 0), new Point(180, 100), new Point(120, 60), new Point(120, 100)],
    };

    expect(HalfEdgeUtils.getMiddleArrowRotation(halfEdge1, halfEdge2)).toBe(0);
});

test('getInfoPointAndAngle', () => {
    const halfEdge1: HalfEdge = {
        side: '1',
        fork: false,
        busOuterRadius: 0,
        voltageLevelRadius: 0,
        edgePoints: [new Point(0, 0), new Point(90, 0)],
    };
    const halfEdge2: HalfEdge = {
        side: '2',
        fork: false,
        busOuterRadius: 0,
        voltageLevelRadius: 0,
        edgePoints: [new Point(200, 0), new Point(110, 0)],
    };
    let infoPointAndAngle: [Point, number] | undefined = HalfEdgeUtils.getInfoPointAndAngle(halfEdge1, halfEdge2) ?? [
        new Point(0, 0),
        0,
    ];
    expect(infoPointAndAngle).not.toBe(undefined);
    expect(infoPointAndAngle[0].x).toBe(100);
    expect(infoPointAndAngle[0].y).toBe(0);
    expect(infoPointAndAngle[1]).toBe(0);
    infoPointAndAngle = HalfEdgeUtils.getInfoPointAndAngle(null, halfEdge2) ?? [new Point(0, 0), 0];
    expect(infoPointAndAngle).not.toBe(undefined);
    expect(infoPointAndAngle[0].x).toBe(110);
    expect(infoPointAndAngle[0].y).toBe(0);
    expect(infoPointAndAngle[1]).toBe(0);
    infoPointAndAngle = HalfEdgeUtils.getInfoPointAndAngle(null, null);
    expect(infoPointAndAngle).toBe(undefined);
});

test('getMiddleLabelData', () => {
    const halfEdge1: HalfEdge = {
        side: '1',
        fork: false,
        busOuterRadius: 0,
        voltageLevelRadius: 0,
        edgePoints: [new Point(0, 0), new Point(90, 0)],
    };
    const halfEdge2: HalfEdge = {
        side: '2',
        fork: false,
        busOuterRadius: 0,
        voltageLevelRadius: 0,
        edgePoints: [new Point(200, 0), new Point(110, 0)],
    };
    let middleLabelData = HalfEdgeUtils.getMiddleLabelData(halfEdge1, halfEdge2, true, 10);
    expect(middleLabelData[0]).toBe(10);
    expect(middleLabelData[1]).toBe(undefined);
    middleLabelData = HalfEdgeUtils.getMiddleLabelData(halfEdge1, halfEdge2, false, 10);
    expect(middleLabelData[0]).toBe(-10);
    expect(middleLabelData[1]).toBe('text-anchor:end');
});

test('getHalfEdges', () => {
    const edge18: EdgeMetadata = getEdge18();
    const edge22: EdgeMetadata = getEdge22();
    const diagramMetadata = getDiagramMetadata();
    const svgParameters = new SvgParameters(diagramMetadata.svgParameters);

    let halfEdges = HalfEdgeUtils.getHalfEdges(edge22, 2, 3, diagramMetadata, svgParameters);
    checkEdge22(halfEdges);

    const edgeNodePoints = getEdgeNodePoints(edge18, diagramMetadata);
    expect(edgeNodePoints[0]).not.toBe(undefined);
    expect(edgeNodePoints[0]?.x).toBeCloseTo(-245.26);
    expect(edgeNodePoints[0]?.y).toBeCloseTo(34.3);
    expect(edgeNodePoints[1]).not.toBe(undefined);
    expect(edgeNodePoints[1]?.x).toBeCloseTo(140.33);
    expect(edgeNodePoints[1]?.y).toBeCloseTo(58.61);

    halfEdges = HalfEdgeUtils.getHalfEdges(
        edge22,
        2,
        3,
        diagramMetadata,
        svgParameters,
        edgeNodePoints[0],
        edgeNodePoints[1]
    );
    checkEdge22InitialPoints(halfEdges);
});

test('getHalfEdgesUsingMetadataSearch', () => {
    const edge18: EdgeMetadata = getEdge18();
    const edge22: EdgeMetadata = getEdge22();
    const diagramMetadata = getDiagramMetadata();
    const svgParameters = new SvgParameters(diagramMetadata.svgParameters);
    const metadataSearch = new MetadataSearch(diagramMetadata);

    let halfEdges = HalfEdgeUtils.getHalfEdgesUsingMetadataSearch(edge22, 2, 3, metadataSearch, svgParameters);
    checkEdge22(halfEdges);

    const edgeNodePoints = getEdgeNodePoints(edge18, diagramMetadata);
    halfEdges = HalfEdgeUtils.getHalfEdgesUsingMetadataSearch(
        edge22,
        2,
        3,
        metadataSearch,
        svgParameters,
        edgeNodePoints[0],
        edgeNodePoints[1]
    );
    checkEdge22InitialPoints(halfEdges);
});

function checkEdge22(halfEdges: HalfEdge[] | null[]) {
    expect(halfEdges.length).toBe(2);
    expect(halfEdges[0]).not.toBeNull();
    if (halfEdges[0]) {
        expect(halfEdges[0].edgePoints.length).toBe(3);
        expect(round(halfEdges[0].edgePoints[0].x)).toBeCloseTo(115.7);
        expect(round(halfEdges[0].edgePoints[0].y)).toBeCloseTo(70.83);
        expect(round(halfEdges[0].edgePoints[1].x)).toBeCloseTo(68.67);
        expect(round(halfEdges[0].edgePoints[1].y)).toBeCloseTo(94.17);
        expect(round(halfEdges[0].edgePoints[2].x)).toBeCloseTo(-54.98);
        expect(round(halfEdges[0].edgePoints[2].y)).toBeCloseTo(86.38);
    }
    expect(halfEdges[1]).not.toBeNull();
    if (halfEdges[1]) {
        expect(halfEdges[1].edgePoints.length).toBe(3);
        expect(round(halfEdges[1].edgePoints[0].x)).toBeCloseTo(-222.36);
        expect(round(halfEdges[1].edgePoints[0].y)).toBeCloseTo(49.52);
        expect(round(halfEdges[1].edgePoints[1].x)).toBeCloseTo(-178.63);
        expect(round(halfEdges[1].edgePoints[1].y)).toBeCloseTo(78.58);
        expect(round(halfEdges[1].edgePoints[2].x)).toBeCloseTo(-54.98);
        expect(round(halfEdges[1].edgePoints[2].y)).toBeCloseTo(86.38);
    }
}

function checkEdge22InitialPoints(halfEdges: HalfEdge[] | null[]) {
    expect(halfEdges.length).toBe(2);
    expect(halfEdges[0]).not.toBeNull();
    if (halfEdges[0]) {
        expect(halfEdges[0].edgePoints.length).toBe(3);
        expect(round(halfEdges[0].edgePoints[0].x)).toBeCloseTo(-220.63);
        expect(round(halfEdges[0].edgePoints[0].y)).toBeCloseTo(22.08);
        expect(round(halfEdges[0].edgePoints[1].x)).toBeCloseTo(-173.6);
        expect(round(halfEdges[0].edgePoints[1].y)).toBeCloseTo(-1.26);
        expect(round(halfEdges[0].edgePoints[2].x)).toBeCloseTo(-49.95);
        expect(round(halfEdges[0].edgePoints[2].y)).toBeCloseTo(6.53);
    }
    expect(halfEdges[1]).not.toBeNull();
    if (halfEdges[1]) {
        expect(halfEdges[1].edgePoints.length).toBe(3);
        expect(round(halfEdges[1].edgePoints[0].x)).toBeCloseTo(117.43);
        expect(round(halfEdges[1].edgePoints[0].y)).toBeCloseTo(43.39);
        expect(round(halfEdges[1].edgePoints[1].x)).toBeCloseTo(73.7);
        expect(round(halfEdges[1].edgePoints[1].y)).toBeCloseTo(14.33);
        expect(round(halfEdges[1].edgePoints[2].x)).toBeCloseTo(-49.95);
        expect(round(halfEdges[1].edgePoints[2].y)).toBeCloseTo(6.53);
    }
}

function getEdge18(): EdgeMetadata {
    return {
        svgId: '18',
        equipmentId: 'NHV1_NHV2_1',
        node1: '4',
        node2: '8',
        busNode1: '7',
        busNode2: '11',
        type: 'LineEdge',
        edgeInfoMiddle: {
            svgId: '19',
            infoTypeA: 'Name',
            labelA: 'NHV1_NHV2_1',
        },
    };
}

function getEdge22(): EdgeMetadata {
    return {
        svgId: '22',
        equipmentId: 'NHV1_NHV2_3',
        node1: '8',
        node2: '4',
        busNode1: '11',
        busNode2: '7',
        type: 'LineEdge',
        edgeInfoMiddle: {
            svgId: '23',
            infoTypeA: 'Name',
            labelA: 'NHV1_NHV2_3',
        },
    };
}
