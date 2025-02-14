/**
 * Copyright (c) 2024, RTE (http://www.rte-france.com)
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */
import MapboxDraw from '@mapbox/mapbox-gl-draw';
import { useCallback } from 'react';
import { type ControlPosition, useControl } from 'react-map-gl/mapbox';
import { DRAW_MODES, type DrawControlProps as DrawControlBaseProps } from './draw-control-common';

let mapDrawerController: MapboxDraw | undefined = undefined;

export function getMapDrawer() {
    return mapDrawerController;
}

const emptyFn = () => {};

export type DrawControlProps = DrawControlBaseProps<ControlPosition>;

export default function DrawControl(props: Readonly<DrawControlProps>) {
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
