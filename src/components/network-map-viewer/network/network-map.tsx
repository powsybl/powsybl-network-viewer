/**
 * Copyright (c) 2020, RTE (http://www.rte-france.com)
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

import type { LiteralUnion } from 'type-fest';
import PropTypes from 'prop-types';
import { forwardRef } from 'react';
import { GeoData } from './geo-data';
import { LineFlowColorMode, LineFlowMode } from './line-layer';
import { MapEquipments } from './map-equipments';
import { type MapTheme, type NetworkMapProps as NetworkMapBaseProps, type NetworkMapRef } from './network-map-common';
import NetworkMapGl from './network-map-mapbox';
import NetworkMapLibre, { type MapLibrary } from './network-map-maplibre';

const MAPBOX = 'mapbox';

/*export type NetworkMapProps = NetworkMapBaseProps & {
    mapLibrary?: LiteralUnion<MapLibrary, string>;
    mapBoxToken?: string;
};*/
export type NetworkMapProps = NetworkMapBaseProps &
    (
        | {
              mapLibrary: typeof MAPBOX;
              mapBoxToken?: string;
          }
        | {
              mapLibrary?: LiteralUnion<MapLibrary, string>;
          }
    );

const NetworkMap = forwardRef<NetworkMapRef, NetworkMapProps>(({ mapLibrary, ...netMapProps }, ref) => {
    return mapLibrary === MAPBOX ? (
        <NetworkMapGl ref={ref} {...netMapProps} />
    ) : (
        <NetworkMapLibre ref={ref} {...netMapProps} mapLibrary={mapLibrary} />
    );
});

NetworkMap.propTypes = {
    disabled: PropTypes.bool,
    geoData: PropTypes.instanceOf(GeoData),
    mapBoxToken: PropTypes.string,
    mapEquipments: PropTypes.instanceOf(MapEquipments),
    mapLibrary: PropTypes.string,
    mapTheme: PropTypes.oneOf<MapTheme>(['light', 'dark']),
    areFlowsValid: PropTypes.bool,
    arrowsZoomThreshold: PropTypes.number,
    centerOnSubstation: PropTypes.any,
    displayOverlayLoader: PropTypes.bool,
    filteredNominalVoltages: PropTypes.array,
    initialPosition: PropTypes.any,
    initialZoom: PropTypes.number,
    isManualRefreshBackdropDisplayed: PropTypes.bool,
    labelsZoomThreshold: PropTypes.number,
    lineFlowAlertThreshold: PropTypes.number,
    lineFlowColorMode: PropTypes.oneOf(Object.values(LineFlowColorMode)),
    lineFlowMode: PropTypes.oneOf(Object.values(LineFlowMode)),
    lineFullPath: PropTypes.bool,
    lineParallelPath: PropTypes.bool,
    renderPopover: PropTypes.func,
    tooltipZoomThreshold: PropTypes.number,
    // With mapboxgl v2 (not a problem with maplibre), we need to call
    // map.resize() when the parent size has changed, otherwise the map is not
    // redrawn. It seems like this is autodetected when the browser window is
    // resized, but not for programmatic resizes of the parent. For now in our
    // app, only study display mode resizes programmatically
    // use this prop to make the map resize when needed, each time this prop changes, map.resize() is trigged
    triggerMapResizeOnChange: PropTypes.any,
    updatedLines: PropTypes.array,
    useName: PropTypes.bool,
    visible: PropTypes.bool,
    shouldDisableToolTip: PropTypes.bool,
    locateSubStationZoomLevel: PropTypes.number,
    onHvdcLineMenuClick: PropTypes.func,
    onLineMenuClick: PropTypes.func,
    onTieLineMenuClick: PropTypes.func,
    onManualRefreshClick: PropTypes.func,
    onSubstationClick: PropTypes.func,
    onSubstationClickChooseVoltageLevel: PropTypes.func,
    onSubstationMenuClick: PropTypes.func,
    onVoltageLevelMenuClick: PropTypes.func,
    onDrawPolygonModeActive: PropTypes.func,
    onPolygonChanged: PropTypes.func,
    onDrawEvent: PropTypes.func,
};

export default NetworkMap;
