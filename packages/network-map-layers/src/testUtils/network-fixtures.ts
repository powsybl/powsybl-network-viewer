/**
 * Copyright (c) 2026, RTE (http://www.rte-france.com)
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

import { EQUIPMENT_TYPES, MapAdditionalProperties, MapLine, type MapLineWithType } from '../equipment-types';
import { GeoData } from '../network/geo-data';
import { LineStatus } from '../network/line-layer';
import { MapEquipments } from '../network/map-equipments';

type Coordinate = { lat: number; lon: number };

type LargeLineRoute = {
    lineId: string;
    fromSubstationId: string;
    toSubstationId: string;
    bend: number;
};

const SUBSTATION_1 = {
    id: 's1',
    name: 'S1',
    voltageLevels: [{ id: 'vl1', nominalV: 400, substationId: 's1' }],
};

const SUBSTATION_2 = {
    id: 's2',
    name: 'S2',
    voltageLevels: [{ id: 'vl2', nominalV: 400, substationId: 's2' }],
};

const SUBSTATION_COORDINATES: Coordinate[] = [
    { lat: 48.85, lon: 2.35 },
    { lat: 48.87, lon: 2.37 },
];

const LINE_COORDINATES: Coordinate[] = [
    { lat: 48.85, lon: 2.35 },
    { lat: 48.86, lon: 2.36 },
    { lat: 48.87, lon: 2.37 },
];

const LARGE_SUBSTATIONS = [
    {
        id: 's-paris',
        name: 'Paris',
        voltageLevels: [
            { id: 'vl-paris-400', nominalV: 400, substationId: 's-paris' },
            { id: 'vl-paris-225', nominalV: 225, substationId: 's-paris' },
            { id: 'vl-paris-90', nominalV: 90, substationId: 's-paris' },
            { id: 'vl-paris-63', nominalV: 63, substationId: 's-paris' },
            { id: 'vl-paris-45', nominalV: 45, substationId: 's-paris' },
        ],
    },
    {
        id: 's-mantes',
        name: 'Mantes',
        voltageLevels: [
            { id: 'vl-mantes-400', nominalV: 400, substationId: 's-mantes' },
            { id: 'vl-mantes-90', nominalV: 90, substationId: 's-mantes' },
            { id: 'vl-mantes-45', nominalV: 45, substationId: 's-mantes' },
        ],
    },
    {
        id: 's-tours',
        name: 'Tours',
        voltageLevels: [
            { id: 'vl-tours-400', nominalV: 400, substationId: 's-tours' },
            { id: 'vl-tours-45', nominalV: 45, substationId: 's-tours' },
        ],
    },
    {
        id: 's-lille',
        name: 'Lille',
        voltageLevels: [
            { id: 'vl-lille-400', nominalV: 400, substationId: 's-lille' },
            { id: 'vl-lille-150', nominalV: 150, substationId: 's-lille' },
        ],
    },
    {
        id: 's-versailles',
        name: 'Versailles',
        voltageLevels: [
            { id: 'vl-versailles-225', nominalV: 225, substationId: 's-versailles' },
            { id: 'vl-versailles-63', nominalV: 63, substationId: 's-versailles' },
        ],
    },
    {
        id: 's-rouen',
        name: 'Rouen',
        voltageLevels: [
            { id: 'vl-rouen-225', nominalV: 225, substationId: 's-rouen' },
            { id: 'vl-rouen-150', nominalV: 150, substationId: 's-rouen' },
        ],
    },
    {
        id: 's-reims',
        name: 'Reims',
        voltageLevels: [
            { id: 'vl-reims-225', nominalV: 225, substationId: 's-reims' },
            { id: 'vl-reims-45', nominalV: 45, substationId: 's-reims' },
        ],
    },
    {
        id: 's-caen',
        name: 'Caen',
        voltageLevels: [
            { id: 'vl-caen-150', nominalV: 150, substationId: 's-caen' },
            { id: 'vl-caen-63', nominalV: 63, substationId: 's-caen' },
        ],
    },
    {
        id: 's-amiens',
        name: 'Amiens',
        voltageLevels: [
            { id: 'vl-amiens-90', nominalV: 90, substationId: 's-amiens' },
            { id: 'vl-amiens-63', nominalV: 63, substationId: 's-amiens' },
        ],
    },
    {
        id: 's-orleans',
        name: 'Orleans',
        voltageLevels: [
            { id: 'vl-orleans-90', nominalV: 90, substationId: 's-orleans' },
            { id: 'vl-orleans-20', nominalV: 20, substationId: 's-orleans' },
        ],
    },
];

const LARGE_SUBSTATION_COORDINATES: Record<string, Coordinate> = {
    's-paris': { lat: 48.8566, lon: 2.3522 },
    's-mantes': { lat: 48.9905, lon: 1.7172 },
    's-tours': { lat: 47.3941, lon: 0.6848 },
    's-lille': { lat: 50.6292, lon: 3.0573 },
    's-versailles': { lat: 48.8049, lon: 2.1204 },
    's-rouen': { lat: 49.4432, lon: 1.0993 },
    's-reims': { lat: 49.2583, lon: 4.0317 },
    's-caen': { lat: 49.1829, lon: -0.3707 },
    's-amiens': { lat: 49.8941, lon: 2.2958 },
    's-orleans': { lat: 47.9029, lon: 1.9093 },
};

const LARGE_NETWORK_LINES: MapLineWithType[] = [
    {
        id: 'line-paris-mantes-400',
        equipmentType: EQUIPMENT_TYPES.LINE,
        voltageLevelId1: 'vl-paris-400',
        voltageLevelId2: 'vl-mantes-400',
        terminal1Connected: true,
        terminal2Connected: true,
        p1: 280,
        p2: -280,
        i1: 65,
        i2: 64,
        operatingStatus: LineStatus.IN_OPERATION,
        currentLimits1: { permanentLimit: 800 },
        currentLimits2: { permanentLimit: 800 },
    },
    {
        id: 'line-paris-lille-400',
        equipmentType: EQUIPMENT_TYPES.LINE,
        voltageLevelId1: 'vl-paris-400',
        voltageLevelId2: 'vl-lille-400',
        terminal1Connected: true,
        terminal2Connected: true,
        p1: 360,
        p2: -360,
        i1: 82,
        i2: 80,
        operatingStatus: LineStatus.IN_OPERATION,
        currentLimits1: { permanentLimit: 900 },
        currentLimits2: { permanentLimit: 900 },
    },
    {
        id: 'line-paris-tours-400',
        equipmentType: EQUIPMENT_TYPES.LINE,
        voltageLevelId1: 'vl-paris-400',
        voltageLevelId2: 'vl-tours-400',
        terminal1Connected: true,
        terminal2Connected: false,
        p1: 0,
        p2: 0,
        i1: 0,
        i2: 0,
        operatingStatus: LineStatus.PLANNED_OUTAGE,
        currentLimits1: { permanentLimit: 750 },
        currentLimits2: { permanentLimit: 750 },
    },
    {
        id: 'line-mantes-tours-400',
        equipmentType: EQUIPMENT_TYPES.LINE,
        voltageLevelId1: 'vl-mantes-400',
        voltageLevelId2: 'vl-tours-400',
        terminal1Connected: true,
        terminal2Connected: true,
        p1: 150,
        p2: -150,
        i1: 36,
        i2: 35,
        operatingStatus: LineStatus.IN_OPERATION,
        currentLimits1: { permanentLimit: 700 },
        currentLimits2: { permanentLimit: 700 },
    },
    {
        id: 'line-paris-versailles-225',
        equipmentType: EQUIPMENT_TYPES.LINE,
        voltageLevelId1: 'vl-paris-225',
        voltageLevelId2: 'vl-versailles-225',
        terminal1Connected: true,
        terminal2Connected: true,
        p1: 110,
        p2: -110,
        i1: 40,
        i2: 39,
        operatingStatus: LineStatus.IN_OPERATION,
        currentLimits1: { permanentLimit: 400 },
        currentLimits2: { permanentLimit: 400 },
    },
    {
        id: 'line-paris-reims-225',
        equipmentType: EQUIPMENT_TYPES.LINE,
        voltageLevelId1: 'vl-paris-225',
        voltageLevelId2: 'vl-reims-225',
        terminal1Connected: true,
        terminal2Connected: true,
        p1: 140,
        p2: -140,
        i1: 48,
        i2: 47,
        operatingStatus: LineStatus.IN_OPERATION,
        currentLimits1: { permanentLimit: 430 },
        currentLimits2: { permanentLimit: 430 },
    },
    {
        id: 'line-paris-rouen-225',
        equipmentType: EQUIPMENT_TYPES.LINE,
        voltageLevelId1: 'vl-paris-225',
        voltageLevelId2: 'vl-rouen-225',
        terminal1Connected: true,
        terminal2Connected: true,
        p1: 0,
        p2: 0,
        i1: 0,
        i2: 0,
        operatingStatus: LineStatus.FORCED_OUTAGE,
        currentLimits1: { permanentLimit: 420 },
        currentLimits2: { permanentLimit: 420 },
    },
    {
        id: 'line-rouen-caen-150',
        equipmentType: EQUIPMENT_TYPES.LINE,
        voltageLevelId1: 'vl-rouen-150',
        voltageLevelId2: 'vl-caen-150',
        terminal1Connected: true,
        terminal2Connected: true,
        p1: 95,
        p2: -95,
        i1: 37,
        i2: 36,
        operatingStatus: LineStatus.IN_OPERATION,
        currentLimits1: { permanentLimit: 320 },
        currentLimits2: { permanentLimit: 320 },
    },
    {
        id: 'line-caen-lille-150',
        equipmentType: EQUIPMENT_TYPES.LINE,
        voltageLevelId1: 'vl-caen-150',
        voltageLevelId2: 'vl-lille-150',
        terminal1Connected: true,
        terminal2Connected: true,
        p1: 0,
        p2: 0,
        i1: 0,
        i2: 0,
        operatingStatus: LineStatus.PLANNED_OUTAGE,
        currentLimits1: { permanentLimit: 340 },
        currentLimits2: { permanentLimit: 340 },
    },
    {
        id: 'line-paris-versailles-63',
        equipmentType: EQUIPMENT_TYPES.LINE,
        voltageLevelId1: 'vl-paris-63',
        voltageLevelId2: 'vl-versailles-63',
        terminal1Connected: true,
        terminal2Connected: true,
        p1: 70,
        p2: -70,
        i1: 42,
        i2: 41,
        operatingStatus: LineStatus.IN_OPERATION,
        currentLimits1: { permanentLimit: 240 },
        currentLimits2: { permanentLimit: 240 },
    },
    {
        id: 'line-paris-mantes-90',
        equipmentType: EQUIPMENT_TYPES.LINE,
        voltageLevelId1: 'vl-paris-90',
        voltageLevelId2: 'vl-mantes-90',
        terminal1Connected: true,
        terminal2Connected: true,
        p1: 70,
        p2: -70,
        i1: 42,
        i2: 41,
        operatingStatus: LineStatus.IN_OPERATION,
        currentLimits1: { permanentLimit: 240 },
        currentLimits2: { permanentLimit: 240 },
    },
    {
        id: 'line-paris-mantes-45',
        equipmentType: EQUIPMENT_TYPES.LINE,
        voltageLevelId1: 'vl-paris-45',
        voltageLevelId2: 'vl-mantes-45',
        terminal1Connected: true,
        terminal2Connected: true,
        p1: 70,
        p2: -70,
        i1: 42,
        i2: 41,
        operatingStatus: LineStatus.IN_OPERATION,
        currentLimits1: { permanentLimit: 240 },
        currentLimits2: { permanentLimit: 240 },
    },
    {
        id: 'line-paris-amiens-90',
        equipmentType: EQUIPMENT_TYPES.LINE,
        voltageLevelId1: 'vl-paris-90',
        voltageLevelId2: 'vl-amiens-90',
        terminal1Connected: true,
        terminal2Connected: true,
        p1: 85,
        p2: -85,
        i1: 44,
        i2: 43,
        operatingStatus: LineStatus.IN_OPERATION,
        currentLimits1: { permanentLimit: 250 },
        currentLimits2: { permanentLimit: 250 },
    },
    {
        id: 'line-paris-orleans-90',
        equipmentType: EQUIPMENT_TYPES.LINE,
        voltageLevelId1: 'vl-paris-90',
        voltageLevelId2: 'vl-orleans-90',
        terminal1Connected: false,
        terminal2Connected: true,
        p1: 0,
        p2: 0,
        i1: 0,
        i2: 0,
        operatingStatus: LineStatus.FORCED_OUTAGE,
        currentLimits1: { permanentLimit: 220 },
        currentLimits2: { permanentLimit: 220 },
    },
    {
        id: 'line-versailles-caen-63',
        equipmentType: EQUIPMENT_TYPES.LINE,
        voltageLevelId1: 'vl-versailles-63',
        voltageLevelId2: 'vl-caen-63',
        terminal1Connected: true,
        terminal2Connected: false,
        p1: 0,
        p2: 0,
        i1: 0,
        i2: 0,
        operatingStatus: LineStatus.IN_OPERATION,
        currentLimits1: { permanentLimit: 180 },
        currentLimits2: { permanentLimit: 180 },
    },
    {
        id: 'line-caen-amiens-63',
        equipmentType: EQUIPMENT_TYPES.LINE,
        voltageLevelId1: 'vl-caen-63',
        voltageLevelId2: 'vl-amiens-63',
        terminal1Connected: true,
        terminal2Connected: true,
        p1: 55,
        p2: -55,
        i1: 33,
        i2: 32,
        operatingStatus: LineStatus.IN_OPERATION,
        currentLimits1: { permanentLimit: 170 },
        currentLimits2: { permanentLimit: 170 },
    },
    {
        id: 'line-tours-reims-45',
        equipmentType: EQUIPMENT_TYPES.LINE,
        voltageLevelId1: 'vl-tours-45',
        voltageLevelId2: 'vl-reims-45',
        terminal1Connected: true,
        terminal2Connected: true,
        p1: 0,
        p2: 0,
        i1: 0,
        i2: 0,
        operatingStatus: LineStatus.PLANNED_OUTAGE,
        currentLimits1: { permanentLimit: 150 },
        currentLimits2: { permanentLimit: 150 },
    },
];

const LARGE_LINE_ROUTES: LargeLineRoute[] = [
    { lineId: 'line-paris-mantes-400', fromSubstationId: 's-paris', toSubstationId: 's-mantes', bend: 0.05 },
    { lineId: 'line-paris-lille-400', fromSubstationId: 's-paris', toSubstationId: 's-lille', bend: 0.08 },
    { lineId: 'line-paris-tours-400', fromSubstationId: 's-paris', toSubstationId: 's-tours', bend: -0.1 },
    { lineId: 'line-mantes-tours-400', fromSubstationId: 's-mantes', toSubstationId: 's-tours', bend: -0.06 },
    {
        lineId: 'line-paris-versailles-225',
        fromSubstationId: 's-paris',
        toSubstationId: 's-versailles',
        bend: 0.02,
    },
    { lineId: 'line-paris-reims-225', fromSubstationId: 's-paris', toSubstationId: 's-reims', bend: 0.04 },
    { lineId: 'line-paris-rouen-225', fromSubstationId: 's-paris', toSubstationId: 's-rouen', bend: 0.03 },
    { lineId: 'line-rouen-caen-150', fromSubstationId: 's-rouen', toSubstationId: 's-caen', bend: 0.06 },
    { lineId: 'line-caen-lille-150', fromSubstationId: 's-caen', toSubstationId: 's-lille', bend: 0.07 },
    { lineId: 'line-paris-versailles-63', fromSubstationId: 's-paris', toSubstationId: 's-versailles', bend: -0.02 },
    { lineId: 'line-paris-mantes-90', fromSubstationId: 's-paris', toSubstationId: 's-mantes', bend: -0.04 },
    { lineId: 'line-paris-mantes-45', fromSubstationId: 's-paris', toSubstationId: 's-mantes', bend: -0.01 },
    { lineId: 'line-paris-amiens-90', fromSubstationId: 's-paris', toSubstationId: 's-amiens', bend: 0.02 },
    { lineId: 'line-paris-orleans-90', fromSubstationId: 's-paris', toSubstationId: 's-orleans', bend: -0.05 },
    {
        lineId: 'line-versailles-caen-63',
        fromSubstationId: 's-versailles',
        toSubstationId: 's-caen',
        bend: 0.09,
    },
    { lineId: 'line-caen-amiens-63', fromSubstationId: 's-caen', toSubstationId: 's-amiens', bend: -0.04 },
    { lineId: 'line-tours-reims-45', fromSubstationId: 's-tours', toSubstationId: 's-reims', bend: 0.11 },
];

function createPolylineCoordinates(start: Coordinate, end: Coordinate, bend: number): Coordinate[] {
    const middle = {
        lat: (start.lat + end.lat) / 2 + bend,
        lon: (start.lon + end.lon) / 2 - bend,
    };

    return [start, middle, end];
}

export function createLineForLineLayer(overrides: Partial<MapLineWithType> = {}): MapLineWithType {
    return {
        id: 'line-1',
        equipmentType: EQUIPMENT_TYPES.LINE,
        voltageLevelId1: 'vl1',
        voltageLevelId2: 'vl2',
        terminal1Connected: true,
        terminal2Connected: true,
        p1: 120,
        p2: -120,
        i1: 20,
        i2: 20,
        operatingStatus: LineStatus.IN_OPERATION,
        currentLimits1: { permanentLimit: 100 },
        currentLimits2: { permanentLimit: 100 },
        ...overrides,
    };
}

export function createMapLineWithType(
    overrides: Partial<MapLine & MapAdditionalProperties> = {}
): MapAdditionalProperties & MapLineWithType {
    return {
        id: 'line-visual-1',
        equipmentType: EQUIPMENT_TYPES.LINE,
        voltageLevelId1: 'vl1',
        voltageLevelId2: 'vl2',
        terminal1Connected: true,
        terminal2Connected: true,
        p1: 90,
        p2: -90,
        positions: [
            [2.35, 48.85],
            [2.36, 48.86],
            [2.37, 48.865],
        ],
        cumulativeDistances: [0, 1200, 2200],
        parallelIndex: 0,
        angleStart: 0,
        angle: 0,
        angleEnd: 0,
        proximityFactorStart: 1,
        proximityFactorEnd: 1,
        ...overrides,
    };
}

export function createNetwork(lineData: MapLineWithType): MapEquipments {
    const network = new MapEquipments();
    network.updateSubstations([SUBSTATION_1, SUBSTATION_2], true);
    network.updateLines([lineData], true);
    return network;
}

export function createGeoData(lineData: MapLineWithType): GeoData {
    const geoData = new GeoData(new Map(), new Map());
    geoData.setSubstationPositions([
        { id: SUBSTATION_1.id, coordinate: SUBSTATION_COORDINATES[0] },
        { id: SUBSTATION_2.id, coordinate: SUBSTATION_COORDINATES[1] },
    ]);
    geoData.setLinePositions([
        {
            id: lineData.id,
            coordinates: LINE_COORDINATES,
        },
    ]);
    return geoData;
}

export function createLargeNetwork(): MapEquipments {
    const network = new MapEquipments();
    network.updateSubstations(LARGE_SUBSTATIONS, true);
    network.updateLines(LARGE_NETWORK_LINES, true);
    return network;
}

export function createLargeGeoData(): GeoData {
    const geoData = new GeoData(new Map(), new Map());

    geoData.setSubstationPositions(
        LARGE_SUBSTATIONS.map((substation) => ({
            id: substation.id,
            coordinate: LARGE_SUBSTATION_COORDINATES[substation.id],
        }))
    );

    geoData.setLinePositions(
        LARGE_LINE_ROUTES.map((route) => ({
            id: route.lineId,
            coordinates: createPolylineCoordinates(
                LARGE_SUBSTATION_COORDINATES[route.fromSubstationId],
                LARGE_SUBSTATION_COORDINATES[route.toSubstationId],
                route.bend
            ),
        }))
    );

    return geoData;
}

export function createLargeMapLinesWithType(): (MapAdditionalProperties & MapLineWithType)[] {
    const network = createLargeNetwork();
    const geoData = createLargeGeoData();

    return LARGE_NETWORK_LINES.map((line, index) => {
        const positions = geoData.getLinePositions(network, line, true);
        const cumulativeDistances = geoData.getLineDistances(positions) ?? [];
        const start = positions[0];
        const end = positions[positions.length - 1];
        const angle = Math.atan2(end[1] - start[1], end[0] - start[0]);

        return {
            ...line,
            positions,
            cumulativeDistances,
            parallelIndex: (index % 5) - 2,
            angleStart: angle,
            angle,
            angleEnd: angle,
            proximityFactorStart: 1,
            proximityFactorEnd: 1,
        };
    });
}
