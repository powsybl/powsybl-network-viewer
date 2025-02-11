/**
 * Copyright (c) 2024, RTE (http://www.rte-france.com)
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */
import MapboxDraw from '@mapbox/mapbox-gl-draw';
import { useCallback } from 'react';
import { type ControlPosition, useControl } from 'react-map-gl/mapbox';

// type has been removed from react-map-gl or mapbox-gl
type EventedListener = (event?: unknown) => unknown;

let mapDrawerController: MapboxDraw | undefined = undefined;

export function getMapDrawer() {
    return mapDrawerController;
}

const emptyFn = () => {};

export enum DRAW_MODES {
    DRAW_POLYGON = 'draw_polygon',
    DRAW_POINT = 'draw_point',
    SIMPLE_SELECT = 'simple_select',
    DIRECT_SELECT = 'direct_select',
}

export type DrawControlProps = ConstructorParameters<typeof MapboxDraw>[0] & {
    position?: ControlPosition;
    readyToDisplay: boolean;
    onDrawPolygonModeActive: (polygoneDrawing: DRAW_MODES) => void;
    onCreate?: EventedListener;
    onUpdate?: EventedListener;
    onDelete?: EventedListener;
};

export default function DrawControl(props: DrawControlProps) {
    const { onDrawPolygonModeActive } = props;
    const onModeChange = useCallback(
        (e: { mode: DRAW_MODES }) => onDrawPolygonModeActive(e.mode),
        [onDrawPolygonModeActive]
    );

    useControl<MapboxDraw>(
        //onCreate
        () => {
            mapDrawerController = new MapboxDraw({ ...props });
            return mapDrawerController;
        },
        //on add
        ({ map }) => {
            map.on('draw.create', props.onCreate ?? emptyFn);
            map.on('draw.update', props.onUpdate ?? emptyFn);
            map.on('draw.delete', props.onDelete ?? emptyFn);
            map.on('draw.modechange', onModeChange);
        },
        //onRemove
        ({ map }) => {
            map.off('draw.create', props.onCreate ?? emptyFn);
            map.off('draw.update', props.onUpdate ?? emptyFn);
            map.off('draw.delete', props.onDelete ?? emptyFn);
            map.off('draw.modechange', onModeChange);
        },
        { position: props.position }
    );

    return null;
}
