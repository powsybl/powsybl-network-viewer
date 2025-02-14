/**
 * Copyright (c) 2020, RTE (http://www.rte-france.com)
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

import '@mapbox/mapbox-gl-draw/dist/mapbox-gl-draw.css';
import type { LiteralUnion } from 'type-fest';
import type { Property } from 'csstype';
import {
    type Dispatch,
    type ForwardedRef,
    type ReactNode,
    type RefObject,
    type SetStateAction,
    useCallback,
    useImperativeHandle,
    useMemo,
    useRef,
    useState,
} from 'react';
import { Box, Button, type ButtonProps, decomposeColor, useTheme } from '@mui/material';
import { Replay } from '@mui/icons-material';
import { FormattedMessage } from 'react-intl';
import type { MapboxOverlayProps } from '@deck.gl/mapbox';
import type { Feature, Polygon } from 'geojson';
import booleanPointInPolygon from '@turf/boolean-point-in-polygon';
import type MapboxDraw from '@mapbox/mapbox-gl-draw';
import type { GeoData } from './geo-data';
import type { MapEquipments } from './map-equipments';
import { type DrawControlProps } from './draw-control-common';
import LineLayer, { LineFlowColorMode, LineFlowMode, type LineLayerProps } from './line-layer';
import SubstationLayer from './substation-layer';
import {
    EQUIPMENT_TYPES,
    type MapAnyLine,
    type MapAnyLineWithType,
    type MapEquipment,
    type MapHvdcLine,
    type MapLine,
    type MapSubstation,
    type MapTieLine,
    type MapVoltageLevel,
} from '../../../equipment-types';
import LoaderWithOverlay from '../utils/loader-with-overlay';
import { type Layer, type LayerProps, type PickingInfo } from 'deck.gl';
import { getNominalVoltageColor } from '../../../utils/colors';
import { useNameOrId } from '../utils/equipmentInfosHandler';

// MouseEvent.button https://developer.mozilla.org/en-US/docs/Web/API/MouseEvent/button
export const MOUSE_EVENT_BUTTON_LEFT = 0;
export const MOUSE_EVENT_BUTTON_RIGHT = 2;

export const PICKING_RADIUS = 5;
export const DEFAULT_LOCATE_SUBSTATION_ZOOM_LEVEL = 12;
export const SUBSTATION_LAYER_PREFIX = 'substationLayer';
export const LINE_LAYER_PREFIX = 'lineLayer';
export const LABEL_SIZE = 12;

export type Centered = {
    lastCenteredSubstation: string | null;
    centeredSubstationId?: string | null;
    centered: boolean;
};

export const INITIAL_CENTERED: Centered = {
    lastCenteredSubstation: null,
    centeredSubstationId: null,
    centered: false,
};

/**
 * Represents the draw event types for the network map.<br/>
 * when a draw event is triggered, the event type is passed to the onDrawEvent callback<br/>
 * On create, when the user create a new polygon (shape finished)
 */
export enum DRAW_EVENT {
    CREATE = 1,
    UPDATE = 2,
    DELETE = 0,
}

const LIGHT = 'light';
const DARK = 'dark';
export type MapTheme = typeof LIGHT | typeof DARK;

export type TooltipType = {
    equipmentId: string;
    equipmentType: EQUIPMENT_TYPES;
    pointerX: number;
    pointerY: number;
    visible: boolean;
};

export type MenuClickFunction<T extends MapEquipment> = (equipment: T, eventX: number, eventY: number) => void;

export type NetworkMapProps = {
    disabled?: boolean;
    geoData?: GeoData;
    mapEquipments?: MapEquipments;
    mapTheme?: LiteralUnion<MapTheme, string>;
    areFlowsValid?: boolean;
    arrowsZoomThreshold?: number;
    centerOnSubstation?: { to: string };
    displayOverlayLoader?: boolean;
    filteredNominalVoltages?: number[];
    initialPosition?: [number, number];
    initialZoom?: number;
    isManualRefreshBackdropDisplayed?: boolean;
    labelsZoomThreshold?: number;
    lineFlowAlertThreshold?: number;
    lineFlowColorMode?: LineFlowColorMode;
    lineFlowMode?: LineFlowMode;
    lineFullPath?: boolean;
    lineParallelPath?: boolean;
    renderPopover?: (equipmentId: string, divRef: RefObject<HTMLDivElement>) => ReactNode;
    tooltipZoomThreshold?: number;
    // With mapboxgl v2 (not a problem with maplibre), we need to call
    // map.resize() when the parent size has changed, otherwise the map is not
    // redrawn. It seems like this is autodetected when the browser window is
    // resized, but not for programmatic resizes of the parent. For now in our
    // app, only study display mode resizes programmatically
    // use this prop to make the map resize when needed, each time this prop changes, map.resize() is trigged
    triggerMapResizeOnChange?: unknown;
    updatedLines?: LineLayerProps['updatedLines'];
    useName?: boolean;
    visible?: boolean;
    shouldDisableToolTip?: boolean;
    locateSubStationZoomLevel?: number;
    onHvdcLineMenuClick?: MenuClickFunction<MapHvdcLine>;
    onLineMenuClick?: MenuClickFunction<MapLine>;
    onTieLineMenuClick?: MenuClickFunction<MapTieLine>;
    onManualRefreshClick?: ButtonProps['onClick'];
    onSubstationClick?: (idVoltageLevel: string) => void;
    onSubstationClickChooseVoltageLevel?: (idSubstation: string, eventX: number, eventY: number) => void;
    onSubstationMenuClick?: MenuClickFunction<MapSubstation>;
    onVoltageLevelMenuClick?: MenuClickFunction<MapVoltageLevel>;
    onDrawPolygonModeActive?: DrawControlProps<unknown>['onDrawPolygonModeActive'];
    onPolygonChanged?: (polygoneFeature: Feature | Record<string, never>) => void;
    onDrawEvent?: (drawEvent: DRAW_EVENT) => void;
};

export type NetworkMapRef = {
    getSelectedSubstations: () => MapSubstation[];
    getSelectedLines: () => MapAnyLine[];
    cleanDraw: () => void;
    getMapDrawer: () => MapboxDraw | undefined;
    resetZoomAndPosition: () => void;
};

type GetPolygonFeaturesFunction = () => Parameters<NonNullable<NetworkMapProps['onPolygonChanged']>>[0];

const styles = {
    map: { zIndex: 0 },
    mapManualRefreshBackdrop: {
        width: '100%',
        height: '100%',
        textAlign: 'center',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'grey',
        opacity: '0.8',
        zIndex: 99,
        fontSize: 30,
    },
};

function getSubstationsInPolygon(
    features: Partial<Feature>, // Feature from geojson
    mapEquipments: MapEquipments | undefined,
    geoData: GeoData | undefined
) {
    const polygonCoordinates = features?.geometry as Polygon | undefined;
    if (!polygonCoordinates || polygonCoordinates.coordinates.length < 3) {
        return [];
    }
    //get the list of substation
    const substationsList = mapEquipments?.substations ?? [];
    //for each substation, check if it is in the polygon
    return substationsList // keep only the substation in the polygon
        .filter((substation) => {
            const pos = geoData?.getSubstationPosition(substation.id);
            if (!pos) {
                // we do like the library: https://github.com/Turfjs/turf/blob/master/packages/turf-boolean-point-in-polygon/index.ts#L50
                throw new Error('point is required');
            }
            return booleanPointInPolygon(pos, polygonCoordinates);
        });
}

function getSelectedLinesInPolygon(
    network: MapEquipments,
    lines: MapAnyLine[],
    geoData: GeoData | undefined,
    polygonCoordinates: Polygon
) {
    return lines.filter((line) => {
        try {
            const linePos = geoData?.getLinePositions(network, line);
            if (!linePos) {
                return false;
            }
            if (linePos.length < 2) {
                return false;
            }
            const extremities = [linePos[0], linePos[linePos.length - 1]];
            return extremities.some((pos) => booleanPointInPolygon(pos, polygonCoordinates));
        } catch (error) {
            console.error(error);
            return false;
        }
    });
}

export function useClickHandler(
    onSubstationClick: NetworkMapProps['onSubstationClick'] = () => {},
    onSubstationClickChooseVoltageLevel: NetworkMapProps['onSubstationClickChooseVoltageLevel'] = () => {},
    onSubstationMenuClick: NetworkMapProps['onSubstationMenuClick'] = () => {},
    onVoltageLevelMenuClick: NetworkMapProps['onVoltageLevelMenuClick'] = () => {},
    onLineMenuClick: NetworkMapProps['onLineMenuClick'] = () => {},
    onTieLineMenuClick: NetworkMapProps['onTieLineMenuClick'] = () => {},
    onHvdcLineMenuClick: NetworkMapProps['onHvdcLineMenuClick'] = () => {}
) {
    return useCallback(
        (
            info: PickingInfo,
            //event: MapMouseEvent, //| MjolnirGestureEvent['srcEvent'],
            originalEvent: MouseEvent,
            network: MapEquipments | undefined
        ) => {
            const leftButton = originalEvent.button === MOUSE_EVENT_BUTTON_LEFT;
            const rightButton = originalEvent.button === MOUSE_EVENT_BUTTON_RIGHT;
            if (
                info.layer?.id.startsWith(SUBSTATION_LAYER_PREFIX) &&
                (info.object?.substationId || info.object?.voltageLevels) // is a voltage level marker, or a substation text
            ) {
                let idVl: string | undefined;
                let idSubstation: string | undefined;
                if (info.object.substationId) {
                    idVl = info.object.id;
                } else if (info.object.voltageLevels) {
                    if (info.object.voltageLevels.length === 1) {
                        const idS = info.object.voltageLevels[0].substationId;
                        const substation = network?.getSubstation(idS);
                        if (substation && substation.voltageLevels.length > 1) {
                            idSubstation = idS;
                        } else {
                            idVl = info.object.voltageLevels[0].id;
                        }
                    } else {
                        idSubstation = info.object.voltageLevels[0].substationId;
                    }
                }
                if (idVl !== undefined) {
                    if (leftButton) {
                        onSubstationClick(idVl);
                    } else if (rightButton) {
                        onVoltageLevelMenuClick(
                            // @ts-expect-error TODO: manage undefined case
                            network?.getVoltageLevel(idVl),
                            originalEvent.x,
                            originalEvent.y
                        );
                    }
                }
                if (idSubstation !== undefined) {
                    if (leftButton) {
                        onSubstationClickChooseVoltageLevel(idSubstation, originalEvent.x, originalEvent.y);
                    } else if (rightButton) {
                        onSubstationMenuClick(
                            // @ts-expect-error TODO: manage undefined case
                            network?.getSubstation(idSubstation),
                            originalEvent.x,
                            originalEvent.y
                        );
                    }
                }
            }
            if (
                rightButton &&
                info.layer?.id.startsWith(LINE_LAYER_PREFIX) &&
                info.object?.id &&
                info.object?.voltageLevelId1 &&
                info.object?.voltageLevelId2
            ) {
                // picked line properties are retrieved from network data and not from pickable object infos,
                // because pickable object infos might not be up to date
                const line = network?.getLine(info.object.id);
                if (line) {
                    onLineMenuClick(line, originalEvent.x, originalEvent.y);
                } else {
                    const tieLine = network?.getTieLine(info.object.id);
                    if (tieLine) {
                        onTieLineMenuClick(tieLine, originalEvent.x, originalEvent.y);
                    } else {
                        const hvdcLine = network?.getHvdcLine(info.object.id);
                        if (hvdcLine) {
                            onHvdcLineMenuClick(hvdcLine, originalEvent.x, originalEvent.y);
                        }
                    }
                }
            }
        },
        [
            onSubstationClick,
            onVoltageLevelMenuClick,
            onSubstationClickChooseVoltageLevel,
            onSubstationMenuClick,
            onLineMenuClick,
            onTieLineMenuClick,
            onHvdcLineMenuClick,
        ]
    );
}

export function useMapLinesWithType(mapEquipments: NetworkMapProps['mapEquipments']) {
    return useMemo<MapAnyLineWithType[]>(() => {
        return [
            ...(mapEquipments?.lines.map((line) => ({
                ...line,
                equipmentType: EQUIPMENT_TYPES.LINE as const,
            })) ?? []),
            ...(mapEquipments?.tieLines.map((tieLine) => ({
                ...tieLine,
                equipmentType: EQUIPMENT_TYPES.TIE_LINE as const,
            })) ?? []),
            ...(mapEquipments?.hvdcLines.map((hvdcLine) => ({
                ...hvdcLine,
                equipmentType: EQUIPMENT_TYPES.HVDC_LINE as const,
            })) ?? []),
        ];
    }, [mapEquipments?.hvdcLines, mapEquipments?.tieLines, mapEquipments?.lines]);
}

export function useMapApi(
    ref: ForwardedRef<NetworkMapRef>,
    mapEquipments: NetworkMapProps['mapEquipments'],
    mapEquipmentsLines: MapAnyLineWithType[],
    getPolygonFeatures: GetPolygonFeaturesFunction,
    getMapDrawer: NetworkMapRef['getMapDrawer'],
    geoData: NetworkMapProps['geoData'],
    filteredNominalVoltages: NetworkMapProps['filteredNominalVoltages'],
    setCentered: Dispatch<SetStateAction<Centered>>,
    onPolygonChanged: NonNullable<NetworkMapProps['onPolygonChanged']>,
    onDrawEvent: NonNullable<NetworkMapProps['onDrawEvent']>
) {
    const getSelectedLines = useCallback(() => {
        const polygonFeatures = getPolygonFeatures();
        const polygonCoordinates = polygonFeatures?.geometry as Polygon | undefined;
        if (!polygonCoordinates || polygonCoordinates.coordinates.length < 3) {
            return [];
        }
        //for each line, check if it is in the polygon
        const selectedLines = getSelectedLinesInPolygon(
            // @ts-expect-error TODO: manage undefined case
            mapEquipments,
            mapEquipmentsLines,
            geoData,
            polygonCoordinates
        );
        return selectedLines.filter((line) =>
            filteredNominalVoltages?.some(
                (nv) =>
                    nv === mapEquipments?.getVoltageLevel(line.voltageLevelId1)?.nominalV ||
                    nv === mapEquipments?.getVoltageLevel(line.voltageLevelId2)?.nominalV
            )
        );
    }, [getPolygonFeatures, mapEquipmentsLines, geoData, filteredNominalVoltages, mapEquipments]);

    const getSelectedSubstations = useCallback(() => {
        const substations = getSubstationsInPolygon(getPolygonFeatures(), mapEquipments, geoData);
        return (
            substations.filter((substation) =>
                substation.voltageLevels.some((vl) => filteredNominalVoltages?.includes(vl.nominalV))
            ) ?? []
        );
    }, [getPolygonFeatures, mapEquipments, geoData, filteredNominalVoltages]);

    // reset zoom and position to make the map centered around the displayed network
    const resetZoomAndPosition = useCallback(() => setCentered(INITIAL_CENTERED), [setCentered]);

    const cleanDraw = useCallback(() => {
        //because deleteAll does not trigger a update of the polygonFeature callback
        getMapDrawer()?.deleteAll();
        onPolygonChanged(getPolygonFeatures());
        onDrawEvent(DRAW_EVENT.DELETE);
    }, [getMapDrawer, getPolygonFeatures, onDrawEvent, onPolygonChanged]);

    useImperativeHandle(
        ref,
        () => ({
            getSelectedSubstations,
            getSelectedLines,
            cleanDraw,
            getMapDrawer,
            resetZoomAndPosition,
        }),
        [getSelectedSubstations, getSelectedLines, cleanDraw, getMapDrawer, resetZoomAndPosition]
    );
}

export function useMapCommonParameters(
    cursorType: Property.Cursor,
    initialPosition: NetworkMapProps['initialPosition'] = [0, 0],
    initialZoom: NetworkMapProps['initialZoom'] = 5
) {
    const [isDragging, setIsDragging] = useState(false);
    const setDraggingTrue = useCallback(() => setIsDragging(true), []);
    const setDraggingFalse = useCallback(() => setIsDragging(false), []);

    const initialViewState = useMemo(
        () => ({
            longitude: initialPosition[0],
            latitude: initialPosition[1],
            zoom: initialZoom,
            maxZoom: 14,
            pitch: 0,
            bearing: 0,
        }),
        [initialPosition, initialZoom]
    );

    return {
        style: styles.map,
        //onMove: onViewStateChange,
        doubleClickZoom: false,
        styleDiffing: false,
        initialViewState: initialViewState,
        cursor: isDragging ? 'grabbing' : cursorType, // TODO needed for pointer on our polygonFeatures, but forces us to reimplement grabbing/grab for panning. Can we avoid reimplementing?
        onDrag: setDraggingTrue,
        onDragEnd: setDraggingFalse,
        //onContextMenu: onMapContextMenu,
    } as const;
}

type MapCommonAddonsProps = {
    displayOverlayLoader: NetworkMapProps['displayOverlayLoader'];
    isManualRefreshBackdropDisplayed: NetworkMapProps['isManualRefreshBackdropDisplayed'];
    onManualRefreshClick: NetworkMapProps['onManualRefreshClick'];
    showTooltip: boolean;
    tooltip: TooltipType | undefined;
    shouldDisableToolTip: NetworkMapProps['shouldDisableToolTip'];
    renderPopover: NetworkMapProps['renderPopover'];
};

export function MapCommonAddons({
    displayOverlayLoader = false,
    isManualRefreshBackdropDisplayed = false,
    onManualRefreshClick = () => {},
    showTooltip,
    tooltip,
    shouldDisableToolTip = false,
    renderPopover = (eId) => eId,
}: Readonly<MapCommonAddonsProps>) {
    const theme = useTheme();
    const divRef = useRef<HTMLDivElement>(null);
    return (
        <>
            {displayOverlayLoader && (
                <LoaderWithOverlay
                    color="inherit"
                    loaderSize={70}
                    isFixed={false}
                    loadingMessageText="loadingGeoData"
                />
            )}
            {isManualRefreshBackdropDisplayed && (
                <Box sx={styles.mapManualRefreshBackdrop}>
                    <Button onClick={onManualRefreshClick} aria-label="reload" color="inherit" size="large">
                        <Replay />
                        <FormattedMessage id="ManuallyRefreshGeoData" />
                    </Button>
                </Box>
            )}
            {showTooltip &&
                tooltip &&
                tooltip.visible &&
                !shouldDisableToolTip &&
                //As of now only LINE tooltip is implemented, the following condition is to be removed or tweaked once other types of line tooltip are implemented
                tooltip.equipmentType === EQUIPMENT_TYPES.LINE && (
                    <div
                        ref={divRef}
                        style={{
                            position: 'absolute',
                            color: theme.palette.text.primary,
                            zIndex: 1,
                            pointerEvents: 'none',
                            left: tooltip.pointerX,
                            top: tooltip.pointerY,
                        }}
                    >
                        {renderPopover(tooltip.equipmentId, divRef)}
                    </div>
                )}
        </>
    );
}

export function useDeckGlCommonParameters(
    mapEquipments: NetworkMapProps['mapEquipments'],
    mapEquipmentsLines: LineLayerProps['data'],
    geoData: NetworkMapProps['geoData'],
    setCursorType: Dispatch<SetStateAction<Property.Cursor>>,
    setTooltip: Dispatch<SetStateAction<TooltipType | undefined>>,
    showTooltip: boolean,
    labelsVisible: boolean,
    showLineFlow: boolean,
    filteredNominalVoltages: NetworkMapProps['filteredNominalVoltages'],
    useName: NetworkMapProps['useName'] = true,
    areFlowsValid: NetworkMapProps['areFlowsValid'] = true,
    disabled: NetworkMapProps['disabled'] = false,
    lineFlowAlertThreshold: NetworkMapProps['lineFlowAlertThreshold'] = 100,
    lineFlowColorMode: NetworkMapProps['lineFlowColorMode'] = LineFlowColorMode.NOMINAL_VOLTAGE,
    lineFlowMode: NetworkMapProps['lineFlowMode'] = LineFlowMode.FEEDERS,
    lineFullPath: NetworkMapProps['lineFullPath'] = true,
    lineParallelPath: NetworkMapProps['lineParallelPath'] = true,
    updatedLines: NetworkMapProps['updatedLines'] = [],
    visible: NetworkMapProps['visible'] = true
) {
    const theme = useTheme();
    const foregroundNeutralColor = useMemo(() => {
        const labelColor = decomposeColor(theme.palette.text.primary).values;
        if (labelColor.length === 4) {
            labelColor[3] *= 255;
        }
        return labelColor;
    }, [theme]);
    const { getNameOrId } = useNameOrId(useName);

    const readyToDisplay = mapEquipments !== null && geoData !== null && !disabled;
    const readyToDisplaySubstations =
        readyToDisplay && mapEquipments?.substations && (geoData?.substationPositionsById.size ?? 0) > 0;
    const readyToDisplayLines =
        readyToDisplay &&
        (mapEquipments?.lines || mapEquipments?.hvdcLines || mapEquipments?.tieLines) &&
        mapEquipments.voltageLevels &&
        (geoData?.substationPositionsById.size ?? 0) > 0;

    const layers: Layer[] = [];
    const onSubstationHover = useCallback<NonNullable<LayerProps['onHover']>>(
        ({ object }) => setCursorType(object ? 'pointer' : 'grab'),
        [setCursorType]
    );
    if (readyToDisplaySubstations) {
        layers.push(
            new SubstationLayer({
                id: SUBSTATION_LAYER_PREFIX,
                data: mapEquipments?.substations,
                network: mapEquipments,
                geoData: geoData,
                getNominalVoltageColor: getNominalVoltageColor,
                filteredNominalVoltages: filteredNominalVoltages,
                labelsVisible: labelsVisible,
                labelColor: foregroundNeutralColor,
                labelSize: LABEL_SIZE,
                pickable: true,
                onHover: onSubstationHover,
                getNameOrId: getNameOrId,
            })
        );
    }
    const onLineHover = useCallback<NonNullable<LayerProps['onHover']>>(
        ({ object, x, y }) => {
            if (object) {
                setCursorType('pointer');
                const lineObject = object?.line ?? object;
                setTooltip({
                    equipmentId: lineObject?.id,
                    equipmentType: lineObject?.equipmentType,
                    pointerX: x,
                    pointerY: y,
                    visible: showTooltip,
                });
            } else {
                setCursorType('grab');
                setTooltip(undefined);
            }
        },
        [setCursorType, setTooltip, showTooltip]
    );
    if (readyToDisplayLines) {
        layers.push(
            new LineLayer({
                areFlowsValid: areFlowsValid,
                id: LINE_LAYER_PREFIX,
                data: mapEquipmentsLines,
                network: mapEquipments,
                updatedLines: updatedLines,
                geoData: geoData,
                getNominalVoltageColor: getNominalVoltageColor,
                disconnectedLineColor: foregroundNeutralColor,
                filteredNominalVoltages: filteredNominalVoltages,
                lineFlowMode: lineFlowMode,
                showLineFlow: visible && showLineFlow,
                lineFlowColorMode: lineFlowColorMode,
                lineFlowAlertThreshold: lineFlowAlertThreshold,
                lineFullPath: (geoData?.linePositionsById.size ?? 0) > 0 && lineFullPath,
                lineParallelPath: lineParallelPath,
                labelsVisible: labelsVisible,
                labelColor: foregroundNeutralColor,
                labelSize: LABEL_SIZE,
                pickable: true,
                onHover: onLineHover,
            })
        );
    }

    return {
        layers: layers,
        pickingRadius: PICKING_RADIUS,
    } as const satisfies Partial<MapboxOverlayProps>;
}

const drawControlControls = { polygon: true, trash: true } as const;
export function useDrawControlCommonParameters(
    getPolygonFeatures: GetPolygonFeaturesFunction,
    onPolygonChanged: NonNullable<NetworkMapProps['onPolygonChanged']>,
    onDrawEvent: NonNullable<NetworkMapProps['onDrawEvent']>,
    onDrawPolygonModeActive: NetworkMapProps['onDrawPolygonModeActive'] = () => {}
) {
    //onDrawPolygonModeActive = (active) => console.log('polygon drawing mode active: ', active ? 'active' : 'inactive'),
    const onUpdate = useCallback(() => {
        onPolygonChanged(getPolygonFeatures());
        onDrawEvent(DRAW_EVENT.UPDATE);
    }, [getPolygonFeatures, onDrawEvent, onPolygonChanged]);
    const onCreate = useCallback(() => {
        onPolygonChanged(getPolygonFeatures());
        onDrawEvent(DRAW_EVENT.CREATE);
    }, [getPolygonFeatures, onDrawEvent, onPolygonChanged]);
    const onDelete = useCallback(() => {
        onPolygonChanged(getPolygonFeatures());
        onDrawEvent(DRAW_EVENT.DELETE);
    }, [onPolygonChanged, getPolygonFeatures, onDrawEvent]);
    return {
        position: 'bottom-left',
        displayControlsDefault: false,
        controls: drawControlControls,
        defaultMode: 'simple_select', // defaultMode = "simple_select" | "draw_polygon" | ...
        onDrawPolygonModeActive: onDrawPolygonModeActive,
        onCreate: onCreate,
        onUpdate: onUpdate,
        onDelete: onDelete,
    } as const satisfies DrawControlProps<string>;
}
