/**
 * Copyright (c) 2024, RTE (http://www.rte-france.com)
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */
import MapboxDraw from '@mapbox/mapbox-gl-draw';
import type { IControl as MapLibreControl } from 'maplibre-gl';
import { forwardRef, useCallback, useImperativeHandle } from 'react';
import { type ControlPosition, useControl } from 'react-map-gl/mapbox-legacy';
import { useControl as useMapLibreControl } from 'react-map-gl/maplibre';

// type has been removed from react-map-gl or mapbox-gl
type EventedListener = (event?: unknown) => unknown;

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

type DrawControlListener = EventedListener | ((event: { mode: DRAW_MODES }) => void);

type DrawControlHook = (
    onCreate: () => MapboxDraw,
    onAdd: (context: { map: { on: (type: string, listener: DrawControlListener) => unknown } }) => void,
    onRemove: (context: { map: { off: (type: string, listener: DrawControlListener) => unknown } }) => void,
    options: { position?: ControlPosition }
) => MapboxDraw;

const useMapLibreDrawControl: DrawControlHook = (onCreate, onAdd, onRemove, options) =>
    useMapLibreControl(() => onCreate() as MapboxDraw & MapLibreControl, onAdd, onRemove, options);

const createDrawControl = (useAdapterControl: DrawControlHook) =>
    forwardRef((props: DrawControlProps, ref) => {
        const { onDrawPolygonModeActive } = props;
        const onModeChange = useCallback(
            (e: { mode: DRAW_MODES }) => onDrawPolygonModeActive(e.mode),
            [onDrawPolygonModeActive]
        );

        const mapDrawerController = useAdapterControl(
            //onCreate
            () => new MapboxDraw({ ...props }),
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

        useImperativeHandle(ref, () => mapDrawerController, [mapDrawerController]);

        return null;
    });

export const DrawControl = createDrawControl(useControl);
export const MapLibreDrawControl = createDrawControl(useMapLibreDrawControl);

export default DrawControl;
