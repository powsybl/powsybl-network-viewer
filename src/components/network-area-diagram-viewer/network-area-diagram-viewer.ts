/**
 * Copyright (c) 2022-2024, RTE (http://www.rte-france.com)
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

import { Point, SVG, ViewBoxLike, Svg } from '@svgdotjs/svg.js';
import '@svgdotjs/svg.panzoom.js';
import * as DiagramUtils from './diagram-utils';
import { SvgParameters, EdgeInfoEnum, CssLocationEnum } from './svg-parameters';
import { LayoutParameters } from './layout-parameters';
import {
    DiagramMetadata,
    EdgeMetadata,
    BusNodeMetadata,
    NodeMetadata,
    TextNodeMetadata,
    InjectionMetadata,
} from './diagram-metadata';
import { debounce } from '@mui/material';

export type BranchState = {
    branchId: string;
    value1: number | string;
    value2: number | string;
    connected1: boolean;
    connected2: boolean;
    connectedBus1: string;
    connectedBus2: string;
};
export type VoltageLevelState = {
    voltageLevelId: string;
    busValue: {
        busId: string;
        voltage: number;
        angle: number;
    }[];
};
export type OnMoveNodeCallbackType = (
    equipmentId: string,
    nodeId: string,
    x: number,
    y: number,
    XOrig: number,
    yOrig: number
) => void;

export type OnMoveTextNodeCallbackType = (
    equipmentId: string,
    vlNodeId: string,
    textNodeId: string,
    shiftX: number,
    shiftY: number,
    shiftXOrig: number,
    shiftYOrig: number,
    connectionShiftX: number,
    connectionShiftY: number,
    connectionShiftXOrig: number,
    connectionShiftYOrig: number
) => void;

export type OnSelectNodeCallbackType = (equipmentId: string, nodeId: string, mousePosition: Point) => void;

export type OnToggleNadHoverCallbackType = (
    hovered: boolean,
    mousePosition: Point | null,
    equipmentId: string,
    equipmentType: string
) => void;

export type OnRightClickCallbackType = (
    svgId: string,
    equipmentId: string,
    equipmentType: string,
    mousePosition: Point
) => void;

// update css rules when zoom changes by this amount. This allows to not
// update when only translating (when translating, round errors lead to
// epsilon changes in the float values), or not too often a bit when smooth
// scrolling (the update may be entirely missed when smooth scrolling if
// you don't go over the threshold but that's ok, the user doesn't see rule
// threshold values so he will continue to zoom in or out to trigger the
// rule update. Using a debounce that ensure the last update is done
// eventually may be even worse as it could introduce flicker after the
// delay after the last zoom change.  We need a value that gives good
// performance but doesn't change the user experience
const dynamicCssRulesUpdateThreshold = 0.01;

export class NetworkAreaDiagramViewer {
    static readonly DEFAULT_PNG_BACKGROUND_COLOR = 'white';

    container: HTMLElement;
    svgDiv: HTMLElement;
    svgContent: string;
    diagramMetadata: DiagramMetadata | null;
    width: number;
    height: number;
    originalWidth: number;
    originalHeight: number;
    svgDraw: Svg | undefined;
    ratio = 1;
    selectedElement: SVGGraphicsElement | null = null;
    draggedElement: SVGGraphicsElement | null = null;
    transform: SVGTransform | undefined;
    ctm: DOMMatrix | null | undefined = null;
    initialPosition: Point = new Point(0, 0);
    svgParameters: SvgParameters;
    layoutParameters: LayoutParameters;
    edgeAngles: Map<string, number> = new Map<string, number>();
    textNodeSelected: boolean = false;
    enableDragInteraction: boolean = false;
    isDragging: boolean = false;
    endTextEdge: Point = new Point(0, 0);
    onMoveNodeCallback: OnMoveNodeCallbackType | null;
    onMoveTextNodeCallback: OnMoveTextNodeCallbackType | null;
    onSelectNodeCallback: OnSelectNodeCallbackType | null;
    onToggleHoverCallback: OnToggleNadHoverCallbackType | null;
    previousMaxDisplayedSize: number;
    edgesMap: Map<string, EdgeMetadata> = new Map<string, EdgeMetadata>();
    onRightClickCallback: OnRightClickCallbackType | null;
    originalNodePosition: Point = new Point(0, 0);
    originalTextNodeShift: Point = new Point(0, 0);
    originalTextNodeConnectionShift: Point = new Point(0, 0);
    lastZoomLevel: number = 0;
    zoomLevels: number[] = [0, 1000, 2200, 2500, 3000, 4000, 9000, 12000, 20000];

    static readonly ZOOM_CLASS_PREFIX = 'nad-zoom-';

    /**
     * @param container - The HTML element that will contain the SVG diagram.
     * @param svgContent - The SVG content to be rendered in the viewer.
     * @param diagramMetadata - Metadata associated with the diagram, including nodes, edges, and other properties.
     * @param minWidth - The minimum width of the viewer.
     * @param minHeight - The minimum height of the viewer.
     * @param maxWidth - The maximum width of the viewer.
     * @param maxHeight - The maximum height of the viewer.
     * @param onMoveNodeCallback - Callback function triggered when a node is moved.
     * @param onMoveTextNodeCallback - Callback function triggered when a text node is moved.
     * @param onSelectNodeCallback - Callback function triggered when a node is selected.
     * @param enableDragInteraction - Whether dragging interaction on node or label is enabled.
     * @param enableLevelOfDetail - Whether level-of-detail rendering is enabled based on zoom level.
     * @param zoomLevels - Array of zoom levels used to determine level-of-detail rendering by applying corresponding
     *                     css class 'nad-zoom-{level}' to 'svg' element. If null, default zoom levels are used.
     * @param onToggleHoverCallback - Callback function triggered when hovering over a node or edge.
     * @param onRightClickCallback - Callback function triggered when right-clicking on a node or edge.
     * @param addButtons - Whether to add zoom control buttons (zoom in, zoom out, zoom to fit) to the viewer.
     */
    constructor(
        container: HTMLElement,
        svgContent: string,
        diagramMetadata: DiagramMetadata | null,
        minWidth: number,
        minHeight: number,
        maxWidth: number,
        maxHeight: number,
        onMoveNodeCallback: OnMoveNodeCallbackType | null,
        onMoveTextNodeCallback: OnMoveTextNodeCallbackType | null,
        onSelectNodeCallback: OnSelectNodeCallbackType | null,
        enableDragInteraction: boolean,
        enableLevelOfDetail: boolean,
        zoomLevels: number[] | null,
        onToggleHoverCallback: OnToggleNadHoverCallbackType | null,
        onRightClickCallback: OnRightClickCallbackType | null,
        addButtons: boolean
    ) {
        this.container = container;
        this.svgDiv = document.createElement('div');
        this.svgDiv.id = 'svg-container';
        this.svgContent = this.fixSvgContent(svgContent);
        this.diagramMetadata = diagramMetadata;
        this.width = 0;
        this.height = 0;
        this.originalWidth = 0;
        this.originalHeight = 0;
        this.onRightClickCallback = onRightClickCallback;
        if (zoomLevels != null) this.zoomLevels = zoomLevels;
        this.zoomLevels.sort((a, b) => b - a);
        this.init(minWidth, minHeight, maxWidth, maxHeight, enableLevelOfDetail, diagramMetadata !== null, addButtons);
        this.svgParameters = new SvgParameters(diagramMetadata?.svgParameters);
        this.layoutParameters = new LayoutParameters(diagramMetadata?.layoutParameters);
        this.onMoveNodeCallback = onMoveNodeCallback;
        this.onMoveTextNodeCallback = onMoveTextNodeCallback;
        this.onSelectNodeCallback = onSelectNodeCallback;
        this.onToggleHoverCallback = onToggleHoverCallback;
        this.previousMaxDisplayedSize = 0;
        this.enableDragInteraction = enableDragInteraction;
    }

    private fixSvgContent(svgContent: string): string {
        // fix span in text boxes, for avoiding to include the following text
        return svgContent.replace(/(<span class=".*")(\/>)/g, '$1></span>');
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
        this.svgContent = this.fixSvgContent(svgContent);
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
        this.svgDraw?.viewbox(viewBox);
    }

    public setPreviousMaxDisplayedSize(previousMaxDisplayedSize: number): void {
        this.previousMaxDisplayedSize = previousMaxDisplayedSize;
    }

    public getPreviousMaxDisplayedSize(): number {
        return this.previousMaxDisplayedSize;
    }

    private getNodeIdFromEquipmentId(equipmentId: string) {
        const node: NodeMetadata | undefined = this.diagramMetadata?.nodes.find(
            (node) => node.equipmentId == equipmentId
        );
        return node?.svgId || null;
    }

    private getTextNodeIdFromEquipmentId(equipmentId: string) {
        const node: TextNodeMetadata | undefined = this.diagramMetadata?.textNodes.find(
            (node) => node.equipmentId == equipmentId
        );
        return node?.svgId || null;
    }

    public moveNodeToCoordinates(equipmentId: string, x: number, y: number) {
        const nodeId = this.getNodeIdFromEquipmentId(equipmentId);
        if (nodeId != null) {
            const elemToMove: SVGGraphicsElement | null = this.svgDiv.querySelector('[id="' + nodeId + '"]');
            if (elemToMove) {
                // update metadata only
                this.updateNodeMetadata(elemToMove, new Point(x, y));
                // update and redraw element
                this.updateElement(elemToMove);
            }
        }
    }

    public moveTextNodeToCoordinates(
        equipmentId: string,
        shiftX: number,
        shiftY: number,
        connectionShiftX: number,
        connectionShiftY: number
    ) {
        const nodeId = this.getNodeIdFromEquipmentId(equipmentId);
        if (nodeId == null) {
            return;
        }
        const nodeElement: SVGGraphicsElement | null = this.svgDiv.querySelector('[id="' + nodeId + '"]');
        if (!nodeElement) {
            return;
        }
        const nodePosition: Point = DiagramUtils.getPosition(nodeElement);

        const textnodeId = this.getTextNodeIdFromEquipmentId(equipmentId);
        if (textnodeId == null) {
            return;
        }
        const elemToMove: SVGGraphicsElement | null = this.svgDiv.querySelector('[id="' + textnodeId + '"]');
        if (!elemToMove) {
            return;
        }
        this.endTextEdge = new Point(nodePosition.x + connectionShiftX, nodePosition.y + connectionShiftY);

        const textNodeTopLeftCornerPosition = new Point(nodePosition.x + shiftX, nodePosition.y + shiftY);

        // update metadata only
        this.updateTextNodeMetadata(elemToMove, textNodeTopLeftCornerPosition);

        //update and redraw element
        this.updateElement(elemToMove);
    }

    private hasNodeInteraction(): boolean {
        return this.enableDragInteraction || this.onRightClickCallback != null || this.onSelectNodeCallback != null;
    }

    public init(
        minWidth: number,
        minHeight: number,
        maxWidth: number,
        maxHeight: number,
        enableLevelOfDetail: boolean,
        hasMetadata: boolean,
        addButtons: boolean
    ): void {
        if (!this.container || !this.svgContent) {
            return;
        }

        const dimensions: DiagramUtils.Dimensions | null = this.getDimensionsFromSvg();
        if (!dimensions) {
            return;
        }

        // clear the previous svg in div element before replacing
        this.container.innerHTML = '';

        // add nad viewer div
        const nadViewerDiv = document.createElement('div');
        nadViewerDiv.id = 'nad-viewer';
        nadViewerDiv.style.position = 'relative';
        this.container.appendChild(nadViewerDiv);

        // add buttons bar div
        if (addButtons) {
            nadViewerDiv.appendChild(this.getZoomButtonsBar());
            nadViewerDiv.appendChild(this.getActionButtonsBar());
        }

        // add svg div
        nadViewerDiv.appendChild(this.svgDiv);

        // set dimensions
        this.setOriginalWidth(dimensions.width);
        this.setOriginalHeight(dimensions.height);
        this.setWidth(dimensions.width < minWidth ? minWidth : Math.min(dimensions.width, maxWidth));
        this.setHeight(dimensions.height < minHeight ? minHeight : Math.min(dimensions.height, maxHeight));

        // set the SVG
        this.svgDraw = SVG()
            .addTo(this.svgDiv)
            .size(this.width, this.height)
            .viewbox(dimensions.viewbox.x, dimensions.viewbox.y, dimensions.viewbox.width, dimensions.viewbox.height);
        const drawnSvg: HTMLElement = <HTMLElement>this.svgDraw.svg(this.svgContent).node.firstElementChild;
        drawnSvg.style.overflow = 'visible';

        // add events
        if (this.hasNodeInteraction() && hasMetadata) {
            this.svgDraw.on('mousedown', (e: Event) => {
                if ((e as MouseEvent).button == 0) {
                    this.onMouseLeftDown(e as MouseEvent);
                }
            });
            this.svgDraw.on('mousemove', (e: Event) => {
                this.onMouseMove(e as MouseEvent);
            });
            this.svgDraw.on('mouseup mouseleave', (e: Event) => {
                if ((e as MouseEvent).button == 0) {
                    this.onMouseLeftUpOrLeave(e as MouseEvent);
                }
            });
        }
        if (hasMetadata) {
            this.svgDraw.on('mouseover', (e: Event) => {
                this.onHover(e as MouseEvent);
            });

            this.svgDraw.on('mouseout', () => {
                this.onToggleHoverCallback?.(false, null, '', '');
            });
        }
        if (this.onRightClickCallback != null && hasMetadata) {
            this.svgDraw.on('mousedown', (e: Event) => {
                if ((e as MouseEvent).button == 2) {
                    this.onMouseRightDown(e as MouseEvent);
                }
            });
        }
        this.svgDraw.on('panStart', function () {
            if (drawnSvg.parentElement != undefined) {
                drawnSvg.parentElement.style.cursor = 'move';
            }
        });
        this.svgDraw.on('panEnd', function () {
            if (drawnSvg.parentElement != undefined) {
                drawnSvg.parentElement.style.removeProperty('cursor');
            }
        });

        // add pan and zoom to the SVG
        // we check if there is an "initial zoom" by checking ratio of width and height of the nad compared with viewBox sizes
        const widthRatio = dimensions.viewbox.width / this.getWidth();
        const heightRatio = dimensions.viewbox.height / this.getHeight();
        this.ratio = Math.max(widthRatio, heightRatio);
        this.enablePanzoom();
        // PowSyBl NAD introduced server side calculated SVG viewbox. This viewBox attribute can be removed as it is copied in the panzoom svg tag.
        const firstChild: HTMLElement = <HTMLElement>this.svgDraw.node.firstChild;
        firstChild.removeAttribute('viewBox');
        firstChild.removeAttribute('width');
        firstChild.removeAttribute('height');

        if (enableLevelOfDetail) {
            this.svgDraw.fire('zoom'); // Forces a new dynamic zoom check to correctly update the dynamic CSS

            // We add an observer to track when the SVG's viewBox is updated by panzoom
            // (we have to do this instead of using panzoom's 'zoom' event to have accurate viewBox updates)
            const targetNode: SVGSVGElement = this.svgDraw.node;
            this.checkAndUpdateLevelOfDetail(targetNode);
            // Callback function to execute when mutations are observed
            const observerCallback = (mutationList: MutationRecord[]) => {
                for (const mutation of mutationList) {
                    if (mutation.attributeName === 'viewBox') {
                        this.checkAndUpdateLevelOfDetail(targetNode);
                    }
                }
            };

            // Create a debounced version of the observer callback to limit the frequency of calls when the 'viewBox' attribute changes,
            // particularly during zooming operations, improving performance and avoiding redundant updates.
            const debouncedObserverCallback = debounce(observerCallback, 50);
            const observer = new MutationObserver(debouncedObserverCallback);
            observer.observe(targetNode, { attributeFilter: ['viewBox'] });
        }

        if (this.hasNodeInteraction() && hasMetadata) {
            // fill empty elements: unknown buses and three windings transformers
            const emptyElements: NodeListOf<SVGGraphicsElement> = this.svgDiv.querySelectorAll(
                '.nad-unknown-busnode, .nad-3wt-nodes .nad-winding'
            );
            emptyElements.forEach((emptyElement) => {
                emptyElement.style.fill = '#0000';
            });
        }
        if (this.onRightClickCallback != null && hasMetadata) {
            // fill empty branch elements: two windings transformers
            const emptyElements: NodeListOf<SVGGraphicsElement> = this.svgDiv.querySelectorAll(
                '.nad-branch-edges .nad-winding'
            );
            emptyElements.forEach((emptyElement) => {
                emptyElement.style.fill = '#0000';
            });
        }
    }

    private getZoomButtonsBar(): HTMLDivElement {
        const buttonsDiv = document.createElement('div');
        buttonsDiv.id = 'zoom-buttons-bars';
        buttonsDiv.style.display = 'inline-grid';
        buttonsDiv.style.alignItems = 'center';
        buttonsDiv.style.position = 'absolute';
        buttonsDiv.style.left = '6px';
        buttonsDiv.style.bottom = '6px';

        const zoomInButton = DiagramUtils.getZoomInButton();
        buttonsDiv.appendChild(zoomInButton);
        zoomInButton.addEventListener('click', () => {
            this.zoomIn();
        });
        const zoomOutButton = DiagramUtils.getZoomOutButton();
        buttonsDiv.appendChild(zoomOutButton);
        zoomOutButton.addEventListener('click', () => {
            this.zoomOut();
        });
        const zoomToFitButton = DiagramUtils.getZoomToFitButton();
        buttonsDiv.appendChild(zoomToFitButton);
        zoomToFitButton.addEventListener('click', () => {
            this.zoomToFit();
        });

        return buttonsDiv;
    }

    private getActionButtonsBar(): HTMLDivElement {
        const buttonsDiv = document.createElement('div');
        buttonsDiv.id = 'action-buttons-bars';
        buttonsDiv.style.display = 'flex';
        buttonsDiv.style.alignItems = 'center';
        buttonsDiv.style.position = 'absolute';
        buttonsDiv.style.left = '6px';
        buttonsDiv.style.top = '6px';

        const saveSvgButton = DiagramUtils.getSaveSvgButton();
        buttonsDiv.appendChild(saveSvgButton);
        saveSvgButton.addEventListener('click', () => {
            this.saveSvg();
        });
        const savePngButton = DiagramUtils.getSavePngButton();
        buttonsDiv.appendChild(savePngButton);
        savePngButton.addEventListener('click', () => {
            this.savePng(NetworkAreaDiagramViewer.DEFAULT_PNG_BACKGROUND_COLOR);
        });
        navigator.permissions
            .query({ name: 'clipboard-write' as PermissionName })
            .then((result) => {
                if (result.state == 'granted' || result.state == 'prompt') {
                    this.addScreenshotButton(buttonsDiv, true);
                } else {
                    console.warn('Write access to clipboard not granted');
                    this.addScreenshotButton(buttonsDiv, false);
                }
            })
            .catch((err) => {
                // Firefox does not support clipboard-write permission
                console.warn('clipboard-write permission not supported: ' + err);
                // add button based on clipboard availability
                if (navigator.clipboard) {
                    this.addScreenshotButton(buttonsDiv, true);
                } else {
                    console.warn('Navigator clipboard not available');
                    this.addScreenshotButton(buttonsDiv, false);
                }
            });

        return buttonsDiv;
    }

    private addScreenshotButton(buttonsDiv: HTMLDivElement, enabled: boolean) {
        const screenshotButton = DiagramUtils.getScreenshotButton(enabled);
        buttonsDiv.appendChild(screenshotButton);
        screenshotButton.addEventListener('click', () => {
            this.screenshot(NetworkAreaDiagramViewer.DEFAULT_PNG_BACKGROUND_COLOR);
        });
    }

    public getSvg(): string | null {
        return this.svgDraw !== undefined ? this.svgDraw.svg() : null;
    }

    public getJsonMetadata(): string | null {
        return JSON.stringify(this.diagramMetadata);
    }

    public getDimensionsFromSvg(): DiagramUtils.Dimensions | null {
        // Dimensions are set in the main svg tag attributes. We want to parse those data without loading the whole svg in the DOM.
        const result = this.svgContent.match('<svg[^>]*>');
        if (result === null || result.length === 0) {
            return null;
        }
        const emptiedSvgContent = result[0] + '</svg>';
        const svg: SVGSVGElement = new DOMParser()
            .parseFromString(emptiedSvgContent, 'image/svg+xml')
            .getElementsByTagName('svg')[0];
        const width = Number(svg.getAttribute('width'));
        const height = Number(svg.getAttribute('height'));
        const viewbox: DiagramUtils.ViewBox = svg.viewBox.baseVal;
        return { width: width, height: height, viewbox: viewbox };
    }

    private enablePanzoom() {
        this.svgDraw?.panZoom({
            panning: true,
            zoomMin: 0.5 / this.ratio, // maximum zoom OUT ratio (0.5 = at best, the displayed area is twice the SVG's size)
            zoomMax: 20 * this.ratio, // maximum zoom IN ratio (20 = at best, the displayed area is only 1/20th of the SVG's size)
            zoomFactor: 0.2,
        });
    }

    private disablePanzoom() {
        this.svgDraw?.panZoom({
            panning: false,
        });
    }
    private onMouseLeftDown(event: MouseEvent) {
        // Nodes are selectable and draggable
        // TextNodes are only draggable
        const targetElement = event.target as SVGElement;
        const selectableElem = DiagramUtils.getSelectableFrom(targetElement);
        const draggableElem = DiagramUtils.getDraggableFrom(targetElement);

        if (event.shiftKey) {
            //SHIFT Selection mode only
            this.initSelection(selectableElem);
        } else {
            // Interaction mode (could be drag or select)
            // next 'mousemove' event will determine it
            this.initSelection(selectableElem);
            if (this.enableDragInteraction) {
                this.initDrag(draggableElem);
            }
        }
    }

    private initSelection(selectableElem?: SVGElement) {
        if (!selectableElem) {
            return;
        }
        if (this.onSelectNodeCallback != null) {
            this.disablePanzoom(); // keep pan zoom functionality if mouse over a node
        }
        this.selectedElement = selectableElem as SVGGraphicsElement;
    }

    private initDrag(draggableElem?: SVGElement) {
        if (!draggableElem) {
            return;
        }
        this.disablePanzoom();
        this.draggedElement = draggableElem as SVGGraphicsElement;
    }

    private onDragStart() {
        this.isDragging = true;

        // change cursor style
        const svg: HTMLElement = <HTMLElement>this.svgDraw?.node.firstElementChild?.parentElement;
        svg.style.cursor = 'grabbing';

        this.ctm = this.svgDraw?.node.getScreenCTM(); // used to compute mouse movement
        this.edgeAngles = new Map<string, number>(); // used for node redrawing

        // get original position of dragged element
        this.textNodeSelected = DiagramUtils.isTextNode(this.draggedElement);
        if (this.textNodeSelected) {
            this.initialPosition = DiagramUtils.getTextNodePosition(this.draggedElement); // used for the offset
            this.endTextEdge = new Point(0, 0);
            const textNode: TextNodeMetadata | undefined = this.diagramMetadata?.textNodes.find(
                (textNode) => textNode.svgId == this.draggedElement?.id
            );
            if (textNode) {
                this.originalTextNodeShift = new Point(textNode.shiftX, textNode.shiftY);
                this.originalTextNodeConnectionShift = new Point(textNode.connectionShiftX, textNode.connectionShiftY);
            }
        } else {
            this.initialPosition = DiagramUtils.getPosition(this.draggedElement); // used for the offset
            const node: NodeMetadata | undefined = this.diagramMetadata?.nodes.find(
                (node) => node.svgId == this.draggedElement?.id
            );
            if (node) {
                this.originalNodePosition = new Point(node.x, node.y);
            }
        }
    }

    private onMouseMove(event: MouseEvent) {
        // first mouse move will start drag & drop and set `isDragging` to true
        if (!this.draggedElement) {
            return;
        }
        if (!this.isDragging) {
            this.onDragStart();
        }

        event.preventDefault();
        this.ctm = this.svgDraw?.node.getScreenCTM();
        const mousePosition = this.getMousePosition(event);

        // Update metadata first
        if (this.textNodeSelected) {
            const topLeftCornerPosition = DiagramUtils.getTextNodeTopLeftCornerFromCenter(
                this.draggedElement,
                mousePosition
            );
            this.updateTextNodeMetadata(this.draggedElement, topLeftCornerPosition);
        } else {
            this.updateNodeMetadata(this.draggedElement, mousePosition);
        }

        // Then update elements visually using updated metadata
        this.updateElement(this.draggedElement);
    }

    private updateNodeMetadata(vlNode: SVGGraphicsElement, position: Point) {
        const node: NodeMetadata | undefined = this.diagramMetadata?.nodes.find((node) => node.svgId == vlNode.id);
        if (node != null) {
            const nodeMove = DiagramUtils.getNodeMove(node, position);
            node.x = nodeMove.xNew;
            node.y = nodeMove.yNew;
        }
    }

    private updateTextNodeMetadata(textNodeElement: SVGGraphicsElement, position: Point) {
        const node: NodeMetadata | undefined = this.diagramMetadata?.nodes.find(
            (node) => node.svgId == DiagramUtils.getVoltageLevelNodeId(textNodeElement.id)
        );
        const textNode: TextNodeMetadata | undefined = this.diagramMetadata?.textNodes.find(
            (textNode) => textNode.svgId == textNodeElement.id
        );
        if (node != null && textNode != null) {
            const textNodeMoves = DiagramUtils.getTextNodeMoves(textNode, node, position, this.endTextEdge);
            textNode.shiftX = textNodeMoves[0].xNew;
            textNode.shiftY = textNodeMoves[0].yNew;
            textNode.connectionShiftX = textNodeMoves[1].xNew;
            textNode.connectionShiftY = textNodeMoves[1].yNew;
        }
    }

    private updateElement(element: SVGGraphicsElement) {
        if (DiagramUtils.isTextNode(element)) {
            this.initialPosition = DiagramUtils.getTextNodePosition(element);
            const vlNode: SVGGraphicsElement | null = this.svgDiv.querySelector(
                "[id='" + DiagramUtils.getVoltageLevelNodeId(element.id) + "']"
            );
            if (vlNode) {
                this.updateVoltageLevelText(element, vlNode);
            }
        } else {
            this.initialPosition = DiagramUtils.getPosition(element);
            this.updateVoltageLevelNode(element);
        }
    }

    private onHover(mouseEvent: MouseEvent) {
        if (this.onToggleHoverCallback == null) {
            return;
        }

        const hoverableElem = DiagramUtils.getHoverableFrom(mouseEvent.target as SVGElement);
        if (!hoverableElem) {
            this.onToggleHoverCallback(false, null, '', '');
            return;
        }

        //get edge by svgId
        const edge: EdgeMetadata | undefined = this.diagramMetadata?.edges.find(
            (edge) => edge.svgId == hoverableElem?.id
        );

        if (edge) {
            const mousePosition = this.getMousePosition(mouseEvent);
            const equipmentId = edge?.equipmentId ?? '';
            const edgeType = DiagramUtils.getStringEdgeType(edge) ?? '';
            this.onToggleHoverCallback(true, mousePosition, equipmentId, edgeType);
        } else {
            this.onToggleHoverCallback(false, null, '', '');
        }
    }

    private onMouseLeftUpOrLeave(mouseEvent: MouseEvent) {
        // check if I moved or selected an element
        if (this.isDragging) {
            // moving element
            this.onDragEnd();
            this.resetMouseEventParams();
        } else if (this.selectedElement) {
            // selecting element
            const mousePosition = this.getMousePosition(mouseEvent);
            this.onSelectEnd(mousePosition);
            this.resetMouseEventParams();
        }
    }

    private resetMouseEventParams() {
        this.selectedElement = null;

        this.isDragging = false;
        this.draggedElement = null;
        this.initialPosition = new Point(0, 0);
        this.ctm = null;
        this.originalNodePosition = new Point(0, 0);
        this.originalTextNodeShift = new Point(0, 0);
        this.originalTextNodeConnectionShift = new Point(0, 0);

        this.enablePanzoom();
    }

    private onDragEnd() {
        if (!this.draggedElement) {
            return;
        }

        if (this.textNodeSelected) {
            this.callMoveTextNodeCallback(this.draggedElement);
        } else {
            this.callMoveNodeCallback(this.draggedElement);
        }
        // change cursor style back to normal
        const svg: HTMLElement = <HTMLElement>this.svgDraw?.node.firstElementChild?.parentElement;
        svg.style.removeProperty('cursor');
    }

    private callMoveNodeCallback(vlNode: SVGGraphicsElement) {
        if (this.onMoveNodeCallback) {
            const node: NodeMetadata | undefined = this.diagramMetadata?.nodes.find((node) => node.svgId == vlNode.id);
            if (node != null) {
                this.onMoveNodeCallback(
                    node.equipmentId,
                    node.svgId,
                    node.x,
                    node.y,
                    this.originalNodePosition.x,
                    this.originalNodePosition.y
                );
            }
        }
    }

    private callMoveTextNodeCallback(textNodeElement: SVGGraphicsElement) {
        if (this.onMoveTextNodeCallback) {
            const node: NodeMetadata | undefined = this.diagramMetadata?.nodes.find(
                (node) => node.svgId == DiagramUtils.getVoltageLevelNodeId(textNodeElement.id)
            );
            const textNode: TextNodeMetadata | undefined = this.diagramMetadata?.textNodes.find(
                (textNode) => textNode.svgId == textNodeElement.id
            );

            if (node != null && textNode != null) {
                this.onMoveTextNodeCallback(
                    node.equipmentId,
                    node.svgId,
                    textNode.svgId,
                    textNode.shiftX,
                    textNode.shiftY,
                    this.originalTextNodeShift.x,
                    this.originalTextNodeShift.y,
                    textNode.connectionShiftX,
                    textNode.connectionShiftY,
                    this.originalTextNodeConnectionShift.x,
                    this.originalTextNodeConnectionShift.y
                );
            }
        }
    }

    private onSelectEnd(mousePosition: Point) {
        this.callSelectNodeCallback(mousePosition);
    }

    // position w.r.t the SVG box
    private getMousePosition(event: MouseEvent): Point {
        return new Point(
            (event.clientX - (this.ctm?.e ?? 0)) / (this.ctm?.a ?? 1),
            (event.clientY - (this.ctm?.f ?? 0)) / (this.ctm?.d ?? 1)
        );
    }

    // translation w.r.t. the initial position
    private getTranslation(position: Point): Point {
        return new Point(position.x - this.initialPosition.x, position.y - this.initialPosition.y);
    }

    private updateVoltageLevelText(textNode: SVGGraphicsElement, vlNode: SVGGraphicsElement) {
        window.getSelection()?.empty(); // to avoid text highlighting in firefox

        const textNodeMetadata = this.diagramMetadata?.textNodes.find((node) => node.svgId === textNode.id);
        const vlNodeMetadata = this.diagramMetadata?.nodes.find((node) => node.svgId === vlNode.id);

        if (textNodeMetadata && vlNodeMetadata) {
            const position = new Point(
                vlNodeMetadata.x + textNodeMetadata.shiftX,
                vlNodeMetadata.y + textNodeMetadata.shiftY
            );
            this.updateText(textNode, vlNode, position);
        }
    }

    private updateVoltageLevelNode(vlNode: SVGGraphicsElement) {
        const nodeMetadata = this.diagramMetadata?.nodes.find((node) => node.svgId === vlNode.id);
        if (nodeMetadata) {
            const position = new Point(nodeMetadata.x, nodeMetadata.y);
            this.updateNodePosition(vlNode, position);
            const textNode: SVGGraphicsElement | null = this.svgDiv.querySelector(
                "[id='" + DiagramUtils.getTextNodeId(vlNode.id) + "']"
            );
            if (textNode) {
                this.updateVoltageLevelText(textNode, vlNode);
            }
            this.updateEdges(vlNode, position);
            this.updateInjections(vlNode, position);
        }
    }

    private updateNodePosition(vlNode: SVGGraphicsElement, position: Point) {
        vlNode.setAttribute('transform', 'translate(' + DiagramUtils.getFormattedPoint(position) + ')');
    }

    private updateText(textNode: SVGGraphicsElement | null, vlNode: SVGGraphicsElement | null, position: Point) {
        if (!textNode) {
            return;
        }

        // update text node position
        this.updateTextNodePosition(textNode, position);
        if (vlNode != null) {
            // redraw text edge
            const textNodeSize = DiagramUtils.getTextNodeSize(textNode);
            this.redrawTextEdge(
                DiagramUtils.getTextEdgeId(vlNode.id),
                position,
                vlNode,
                textNodeSize.height,
                textNodeSize.width
            );
        }
    }

    private updateTextNodePosition(textElement: SVGGraphicsElement | null, point: Point) {
        if (textElement != null) {
            textElement.style.left = point.x.toFixed(0) + 'px';
            textElement.style.top = point.y.toFixed(0) + 'px';
        }
    }

    private redrawTextEdge(
        textEdgeId: string,
        textNodePosition: Point,
        vlNode: SVGGraphicsElement,
        textHeight: number,
        textWidth: number
    ) {
        const textEdge: SVGGraphicsElement | null = this.svgDiv.querySelector("[id='" + textEdgeId + "']");
        if (textEdge != null) {
            // compute voltage level circle radius
            const busNodes: BusNodeMetadata[] | undefined = this.diagramMetadata?.busNodes.filter(
                (busNode) => busNode.vlNode == vlNode.id
            );
            const nbNeighbours = busNodes !== undefined && busNodes.length > 1 ? busNodes.length - 1 : 0;
            const voltageLevelCircleRadius = DiagramUtils.getVoltageLevelCircleRadius(
                nbNeighbours,
                DiagramUtils.isVlNodeFictitious(vlNode.id, this.diagramMetadata?.nodes)
                    ? this.svgParameters.getFictitiousVoltageLevelCircleRadius()
                    : this.svgParameters.getVoltageLevelCircleRadius()
            );
            // compute text edge start and end
            const vlNodePosition = DiagramUtils.getPosition(vlNode);
            // HOTFIX If we call moveElement programmatically (not during a drag and drop event)
            // then textNode?.firstElementChild?.scrollHeight and textNode?.firstElementChild?.scrollWidth seems not defined
            // then textHeight and textWidth equal 0
            // We set this.endTextEdge using connectionShifts sooner in this case
            if (textHeight !== 0 || textWidth !== 0) {
                this.endTextEdge = DiagramUtils.getTextEdgeEnd(
                    textNodePosition,
                    vlNodePosition,
                    this.layoutParameters.getTextNodeEdgeConnectionYShift(),
                    textHeight,
                    textWidth
                );
            }
            const startTextEdge = DiagramUtils.getPointAtDistance(
                vlNodePosition,
                this.endTextEdge,
                voltageLevelCircleRadius
            );
            // update text edge polyline
            const polyline = DiagramUtils.getFormattedPolyline(startTextEdge, null, this.endTextEdge);
            textEdge.setAttribute('points', polyline);
        }
    }

    private updateSvgElementPosition(svgElementId: string, translation: Point) {
        const svgElement: SVGGraphicsElement | null = this.svgDiv.querySelector("[id='" + svgElementId + "']");
        if (svgElement) {
            const transform = DiagramUtils.getTransform(svgElement);
            const totalTranslation = new Point(
                (transform?.matrix.e ?? 0) + translation.x,
                (transform?.matrix.f ?? 0) + translation.y
            );
            svgElement?.setAttribute(
                'transform',
                'translate(' + DiagramUtils.getFormattedPoint(totalTranslation) + ')'
            );
        }
    }

    private updateInjections(vlNode: SVGGraphicsElement, position: Point) {
        // get edges connected to the the node we are moving
        const injections: InjectionMetadata[] | undefined = this.diagramMetadata?.injections?.filter(
            (inj) => inj.vlNodeId == vlNode.id
        );
        injections?.forEach((inj) => {
            this.updateSvgElementPosition(inj.svgId, this.getTranslation(position));
        });
    }

    private updateEdges(vlNode: SVGGraphicsElement, position: Point) {
        // get edges connected to the the node we are moving
        const edges: EdgeMetadata[] | undefined = this.diagramMetadata?.edges.filter(
            (edge) => edge.node1 == vlNode.id || edge.node2 == vlNode.id
        );
        // group edges, to have multibranches - branches connecting the same nodes - together
        const groupedEdges: Map<string, EdgeMetadata[]> = new Map<string, EdgeMetadata[]>();
        const loopEdges: Map<string, EdgeMetadata[]> = new Map<string, EdgeMetadata[]>();
        const busNodeEdges: Map<string, EdgeMetadata[]> = new Map<string, EdgeMetadata[]>();
        edges?.forEach((edge) => {
            let edgeGroup: EdgeMetadata[] = [];
            if (edge.node1 == edge.node2) {
                // loop edge
                if (loopEdges.has(edge.node1)) {
                    edgeGroup = loopEdges.get(edge.node1) ?? [];
                }
                edgeGroup.push(edge);
                loopEdges.set(edge.node1, edgeGroup);
                this.addBusNodeEdge(edge.busNode1, edge, busNodeEdges);
                this.addBusNodeEdge(edge.busNode2, edge, busNodeEdges);
            } else {
                const edgeGroupId = edge.node1.concat('_', edge.node2);
                if (groupedEdges.has(edgeGroupId)) {
                    edgeGroup = groupedEdges.get(edgeGroupId) ?? [];
                }
                edgeGroup.push(edge);
                groupedEdges.set(edgeGroupId, edgeGroup);
                const busNodeId = edge.node1 == vlNode.id ? edge.busNode1 : edge.busNode2;
                this.addBusNodeEdge(busNodeId, edge, busNodeEdges);
            }
        });
        // redraw grouped edges
        for (const edgeGroup of groupedEdges.values()) {
            this.redrawEdgeGroup(edgeGroup, vlNode);
        }
        // redraw loop edges
        for (const edgeGroup of loopEdges.values()) {
            this.redrawLoopEdgeGroup(edgeGroup, position);
        }
        // redraw node
        this.redrawVoltageLevelNode(vlNode, busNodeEdges);
    }

    private addBusNodeEdge(busNodeId: string | null, edge: EdgeMetadata, busNodeEdges: Map<string, EdgeMetadata[]>) {
        let busEdgeGroup: EdgeMetadata[] = [];
        if (busNodeId != null) {
            if (busNodeEdges.has(busNodeId)) {
                busEdgeGroup = busNodeEdges.get(busNodeId) ?? [];
            }
            busEdgeGroup.push(edge);
            busNodeEdges.set(busNodeId, busEdgeGroup);
        }
    }

    private getEdgeNodes(
        edge: EdgeMetadata,
        vlNode: SVGGraphicsElement
    ): [SVGGraphicsElement | null, SVGGraphicsElement | null] {
        const otherNodeId = vlNode.id === edge.node1 ? edge.node2 : edge.node1;
        const otherNode: SVGGraphicsElement | null = this.svgDiv.querySelector("[id='" + otherNodeId + "']");
        const node1 = vlNode.id === edge.node1 ? vlNode : otherNode;
        const node2 = otherNode?.id === edge.node1 ? vlNode : otherNode;
        return [node1, node2];
    }

    private getOtherNode(
        edgeNodes: [SVGGraphicsElement | null, SVGGraphicsElement | null],
        vlNode: SVGGraphicsElement
    ): SVGGraphicsElement | null {
        return edgeNodes[0]?.id == vlNode.id ? edgeNodes[1] : edgeNodes[0];
    }

    private getNodeRadius(busNodeId: string, vlNodeId: string): [number, number, number] {
        const busNode: BusNodeMetadata | undefined = this.diagramMetadata?.busNodes.find(
            (busNode) => busNode.svgId == busNodeId
        );
        return DiagramUtils.getNodeRadius(
            busNode?.nbNeighbours ?? 0,
            DiagramUtils.isVlNodeFictitious(vlNodeId, this.diagramMetadata?.nodes)
                ? this.svgParameters.getFictitiousVoltageLevelCircleRadius()
                : this.svgParameters.getVoltageLevelCircleRadius(),
            busNode?.index ?? 0,
            this.svgParameters.getInterAnnulusSpace()
        );
    }

    private redrawEdgeGroup(edges: EdgeMetadata[], vlNode: SVGGraphicsElement) {
        if (edges.length == 1) {
            this.redrawStraightEdge(edges[0], vlNode); // 1 edge in the group -> straight line
        } else {
            this.redrawForkEdge(edges, vlNode);
        }
    }

    private redrawForkEdge(edges: EdgeMetadata[], vlNode: SVGGraphicsElement) {
        const position: Point = DiagramUtils.getPosition(vlNode);
        const edgeNodes = this.getEdgeNodes(edges[0], vlNode);
        const point1 = DiagramUtils.getPosition(edgeNodes[0]);
        const point2 = DiagramUtils.getPosition(edgeNodes[1]);
        const angle = DiagramUtils.getAngle(point1, point2);
        const nbForks = edges.length;
        const angleStep = this.svgParameters.getEdgesForkAperture() / (nbForks - 1);
        let i = 0;
        edges.forEach((edge) => {
            if (2 * i + 1 == nbForks) {
                this.redrawStraightEdge(edge, vlNode); // central edge, if present -> straight line
            } else {
                // get edge type
                const edgeType = DiagramUtils.getEdgeType(edge);
                if (edgeType == DiagramUtils.EdgeType.UNKNOWN) {
                    return;
                }
                if (edgeNodes[0] == null || edgeNodes[1] == null) {
                    // only 1 side of the edge is in the SVG
                    this.updateSvgElementPosition(edge.svgId, this.getTranslation(position));
                    return;
                }
                // get edge element
                const edgeNode: SVGGraphicsElement | null = this.svgDiv.querySelector("[id='" + edge.svgId + "']");
                if (!edgeNode) {
                    return;
                }
                // compute moved edge data: polyline points
                const alpha = -this.svgParameters.getEdgesForkAperture() / 2 + i * angleStep;
                const angleFork1 = angle - alpha;
                const angleFork2 = angle + Math.PI + alpha;
                const edgeFork1 = DiagramUtils.getEdgeFork(point1, this.svgParameters.getEdgesForkLength(), angleFork1);
                const edgeFork2 = DiagramUtils.getEdgeFork(point2, this.svgParameters.getEdgesForkLength(), angleFork2);
                const unknownBusNode1 = edge.busNode1 != null && edge.busNode1.length == 0;
                const nodeRadius1 = this.getNodeRadius(edge.busNode1 ?? '-1', edge.node1 ?? '-1');
                const edgeStart1 = DiagramUtils.getPointAtDistance(
                    DiagramUtils.getPosition(edgeNodes[0]),
                    edgeFork1,
                    unknownBusNode1
                        ? nodeRadius1[1] + this.svgParameters.getUnknownBusNodeExtraRadius()
                        : nodeRadius1[1]
                );
                const unknownBusNode2 = edge.busNode2 != null && edge.busNode2.length == 0;
                const nodeRadius2 = this.getNodeRadius(edge.busNode2 ?? '-1', edge.node2 ?? '-1');
                const edgeStart2 = DiagramUtils.getPointAtDistance(
                    DiagramUtils.getPosition(edgeNodes[1]),
                    edgeFork2,
                    unknownBusNode2
                        ? nodeRadius2[1] + this.svgParameters.getUnknownBusNodeExtraRadius()
                        : nodeRadius2[1]
                );
                const edgeMiddle = DiagramUtils.getMidPosition(edgeFork1, edgeFork2);
                // redraw edge
                this.redrawEdge(
                    edgeNode,
                    edgeStart1,
                    edgeFork1,
                    edgeStart2,
                    edgeFork2,
                    edgeMiddle,
                    nodeRadius1,
                    nodeRadius2,
                    edgeType
                );
            }
            i++;
        });
        // redraw other voltage level node
        const otherNode: SVGGraphicsElement | null = this.getOtherNode(edgeNodes, vlNode);
        this.redrawOtherVoltageLevelNode(otherNode);
    }

    private redrawStraightEdge(edge: EdgeMetadata, vlNode: SVGGraphicsElement) {
        // get edge type
        const edgeType = DiagramUtils.getEdgeType(edge);
        if (edgeType == DiagramUtils.EdgeType.UNKNOWN) {
            return;
        }

        const position: Point = DiagramUtils.getPosition(vlNode);

        const edgeNodes = this.getEdgeNodes(edge, vlNode);
        if (edgeNodes[0] == null || edgeNodes[1] == null) {
            // only 1 side of the edge is in the SVG
            this.updateSvgElementPosition(edge.svgId, this.getTranslation(position));
            return;
        }
        // get edge element
        const edgeNode: SVGGraphicsElement | null = this.svgDiv.querySelector("[id='" + edge.svgId + "']");
        if (!edgeNode) {
            return;
        }
        if (this.isThreeWtEdge(edgeType, edgeNode)) {
            this.redrawThreeWtEdge(edge, edgeNode, vlNode);
            return;
        }
        // compute moved edge data: polyline points
        const nodeRadius1 = this.getNodeRadius(edge.busNode1 ?? '-1', edge.node1 ?? '-1');
        const edgeStart1 = this.getEdgeStart(edge.busNode1, nodeRadius1[1], edgeNodes[0], edgeNodes[1]);
        const nodeRadius2 = this.getNodeRadius(edge.busNode2 ?? '-1', edge.node2 ?? '-1');
        const edgeStart2 = this.getEdgeStart(edge.busNode2, nodeRadius2[1], edgeNodes[1], edgeNodes[0]);
        const edgeMiddle = DiagramUtils.getMidPosition(edgeStart1, edgeStart2);
        // redraw edge
        this.redrawEdge(edgeNode, edgeStart1, null, edgeStart2, null, edgeMiddle, nodeRadius1, nodeRadius2, edgeType);
        // if dangling line edge -> redraw boundary node
        if (edgeType == DiagramUtils.EdgeType.DANGLING_LINE) {
            this.redrawBoundaryNode(edgeNodes[1], DiagramUtils.getAngle(edgeStart2, edgeMiddle), nodeRadius2[1]);
            if (vlNode.id == edgeNodes[1]?.id) {
                // if boundary node moved -> redraw other voltage level node
                this.redrawOtherVoltageLevelNode(edgeNodes[0]);
            }
        } else {
            // redraw other voltage level node
            const otherNode: SVGGraphicsElement | null = this.getOtherNode(edgeNodes, vlNode);
            this.redrawOtherVoltageLevelNode(otherNode);
        }
    }

    private isThreeWtEdge(edgeType: DiagramUtils.EdgeType, edgeNode: SVGGraphicsElement) {
        if (edgeType == DiagramUtils.EdgeType.THREE_WINDINGS_TRANSFORMER) {
            return true;
        }
        const pst3wtEdge =
            edgeType == DiagramUtils.EdgeType.PHASE_SHIFT_TRANSFORMER &&
            edgeNode.parentElement?.classList.contains('nad-3wt-edges');
        return pst3wtEdge ?? false;
    }

    private getEdgeStart(
        busNodeId: string | null,
        outerRadius: number,
        point1: SVGGraphicsElement | null,
        point2: SVGGraphicsElement | null
    ): Point {
        const unknownBusNode = busNodeId != null && busNodeId.length == 0;
        return DiagramUtils.getPointAtDistance(
            DiagramUtils.getPosition(point1),
            DiagramUtils.getPosition(point2),
            unknownBusNode ? outerRadius + this.svgParameters.getUnknownBusNodeExtraRadius() : outerRadius
        );
    }

    private redrawEdge(
        edgeNode: SVGGraphicsElement,
        edgeStart1: Point,
        edgeFork1: Point | null, // if null -> straight line
        edgeStart2: Point,
        edgeFork2: Point | null, // if null -> straight line
        edgeMiddle: Point,
        nodeRadius1: [number, number, number],
        nodeRadius2: [number, number, number],
        edgeType: DiagramUtils.EdgeType
    ) {
        const isTransformerEdge =
            edgeType == DiagramUtils.EdgeType.TWO_WINDINGS_TRANSFORMER ||
            edgeType == DiagramUtils.EdgeType.PHASE_SHIFT_TRANSFORMER;
        const isHVDCLineEdge = edgeType == DiagramUtils.EdgeType.HVDC_LINE;
        this.redrawHalfEdge(edgeNode, '1', edgeStart1, edgeFork1, edgeMiddle, isTransformerEdge, nodeRadius1);
        this.redrawHalfEdge(edgeNode, '2', edgeStart2, edgeFork2, edgeMiddle, isTransformerEdge, nodeRadius2);
        if (isTransformerEdge) {
            this.redrawTransformer(
                edgeNode,
                edgeFork1 == null ? edgeStart1 : edgeFork1,
                edgeMiddle,
                edgeFork2 == null ? edgeStart2 : edgeFork2,
                edgeMiddle,
                edgeType
            );
        } else if (isHVDCLineEdge) {
            this.redrawConverterStation(
                edgeNode,
                edgeFork1 == null ? edgeStart1 : edgeFork1,
                edgeMiddle,
                edgeFork2 == null ? edgeStart2 : edgeFork2,
                edgeMiddle
            );
        }
        // if present, move edge name
        if (this.svgParameters.getEdgeNameDisplayed()) {
            this.updateEdgeName(edgeNode, edgeMiddle, edgeFork1 == null ? edgeStart1 : edgeFork1);
        }
        // store edge angles, to use them for bus node redrawing
        this.edgeAngles.set(
            edgeNode.id + '.1',
            DiagramUtils.getAngle(edgeStart1, edgeFork1 == null ? edgeMiddle : edgeFork1)
        );
        this.edgeAngles.set(
            edgeNode.id + '.2',
            DiagramUtils.getAngle(edgeStart2, edgeFork2 == null ? edgeMiddle : edgeFork2)
        );
    }

    private redrawHalfEdge(
        edgeNode: SVGGraphicsElement,
        side: string,
        startPolyline: Point,
        middlePolyline: Point | null, // if null -> straight line
        endPolyline: Point,
        transformerEdge: boolean,
        nodeRadius: [number, number, number]
    ) {
        // get half edge element
        const halfEdge: SVGGraphicsElement | null = edgeNode.querySelector("[id='" + edgeNode.id + '.' + side + "']");
        // move edge polyline
        const polyline: SVGGraphicsElement | null | undefined = halfEdge?.querySelector('polyline');
        // if transformer edge reduce edge polyline, leaving space for the transformer
        endPolyline = transformerEdge
            ? DiagramUtils.getPointAtDistance(
                  endPolyline,
                  middlePolyline == null ? startPolyline : middlePolyline,
                  1.5 * this.svgParameters.getTransformerCircleRadius()
              )
            : endPolyline;
        const polylinePoints: string = DiagramUtils.getFormattedPolyline(startPolyline, middlePolyline, endPolyline);
        polyline?.setAttribute('points', polylinePoints);
        // redraw edge arrow and label
        if (halfEdge != null && halfEdge.children.length > 1) {
            this.redrawEdgeArrowAndLabel(halfEdge, startPolyline, middlePolyline, endPolyline, nodeRadius);
        }
    }

    private redrawEdgeArrowAndLabel(
        edgeNode: SVGGraphicsElement,
        startPolyline: Point,
        middlePolyline: Point | null, // if null -> straight line
        endPolyline: Point,
        nodeRadius: [number, number, number]
    ) {
        // move edge arrow
        const arrowCenter = DiagramUtils.getPointAtDistance(
            middlePolyline == null ? startPolyline : middlePolyline,
            endPolyline,
            middlePolyline == null
                ? this.svgParameters.getArrowShift() + (nodeRadius[2] - nodeRadius[1])
                : this.svgParameters.getArrowShift()
        );
        const arrowElement = edgeNode.lastElementChild as SVGGraphicsElement;
        arrowElement?.setAttribute('transform', 'translate(' + DiagramUtils.getFormattedPoint(arrowCenter) + ')');
        const arrowAngle = DiagramUtils.getArrowAngle(
            middlePolyline == null ? startPolyline : middlePolyline,
            endPolyline
        );
        const arrowRotationElement = arrowElement.firstElementChild?.firstElementChild as SVGGraphicsElement;
        arrowRotationElement.setAttribute('transform', 'rotate(' + DiagramUtils.getFormattedValue(arrowAngle) + ')');
        // move edge label
        const labelData = DiagramUtils.getLabelData(
            middlePolyline == null ? startPolyline : middlePolyline,
            endPolyline,
            this.svgParameters.getArrowLabelShift()
        );
        const labelRotationElement = arrowElement.firstElementChild?.lastElementChild as SVGGraphicsElement;
        labelRotationElement.setAttribute('transform', 'rotate(' + DiagramUtils.getFormattedValue(labelData[0]) + ')');
        labelRotationElement.setAttribute('x', DiagramUtils.getFormattedValue(labelData[1]));
        if (labelData[2]) {
            labelRotationElement.setAttribute('style', labelData[2]);
        } else if (labelRotationElement.hasAttribute('style')) {
            labelRotationElement.removeAttribute('style');
        }
    }

    private redrawTransformer(
        edgeNode: SVGGraphicsElement,
        startPolyline1: Point,
        endPolyline1: Point,
        startPolyline2: Point,
        endPolyline2: Point,
        edgeType: DiagramUtils.EdgeType
    ) {
        const transformerElement: SVGGraphicsElement = edgeNode.lastElementChild as SVGGraphicsElement;
        // move transformer circles
        const transformerCircles: NodeListOf<SVGGraphicsElement> = transformerElement?.querySelectorAll('circle');
        this.redrawTransformerCircle(
            transformerCircles.item(0),
            startPolyline1,
            DiagramUtils.getPointAtDistance(
                endPolyline1,
                startPolyline1,
                1.5 * this.svgParameters.getTransformerCircleRadius()
            )
        );
        this.redrawTransformerCircle(
            transformerCircles.item(1),
            startPolyline2,
            DiagramUtils.getPointAtDistance(
                endPolyline2,
                startPolyline2,
                1.5 * this.svgParameters.getTransformerCircleRadius()
            )
        );
        // if phase shifting transformer move transformer arrow
        const isPSTransformerEdge = edgeType == DiagramUtils.EdgeType.PHASE_SHIFT_TRANSFORMER;
        if (isPSTransformerEdge) {
            this.redrawTransformerArrow(
                transformerElement,
                startPolyline1,
                endPolyline1,
                DiagramUtils.getMidPosition(endPolyline1, endPolyline2)
            );
        }
    }

    private redrawTransformerCircle(transformerCircle: SVGGraphicsElement, startPolyline: Point, endPolyline: Point) {
        const circleCenter: Point = DiagramUtils.getPointAtDistance(
            endPolyline,
            startPolyline,
            -this.svgParameters.getTransformerCircleRadius()
        );
        transformerCircle.setAttribute('cx', DiagramUtils.getFormattedValue(circleCenter.x));
        transformerCircle.setAttribute('cy', DiagramUtils.getFormattedValue(circleCenter.y));
    }

    private redrawTransformerArrow(
        transformerElement: SVGGraphicsElement,
        startPolyline: Point,
        endPolyline: Point,
        transformerCenter: Point
    ) {
        const arrowPath: SVGGraphicsElement | null = transformerElement.querySelector('path');
        const matrix: string = DiagramUtils.getTransformerArrowMatrixString(
            startPolyline,
            endPolyline,
            transformerCenter,
            this.svgParameters.getTransformerCircleRadius()
        );
        arrowPath?.setAttribute('transform', 'matrix(' + matrix + ')');
    }

    private redrawConverterStation(
        edgeNode: SVGGraphicsElement,
        startPolyline1: Point,
        endPolyline1: Point,
        startPolyline2: Point,
        endPolyline2: Point
    ) {
        const converterStationElement: SVGGraphicsElement = edgeNode.lastElementChild as SVGGraphicsElement;
        const polylinePoints: string = DiagramUtils.getConverterStationPolyline(
            startPolyline1,
            endPolyline1,
            startPolyline2,
            endPolyline2,
            this.svgParameters.getConverterStationWidth()
        );
        const polyline: SVGGraphicsElement | null = converterStationElement.querySelector('polyline');
        polyline?.setAttribute('points', polylinePoints);
    }

    private redrawLoopEdgeGroup(edges: EdgeMetadata[], position: Point) {
        edges.forEach((edge) => {
            // get edge element
            if (!edge.svgId) {
                return;
            }
            this.updateSvgElementPosition(edge.svgId, this.getTranslation(position));
        });
    }

    private updateEdgeName(edgeNode: SVGGraphicsElement, anchorPoint: Point, edgeStart: Point) {
        const positionElement: SVGGraphicsElement | null = edgeNode.querySelector(
            '.nad-edge-label'
        ) as SVGGraphicsElement;
        if (positionElement != null) {
            // move edge name position
            positionElement.setAttribute('transform', 'translate(' + DiagramUtils.getFormattedPoint(anchorPoint) + ')');
            const angleElement: SVGGraphicsElement | null = positionElement.querySelector('text') as SVGGraphicsElement;
            if (angleElement != null) {
                // change edge name angle
                const edgeNameAngle = DiagramUtils.getEdgeNameAngle(edgeStart, anchorPoint);
                angleElement.setAttribute('transform', 'rotate(' + DiagramUtils.getFormattedValue(edgeNameAngle) + ')');
            }
        }
    }

    private redrawVoltageLevelNode(node: SVGGraphicsElement | null, busNodeEdges: Map<string, EdgeMetadata[]>) {
        if (node != null) {
            // get buses belonging to voltage level
            const busNodes: BusNodeMetadata[] | undefined = this.diagramMetadata?.busNodes.filter(
                (busNode) => busNode.vlNode == node.id
            );
            // if single bus voltage level -> do not redraw anything
            if (busNodes !== undefined && busNodes.length <= 1) {
                return;
            }
            // sort buses by index
            const sortedBusNodes: BusNodeMetadata[] = DiagramUtils.getSortedBusNodes(busNodes);
            const traversingBusEdgesAngles: number[] = [];
            for (let index = 0; index < sortedBusNodes.length; index++) {
                const busNode = sortedBusNodes[index];
                // skip redrawing of first bus
                if (index > 0) {
                    this.redrawBusNode(node, busNode, index, traversingBusEdgesAngles);
                }
                // add angles of edges starting from bus to traversing edges angles
                const busEdges = busNodeEdges.get(busNode.svgId) ?? [];
                busEdges.forEach((edge) => {
                    const edgeAngle = this.getEdgeAngle(busNode, edge, edge.svgId, edge.node1 == edge.node2);
                    if (typeof edgeAngle !== 'undefined') {
                        traversingBusEdgesAngles.push(edgeAngle);
                    }
                });
            }
        }
    }

    private getEdgeAngle(busNode: BusNodeMetadata, edge: EdgeMetadata, edgeId: string, isLoopEdge: boolean) {
        const halfEdgeId = busNode.svgId == edge.busNode1 ? edgeId + '.1' : edgeId + '.2';
        if (!this.edgeAngles.has(halfEdgeId)) {
            // if not yet stored in angle map -> compute and store it
            const halfEdgeDrawElement: HTMLElement | null = <HTMLElement>(
                (this.svgDiv.querySelector("[id='" + halfEdgeId + "']")?.querySelector('path, polyline') as Element)
            );
            if (halfEdgeDrawElement != null) {
                const angle = isLoopEdge
                    ? DiagramUtils.getPathAngle(halfEdgeDrawElement)
                    : DiagramUtils.getPolylineAngle(halfEdgeDrawElement);
                if (angle != null) {
                    this.edgeAngles.set(halfEdgeId, angle);
                }
            }
        }
        return this.edgeAngles.get(halfEdgeId);
    }

    private redrawBusNode(
        node: SVGGraphicsElement,
        busNode: BusNodeMetadata,
        busIndex: number,
        traversingBusEdgesAngles: number[]
    ) {
        const busNodeRadius = DiagramUtils.getNodeRadius(
            busNode.nbNeighbours == null ? 0 : busNode.nbNeighbours,
            this.svgParameters.getVoltageLevelCircleRadius(),
            busIndex,
            this.svgParameters.getInterAnnulusSpace()
        );
        const edgeAngles = Object.assign(
            [],
            traversingBusEdgesAngles.sort(function (a, b) {
                return a - b;
            })
        );
        edgeAngles.push(edgeAngles[0] + 2 * Math.PI);
        const path: string = DiagramUtils.getFragmentedAnnulusPath(
            edgeAngles,
            busNodeRadius,
            this.svgParameters.getNodeHollowWidth()
        );
        const busElement: HTMLElement | null = <HTMLElement>node.querySelectorAll('.nad-busnode')[busIndex];
        if (busElement != null) {
            busElement.setAttribute('d', path);
        }
    }

    private redrawOtherVoltageLevelNode(otherNode: SVGGraphicsElement | null) {
        if (otherNode != null) {
            // get other voltage level node edges
            const edges: EdgeMetadata[] | undefined = this.diagramMetadata?.edges.filter(
                (edge) => edge.node1 == (otherNode?.id ?? -1) || edge.node2 == (otherNode?.id ?? -1)
            );
            // group other voltage level node edges by bus node
            const busNodeEdges: Map<string, EdgeMetadata[]> = new Map<string, EdgeMetadata[]>();
            edges?.forEach((edge) => {
                if (edge.node1 == edge.node2) {
                    // loop edge
                    this.addBusNodeEdge(edge.busNode1, edge, busNodeEdges);
                    this.addBusNodeEdge(edge.busNode2, edge, busNodeEdges);
                } else {
                    const busNodeId = edge.node1 == otherNode?.id ? edge.busNode1 : edge.busNode2;
                    this.addBusNodeEdge(busNodeId, edge, busNodeEdges);
                }
            });
            // redraw other voltage level node
            this.redrawVoltageLevelNode(otherNode, busNodeEdges);
        }
    }

    private redrawThreeWtEdge(edge: EdgeMetadata, edgeNode: SVGGraphicsElement, vlNode: SVGGraphicsElement) {
        const position = DiagramUtils.getPosition(vlNode);
        const twtEdge: HTMLElement = <HTMLElement>edgeNode.firstElementChild;
        if (twtEdge != null) {
            const points = DiagramUtils.getPolylinePoints(twtEdge);
            if (points != null) {
                // compute polyline points
                const edgeNodes = this.getEdgeNodes(edge, vlNode);
                const threeWtMoved = edgeNodes[1]?.id == this.draggedElement?.id;
                const nodeRadius1 = this.getNodeRadius(edge.busNode1 ?? '-1', edge.node1 ?? '-1');
                const edgeStart = this.getEdgeStart(edge.busNode1, nodeRadius1[1], edgeNodes[0], edgeNodes[1]);
                const translation = this.getTranslation(position);
                const edgeEnd = threeWtMoved
                    ? new Point(
                          points[points.length - 1].x + translation.x,
                          points[points.length - 1].y + translation.y
                      )
                    : points[points.length - 1];
                // move polyline
                const polylinePoints: string = DiagramUtils.getFormattedPolyline(edgeStart, null, edgeEnd);
                twtEdge.setAttribute('points', polylinePoints);
                // redraw edge arrow and label
                if (edgeNode.children.length > 1) {
                    this.redrawEdgeArrowAndLabel(edgeNode, edgeStart, null, edgeEnd, nodeRadius1);
                }
                // store edge angles, to use them for bus node redrawing
                this.edgeAngles.set(edgeNode.id + '.1', DiagramUtils.getAngle(edgeStart, edgeEnd));
                // redraw voltage level node connected to three windings transformer
                if (threeWtMoved) {
                    this.redrawOtherVoltageLevelNode(edgeNodes[0]);
                }
            }
        }
    }

    private redrawBoundaryNode(node: SVGGraphicsElement | null, edgeStartAngle: number, busOuterRadius: number) {
        if (node != null) {
            const path: string = DiagramUtils.getBoundarySemicircle(edgeStartAngle, busOuterRadius);
            const pathElement: HTMLElement | null = <HTMLElement>node.firstElementChild;
            if (pathElement != null && pathElement.tagName == 'path') {
                pathElement.setAttribute('d', path);
            }
        }
    }

    private callSelectNodeCallback(mousePosition: Point) {
        // call the select node callback, if defined
        if (this.onSelectNodeCallback != null) {
            // get selected node from metadata
            const node: NodeMetadata | undefined = this.diagramMetadata?.nodes.find(
                (node) => node.svgId == this.selectedElement?.id
            );
            if (node != null) {
                this.onSelectNodeCallback(node.equipmentId, node.svgId, mousePosition);
            }
        }
    }

    public getCurrentlyMaxDisplayedSize(): number {
        const viewbox = this.getViewBox();
        return Math.max(viewbox?.height || 0, viewbox?.width || 0);
    }

    public checkAndUpdateLevelOfDetail(svg: SVGSVGElement) {
        const maxDisplayedSize = this.getCurrentlyMaxDisplayedSize();
        const previousMaxDisplayedSize = this.getPreviousMaxDisplayedSize();
        // in case of bad or unset values NaN or Infinity, this condition is skipped and the function behaves as if zoom changed
        if (
            Math.abs(previousMaxDisplayedSize - maxDisplayedSize) / previousMaxDisplayedSize <
            dynamicCssRulesUpdateThreshold
        ) {
            return;
        }
        this.setPreviousMaxDisplayedSize(maxDisplayedSize);

        //Workaround chromium (tested on edge and google-chrome 131) doesn't
        //redraw things with percentages on viewbox changes but it should, so
        //we force it. This is not strictly related to the enableLevelOfDetail
        //and dynamic css feature, but it turns out that we use percentages in
        //css only in the case where enableLevelOfDetail=true, so we can do the
        //workaround here at each viewbox change until we have other needs or
        //until we remove the workaround entirely. Firefox does correctly
        //redraw, but we force for everyone to have the same behavior
        //everywhere and detect problems more easily. We can't use
        //innerHtml+='' on the <style> tags because values set with
        //setProperty(key, value) in updateSvgCssDisplayValue are not reflected
        //in the html text so the innerHTML trick has the effect of resetting
        //them. So instead of doing it on the svg, we do it on all its children
        //that are not style elements. This won't work if there are deeply
        //nested style elements that need dynamic css rules but in practice
        //only the root style element has dynamic rules so it's ok.
        //TODO Remove this when chromium fixes their bug.
        //TODO If this workaround causes problems, we can find a better way to
        //force a redraw that doesnt change the elements in the dom.
        const innerSvg = svg.querySelector('svg');
        if (innerSvg) {
            for (const child of innerSvg.children) {
                // annoying, sometimes lowercase (html), sometimes uppercase (xml in xhtml or svg))
                if (child.nodeName.toUpperCase() != 'STYLE') {
                    child.innerHTML += '';
                }
            }
            const zoomLevel = this.getZoomLevel(maxDisplayedSize);
            if (zoomLevel != this.lastZoomLevel) {
                innerSvg.setAttribute('class', NetworkAreaDiagramViewer.ZOOM_CLASS_PREFIX + zoomLevel);
                this.lastZoomLevel = zoomLevel;
            }
        }
    }

    private getZoomLevel(maxDisplayedSize: number): number {
        for (const zoomLevel of this.zoomLevels) {
            if (maxDisplayedSize >= zoomLevel) {
                return zoomLevel;
            }
        }
        return 0;
    }

    public setJsonBranchStates(branchStates: string) {
        const branchStatesArray: BranchState[] = JSON.parse(branchStates);
        this.setBranchStates(branchStatesArray);
    }

    public setBranchStates(branchStates: BranchState[]) {
        branchStates.forEach((branchState) => {
            if (!this.edgesMap.has(branchState.branchId)) {
                const edge = (this.diagramMetadata?.edges ?? []).find(
                    (edge) => edge.equipmentId == branchState.branchId
                );
                if (edge === undefined) {
                    console.warn('Skipping updating branch ' + branchState.branchId + ' labels: branch not found');
                    return;
                }
                this.edgesMap.set(branchState.branchId, edge);
            }
            const edgeId = this.edgesMap.get(branchState.branchId)?.svgId ?? '-1';
            this.setBranchSideLabel(branchState.branchId, '1', edgeId, branchState.value1);
            this.setBranchSideLabel(branchState.branchId, '2', edgeId, branchState.value2);
            this.setBranchSideConnection(branchState.branchId, '1', edgeId, branchState.connected1);
            this.setBranchSideConnection(branchState.branchId, '2', edgeId, branchState.connected2);

            const edge = (this.diagramMetadata?.edges ?? []).find((edge) => edge.equipmentId == branchState.branchId);

            if (branchState.connectedBus1 && edge) {
                this.setBranchBusConnection(edge, branchState.branchId, '1', branchState.connectedBus1);
            }
            if (branchState.connectedBus2 && edge) {
                this.setBranchBusConnection(edge, branchState.branchId, '2', branchState.connectedBus2);
            }
        });
    }

    public setJsonVoltageLevelStates(voltageLevelStates: string) {
        const voltageLevelStatesArray: VoltageLevelState[] = JSON.parse(voltageLevelStates);
        this.setVoltageLevelStates(voltageLevelStatesArray);
    }

    public setVoltageLevelStates(voltageLevelStates: VoltageLevelState[]) {
        voltageLevelStates.forEach((vlState) => {
            const textNodeId = this.getTextNodeIdFromEquipmentId(vlState.voltageLevelId);
            if (!textNodeId) {
                console.warn(`Text node for ${vlState.voltageLevelId} not found`);
                return;
            }

            const textNodeElement = this.container.querySelector(`[id='${textNodeId}']`);
            if (!textNodeElement) {
                console.warn(`Text node element ${textNodeId} not found in DOM`);
                return;
            }

            const vlNodeId = DiagramUtils.getVoltageLevelNodeId(textNodeId);

            // Get all buses for this voltage level
            const vlBusNodes = this.diagramMetadata?.busNodes.filter((bus) => bus.vlNode === vlNodeId);
            if (!vlBusNodes || vlBusNodes.length === 0) {
                console.warn(`No bus nodes found for voltage level ${vlState.voltageLevelId}`);
                return;
            }

            // Get span elements
            const spans = textNodeElement.querySelectorAll('div span');

            vlState.busValue.forEach((busValue) => {
                // Find the bus node metadata by id
                const busNode = vlBusNodes.find((bus) => bus.equipmentId === busValue.busId);
                if (!busNode) return;

                const rowIndex = busNode.index;

                if (rowIndex < spans.length) {
                    const div = spans[rowIndex].parentElement;
                    if (
                        div &&
                        div.childNodes.length > 1 &&
                        div.childNodes[div.childNodes.length - 1].nodeType === Node.TEXT_NODE
                    ) {
                        const voltage = busValue.voltage.toFixed(this.svgParameters.getVoltageValuePrecision());
                        const angle = busValue.angle.toFixed(this.svgParameters.getAngleValuePrecision());
                        div.childNodes[div.childNodes.length - 1].textContent = `${voltage} kV / ${angle}°`;
                    }
                }
            });
        });
    }

    private setBranchSideLabel(branchId: string, side: string, edgeId: string, value: number | string) {
        const arrowGElement: SVGGraphicsElement | null = this.svgDiv.querySelector(
            "[id='" + edgeId + '.' + side + "'] .nad-edge-infos g"
        );
        if (arrowGElement !== null) {
            arrowGElement.classList.remove('nad-state-in', 'nad-state-out');
            if (typeof value === 'number') {
                arrowGElement.classList.add(DiagramUtils.getArrowClass(value));
            }
            const branchLabelElement = arrowGElement.querySelector('text');
            if (branchLabelElement !== null) {
                branchLabelElement.innerHTML =
                    typeof value === 'number' ? value.toFixed(this.getEdgeInfoValuePrecision()) : value;
            } else {
                console.warn('Skipping updating branch ' + branchId + ' side ' + side + ' label: text not found');
            }
        } else {
            console.warn('Skipping updating branch ' + branchId + ' side ' + side + ' label: label not found');
        }
    }

    private getEdgeInfoValuePrecision() {
        const edgeInfoDisplayed = this.svgParameters.getEdgeInfoDisplayed();
        switch (edgeInfoDisplayed) {
            case EdgeInfoEnum.ACTIVE_POWER:
            case EdgeInfoEnum.REACTIVE_POWER:
                return this.svgParameters.getPowerValuePrecision();
            case EdgeInfoEnum.CURRENT:
                return this.svgParameters.getCurrentValuePrecision();
            default:
                return 0;
        }
    }

    private setBranchSideConnection(branchId: string, side: string, edgeId: string, connected: boolean | undefined) {
        const halfEdge: SVGGraphicsElement | null = this.svgDiv.querySelector("[id='" + edgeId + '.' + side + "']");
        if (halfEdge !== null) {
            if (connected == undefined || connected) {
                halfEdge.classList.remove('nad-disconnected');
            } else {
                halfEdge.classList.add('nad-disconnected');
            }
        } else {
            console.warn('Skipping updating branch ' + branchId + ' side ' + side + ' status: edge not found');
        }
    }

    /**
     * Updates the connection between a branch and a bus in the electrical network diagram
     * @param edge - the edge to be modified
     * @param branchId - the ID of the branch
     * @param side - The side of the branch to connect ('1' or '2')
     * @param busId - The ID of the target bus to connect to
     */
    private setBranchBusConnection(edge: EdgeMetadata, branchId: string, side: string, busId: string) {
        const targetBusNode = this.diagramMetadata?.busNodes.find((busNode) => busNode.equipmentId === busId);
        if (!targetBusNode) {
            console.warn(
                'Skipping updating branch ' +
                    branchId +
                    ' side ' +
                    side +
                    ' status: Bus ' +
                    busId +
                    ' not found in metadata'
            );
            return;
        }

        const currentBusNodeId = side === '1' ? edge.busNode1 : edge.busNode2;
        const currentBusNode = this.diagramMetadata?.busNodes.find((busNode) => busNode.svgId === currentBusNodeId);

        if (currentBusNode && currentBusNode.vlNode !== targetBusNode.vlNode) {
            console.warn(
                'Skipping updating branch ' +
                    branchId +
                    ' side ' +
                    side +
                    ' status: Cannot connect to bus from different voltage level'
            );
            return;
        }

        if (side === '1') {
            edge.busNode1 = targetBusNode.svgId;
        } else {
            edge.busNode2 = targetBusNode.svgId;
        }

        const vlElement = this.container.querySelector(`[id='${targetBusNode.vlNode}']`) as SVGGraphicsElement;
        if (!vlElement) {
            console.warn(`VoltageLevel ${targetBusNode.vlNode} not found`);
            return;
        }

        const edgeGroup = this.diagramMetadata?.edges.filter(
            (e) =>
                (e.node1 === edge.node1 && e.node2 === edge.node2) || (e.node1 === edge.node2 && e.node2 === edge.node1)
        );
        if (edgeGroup) {
            this.redrawEdgeGroup(edgeGroup, vlElement);
        }
    }

    private onMouseRightDown(event: MouseEvent) {
        const elementData = DiagramUtils.getRightClickableElementData(
            event.target as SVGElement,
            this.diagramMetadata?.nodes,
            this.diagramMetadata?.textNodes,
            this.diagramMetadata?.edges
        );
        if (!elementData) {
            return;
        }
        const mousePosition: Point = this.getMousePosition(event);
        this.onRightClickCallback?.(elementData.svgId, elementData.equipmentId, elementData.type, mousePosition);
    }

    public zoomToFit() {
        const viewBox = DiagramUtils.getViewBox(
            this.diagramMetadata?.nodes,
            this.diagramMetadata?.textNodes,
            this.svgParameters
        );
        this.svgDraw?.viewbox(viewBox.x, viewBox.y, viewBox.width, viewBox.height);
    }

    public zoomIn() {
        const zoom = this.svgDraw?.zoom() ?? 1;
        this.svgDraw?.zoom(1.1 * zoom);
    }

    public zoomOut() {
        const zoom = this.svgDraw?.zoom() ?? 1;
        this.svgDraw?.zoom(0.9 * zoom);
    }

    public saveSvg() {
        this.addStyle();
        const userViewBox: DiagramUtils.ViewBox = {
            x: this.svgDraw?.viewbox().x ?? 0,
            y: this.svgDraw?.viewbox().y ?? 0,
            width: this.svgDraw?.viewbox().width ?? 0,
            height: this.svgDraw?.viewbox().height ?? 0,
        };
        this.zoomToFit();
        const blobData = [this.getSvg() ?? ''];
        const blob = new Blob(blobData, { type: 'image/svg+xml' });
        this.downloadFile(blob, 'nad.svg');
        this.svgDraw?.viewbox(userViewBox.x, userViewBox.y, userViewBox.width, userViewBox.height);
        this.removeStyle();
    }

    private downloadFile(blob: Blob, filename: string) {
        const a = document.createElement('a');
        a.download = filename;
        a.href = URL.createObjectURL(blob);
        a.click();
        a.remove();
    }

    private addStyle() {
        // add style, if not present
        if (this.svgParameters.getCssLocation() == CssLocationEnum.EXTERNAL_NO_IMPORT) {
            const styleElement = DiagramUtils.getStyle(document.styleSheets, this.svgDraw?.node);
            const gElement = this.svgDraw?.node.querySelector('g');
            gElement?.before(styleElement);
        }
    }

    private removeStyle() {
        // remove style, if added
        if (this.svgParameters.getCssLocation() == CssLocationEnum.EXTERNAL_NO_IMPORT) {
            const styleElement: HTMLElement | null = this.svgDiv.querySelector('style');
            styleElement?.remove();
        }
    }

    public savePng(backgroundColor?: string) {
        this.copyPng(true, backgroundColor);
    }

    public screenshot(backgroundColor?: string) {
        this.copyPng(false, backgroundColor);
    }

    private copyPng(copyToFile: boolean, backgroundColor?: string) {
        this.addStyle();
        this.addBackgroundColor(backgroundColor);
        const svgXml = DiagramUtils.getSvgXml(this.getSvg());
        const image = new Image();
        image.src = svgXml;
        image.onload = () => {
            const png = DiagramUtils.getPngFromImage(image);
            const blob = DiagramUtils.getBlobFromPng(png);
            if (copyToFile) {
                this.downloadFile(blob, 'nad.png');
            } else {
                this.copyToClipboard(blob);
            }
        };
        this.removeBackgroundColor(backgroundColor);
        this.removeStyle();
    }

    private addBackgroundColor(backgroundColor?: string) {
        if (backgroundColor) {
            this.svgDraw?.node.style.setProperty('background-color', backgroundColor);
        }
    }

    private removeBackgroundColor(backgroundColor?: string) {
        if (backgroundColor) {
            this.svgDraw?.node.style.removeProperty('background-color');
        }
    }

    private copyToClipboard(blob: Blob) {
        navigator.clipboard
            .write([
                new ClipboardItem({
                    [blob.type]: blob,
                }),
            ])
            .then(() => {
                const keyframes = [
                    { backgroundColor: 'gray', offset: 0 },
                    { backgroundColor: 'white', offset: 0.5 },
                ];
                const timing = { duration: 500, iterations: 1 };
                this.svgDiv.animate(keyframes, timing);
            });
    }
}
