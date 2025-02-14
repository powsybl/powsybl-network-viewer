/**
 * Copyright (c) 2020, RTE (http://www.rte-france.com)
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

import type { LiteralUnion } from 'type-fest';
import type { Property } from 'csstype';
import { forwardRef, RefObject, useCallback, useEffect, useImperativeHandle, useMemo, useRef, useState } from 'react';
import { MapboxOverlay, type MapboxOverlayProps } from '@deck.gl/mapbox';
import {
    Map,
    type MapProps,
    type MapRef,
    NavigationControl,
    useControl,
    type ViewState,
    type ViewStateChangeEvent,
} from 'react-map-gl/maplibre';
import DrawControl, { getMapDrawer } from './draw-control-maplibre';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import '@mapbox/mapbox-gl-draw/dist/mapbox-gl-draw.css';
import {
    DEFAULT_LOCATE_SUBSTATION_ZOOM_LEVEL,
    INITIAL_CENTERED,
    MapCommonAddons,
    type MapTheme,
    type NetworkMapProps,
    type NetworkMapRef,
    PICKING_RADIUS,
    type TooltipType,
    useClickHandler,
    useDeckGlCommonParameters,
    useDrawControlCommonParameters,
    useMapApi,
    useMapCommonParameters,
    useMapLinesWithType,
} from './network-map-common';

// Small boilerplate recommended by deckgl, to bridge to a react-map-gl control declaratively
// see https://deck.gl/docs/api-reference/mapbox/mapbox-overlay#using-with-react-map-gl
const DeckGLOverlay = forwardRef<MapboxOverlay | undefined, MapboxOverlayProps>((props, ref) => {
    // @ts-expect-error TS2344: Type MapboxOverlay does not satisfy the constraint IControl
    const overlay = useControl<MapboxOverlay>(() => new MapboxOverlay(props));
    overlay.setProps(props); // useControl can reuse an instance of previous render, so update it
    useImperativeHandle(ref, () => overlay, [overlay]);
    return null;
});

const CARTO = 'carto';
const CARTO_NOLABEL = 'cartonolabel';
export type MapLibrary = typeof CARTO | typeof CARTO_NOLABEL;

const LIGHT = 'light';
const DARK = 'dark';

/** get polygon coordinates (features) or an empty object */
function getPolygonFeatures() {
    return getMapDrawer()?.getAll()?.features[0] ?? ({} as Record<string, never>);
}

function getMapStyle(mapLibrary: LiteralUnion<MapLibrary, string>, mapTheme: LiteralUnion<MapTheme, string>) {
    switch (mapLibrary) {
        // https://openmaptiles.org/styles/ ; https://openmaptiles.org/docs/website/maplibre-gl-js/#use-the-openmaptiles-styles
        // https://github.com/CartoDB/basemap-styles ; https://docs.carto.com/carto-for-developers/carto-for-react/guides/basemaps
        case CARTO:
            if (mapTheme === LIGHT) {
                return 'https://basemaps.cartocdn.com/gl/positron-gl-style/style.json';
            } else {
                return 'https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json';
            }
        case CARTO_NOLABEL:
            if (mapTheme === LIGHT) {
                return 'https://basemaps.cartocdn.com/gl/positron-nolabels-gl-style/style.json';
            } else {
                return 'https://basemaps.cartocdn.com/gl/dark-matter-nolabels-gl-style/style.json';
            }
        default:
            return 'https://basemaps.cartocdn.com/gl/positron-gl-style/style.json';
    }
}

export type NetworkMaplibreProps = NetworkMapProps & {
    mapLibrary?: LiteralUnion<MapLibrary, string>;
};

const NetworkMap = forwardRef<NetworkMapRef, NetworkMaplibreProps>(
    (
        {
            // default props
            areFlowsValid,
            arrowsZoomThreshold = 7,
            disabled,
            displayOverlayLoader,
            initialPosition,
            initialZoom,
            isManualRefreshBackdropDisplayed,
            labelsZoomThreshold = 9,
            lineFlowAlertThreshold,
            lineFlowColorMode,
            lineFlowMode,
            lineFullPath,
            lineParallelPath,
            mapLibrary = CARTO,
            tooltipZoomThreshold = 7,
            mapTheme = DARK,
            //triggerMapResizeOnChange = false,
            updatedLines,
            useName,
            visible,
            shouldDisableToolTip,
            locateSubStationZoomLevel = DEFAULT_LOCATE_SUBSTATION_ZOOM_LEVEL,

            onSubstationClick,
            onSubstationClickChooseVoltageLevel,
            onSubstationMenuClick,
            onVoltageLevelMenuClick,
            onLineMenuClick,
            onTieLineMenuClick,
            onHvdcLineMenuClick,
            onManualRefreshClick,
            renderPopover,
            onDrawPolygonModeActive,
            onPolygonChanged = () => {},
            onDrawEvent = () => {},

            centerOnSubstation,
            mapEquipments,
            triggerMapResizeOnChange,
            geoData,
            filteredNominalVoltages,
        },
        ref
    ) => {
        const [labelsVisible, setLabelsVisible] = useState(false);
        const [showLineFlow, setShowLineFlow] = useState(true);
        const [showTooltip, setShowTooltip] = useState(true);
        const mapRef = useRef<MapRef>(); //TODO replaced since v7.? by https://visgl.github.io/react-map-gl/docs/api-reference/mapbox/use-map
        const deckRef = useRef<MapboxOverlay>();
        const [centered, setCentered] = useState(INITIAL_CENTERED);
        const lastViewStateRef = useRef<ViewState>();
        const [tooltip, setTooltip] = useState<TooltipType>();
        const [cursorType, setCursorType] = useState<Property.Cursor>('grab');
        const mapEquipmentsLines = useMapLinesWithType(mapEquipments);

        useEffect(() => {
            if (centerOnSubstation === null) {
                return;
            }
            setCentered({
                lastCenteredSubstation: null,
                centeredSubstationId: centerOnSubstation?.to,
                centered: true,
            });
        }, [centerOnSubstation]);

        // TODO simplify this, now we use Map as the camera controlling component
        // so  we don't need the deckgl ref anymore. The following comments are
        // probably outdated, cleanup everything:
        // Do this in onAfterRender because when doing it in useEffect (triggered by calling setDeck()),
        // it doesn't work in the case of using the browser backward/forward buttons (because in this particular case,
        // we get the ref to the deck and it has not yet initialized..)
        const onAfterRender = useCallback(() => {
            // TODO outdated comment
            //use centered and deck to execute this block only once when the data is ready and deckgl is initialized
            //TODO, replace the next lines with setProps( { initialViewState } ) when we upgrade to 8.1.0
            //see https://github.com/uber/deck.gl/pull/4038
            //This is a hack because it accesses the properties of deck directly but for now it works
            if (
                (!centered.centered ||
                    (centered.centeredSubstationId &&
                        centered.centeredSubstationId !== centered.lastCenteredSubstation)) &&
                geoData !== null
            ) {
                if ((geoData?.substationPositionsById.size ?? 0) > 0) {
                    if (centered.centeredSubstationId) {
                        const geodata = geoData?.substationPositionsById.get(centered.centeredSubstationId);
                        if (!geodata) {
                            return;
                        } // can't center on substation if no coordinate.
                        mapRef.current?.flyTo({
                            center: [geodata.lon, geodata.lat],
                            duration: 2000,
                            // only zoom if the current zoom is smaller than the new one
                            zoom: Math.max(mapRef.current?.getZoom(), locateSubStationZoomLevel),
                            essential: true,
                        });
                        setCentered({
                            lastCenteredSubstation: centered.centeredSubstationId,
                            centeredSubstationId: centered.centeredSubstationId,
                            centered: true,
                        });
                    } else {
                        const coords = Array.from(geoData?.substationPositionsById.entries() ?? []).map((x) => x[1]);
                        const coordsLon = coords.map((x) => x.lon);
                        const maxLon = Math.max(...coordsLon);
                        const minLon = Math.min(...coordsLon);
                        const marginlon = (maxLon - minLon) / 10;
                        const coordLat = coords.map((x) => x.lat);
                        const maxLat = Math.max(...coordLat);
                        const minLat = Math.min(...coordLat);
                        const marginLat = (maxLat - minLat) / 10;
                        mapRef.current?.fitBounds(
                            [
                                [minLon - marginlon / 2, minLat - marginLat / 2],
                                [maxLon + marginlon / 2, maxLat + marginLat / 2],
                            ],
                            { animate: false }
                        );
                        setCentered({ lastCenteredSubstation: null, centered: true });
                    }
                }
            }
        }, [
            centered.centered,
            centered.centeredSubstationId,
            centered.lastCenteredSubstation,
            geoData,
            locateSubStationZoomLevel,
        ]);

        const onViewStateChange = useCallback(
            (info: ViewStateChangeEvent) => {
                lastViewStateRef.current = info.viewState;
                if (
                    // @ts-expect-error TODO TS2339: Property interactionState does not exist on type ViewStateChangeEvent of MapBox & MapLibre
                    !info.interactionState || // first event of before an animation (e.g. clicking the +/- buttons of the navigation controls, gives the target
                    // @ts-expect-error TODO TS2339: Property interactionState does not exist on type ViewStateChangeEvent of MapBox & MapLibre
                    (info.interactionState && !info.interactionState.inTransition) // Any event not part of an animation (mouse panning or zooming)
                ) {
                    if (info.viewState.zoom >= labelsZoomThreshold && !labelsVisible) {
                        setLabelsVisible(true);
                    } else if (info.viewState.zoom < labelsZoomThreshold && labelsVisible) {
                        setLabelsVisible(false);
                    }
                    setShowTooltip(info.viewState.zoom >= tooltipZoomThreshold);
                    setShowLineFlow(info.viewState.zoom >= arrowsZoomThreshold);
                }
            },
            [labelsVisible, arrowsZoomThreshold, labelsZoomThreshold, tooltipZoomThreshold]
        );

        const onClickHandler = useClickHandler(
            onSubstationClick,
            onSubstationClickChooseVoltageLevel,
            onSubstationMenuClick,
            onVoltageLevelMenuClick,
            onLineMenuClick,
            onTieLineMenuClick,
            onHvdcLineMenuClick
        );

        const onMapContextMenu = useCallback<NonNullable<MapProps['onContextMenu']>>(
            (event) => {
                const info = deckRef.current?.pickObject({
                    x: event.point.x,
                    y: event.point.y,
                    radius: PICKING_RADIUS,
                });
                info && onClickHandler(info, event.originalEvent, mapEquipments);
            },
            [onClickHandler, mapEquipments]
        );

        const onDeckGLOverlayClick = useCallback<NonNullable<MapboxOverlayProps['onClick']>>(
            (info, { srcEvent }) => {
                onClickHandler(
                    info,
                    srcEvent instanceof TouchEvent
                        ? new MouseEvent(srcEvent.type, {
                              // TODO manage touchscreen properly because onClickHandler work on (x,y) coordinate which touch events don't have...
                              altKey: srcEvent.altKey,
                              bubbles: srcEvent.bubbles,
                              cancelable: srcEvent.cancelable,
                              composed: srcEvent.composed,
                              ctrlKey: srcEvent.ctrlKey,
                              metaKey: srcEvent.metaKey,
                              detail: srcEvent.detail,
                              view: srcEvent.view,
                              shiftKey: srcEvent.shiftKey,
                              which: srcEvent.which,
                              // haven't found other properties common between dicts defs
                          })
                        : srcEvent,
                    mapEquipments
                );
            },
            [mapEquipments, onClickHandler]
        );

        useEffect(() => {
            mapRef.current?.resize();
        }, [triggerMapResizeOnChange]);

        const mapStyle = useMemo(() => getMapStyle(mapLibrary, mapTheme), [mapLibrary, mapTheme]);

        useMapApi(
            ref,
            mapEquipments,
            mapEquipmentsLines,
            getPolygonFeatures,
            getMapDrawer,
            geoData,
            filteredNominalVoltages,
            setCentered,
            onPolygonChanged,
            onDrawEvent
        );

        const mapProps = useMapCommonParameters(cursorType, initialPosition, initialZoom) satisfies MapProps;
        const drawControlProps = useDrawControlCommonParameters(
            getPolygonFeatures,
            onPolygonChanged,
            onDrawEvent,
            onDrawPolygonModeActive
        );
        const deckGLOverlayProps = useDeckGlCommonParameters(
            mapEquipments,
            mapEquipmentsLines,
            geoData,
            setCursorType,
            setTooltip,
            showTooltip,
            labelsVisible,
            showLineFlow,
            filteredNominalVoltages,
            useName,
            areFlowsValid,
            disabled,
            lineFlowAlertThreshold,
            lineFlowColorMode,
            lineFlowMode,
            lineFullPath,
            lineParallelPath,
            updatedLines,
            visible
        );

        return (
            <Map
                ref={mapRef as RefObject<MapRef>}
                mapLib={maplibregl}
                mapStyle={mapStyle}
                onMove={onViewStateChange}
                onContextMenu={onMapContextMenu}
                {...mapProps}
            >
                <MapCommonAddons
                    displayOverlayLoader={displayOverlayLoader}
                    isManualRefreshBackdropDisplayed={isManualRefreshBackdropDisplayed}
                    onManualRefreshClick={onManualRefreshClick}
                    showTooltip={showTooltip}
                    tooltip={tooltip}
                    shouldDisableToolTip={shouldDisableToolTip}
                    renderPopover={renderPopover}
                />
                <DeckGLOverlay
                    ref={deckRef}
                    onClick={onDeckGLOverlayClick}
                    onAfterRender={onAfterRender} // TODO simplify this
                    {...deckGLOverlayProps}
                />
                {/* visualizePitch true makes the compass reset the pitch when clicked in addition to visualizing it */}
                <NavigationControl visualizePitch={true} />
                <DrawControl {...drawControlProps} />
            </Map>
        );
    }
);
export default NetworkMap;
