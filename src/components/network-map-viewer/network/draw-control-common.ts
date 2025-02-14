/**
 * Copyright (c) 2024, RTE (http://www.rte-france.com)
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */
import type MapboxDraw from '@mapbox/mapbox-gl-draw';

// type has been removed from react-map-gl or mapbox-gl
export type EventedListener = (event?: unknown) => unknown;

export enum DRAW_MODES {
    DRAW_POLYGON = 'draw_polygon',
    DRAW_POINT = 'draw_point',
    SIMPLE_SELECT = 'simple_select',
    DIRECT_SELECT = 'direct_select',
}

export type DrawControlProps<ControlPosition> = ConstructorParameters<typeof MapboxDraw>[0] & {
    position?: ControlPosition;
    onDrawPolygonModeActive: (polygoneDrawing: DRAW_MODES) => void;
    onCreate?: EventedListener;
    onUpdate?: EventedListener;
    onDelete?: EventedListener;
};
