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
import { DiagramMetadata, EdgeMetadata, SvgParametersMetadata } from './diagram-metadata';
import { SvgParameters } from './svg-parameters';
import { round } from './diagram-utils';
import { getEdgeNodePoints } from './metadata-utils';

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
    const flippedLabelData = HalfEdgeUtils.getLabelData(halfEdge2, 19);
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
    expect(HalfEdgeUtils.getMiddleArrowRotation(halfEdge1, halfEdge2, 'OUT')).toBe(90);
    expect(HalfEdgeUtils.getMiddleArrowRotation(halfEdge1, halfEdge2, 'IN')).toBe(-90);

    expect(HalfEdgeUtils.getMiddleArrowRotation(halfEdge1, null, 'OUT')).toBe(90);
    expect(HalfEdgeUtils.getMiddleArrowRotation(halfEdge1, null, 'IN')).toBe(-90);

    expect(HalfEdgeUtils.getMiddleArrowRotation(null, halfEdge2, 'OUT')).toBe(-270);
    expect(HalfEdgeUtils.getMiddleArrowRotation(null, halfEdge2, 'IN')).toBe(-90);

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

    expect(HalfEdgeUtils.getMiddleArrowRotation(halfEdge1, halfEdge2, 'OUT')).toBe(0);
    expect(HalfEdgeUtils.getMiddleArrowRotation(halfEdge1, halfEdge2, 'IN')).toBe(-180);
});

test('getHalfEdges', () => {
    const svgParametersMetadata: SvgParametersMetadata = {
        diagramPadding: {
            left: 200,
            top: 200,
            right: 200,
            bottom: 200,
        },
        insertNameDesc: false,
        svgWidthAndHeightAdded: false,
        cssLocation: 'EXTERNAL_NO_IMPORT',
        sizeConstraint: 'FIXED_SCALE',
        fixedWidth: -1,
        fixedHeight: -1,
        fixedScale: 0.2,
        arrowShift: 30,
        arrowLabelShift: 19,
        converterStationWidth: 70,
        voltageLevelCircleRadius: 30,
        fictitiousVoltageLevelCircleRadius: 15,
        transformerCircleRadius: 20,
        nodeHollowWidth: 15,
        edgesForkLength: 80,
        edgesForkAperture: 60,
        edgeStartShift: 0,
        unknownBusNodeExtraRadius: 10,
        loopDistance: 120,
        loopEdgesAperture: 60,
        loopControlDistance: 40,
        edgeInfoAlongEdge: true,
        interAnnulusSpace: 5,
        svgPrefix: '',
        arrowPathIn: 'M-10 -10 H10 L0 10z',
        arrowPathOut: 'M-10 10 H10 L0 -10z',
        languageTag: 'en',
        voltageValuePrecision: 1,
        powerValuePrecision: 0,
        angleValuePrecision: 1,
        currentValuePrecision: 0,
        percentageValuePrecision: 0,
        pstArrowHeadSize: 8,
        undefinedValueSymbol: '',
        highlightGraph: false,
        injectionAperture: 10,
        injectionEdgeLength: 145,
        injectionCircleRadius: 25,
        voltageLevelLegendsIncluded: true,
        edgeInfosIncluded: true,
    };

    const edge18: EdgeMetadata = {
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

    const edge22: EdgeMetadata = {
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

    const diagramMetadata: DiagramMetadata = {
        layoutParameters: {
            textNodesForceLayout: false,
            textNodeFixedShift: {
                x: 100,
                y: -40,
            },
            maxSteps: 1000,
            timeoutSeconds: 15,
            textNodeEdgeConnectionYShift: 25,
            injectionsAdded: false,
        },
        svgParameters: svgParametersMetadata,
        busNodes: [
            {
                svgId: '3',
                equipmentId: 'VLGEN_0',
                nbNeighbours: 0,
                index: 0,
                vlNode: '0',
                legend: ' kV / °',
            },
            {
                svgId: '7',
                equipmentId: 'VLHV1_0',
                nbNeighbours: 0,
                index: 0,
                vlNode: '4',
                legend: ' kV / °',
            },
            {
                svgId: '11',
                equipmentId: 'VLHV2_0',
                nbNeighbours: 0,
                index: 0,
                vlNode: '8',
                legend: ' kV / °',
            },
            {
                svgId: '15',
                equipmentId: 'VLLOAD_0',
                nbNeighbours: 0,
                index: 0,
                vlNode: '12',
                legend: ' kV / °',
            },
        ],
        nodes: [
            {
                svgId: '0',
                equipmentId: 'VLGEN',
                x: -452.59,
                y: -2741,
                legendSvgId: '1',
                legendEdgeSvgId: '2',
                legendHeader: ['VLGEN'],
            },
            {
                svgId: '4',
                equipmentId: 'VLHV1',
                x: -245.26,
                y: 34.3,
                legendSvgId: '5',
                legendEdgeSvgId: '6',
                legendHeader: ['VLHV1'],
            },
            {
                svgId: '8',
                equipmentId: 'VLHV2',
                x: 140.33,
                y: 58.61,
                legendSvgId: '9',
                legendEdgeSvgId: '10',
                legendHeader: ['VLHV2'],
            },
            {
                svgId: '12',
                equipmentId: 'VLLOAD',
                x: 430.9,
                y: -1745,
                legendSvgId: '13',
                legendEdgeSvgId: '14',
                legendHeader: ['VLLOAD'],
            },
        ],
        edges: [
            {
                svgId: '16',
                equipmentId: 'NGEN_NHV1',
                node1: '0',
                node2: '4',
                busNode1: '3',
                busNode2: '7',
                type: 'TwoWtEdge',
                edgeInfoMiddle: {
                    svgId: '17',
                    infoTypeA: 'Name',
                    labelA: 'NGEN_NHV1',
                },
            },
            edge18,
            {
                svgId: '20',
                equipmentId: 'NHV1_NHV2_2',
                node1: '4',
                node2: '8',
                busNode1: '7',
                busNode2: '11',
                type: 'LineEdge',
                edgeInfoMiddle: {
                    svgId: '21',
                    infoTypeA: 'Name',
                    labelA: 'NHV1_NHV2_2',
                },
            },
            edge22,
            {
                svgId: '24',
                equipmentId: 'NHV2_NLOAD',
                node1: '8',
                node2: '12',
                busNode1: '11',
                busNode2: '15',
                type: 'TwoWtEdge',
                edgeInfoMiddle: {
                    svgId: '25',
                    infoTypeA: 'Name',
                    labelA: 'NHV2_NLOAD',
                },
            },
        ],
        textNodes: [
            {
                svgId: '1',
                equipmentId: 'VLGEN',
                vlNode: '0',
                shiftX: 100,
                shiftY: -40,
                connectionShiftX: 100,
                connectionShiftY: -15,
            },
            {
                svgId: '5',
                equipmentId: 'VLHV1',
                vlNode: '4',
                shiftX: 100,
                shiftY: -40,
                connectionShiftX: 100,
                connectionShiftY: -15,
            },
            {
                svgId: '9',
                equipmentId: 'VLHV2',
                vlNode: '8',
                shiftX: 100,
                shiftY: -40,
                connectionShiftX: 100,
                connectionShiftY: -15,
            },
            {
                svgId: '13',
                equipmentId: 'VLLOAD',
                vlNode: '12',
                shiftX: 100,
                shiftY: -40,
                connectionShiftX: 100,
                connectionShiftY: -15,
            },
        ],
    };

    const svgParameters = new SvgParameters(svgParametersMetadata);

    let halfEdges = HalfEdgeUtils.getHalfEdges(edge22, 2, 3, diagramMetadata, svgParameters);
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
});
