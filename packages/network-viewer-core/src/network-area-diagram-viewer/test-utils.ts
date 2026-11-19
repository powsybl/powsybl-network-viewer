/*
 * Copyright (c) 2026, RTE (https://www.rte-france.com)
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 * SPDX-License-Identifier: MPL-2.0
 */

import { join } from 'node:path';
import { readFileSync } from 'node:fs';
import { DiagramMetadata, SvgParametersMetadata } from './diagram-metadata';

export function getSvgFromFile(file: string): string {
    const filePath = join(__dirname, file);
    return readFileSync(filePath, 'utf8');
}

export function getDiagramMetadata(): DiagramMetadata {
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
        doubleArrowShiftFactorArrows: 1.5,
        doubleArrowShiftFactorText: 1.8,
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
            scaleFactor: 1,
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
            {
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
            },
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
            {
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
            },
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
    return diagramMetadata;
}
