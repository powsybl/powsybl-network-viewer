/**
 * Copyright (c) 2022, RTE (http://www.rte-france.com)
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

import { Point, SVG, Svg, ViewBoxLike } from '@svgdotjs/svg.js';
import '@svgdotjs/svg.panzoom.js';

type DIMENSIONS = { width: number; height: number; viewbox: VIEWBOX };
type VIEWBOX = { x: number; y: number; width: number; height: number };

const SVG_NS = 'http://www.w3.org/2000/svg';

const SWITCH_COMPONENT_TYPES = new Set(['BREAKER', 'DISCONNECTOR', 'LOAD_BREAK_SWITCH']);

const FEEDER_COMPONENT_TYPES = new Set([
    'LINE',
    'LOAD',
    'BATTERY',
    'DANGLING_LINE',
    'TIE_LINE',
    'GENERATOR',
    'VSC_CONVERTER_STATION',
    'LCC_CONVERTER_STATION',
    'HVDC_LINE',
    'CAPACITOR',
    'INDUCTOR',
    'STATIC_VAR_COMPENSATOR',
    'TWO_WINDINGS_TRANSFORMER',
    'TWO_WINDINGS_TRANSFORMER_LEG',
    'THREE_WINDINGS_TRANSFORMER',
    'THREE_WINDINGS_TRANSFORMER_LEG',
    'PHASE_SHIFT_TRANSFORMER',
]);

const BUSBAR_SECTION_TYPES = new Set(['BUSBAR_SECTION']);

const MAX_ZOOM_LEVEL = 10;
const MIN_ZOOM_LEVEL_SUB = 0.1;
const MIN_ZOOM_LEVEL_VL = 0.5;

const ARROW_SVG =
    '<svg width="44" height="44" viewBox="0 0 44 44" fill="none" xmlns="http://www.w3.org/2000/svg"><path class="arrow" fill-rule="evenodd" clip-rule="evenodd" d="M16 24.0163L17.2358 25.3171L21.9837 20.5691L26.7317 25.3171L28 24.0163L21.9837 18L16 24.0163Z"/></svg>';
const ARROW_HOVER_SVG =
    '<svg width="44" height="44" viewBox="0 0 44 44" fill="none" xmlns="http://www.w3.org/2000/svg"><path class="arrow-hover" fill-rule="evenodd" clip-rule="evenodd" d="M22 35C29.1797 35 35 29.1797 35 22C35 14.8203 29.1797 9 22 9C14.8203 9 9 14.8203 9 22C9 29.1797 14.8203 35 22 35ZM17.2358 25.3171L16 24.0163L21.9837 18L28 24.0163L26.7317 25.3171L21.9837 20.5691L17.2358 25.3171Z"/>';

export interface SLDMetadataNode {
    id: string;
    vid: string;
    nextVId: string;
    componentType: string;
    rotationAngle?: number;
    open: boolean;
    direction: string;
    vlabel: boolean;
    equipmentId: string;
}

export interface SLDMetadataComponentSize {
    width: number;
    height: number;
}

export interface SLDMetadataComponent {
    type: string;
    vid: string;
    anchorPoints: unknown[];
    size: SLDMetadataComponentSize;
    transformations: unknown;
    styleClass: string;
}

//models just the metadata subelements that are actually used(nodes)
export interface SLDMetadata {
    components: SLDMetadataComponent[];
    nodes: SLDMetadataNode[];
    wires: unknown[];
    lines: unknown[];
    arrows: unknown[];
    layoutParams: unknown;
}

export type OnNextVoltageCallbackType = (nextVId: string) => void;

export type OnBreakerCallbackType = (breakerId: string, open: boolean, switchElement: SVGElement | null) => void;

export type OnFeederCallbackType = (
    equipmentId: string,
    equipmentType: string | null,
    svgId: string,
    x: number,
    y: number
) => void;

export type OnBusCallbackType = (busId: string, svgId: string, x: number, y: number) => void;

export type OnToggleSldHoverCallbackType = (
    hovered: boolean,
    anchorEl: EventTarget | null,
    equipmentId: string,
    equipmentType: string
) => void;

export class SingleLineDiagramViewer {
    container: HTMLElement;
    svgContent: string;
    svgMetadata: SLDMetadata | null;
    width: number;
    height: number;
    originalWidth: number;
    originalHeight: number;
    onNextVoltageCallback: OnNextVoltageCallbackType | null;
    onBreakerCallback: OnBreakerCallbackType | null;
    onFeederCallback: OnFeederCallbackType | null;
    onBusCallback: OnBusCallbackType | null;
    selectionBackColor: string;
    svgType: string;
    arrowSvg: string;
    arrowHoverSvg: string;
    svgDraw: Svg | undefined;
    onToggleHoverCallback: OnToggleSldHoverCallbackType | null;

    constructor(
        container: HTMLElement,
        svgContent: string,
        svgMetadata: SLDMetadata | null,
        svgType: string,
        minWidth: number,
        minHeight: number,
        maxWidth: number,
        maxHeight: number,
        onNextVoltageCallback: OnNextVoltageCallbackType | null,
        onBreakerCallback: OnBreakerCallbackType | null,
        onFeederCallback: OnFeederCallbackType | null,
        onBusCallback: OnBusCallbackType | null,
        selectionBackColor: string,
        onToggleHoverCallback: OnToggleSldHoverCallbackType | null
    ) {
        this.container = container;
        this.svgType = svgType;
        this.svgContent = svgContent;
        this.svgMetadata = svgMetadata;
        this.onNextVoltageCallback = onNextVoltageCallback;
        this.onBreakerCallback = onBreakerCallback;
        this.onFeederCallback = onFeederCallback;
        this.onBusCallback = onBusCallback;
        this.selectionBackColor = selectionBackColor;
        this.width = 0;
        this.height = 0;
        this.originalWidth = 0;
        this.originalHeight = 0;
        this.init(minWidth, minHeight, maxWidth, maxHeight);
        this.arrowSvg = ARROW_SVG;
        this.arrowHoverSvg = ARROW_HOVER_SVG;
        this.addNavigationArrow();
        this.onToggleHoverCallback = onToggleHoverCallback;
    }

    public setWidth(width: number): void {
        this.width = width;
    }

    public setOriginalWidth(originalWidth: number): void {
        this.originalWidth = originalWidth;
    }

    public setHeight(height: number): void {
        this.height = height;
    }

    public setOriginalHeight(originalHeight: number): void {
        this.originalHeight = originalHeight;
    }

    public setContainer(container: HTMLElement): void {
        this.container = container;
    }

    public setSvgContent(svgContent: string): void {
        this.svgContent = svgContent;
    }

    public getWidth(): number {
        return this.width;
    }

    public getOriginalWidth(): number {
        return this.originalWidth;
    }

    public getHeight(): number {
        return this.height;
    }

    public getOriginalHeight(): number {
        return this.originalHeight;
    }

    public getContainer(): HTMLElement {
        return this.container;
    }

    public getSvgContent(): string {
        return this.svgContent;
    }

    public getViewBox(): ViewBoxLike | undefined {
        return this.svgDraw?.viewbox();
    }

    public setViewBox(viewBox: ViewBoxLike): void {
        if (viewBox !== undefined && viewBox !== null) {
            this.svgDraw?.viewbox(viewBox);
        }
    }

    // this method calculates min/max zooms depending on current sld size, then checks current zoom isn't exceeding any of them
    public refreshZoom(): void {
        // min and max zoom depends on the ratio between client width / height and SVG width / height
        if (!this.getContainer() || this.getContainer().clientWidth === 0 || this.getContainer().clientHeight === 0) {
            // Do nothing if the sld is not displayed and therefor its width and height are equal to zero.
            return;
        }
        const ratioX = this.getWidth() / this.getContainer().clientWidth;
        const ratioY = this.getHeight() / this.getContainer().clientHeight;
        const ratio = Math.max(ratioX, ratioY);

        const minZoom = ratio * (this.svgType === 'voltage-level' ? MIN_ZOOM_LEVEL_VL : MIN_ZOOM_LEVEL_SUB);
        const maxZoom = ratio * MAX_ZOOM_LEVEL;

        if (this.svgDraw) {
            if (this.svgDraw.zoom() > maxZoom) {
                this.svgDraw.zoom(maxZoom);
            }
            if (this.svgDraw.zoom() < minZoom) {
                this.svgDraw.zoom(minZoom);
            }
        }
    }

    public init(minWidth: number, minHeight: number, maxWidth: number, maxHeight: number): void {
        if (!this.container || !this.svgContent) {
            return;
        }

        const dimensions: DIMENSIONS | null = this.getDimensionsFromSvg();

        if (!dimensions) {
            console.warn("cannot·display·the·svg:·couldn't·get·its·size");
            return;
        }

        // clear the previous svg in div element before replacing
        this.container.innerHTML = '';

        this.setOriginalWidth(dimensions.width);
        this.setOriginalHeight(dimensions.height);

        this.setWidth(dimensions.width < minWidth ? minWidth : Math.min(dimensions.width, maxWidth));
        this.setHeight(dimensions.height < minHeight ? minHeight : Math.min(dimensions.height, maxHeight));
        const draw = SVG()
            .addTo(this.container)
            .size(this.width, this.height)
            .viewbox(dimensions.viewbox.x, dimensions.viewbox.y, dimensions.viewbox.width, dimensions.viewbox.height)
            .panZoom({
                panning: true,
                zoomMin: this.svgType === 'voltage-level' ? MIN_ZOOM_LEVEL_VL : MIN_ZOOM_LEVEL_SUB,
                zoomMax: MAX_ZOOM_LEVEL,
                zoomFactor: this.svgType === 'voltage-level' ? 0.3 : 0.15,
                margins: { top: 100, left: 100, right: 100, bottom: 100 },
            });

        const drawnSvg: HTMLElement = draw.svg(this.svgContent).node.firstElementChild as HTMLElement;

        drawnSvg.style.overflow = 'visible';
        // PowSyBl SLD introduced server side calculated SVG viewbox. This viewBox attribute can be removed as it is copied in the panzoom svg tag.
        const firstChild: HTMLElement = draw.node.firstChild as HTMLElement;
        firstChild.removeAttribute('viewBox');
        firstChild.removeAttribute('width');
        firstChild.removeAttribute('height');

        const svgWidth = dimensions.width;
        const svgHeight = dimensions.height;
        if (svgWidth > maxWidth || svgHeight > maxHeight) {
            //The svg is too big, display only the top left corner because that's
            //better for users than zooming out. Keep the same aspect ratio
            //so that panzoom's margins still work correctly.
            //I am not sure the offsetX and offsetY thing is correct. It seems
            //to help. When someone finds a big problem, then we can fix it.
            const newLvlX = svgWidth / maxWidth;
            const newLvlY = svgHeight / maxHeight;

            const xOrigin = dimensions.viewbox.x;
            const yOrigin = dimensions.viewbox.y;

            if (newLvlX > newLvlY) {
                const offsetY = (maxHeight - svgHeight) / newLvlX;
                draw.zoom(1, new Point(xOrigin, (yOrigin + maxHeight - offsetY) / 2));
            } else {
                const offsetX = (maxWidth - svgWidth) / newLvlY;
                draw.zoom(1, new Point((xOrigin + maxWidth - offsetX) / 2, yOrigin));
            }
        }

        draw.on('panStart', function () {
            drawnSvg.style.cursor = 'move';
        });
        draw.on('panEnd', function () {
            drawnSvg.style.cursor = 'default';
        });

        this.addSwitchesHandler();
        this.addFeedersHandler();
        this.addEquipmentsPopover();
        this.addBusHandler();
        this.svgDraw = draw;
    }

    public getDimensionsFromSvg(): DIMENSIONS | null {
        // Dimensions are set in the main svg tag attributes. We want to parse those data without loading the whole svg in the DOM.
        const result = this.svgContent.match('<svg[^>]*>');
        if (result === null || result.length === 0) {
            return null;
        }
        const emptiedSvgContent = result[0] + '</svg>';
        const svg: SVGSVGElement = new DOMParser()
            .parseFromString(emptiedSvgContent, 'image/svg+xml')
            .getElementsByTagName('svg')[0];
        const viewbox: VIEWBOX = svg.viewBox.baseVal;
        viewbox.x -= 20;
        viewbox.y -= 20;
        viewbox.width += 40;
        viewbox.height += 40;
        let width = Number(svg.getAttribute('width'));
        let height = Number(svg.getAttribute('height'));
        width = width == 0 ? viewbox.width : width + 40;
        height = height == 0 ? viewbox.height : height + 40;
        return { width: width, height: height, viewbox: viewbox };
    }

    private addNavigationArrow() {
        if (this.onNextVoltageCallback !== null) {
            let navigable = this.svgMetadata?.nodes.filter((el) => el.nextVId);
            let vlList = this.svgMetadata?.nodes.map((element) => element.vid);
            vlList = vlList?.filter((element, index) => element !== '' && vlList?.indexOf(element) === index);

            //remove arrows if the arrow points to the current svg
            navigable = navigable?.filter((element) => {
                return vlList?.indexOf(element.nextVId) === -1;
            });

            const highestY = new Map();
            const lowestY = new Map();
            let y;

            navigable?.forEach((element) => {
                const elementById: HTMLElement | null = this.container.querySelector('#' + element.id);
                if (elementById != null) {
                    const transform: string[] | undefined = elementById?.getAttribute('transform')?.split(',');

                    const ys = transform?.[1]?.match(/\d+/)?.[0];
                    if (ys !== undefined) {
                        y = parseInt(ys, 10);
                        if (highestY.get(element.vid) === undefined || y > highestY.get(element.vid)) {
                            highestY.set(element.vid, y);
                        }
                        if (lowestY.get(element.vid) === undefined || y < lowestY.get(element.vid)) {
                            lowestY.set(element.vid, y);
                        }
                    }
                }
            });

            navigable?.forEach((element) => {
                const elementById: HTMLElement | null = this.container.querySelector('#' + element.id);
                if (elementById != null) {
                    const transform: string[] | undefined = elementById?.getAttribute('transform')?.split(',');
                    const xs = transform?.[0]?.match(/\d+/)?.[0];
                    if (xs !== undefined) {
                        const x = parseInt(xs, 10);
                        const feederWidth =
                            this.svgMetadata?.components.find((comp) => comp.type === element.componentType)?.size
                                .width || 0;
                        this.createSvgArrow(
                            elementById,
                            element.direction,
                            x + feederWidth / 2,
                            highestY.get(element.vid),
                            lowestY.get(element.vid)
                        );
                    }
                }
            });
        }
    }

    private setArrowsStyle = (target: SVGElement, color1: string, color2: string) => {
        const pe1 = target.querySelector('.arrow') as SVGPathElement;
        const pe2 = target.querySelector('.arrow-hover') as SVGPathElement;
        if (pe1 !== null) {
            pe1.style.fill = color1;
        }
        if (pe2 !== null) {
            pe2.style.fill = color2;
        }
    };

    private createSvgArrow(element: HTMLElement, position: string, x: number, highestY: number, lowestY: number) {
        const svgInsert: HTMLElement | null = element?.parentElement;
        if (svgInsert !== undefined && svgInsert !== null) {
            const group = document.createElementNS(SVG_NS, 'g');
            const svgMetadata = this.svgMetadata;
            let y;

            if (position === 'TOP') {
                y = lowestY - 65;
                x = x - 22;
            } else {
                y = highestY + 65;
                x = x + 22;
            }

            if (position === 'BOTTOM') {
                group.setAttribute('transform', 'translate(' + x + ',' + y + ') rotate(180)');
            } else {
                group.setAttribute('transform', 'translate(' + x + ',' + y + ')');
            }

            group.innerHTML = this.arrowSvg + this.arrowHoverSvg;
            svgInsert.appendChild(group);

            // handling the navigation between voltage levels
            group.style.cursor = 'pointer';
            this.setArrowsStyle(group, 'currentColor', this.selectionBackColor);
            let dragged = false;
            group.addEventListener('mousedown', () => {
                dragged = false;
            });
            group.addEventListener('mousemove', () => {
                dragged = true;
            });
            group.addEventListener('mouseup', (event) => {
                if (dragged || event.button !== 0) {
                    return;
                }
                const meta = svgMetadata?.nodes.find((other) => other.id === element.id);
                if (meta !== undefined && meta !== null) {
                    this.onNextVoltageCallback?.(meta.nextVId);
                }
            });

            //handling the color changes when hovering
            group.addEventListener('mouseenter', (e: Event) => {
                this.setArrowsStyle(e.target as SVGElement, this.selectionBackColor, 'currentColor');
            });

            group.addEventListener('mouseleave', (e: Event) => {
                this.setArrowsStyle(e.target as SVGElement, 'currentColor', this.selectionBackColor);
            });
        }
    }

    private addSwitchesHandler() {
        // handling the click on a switch
        if (this.onBreakerCallback != null) {
            const switches = this.svgMetadata?.nodes.filter((element) =>
                SWITCH_COMPONENT_TYPES.has(element.componentType)
            );
            switches?.forEach((aSwitch) => {
                const domEl: HTMLElement | null = this.container.querySelector('#' + aSwitch.id);
                if (domEl !== null) {
                    domEl.style.cursor = 'pointer';
                    let dragged = false;
                    domEl.addEventListener('mousedown', () => {
                        dragged = false;
                    });
                    domEl.addEventListener('mousemove', () => {
                        dragged = true;
                    });
                    domEl.addEventListener('mouseup', (event) => {
                        if (dragged || event.button !== 0) {
                            return;
                        }
                        const switchId = aSwitch.equipmentId;
                        const open = aSwitch.open;
                        this.onBreakerCallback?.(switchId, !open, event.currentTarget as SVGElement);
                    });
                }
            });
        }
    }

    private addFeederSelectionRect(svgText: SVGTextElement, backgroundColor: string) {
        svgText.style.setProperty('fill', backgroundColor);
        const selectionBackgroundColor = 'currentColor';
        const selectionPadding = 4;
        const bounds = svgText.getBBox();
        const selectionRect = document.createElementNS(SVG_NS, 'rect');
        selectionRect.setAttribute('class', 'sld-label-selection');
        const style: CSSStyleDeclaration = getComputedStyle(svgText);
        const padding_top = parseInt(style.paddingTop);
        const padding_left = parseInt(style.paddingLeft);
        const padding_right = parseInt(style.paddingRight);
        const padding_bottom = parseInt(style.paddingBottom);
        selectionRect.setAttribute('stroke-width', '0');
        selectionRect.setAttribute('x', (bounds.x - padding_left - selectionPadding).toString());
        selectionRect.setAttribute('y', (bounds.y - padding_top - selectionPadding).toString());
        selectionRect.setAttribute(
            'width',
            (bounds.width + padding_left + padding_right + 2 * selectionPadding).toString()
        );
        selectionRect.setAttribute(
            'height',
            (bounds.height + padding_top + padding_bottom + 2 * selectionPadding).toString()
        );
        selectionRect.setAttribute('fill', selectionBackgroundColor);
        selectionRect.setAttribute('rx', selectionPadding.toString());
        if (svgText.hasAttribute('transform')) {
            const transformAttribute = svgText.getAttribute('transform');
            if (transformAttribute !== null) {
                selectionRect.setAttribute('transform', transformAttribute);
            }
        }
        svgText.parentNode?.insertBefore(selectionRect, svgText);
    }

    private addFeedersHandler() {
        // handling the right click on a feeder (menu)
        if (this.onFeederCallback != null) {
            const showFeederSelection = (svgText: SVGTextElement, colorSelected: string) => {
                if (svgText.parentElement !== null) {
                    if (svgText.parentElement.getElementsByClassName('sld-label-selection').length === 0) {
                        this.addFeederSelectionRect(svgText, colorSelected);
                    }
                }
            };

            const hideFeederSelection = (svgText: SVGTextElement) => {
                svgText.style.removeProperty('fill');
                if (svgText.parentElement !== null && svgText.parentNode !== null) {
                    const selectionRect = svgText.parentElement.getElementsByClassName('sld-label-selection');
                    if (selectionRect.length !== 0) {
                        svgText.parentNode.removeChild(selectionRect[0]);
                    }
                }
            };

            const feeders = this.svgMetadata?.nodes.filter((element) => {
                return element.vid !== '' && FEEDER_COMPONENT_TYPES.has(element.componentType);
            });
            feeders?.forEach((feeder) => {
                const svgText: SVGTextElement | null | undefined = this.container
                    ?.querySelector('#' + feeder.id)
                    ?.querySelector('text[class="sld-label"]');
                if (svgText !== undefined && svgText !== null) {
                    svgText.style.cursor = 'pointer';
                    svgText.addEventListener('mouseenter', () => {
                        showFeederSelection(svgText, this.selectionBackColor);
                    });
                    svgText.addEventListener('mouseleave', () => {
                        hideFeederSelection(svgText);
                    });
                    svgText.addEventListener('contextmenu', (event) => {
                        event.preventDefault();
                        event.stopPropagation();
                        this.onFeederCallback?.(feeder.equipmentId, feeder.componentType, feeder.id, event.x, event.y);
                    });
                }
            });
        }
    }

    private addEquipmentsPopover() {
        this.svgMetadata?.nodes?.forEach((equipment) => {
            const svgEquipment = this.container?.querySelector('#' + equipment.id);
            svgEquipment?.addEventListener('mouseover', (event) => {
                this.onToggleHoverCallback?.(true, event.currentTarget, equipment.equipmentId, equipment.componentType);
            });
            svgEquipment?.addEventListener('mouseout', () => {
                this.onToggleHoverCallback?.(false, null, '', '');
            });
        });
    }

    private addBusHandler() {
        const buses = this.svgMetadata?.nodes.filter((element) => BUSBAR_SECTION_TYPES.has(element.componentType));
        buses?.forEach((bus) => {
            const svgBus: HTMLElement | null = this.container?.querySelector('#' + bus.id);
            if (svgBus) {
                svgBus.style.cursor = 'pointer';
                svgBus.addEventListener('contextmenu', (event) => {
                    event.preventDefault();
                    event.stopPropagation();
                    this.onBusCallback?.(bus.equipmentId, bus.id, event.x, event.y);
                });
            }
        });
    }
}
