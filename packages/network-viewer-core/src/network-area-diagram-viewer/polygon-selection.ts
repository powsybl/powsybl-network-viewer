/**
 * Copyright (c) 2026, RTE (http://www.rte-france.com)
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

import { Path, Point, Polygon, Svg } from '@svgdotjs/svg.js';

const POLYGON_COLOR = '#3bb2d0';

export class PolygonSelection {
    private readonly overlay: HTMLDivElement;
    private readonly polygon: Polygon;
    private readonly dots: Path[];
    private readonly points: Point[] = [];
    private pointer?: MouseEvent;

    constructor(
        private readonly svg: Svg,
        private readonly onClose: (ctrlKey: boolean) => void,
        start?: MouseEvent
    ) {
        this.polygon = svg
            .polygon()
            .fill({ color: POLYGON_COLOR, opacity: 0.1, rule: 'evenodd' })
            .stroke({ color: POLYGON_COLOR, width: 2, dasharray: '6 4' })
            .attr('vector-effect', 'non-scaling-stroke');
        this.dots = [
            { color: POLYGON_COLOR, width: 10 },
            { color: 'white', width: 4 },
        ].map(({ color, width }) =>
            svg.path().stroke({ color, width, linecap: 'round' }).attr('vector-effect', 'non-scaling-stroke')
        );

        this.overlay = document.createElement('div');
        Object.assign(this.overlay.style, { position: 'absolute', inset: '0', cursor: 'crosshair' });
        this.overlay.addEventListener('click', this.handleClick);
        this.overlay.addEventListener('contextmenu', this.handleContextMenu);
        this.overlay.addEventListener('pointermove', this.handlePointerMove);
        this.overlay.addEventListener('wheel', this.handleWheel, { passive: false });
        svg.node.parentElement?.appendChild(this.overlay);
        if (start) {
            this.handleClick(start);
        }
    }

    public stop() {
        this.overlay.remove();
        this.polygon.remove();
        this.dots.forEach((dot) => dot.remove());
    }

    public close(ctrlKey: boolean) {
        if (this.pointer && this.points.length >= 2) {
            this.draw(this.toDiagramPoint(this.pointer));
            this.onClose(ctrlKey);
        }
    }

    public contains(point: Point): boolean {
        return this.polygon.node.isPointInFill(point);
    }

    private readonly handleClick = (event: MouseEvent) => {
        this.points.push(this.toDiagramPoint(event));
        this.draw();
    };

    private readonly handleContextMenu = (event: MouseEvent) => {
        event.preventDefault();
        this.pointer = event;
        this.close(event.ctrlKey);
    };

    private readonly handlePointerMove = (event: PointerEvent) => {
        this.pointer = event;
        if (this.points.length > 0) {
            this.draw(this.toDiagramPoint(event));
        }
    };

    private readonly handleWheel = (event: WheelEvent) => {
        event.preventDefault();
        this.svg.node.dispatchEvent(new WheelEvent(event.type, event));
    };

    private draw(pointer?: Point) {
        const polygonPoints = pointer ? [...this.points, pointer] : this.points;
        this.polygon.plot(polygonPoints.flatMap(({ x, y }) => [x, y]));
        const dotsPath = this.points.map(({ x, y }) => `M${x} ${y}h0`).join('');
        this.dots.forEach((dot) => dot.plot(dotsPath));
    }

    private toDiagramPoint(event: MouseEvent): Point {
        return this.svg.point(event.clientX, event.clientY);
    }
}
