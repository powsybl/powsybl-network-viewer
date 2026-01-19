/**
 * Copyright (c) 2024, RTE (http://www.rte-france.com)
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 * SPDX-License-Identifier: MPL-2.0
 */

import * as DiagramUtils from './diagram-utils';
import { DiagramPaddingMetadata, SvgParametersMetadata } from './diagram-metadata';
import { Point } from '@svgdotjs/svg.js';
import { SvgParameters } from './svg-parameters';

test('getFormattedValue', () => {
    expect(DiagramUtils.getFormattedValue(12)).toBe('12.00');
    expect(DiagramUtils.getFormattedValue(7.417)).toBe('7.42');
    expect(DiagramUtils.getFormattedValue(145.9532834)).toBe('145.95');
});

test('getFormattedPoint', () => {
    expect(DiagramUtils.getFormattedPoint(new Point(144, 34.836))).toBe('144.00,34.84');
});

test('getFormattedPolyline', () => {
    expect(DiagramUtils.getFormattedPolyline([new Point(144, 34.836), new Point(213.892, 74)])).toBe(
        '144.00,34.84 213.89,74.00'
    );
    expect(DiagramUtils.getFormattedPolyline([new Point(144, 34.836), new Point(213.892, 74)])).toBe(
        '144.00,34.84 213.89,74.00'
    );
});

test('degToRad', () => {
    expect(DiagramUtils.degToRad(60)).toBe(1.0471975511965976);
});

test('radToDeg', () => {
    expect(DiagramUtils.radToDeg(1.0471975511965976)).toBeCloseTo(60, 3);
});

test('round', () => {
    expect(DiagramUtils.round(147.672)).toBe(147.67);
    expect(DiagramUtils.round(8.7)).toBe(8.7);
    expect(DiagramUtils.round(19.2894)).toBe(19.29);
    expect(DiagramUtils.round(643)).toBe(643);
});

test('getMidPosition', () => {
    const midPoint = DiagramUtils.getMidPosition(new Point(10.46, 5.818), new Point(45.24, 90.122));
    expect(midPoint.x).toBe(27.85);
    expect(midPoint.y).toBe(47.97);
});

test('getPointAtDistance', () => {
    const pointAtDistance = DiagramUtils.getPointAtDistance(new Point(10, 10), new Point(36, 48), 30);
    expect(pointAtDistance.x).toBeCloseTo(26.94, 2);
    expect(pointAtDistance.y).toBeCloseTo(34.76, 2);
});

test('getAngle', () => {
    expect(DiagramUtils.getAngle(new Point(10, 10), new Point(50, 50))).toBe(0.7853981633974483);
    expect(DiagramUtils.getAngle(new Point(10, 10), new Point(10, 50))).toBe(1.5707963267948966);
    expect(DiagramUtils.getAngle(new Point(10, 10), new Point(50, 10))).toBe(0);
    expect(DiagramUtils.getAngle(new Point(50, 50), new Point(10, 10))).toBe(-2.356194490192345);
});

test('getEdgeFork', () => {
    const edgeFork = DiagramUtils.getEdgeFork(new Point(10, 10), 80, 0.2618);
    expect(edgeFork.x).toBeCloseTo(87.274, 3);
    expect(edgeFork.y).toBeCloseTo(30.7055, 3);
});

test('getTransformerArrowMatrixString', () => {
    expect(DiagramUtils.getTransformerArrowMatrixString(Math.PI / 4, new Point(60, 60), 20)).toBe(
        '0.71,0.71,-0.71,0.71,60.00,17.57'
    );
});

test('getVoltageLevelCircleRadius', () => {
    const diagramPaddingMetadata: DiagramPaddingMetadata = {
        bottom: 0,
        left: 0,
        right: 0,
        top: 0,
    };
    const svgParametersMetadata: SvgParametersMetadata = {
        angleValuePrecision: 0,
        arrowLabelShift: 0,
        arrowPathIn: '',
        arrowPathOut: '',
        arrowShift: 0,
        converterStationWidth: 0,
        cssLocation: '',
        currentValuePrecision: 0,
        diagramPadding: diagramPaddingMetadata,
        edgesForkAperture: 0,
        edgesForkLength: 0,
        insertNameDesc: false,
        interAnnulusSpace: 0,
        nodeHollowWidth: 0,
        powerValuePrecision: 0,
        transformerCircleRadius: 0,
        unknownBusNodeExtraRadius: 0,
        voltageValuePrecision: 0,
        voltageLevelCircleRadius: 30,
        fictitiousVoltageLevelCircleRadius: 15,
        svgWidthAndHeightAdded: false,
        sizeConstraint: '',
        fixedWidth: 0,
        fixedHeight: 0,
        fixedScale: 0,
        edgeStartShift: 0,
        loopDistance: 0,
        loopEdgesAperture: 0,
        loopControlDistance: 0,
        edgeInfoAlongEdge: false,
        svgPrefix: '',
        languageTag: '',
        percentageValuePrecision: 0,
        pstArrowHeadSize: 0,
        undefinedValueSymbol: '',
        highlightGraph: false,
        injectionAperture: 0,
        injectionEdgeLength: 0,
        injectionCircleRadius: 0,
        voltageLevelLegendsIncluded: false,
        edgeInfosIncluded: false,
    };
    const svgParameters = new SvgParameters(svgParametersMetadata);
    expect(DiagramUtils.getVoltageLevelCircleRadius(0, true, svgParameters)).toBe(15);
    expect(DiagramUtils.getVoltageLevelCircleRadius(0, false, svgParameters)).toBe(30);
    expect(DiagramUtils.getVoltageLevelCircleRadius(1, false, svgParameters)).toBe(60);
    expect(DiagramUtils.getVoltageLevelCircleRadius(2, false, svgParameters)).toBe(60);
});

test('getFragmentedAnnulusPath', () => {
    expect(
        DiagramUtils.getFragmentedAnnulusPath(
            [-2.38, 0.75, 1.4],
            { busInnerRadius: 42.5, busOuterRadius: 57.5, voltageLevelRadius: 60 },
            15
        )
    ).toBe(
        'M-36.101,-44.755 A57.500,57.500 164.389 0 1 46.813,33.389 L35.700,23.061 A42.500,42.500 -159.114 0 0 -25.132,-34.273 Z M36.617,44.333 A57.500,57.500 22.296 0 1 17.060,54.911 L14.464,39.963 A42.500,42.500 -17.020 0 0 25.528,33.979 Z '
    );

    expect(
        DiagramUtils.getFragmentedAnnulusPath(
            [],
            { busInnerRadius: 42.5, busOuterRadius: 57.5, voltageLevelRadius: 60 },
            15
        )
    ).toBe(
        'M57.500,0.000 A57.500,57.500 180.000 0 1 -57.500,0.000 M-57.500,0.000 A57.500,57.500 -180.000 0 1 57.500,0.000 M42.500,0.000 A42.500,42.500 180.000 0 0 -42.500,0.000 M-42.500,0.000 A42.500,42.500 -180.000 0 0 42.500,0.000'
    );
});

test('getBoundarySemicircle', () => {
    expect(DiagramUtils.getBoundarySemicircle(1.0471975511965976, 60)).toBe(
        'M51.962,-30.000 A60.000,60.000 180.000 0 1 -51.962,30.000'
    );
});

test('getEdgeNameAngle', () => {
    expect(DiagramUtils.getEdgeNameAngle(new Point(60, 60), new Point(110, 110))).toBe(45);
    expect(DiagramUtils.getEdgeNameAngle(new Point(60, 60), new Point(10, 110))).toBe(-45);
});

test('getTextEdgeEnd', () => {
    let textEdgeEnd = DiagramUtils.getTextEdgeEnd(new Point(110, 110), new Point(60, 60), 25, 50, 80);
    expect(textEdgeEnd.x).toBe(110);
    expect(textEdgeEnd.y).toBe(135);
    textEdgeEnd = DiagramUtils.getTextEdgeEnd(new Point(110, 10), new Point(60, 60), 25, 50, 80);
    expect(textEdgeEnd.x).toBe(110);
    expect(textEdgeEnd.y).toBe(35);
    textEdgeEnd = DiagramUtils.getTextEdgeEnd(new Point(10, 10), new Point(60, 60), 25, 50, 80);
    expect(textEdgeEnd.x).toBe(35);
    expect(textEdgeEnd.y).toBe(60);
    textEdgeEnd = DiagramUtils.getTextEdgeEnd(new Point(10, 110), new Point(60, 60), 25, 50, 80);
    expect(textEdgeEnd.x).toBe(35);
    expect(textEdgeEnd.y).toBe(110);
});

test('getArrowClass', () => {
    const diagramPaddingMetadata: DiagramPaddingMetadata = {
        bottom: 0,
        left: 0,
        right: 0,
        top: 0,
    };
    const arrowPathIn = 'M-10 -10 H10 L0 10z';
    const arrowPathOut = 'M-10 10 H10 L0 -10z';
    const svgParametersMetadata: SvgParametersMetadata = {
        angleValuePrecision: 0,
        arrowLabelShift: 0,
        arrowPathIn: arrowPathIn,
        arrowPathOut: arrowPathOut,
        arrowShift: 0,
        converterStationWidth: 0,
        cssLocation: '',
        currentValuePrecision: 0,
        diagramPadding: diagramPaddingMetadata,
        edgesForkAperture: 0,
        edgesForkLength: 0,
        insertNameDesc: false,
        interAnnulusSpace: 0,
        nodeHollowWidth: 0,
        powerValuePrecision: 0,
        transformerCircleRadius: 0,
        unknownBusNodeExtraRadius: 0,
        voltageValuePrecision: 0,
        voltageLevelCircleRadius: 30,
        fictitiousVoltageLevelCircleRadius: 15,
        svgWidthAndHeightAdded: false,
        sizeConstraint: '',
        fixedWidth: 0,
        fixedHeight: 0,
        fixedScale: 0,
        edgeStartShift: 0,
        loopDistance: 0,
        loopEdgesAperture: 0,
        loopControlDistance: 0,
        edgeInfoAlongEdge: false,
        svgPrefix: '',
        languageTag: '',
        percentageValuePrecision: 0,
        pstArrowHeadSize: 0,
        undefinedValueSymbol: '',
        highlightGraph: false,
        injectionAperture: 0,
        injectionEdgeLength: 0,
        injectionCircleRadius: 0,
        voltageLevelLegendsIncluded: false,
        edgeInfosIncluded: false,
    };
    const svgParameters = new SvgParameters(svgParametersMetadata);
    expect(DiagramUtils.getArrowPath('IN', svgParameters)).toBe(arrowPathIn);
    expect(DiagramUtils.getArrowPath('OUT', svgParameters)).toBe(arrowPathOut);
});
