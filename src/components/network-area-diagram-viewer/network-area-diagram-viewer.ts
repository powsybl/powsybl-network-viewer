/**
 * Copyright (c) 2022-2024, RTE (http://www.rte-france.com)
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

import { Point, SVG, Svg, ViewBoxLike } from '@svgdotjs/svg.js';
import '@svgdotjs/svg.panzoom.js';
import * as DiagramUtils from './diagram-utils';
import { ElementType, HalfEdge, isTextNode, isVoltageLevelElement } from './diagram-utils';
import { CssLocationEnum, EdgeInfoEnum, SvgParameters } from './svg-parameters';
import { LayoutParameters } from './layout-parameters';
import {
    BusNodeMetadata,
    DiagramMetadata,
    EdgeMetadata,
    InjectionMetadata,
    NodeMetadata,
    TextNodeMetadata,
} from './diagram-metadata';
import { debounce } from '@mui/material';
import {
    NadViewerParameters,
    NadViewerParametersOptions,
    OnBendLineCallbackType,
    OnMoveNodeCallbackType,
    OnMoveTextNodeCallbackType,
    OnRightClickCallbackType,
    OnSelectNodeCallbackType,
    OnToggleNadHoverCallbackType,
} from './nad-viewer-parameters';
import { Cancelable } from '@mui/utils/debounce/debounce';

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

export enum LineOperation {
    BEND,
    STRAIGHTEN,
}

export enum DraggedElementType {
    VOLTAGE_LEVEL_NODE,
    TEXT_NODE,
    BENT_SQUARE,
}

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
    innerSvg: SVGElement | undefined;
    ratio = 1;
    selectedElement: SVGGraphicsElement | null = null;
    draggedElement: SVGGraphicsElement | null = null;
    hoveredElement: SVGElement | null = null;
    hoveredElementPosition: Point = new Point(0, 0);
    transform: SVGTransform | undefined;
    ctm: DOMMatrix | null | undefined = null;
    initialPosition: Point = new Point(0, 0);
    svgParameters: SvgParameters;
    layoutParameters: LayoutParameters;
    nadViewerParameters: NadViewerParameters;
    edgeAngles1: Map<string, number> = new Map<string, number>();
    edgeAngles2: Map<string, number> = new Map<string, number>();
    draggedElementType: DraggedElementType | null = null;
    enableDragInteraction: boolean = false;
    isDragging: boolean = false;
    endTextEdge: Point = new Point(0, 0);
    onMoveNodeCallback: OnMoveNodeCallbackType | null;
    onMoveTextNodeCallback: OnMoveTextNodeCallbackType | null;
    onSelectNodeCallback: OnSelectNodeCallbackType | null;
    onToggleHoverCallback: OnToggleNadHoverCallbackType | null;
    debounceToggleHoverCallback: (OnToggleNadHoverCallbackType | null) & Cancelable;
    previousMaxDisplayedSize: number;
    edgesMap: Map<string, EdgeMetadata> = new Map<string, EdgeMetadata>();
    onRightClickCallback: OnRightClickCallbackType | null;
    originalNodePosition: Point = new Point(0, 0);
    originalTextNodeShift: Point = new Point(0, 0);
    originalTextNodeConnectionShift: Point = new Point(0, 0);
    lastZoomLevel: number = 0;
    zoomLevels: number[] = [0, 1000, 2200, 2500, 3000, 4000, 9000, 12000, 20000];
    isHoverCallbackUsed: boolean = false;
    hoverPositionPrecision: number = 0;
    bendLines: boolean = false;
    onBendLineCallback: OnBendLineCallbackType | null;
    straightenedElement: SVGGraphicsElement | null = null;
    bendableLines: string[] = [];

    linePointIndexMap = new Map<string, { edgeId: string; index: number }>();

    static readonly ZOOM_CLASS_PREFIX = 'nad-zoom-';

    /**
     * @param container - The HTML element that will contain the SVG diagram.
     * @param svgContent - The SVG content to be rendered in the viewer.
     * @param diagramMetadata - Metadata associated with the diagram, including nodes, edges, and other properties.
     * @param nadViewerParametersOptions - Parameters for the network area diagram viewer.
     */
    constructor(
        container: HTMLElement,
        svgContent: string,
        diagramMetadata: DiagramMetadata | null,
        nadViewerParametersOptions: NadViewerParametersOptions | null
    ) {
        this.container = container;
        this.svgDiv = document.createElement('div');
        this.svgDiv.id = 'svg-container';
        this.svgContent = this.fixSvgContent(svgContent);
        this.diagramMetadata = diagramMetadata;
        this.nadViewerParameters = new NadViewerParameters(nadViewerParametersOptions ?? undefined);
        this.width = 0;
        this.height = 0;
        this.originalWidth = 0;
        this.originalHeight = 0;
        this.enableDragInteraction = this.nadViewerParameters.getEnableDragInteraction();
        this.onMoveNodeCallback = this.nadViewerParameters.getOnMoveNodeCallback();
        this.onMoveTextNodeCallback = this.nadViewerParameters.getOnMoveTextNodeCallback();
        this.onRightClickCallback = this.nadViewerParameters.getOnRightClickCallback();
        this.onSelectNodeCallback = this.nadViewerParameters.getOnSelectNodeCallback();
        this.onToggleHoverCallback = this.nadViewerParameters.getOnToggleHoverCallback();
        this.debounceToggleHoverCallback = this.initDebounceToggleHoverCallback();
        this.onBendLineCallback = this.nadViewerParameters.getOnBendingLineCallback();
        this.zoomLevels = this.nadViewerParameters.getZoomLevels();
        this.zoomLevels.sort((a, b) => b - a);
        this.hoverPositionPrecision = this.nadViewerParameters.getHoverPositionPrecision();
        this.init();
        this.svgParameters = new SvgParameters(this.diagramMetadata?.svgParameters);
        this.layoutParameters = new LayoutParameters(this.diagramMetadata?.layoutParameters);
        this.previousMaxDisplayedSize = 0;
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

        const textNodeMetadata: TextNodeMetadata | undefined = this.diagramMetadata?.textNodes.find(
            (node) => node.equipmentId == equipmentId
        );
        if (!textNodeMetadata) {
            return;
        }

        const elemToMove: SVGGraphicsElement | null = this.svgDiv.querySelector(
            '[id="' + textNodeMetadata.svgId + '"]'
        );
        if (!elemToMove) {
            return;
        }
        this.endTextEdge = new Point(nodePosition.x + connectionShiftX, nodePosition.y + connectionShiftY);

        const textNodeTopLeftCornerPosition = new Point(nodePosition.x + shiftX, nodePosition.y + shiftY);

        // update metadata only
        this.updateTextNodeMetadata(textNodeMetadata.svgId, textNodeTopLeftCornerPosition);

        //update and redraw element
        this.updateElement(elemToMove);
    }

    private hasNodeInteraction(): boolean {
        return this.enableDragInteraction || this.onRightClickCallback != null || this.onSelectNodeCallback != null;
    }

    public init() {
        if (!this.container || !this.svgContent) return;

        const dimensions: DiagramUtils.Dimensions | null = this.getDimensionsFromSvg();
        if (!dimensions) return;

        // clear the previous svg in div element before replacing
        this.container.innerHTML = '';

        // add nad viewer div
        const nadViewerDiv = document.createElement('div');
        nadViewerDiv.id = 'nad-viewer';
        nadViewerDiv.style.position = 'relative';
        this.container.appendChild(nadViewerDiv);

        // add buttons bar div
        if (this.nadViewerParameters.getAddButtons()) {
            nadViewerDiv.appendChild(this.getZoomButtonsBar());
            nadViewerDiv.appendChild(this.getActionButtonsBar());
        }

        // add svg div
        nadViewerDiv.appendChild(this.svgDiv);

        // set dimensions
        this.setOriginalWidth(dimensions.width);
        this.setOriginalHeight(dimensions.height);
        this.setWidth(
            dimensions.width < this.nadViewerParameters.getMinWidth()
                ? this.nadViewerParameters.getMinWidth()
                : Math.min(dimensions.width, this.nadViewerParameters.getMaxWidth())
        );
        this.setHeight(
            dimensions.height < this.nadViewerParameters.getMinHeight()
                ? this.nadViewerParameters.getMinHeight()
                : Math.min(dimensions.height, this.nadViewerParameters.getMaxHeight())
        );

        // set the SVG
        const viewBox: ViewBoxLike = this.nadViewerParameters.getInitialViewBox() ?? {
            x: dimensions.viewbox.x,
            y: dimensions.viewbox.y,
            width: dimensions.viewbox.width,
            height: dimensions.viewbox.height,
        };
        this.svgDraw = SVG().addTo(this.svgDiv).size(this.width, this.height).viewbox(viewBox);
        this.innerSvg = <SVGElement>this.svgDraw.svg(this.svgContent).node.firstElementChild;
        this.innerSvg.style.overflow = 'visible';

        // add events
        const hasMetadata = this.diagramMetadata !== null;
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
                this.hideEdgePreviewPoints();
            });
        }
        if (this.onRightClickCallback != null && hasMetadata) {
            this.svgDraw.on('mousedown', (e: Event) => {
                if ((e as MouseEvent).button == 2) {
                    this.onMouseRightDown(e as MouseEvent);
                }
            });
        }

        const drawnSvg = this.innerSvg;
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

        if (this.nadViewerParameters.getEnableLevelOfDetail()) {
            this.svgDraw.fire('zoom'); // Forces a new dynamic zoom check to correctly update the dynamic CSS

            // We add an observer to track when the SVG's viewBox is updated by panzoom
            // (we have to do this instead of using panzoom's 'zoom' event to have accurate viewBox updates)
            this.checkAndUpdateLevelOfDetail();
            // Callback function to execute when mutations are observed
            const observerCallback = (mutationList: MutationRecord[]) => {
                for (const mutation of mutationList) {
                    if (mutation.attributeName === 'viewBox') {
                        this.checkAndUpdateLevelOfDetail();
                    }
                }
            };

            // Create a debounced version of the observer callback to limit the frequency of calls when the 'viewBox' attribute changes,
            // particularly during zooming operations, improving performance and avoiding redundant updates.
            const debouncedObserverCallback = debounce(observerCallback, 50);
            const observer = new MutationObserver(debouncedObserverCallback);
            observer.observe(this.svgDraw.node, { attributeFilter: ['viewBox'] });
        }

        if (this.hasNodeInteraction() && hasMetadata) {
            // fill empty elements: unknown buses and three windings transformers
            const emptyElements: NodeListOf<SVGGraphicsElement> = this.svgDiv.querySelectorAll(
                '.nad-unknown-busnode, .nad-3wt-nodes .nad-winding, g.nad-injections>g>g>g>g>circle'
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

    private initDebounceToggleHoverCallback() {
        return debounce((hovered: boolean, mousePosition: Point | null, equipmentId: string, equipmentType: string) => {
            this.onToggleHoverCallback?.(hovered, mousePosition, equipmentId, equipmentType);
        }, 250);
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

        const screenshotButton = DiagramUtils.getDisabledScreenshotButton();
        buttonsDiv.appendChild(screenshotButton);
        screenshotButton.addEventListener('click', () => {
            this.screenshot(NetworkAreaDiagramViewer.DEFAULT_PNG_BACKGROUND_COLOR);
        });
        navigator.permissions
            .query({ name: 'clipboard-write' as PermissionName })
            .then((result) => {
                if (result.state == 'granted' || result.state == 'prompt') {
                    DiagramUtils.enableButton(screenshotButton);
                } else {
                    console.warn('Write access to clipboard not granted');
                }
            })
            .catch((err) => {
                // Firefox does not support clipboard-write permission
                console.warn('clipboard-write permission not supported: ' + err);
                // add button based on clipboard availability
                if (navigator.clipboard) {
                    DiagramUtils.enableButton(screenshotButton);
                } else {
                    console.warn('Navigator clipboard not available');
                }
            });

        const bendLinesButton = DiagramUtils.getBendLinesButton();
        buttonsDiv.appendChild(bendLinesButton);
        bendLinesButton.addEventListener('click', () => {
            if (this.bendLines) {
                this.disableLineBending();
                bendLinesButton.classList.remove('bend-lines-button-active');
                bendLinesButton.classList.add('bend-lines-button-inactive');
                bendLinesButton.title = 'Enable line bending';
            } else {
                this.enableLineBending();
                if (this.bendLines) {
                    bendLinesButton.classList.remove('bend-lines-button-inactive');
                    bendLinesButton.classList.add('bend-lines-button-active');
                    bendLinesButton.title = 'Disable line bending';
                }
            }
        });
        return buttonsDiv;
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
        let targetElement = event.target as SVGElement;
        if (this.hoveredElement && this.existsNearbyHoveredElement(this.getMousePosition(event))) {
            targetElement = this.hoveredElement;
        }
        const selectableElem = DiagramUtils.getSelectableFrom(targetElement);
        const draggableElem = DiagramUtils.getDraggableFrom(targetElement);

        if (event.shiftKey) {
            this.initSelection(selectableElem);
            if (this.bendLines) {
                this.onStraightenStart(DiagramUtils.getBendableFrom(targetElement));
            }
        } else {
            this.initSelection(selectableElem);

            if (this.enableDragInteraction) {
                this.initDrag(draggableElem);
            }

            if (this.bendLines && !draggableElem) {
                this.createEdgeBendPoint(DiagramUtils.getBendableLineFrom(targetElement, this.bendableLines), event);
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

        if (DiagramUtils.isBendable(this.draggedElement)) {
            this.draggedElementType = DraggedElementType.BENT_SQUARE;
        } else if (DiagramUtils.isTextNode(draggableElem)) {
            this.draggedElementType = DraggedElementType.TEXT_NODE;
        } else {
            this.draggedElementType = DraggedElementType.VOLTAGE_LEVEL_NODE;
        }
    }

    private onDragStart() {
        this.isDragging = true;

        // change cursor style
        const svg: HTMLElement = <HTMLElement>this.svgDraw?.node.firstElementChild?.parentElement;
        svg.style.cursor = 'grabbing';

        this.ctm = this.svgDraw?.node.getScreenCTM(); // used to compute mouse movement
        this.edgeAngles1 = new Map<string, number>(); // used for node redrawing
        this.edgeAngles2 = new Map<string, number>(); // used for node redrawing

        if (this.draggedElementType == DraggedElementType.TEXT_NODE) {
            this.initialPosition = DiagramUtils.getTextNodePosition(this.draggedElement); // used for the offset
            this.endTextEdge = new Point(0, 0);
            const textNode: TextNodeMetadata | undefined = this.diagramMetadata?.textNodes.find(
                (textNode) => textNode.svgId == this.draggedElement?.id
            );
            if (textNode) {
                this.originalTextNodeShift = new Point(textNode.shiftX, textNode.shiftY);
                this.originalTextNodeConnectionShift = new Point(textNode.connectionShiftX, textNode.connectionShiftY);
            }
        } else if (this.draggedElementType == DraggedElementType.VOLTAGE_LEVEL_NODE) {
            this.initialPosition = DiagramUtils.getPosition(this.draggedElement); // used for the offset
            const node: NodeMetadata | undefined = this.diagramMetadata?.nodes.find(
                (node) => node.svgId == this.draggedElement?.id
            );
            if (node) {
                this.originalNodePosition = new Point(node.x, node.y);
            }
        } else if (this.draggedElementType === DraggedElementType.BENT_SQUARE) {
            this.initialPosition = DiagramUtils.getPosition(this.draggedElement);
        }
    }

    private onMouseMove(event: MouseEvent) {
        if (!this.draggedElement) {
            this.handleHoverCallBack(event);
            return;
        }

        event.preventDefault();
        this.ctm = this.svgDraw?.node.getScreenCTM();
        const mousePosition = this.getMousePosition(event);

        if (!this.isDragging) {
            this.onDragStart();
        }

        if (this.draggedElementType === DraggedElementType.TEXT_NODE) {
            const topLeftCornerPosition = DiagramUtils.getTextNodeTopLeftCornerFromCenter(
                this.draggedElement,
                mousePosition
            );
            this.updateTextNodeMetadata(this.draggedElement.id, topLeftCornerPosition);
            this.updateElement(this.draggedElement);
        } else if (this.draggedElementType === DraggedElementType.VOLTAGE_LEVEL_NODE) {
            this.updateNodeMetadata(this.draggedElement, mousePosition);
            this.updateElement(this.draggedElement);
        } else if (this.draggedElementType === DraggedElementType.BENT_SQUARE) {
            this.updateEdgeMetadata(this.draggedElement, mousePosition, LineOperation.BEND);
            this.redrawBentLine(this.draggedElement, LineOperation.BEND);
        }
    }

    private updateNodeMetadata(vlNode: SVGGraphicsElement, position: Point) {
        const node: NodeMetadata | undefined = this.diagramMetadata?.nodes.find((node) => node.svgId == vlNode.id);
        if (node != null) {
            const nodeMove = DiagramUtils.getNodeMove(node, position);
            node.x = nodeMove.xNew;
            node.y = nodeMove.yNew;
        }
    }

    private updateTextNodeMetadata(textNodeId: string, position: Point) {
        const textNode: TextNodeMetadata | undefined = this.diagramMetadata?.textNodes.find(
            (textNode) => textNode.svgId == textNodeId
        );
        if (!textNode) {
            return;
        }

        const node: NodeMetadata | undefined = this.diagramMetadata?.nodes.find(
            (node) => node.svgId == textNode.vlNode
        );
        if (!node) {
            return;
        }

        const textNodeMoves = DiagramUtils.getTextNodeMoves(textNode, node, position, this.endTextEdge);
        textNode.shiftX = textNodeMoves[0].xNew;
        textNode.shiftY = textNodeMoves[0].yNew;
        textNode.connectionShiftX = textNodeMoves[1].xNew;
        textNode.connectionShiftY = textNodeMoves[1].yNew;
    }

    private updateElement(element: SVGGraphicsElement) {
        if (DiagramUtils.isTextNode(element)) {
            this.initialPosition = DiagramUtils.getTextNodePosition(element);
            this.updateVoltageLevelText(element);
        } else {
            this.initialPosition = DiagramUtils.getPosition(element);
            this.updateVoltageLevelNode(element);
        }
    }

    private existsNearbyHoveredElement(mousePosition: Point): boolean {
        if (!this.hoveredElement) {
            return false;
        }
        return DiagramUtils.getDistance(this.hoveredElementPosition, mousePosition) <= this.hoverPositionPrecision;
    }

    private onHover(mouseEvent: MouseEvent) {
        const hoverableElem = DiagramUtils.getHoverableFrom(mouseEvent.target as SVGElement);
        if (!hoverableElem) {
            return;
        }
        this.hoveredElement = hoverableElem;
        this.hoveredElementPosition = this.getMousePosition(mouseEvent);
    }

    private handleHoverCallBack(mouseEvent: MouseEvent) {
        if (!this.hoveredElement) {
            return;
        }

        this.clearHighlights();
        const mousePosition = this.getMousePosition(mouseEvent);

        // Check if we are over the hovered object
        const hoverableElem = DiagramUtils.getHoverableFrom(mouseEvent.target as SVGElement);
        if (hoverableElem && hoverableElem === this.hoveredElement) {
            // We are still over the hoveredElement, we update the mouse position
            this.hoveredElementPosition = mousePosition;
        }

        if (this.existsNearbyHoveredElement(mousePosition)) {
            if (DiagramUtils.isHighlightableElement(this.hoveredElement)) {
                this.handleHighlightableElementHover(this.hoveredElement, mousePosition);
            } else if (DiagramUtils.isInjection(this.hoveredElement)) {
                this.handleInjectionHover(this.hoveredElement, mousePosition);
            } else {
                this.handleEdgeHover(this.hoveredElement, mousePosition);
            }
            this.isHoverCallbackUsed = true;
        } else {
            this.debounceToggleHoverCallback.clear();
            if (this.isHoverCallbackUsed) {
                this.isHoverCallbackUsed = false;
                this.onToggleHoverCallback?.(false, null, '', '');
            }
            this.hideEdgePreviewPoints();
            this.hoveredElement = null;
        }
    }

    private onMouseLeftUpOrLeave(mouseEvent: MouseEvent) {
        // check if I moved or selected an element
        if (this.isDragging) {
            // moving element
            this.onDragEnd();
        } else if (this.selectedElement) {
            // selecting element
            const mousePosition = this.getMousePosition(mouseEvent);
            this.onSelectEnd(mousePosition);
        } else if (this.straightenedElement) {
            // straightening line
            this.onStraightenEnd();
        }
        this.resetMouseEventParams();
    }

    private resetMouseEventParams() {
        this.selectedElement = null;
        this.isDragging = false;
        this.draggedElement = null;
        this.draggedElementType = null;
        this.initialPosition = new Point(0, 0);
        this.ctm = null;
        this.originalNodePosition = new Point(0, 0);
        this.originalTextNodeShift = new Point(0, 0);
        this.originalTextNodeConnectionShift = new Point(0, 0);

        // change cursor style back to normal
        const svg: HTMLElement = <HTMLElement>this.svgDraw?.node.firstElementChild?.parentElement;
        svg.style.removeProperty('cursor');

        this.enablePanzoom();
    }

    private onDragEnd() {
        if (!this.draggedElement) {
            return;
        }
        switch (this.draggedElementType) {
            case DraggedElementType.BENT_SQUARE:
                this.callBendLineCallback(this.draggedElement, LineOperation.BEND);
                break;
            case DraggedElementType.TEXT_NODE:
                this.callMoveTextNodeCallback(this.draggedElement);
                break;
            case DraggedElementType.VOLTAGE_LEVEL_NODE:
                this.callMoveNodeCallback(this.draggedElement);
                break;
            default:
                return;
        }
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
            const textNode: TextNodeMetadata | undefined = this.diagramMetadata?.textNodes.find(
                (textNode) => textNode.svgId == textNodeElement.id
            );
            if (!textNode) {
                return;
            }

            const node: NodeMetadata | undefined = this.diagramMetadata?.nodes.find(
                (node) => node.svgId == textNode.vlNode
            );
            if (!node) {
                return;
            }

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

    private updateVoltageLevelText(textNode: SVGGraphicsElement) {
        window.getSelection()?.empty(); // to avoid text highlighting in firefox

        const textNodeMetadata = this.diagramMetadata?.textNodes.find((node) => node.svgId === textNode.id);
        if (!textNodeMetadata) {
            return;
        }

        const vlNodeMetadata = this.diagramMetadata?.nodes.find((node) => node.svgId === textNodeMetadata.vlNode);
        if (vlNodeMetadata) {
            const position = new Point(
                vlNodeMetadata.x + textNodeMetadata.shiftX,
                vlNodeMetadata.y + textNodeMetadata.shiftY
            );
            this.updateText(textNode, vlNodeMetadata, position);
        }
    }

    private updateVoltageLevelNode(vlNode: SVGGraphicsElement) {
        const nodeMetadata = this.diagramMetadata?.nodes.find((node) => node.svgId === vlNode.id);
        if (nodeMetadata) {
            const position = new Point(nodeMetadata.x, nodeMetadata.y);
            this.updateNodePosition(vlNode, position);
            const textNode: SVGGraphicsElement | null = this.svgDiv.querySelector(
                "[id='" + nodeMetadata.legendSvgId + "']"
            );
            if (textNode) {
                this.updateVoltageLevelText(textNode);
            }
            this.updateEdges(vlNode, position);
            this.updateInjections(vlNode, position);
        }
    }

    private updateNodePosition(vlNode: SVGGraphicsElement, position: Point) {
        vlNode.setAttribute('transform', 'translate(' + DiagramUtils.getFormattedPoint(position) + ')');
    }

    private updateText(textNode: SVGGraphicsElement, nodeMetadata: NodeMetadata, position: Point) {
        // update text node position
        this.updateTextNodePosition(textNode, position);

        // redraw text edge
        const textNodeSize = DiagramUtils.getTextNodeSize(textNode);
        this.redrawTextEdge(
            nodeMetadata.legendEdgeSvgId,
            position,
            nodeMetadata,
            textNodeSize.height,
            textNodeSize.width
        );
    }

    private updateTextNodePosition(textElement: SVGGraphicsElement | null, point: Point) {
        if (textElement != null) {
            textElement.style.left = point.x.toFixed(0) + 'px';
            textElement.style.top = point.y.toFixed(0) + 'px';
        }
    }

    private redrawTextEdge(
        textEdgeId: string | undefined,
        textNodePosition: Point,
        node: NodeMetadata,
        textHeight: number,
        textWidth: number
    ) {
        if (!textEdgeId) {
            return;
        }
        const textEdge: SVGGraphicsElement | null = this.svgDiv.querySelector("[id='" + textEdgeId + "']");
        if (textEdge != null) {
            // compute voltage level circle radius
            const busNodes: BusNodeMetadata[] | undefined = this.diagramMetadata?.busNodes.filter(
                (busNode) => busNode.vlNode == node.svgId
            );
            const nbNeighbours = busNodes !== undefined && busNodes.length > 1 ? busNodes.length - 1 : 0;
            const voltageLevelCircleRadius = DiagramUtils.getVoltageLevelCircleRadius(
                nbNeighbours,
                node?.fictitious,
                this.svgParameters
            );
            // compute text edge start and end
            const vlNodePosition = new Point(node.x, node.y);
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
            const polyline = DiagramUtils.getFormattedPolyline([startTextEdge, this.endTextEdge]);
            textEdge.setAttribute('points', polyline);
        }
    }

    private updateSvgElementPosition(svgElementId: string | undefined, translation: Point) {
        if (!svgElementId) return;
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
            const translation = this.getTranslation(position);
            this.updateSvgElementPosition(inj.svgId, translation);
            this.updateSvgElementPosition(inj.edgeInfo?.svgId, translation);
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

        const injectionsEdges: Map<string, InjectionMetadata[]> = new Map<string, InjectionMetadata[]>();
        this.addInjectionEdges(vlNode.id, injectionsEdges);

        // redraw grouped edges
        for (const edgeGroup of groupedEdges.values()) {
            this.redrawEdgeGroup(edgeGroup, vlNode);
        }
        // redraw loop edges
        for (const edgeGroup of loopEdges.values()) {
            this.redrawLoopEdgeGroup(edgeGroup, position);
        }
        // redraw node
        this.redrawVoltageLevelNode(vlNode, busNodeEdges, injectionsEdges);
    }

    private addInjectionEdges(vlNodeId: string, injectionsEdges: Map<string, InjectionMetadata[]>) {
        const injections: InjectionMetadata[] | undefined = this.diagramMetadata?.injections?.filter(
            (injection) => injection.vlNodeId == vlNodeId
        );
        injections?.forEach((inj) => {
            this.addInjectionEdge(inj.busNodeId, inj, injectionsEdges);
        });
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

    private addInjectionEdge(
        busNodeId: string | null,
        injection: InjectionMetadata,
        injectionEdges: Map<string, InjectionMetadata[]>
    ) {
        let injectionEdgesGroup: InjectionMetadata[] = [];
        if (busNodeId != null) {
            if (injectionEdges.has(busNodeId)) {
                injectionEdgesGroup = injectionEdges.get(busNodeId) ?? [];
            }
            injectionEdgesGroup.push(injection);
            injectionEdges.set(busNodeId, injectionEdgesGroup);
        }
    }

    private getEdgeNodes(
        edge: EdgeMetadata,
        vlNode: SVGGraphicsElement | null
    ): [SVGGraphicsElement | null, SVGGraphicsElement | null] {
        if (!vlNode) return [null, null];

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

    private redrawEdgeGroup(edges: EdgeMetadata[], vlNode: SVGGraphicsElement) {
        if (edges.length == 1) {
            this.redrawStraightEdge(edges[0], vlNode); // 1 edge in the group -> straight line
        } else {
            this.redrawForkEdge(edges, vlNode);
        }
    }

    private redrawForkEdge(edges: EdgeMetadata[], vlNode: SVGGraphicsElement) {
        const position: Point = DiagramUtils.getPosition(vlNode);
        const otherNodeId = vlNode.id === edges[0].node1 ? edges[0].node2 : edges[0].node1;
        const otherNode: SVGGraphicsElement | null = this.svgDiv.querySelector("[id='" + otherNodeId + "']");

        let iEdge = 0;
        edges.forEach((edge) => {
            if (2 * iEdge + 1 == edges.length) {
                this.redrawStraightEdge(edge, vlNode); // central edge, if present -> straight line
            } else {
                // get edge type
                const edgeType = DiagramUtils.getEdgeType(edge);
                if (edgeType == DiagramUtils.EdgeType.UNKNOWN) {
                    return;
                }
                if (otherNode == null) {
                    // only 1 side of the edge is in the SVG
                    const translation = this.getTranslation(position);
                    this.updateSvgElementPosition(edge.svgId, translation);
                    this.updateSvgElementPosition(edge.edgeInfo1?.svgId, translation);
                    this.updateSvgElementPosition(edge.edgeInfo2?.svgId, translation);
                    return;
                }
                // get edge element
                const edgeNode: SVGGraphicsElement | null = this.svgDiv.querySelector("[id='" + edge.svgId + "']");
                if (!edgeNode) {
                    return;
                }

                // compute moved edge data: polyline points
                const halfEdges = this.getHalfEdges(edge, iEdge, edges.length);

                // redraw edge
                this.redrawEdge(edgeNode, halfEdges[0], halfEdges[1], edgeType);
            }
            iEdge++;
        });

        // redraw other voltage level node
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
            const translation = this.getTranslation(position);
            this.updateSvgElementPosition(edge.svgId, translation);
            this.updateSvgElementPosition(edge.edgeInfo1?.svgId, translation);
            this.updateSvgElementPosition(edge.edgeInfo2?.svgId, translation);
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
        const halfEdges = this.getHalfEdges(edge, 0, 1);

        // redraw edge
        this.redrawEdge(edgeNode, halfEdges[0], halfEdges[1], edgeType);

        // if dangling line edge -> redraw boundary node
        if (edgeType == DiagramUtils.EdgeType.DANGLING_LINE) {
            this.redrawBoundaryNode(edgeNodes[1], halfEdges[1]);
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

    private redrawEdge(
        edgeNode: SVGGraphicsElement,
        halfEdge1: HalfEdge | null,
        halfEdge2: HalfEdge | null,
        edgeType: DiagramUtils.EdgeType
    ) {
        if (halfEdge1 == null || halfEdge2 == null) return;

        this.redrawHalfEdge(edgeNode, halfEdge1);
        this.redrawHalfEdge(edgeNode, halfEdge2);

        const isTransformerEdge = DiagramUtils.isTransformerEdge(edgeType);
        const isHVDCLineEdge =
            edgeType == DiagramUtils.EdgeType.HVDC_LINE_LCC || edgeType == DiagramUtils.EdgeType.HVDC_LINE_VSC;
        if (isTransformerEdge) {
            this.redrawTransformer(edgeNode, halfEdge1, halfEdge2, edgeType);
        } else if (isHVDCLineEdge) {
            this.redrawConverterStation(edgeNode, halfEdge1, halfEdge2);
        }
        // if present, move edge name
        if (this.svgParameters.getEdgeNameDisplayed()) {
            this.updateEdgeName(edgeNode, halfEdge1, halfEdge2);
        }
        // store edge angles, to use them for bus node redrawing
        this.edgeAngles1.set(edgeNode.id, DiagramUtils.getEdgeStartAngle(halfEdge1));
        this.edgeAngles2.set(edgeNode.id, DiagramUtils.getEdgeStartAngle(halfEdge2));
    }

    private redrawHalfEdge(edgeNode: SVGGraphicsElement, halfEdge: HalfEdge) {
        // move edge polyline
        const polyline: SVGGraphicsElement | null = edgeNode.querySelector(
            ':scope > polyline.nad-edge-path:nth-of-type(' + halfEdge.side + ')'
        );
        polyline?.setAttribute('points', DiagramUtils.getFormattedPolyline(halfEdge.edgePoints));

        // redraw edge arrow and label
        this.redrawEdgeArrowAndLabel(halfEdge);
    }

    private redrawEdgeArrowAndLabel(halfEdge: HalfEdge) {
        if (!halfEdge.edgeInfoId) {
            return;
        }
        const edgeInfo: SVGGraphicsElement | null = this.svgDiv.querySelector("[id='" + halfEdge.edgeInfoId + "']");
        if (!edgeInfo) {
            return;
        }

        // move edge arrow
        const arrowCenter = DiagramUtils.getArrowCenter(halfEdge, this.svgParameters);
        edgeInfo.setAttribute('transform', 'translate(' + DiagramUtils.getFormattedPoint(arrowCenter) + ')');
        const arrowAngle = DiagramUtils.getArrowRotation(halfEdge);
        const arrowRotationElement = edgeInfo.firstElementChild as SVGGraphicsElement;
        arrowRotationElement.setAttribute('transform', 'rotate(' + DiagramUtils.getFormattedValue(arrowAngle) + ')');

        // move edge label
        const labelData = DiagramUtils.getLabelData(halfEdge, this.svgParameters.getArrowLabelShift());
        const labelRotationElement = edgeInfo.lastElementChild as SVGGraphicsElement;
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
        halfEdge1: HalfEdge,
        halfEdge2: HalfEdge,
        edgeType: DiagramUtils.EdgeType
    ) {
        const transformerElement: SVGGraphicsElement = edgeNode.lastElementChild as SVGGraphicsElement;
        // move transformer circles
        const transformerCircles: NodeListOf<SVGGraphicsElement> = transformerElement?.querySelectorAll('circle');
        this.redrawTransformerCircle(
            transformerCircles.item(0),
            halfEdge1.edgePoints.at(-2)!,
            halfEdge1.edgePoints.at(-1)!
        );
        this.redrawTransformerCircle(
            transformerCircles.item(1),
            halfEdge2.edgePoints.at(-2)!,
            halfEdge2.edgePoints.at(-1)!
        );
        // if phase shifting transformer move transformer arrow
        const isPSTransformerEdge = edgeType == DiagramUtils.EdgeType.PHASE_SHIFT_TRANSFORMER;
        if (isPSTransformerEdge) {
            this.redrawTransformerArrow(
                transformerElement,
                halfEdge1.edgePoints.at(-2)!,
                halfEdge1.edgePoints.at(-1)!,
                DiagramUtils.getMidPosition(halfEdge1.edgePoints.at(-1)!, halfEdge2.edgePoints.at(-1)!)
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

    private redrawConverterStation(edgeNode: SVGGraphicsElement, halfEdge1: HalfEdge, halfEdge2: HalfEdge) {
        const converterStationElement: SVGGraphicsElement = edgeNode.lastElementChild as SVGGraphicsElement;
        const polylinePoints: string = DiagramUtils.getConverterStationPolyline(
            halfEdge1,
            halfEdge2,
            this.svgParameters.getConverterStationWidth()
        );
        const polyline: SVGGraphicsElement | null = converterStationElement.querySelector('polyline');
        polyline?.setAttribute('points', polylinePoints);
    }

    private redrawLoopEdgeGroup(edges: EdgeMetadata[], position: Point) {
        edges.forEach((edge) => {
            const translation = this.getTranslation(position);
            this.updateSvgElementPosition(edge.svgId, translation);
            this.updateSvgElementPosition(edge.edgeInfo1?.svgId, translation);
            this.updateSvgElementPosition(edge.edgeInfo2?.svgId, translation);
        });
    }

    private updateEdgeName(edgeNode: SVGGraphicsElement, halfEdge1: HalfEdge, halfEdge2: HalfEdge) {
        const positionElement: SVGGraphicsElement | null = edgeNode.querySelector(
            '.nad-edge-label'
        ) as SVGGraphicsElement;
        if (!positionElement) return;

        const anchorPoint = DiagramUtils.getMidPosition(halfEdge1.edgePoints.at(-1)!, halfEdge2.edgePoints.at(-1)!);
        const edgeNameAngle = DiagramUtils.getEdgeNameAngle(anchorPoint, halfEdge2.edgePoints.at(-2)!);

        // move edge name position
        positionElement.setAttribute('transform', 'translate(' + DiagramUtils.getFormattedPoint(anchorPoint) + ')');
        const angleElement: SVGGraphicsElement | null = positionElement.querySelector('text') as SVGGraphicsElement;
        if (angleElement != null) {
            // change edge name angle
            angleElement.setAttribute('transform', 'rotate(' + DiagramUtils.getFormattedValue(edgeNameAngle) + ')');
        }
    }

    private redrawVoltageLevelNode(
        node: SVGGraphicsElement | null,
        busNodeEdges: Map<string, EdgeMetadata[]>,
        injectionsEdges: Map<string, InjectionMetadata[]>
    ) {
        if (node != null) {
            // get buses belonging to voltage level
            const busNodes: BusNodeMetadata[] | undefined = this.diagramMetadata?.busNodes.filter(
                (busNode) => busNode.vlNode == node.id
            );
            const nodeMetadata: NodeMetadata | undefined = DiagramUtils.getNodeMetadata(node.id, this.diagramMetadata);
            // if single bus voltage level -> do not redraw anything
            if (busNodes !== undefined && busNodes.length <= 1) {
                return;
            }
            // sort buses by index
            const sortedBusNodes: BusNodeMetadata[] = DiagramUtils.getSortedBusNodes(busNodes);
            const traversingBusEdgesAngles: number[] = [];
            for (let index = 0; index < sortedBusNodes.length; index++) {
                const busNode = sortedBusNodes[index];
                // skip redrawing of first bus or if there are no traversing bus edges
                if (index > 0 && traversingBusEdgesAngles.length > 0) {
                    this.redrawBusNode(node, busNode, nodeMetadata, traversingBusEdgesAngles);
                }
                // add angles of edges starting from bus to traversing edges angles
                const busEdges = busNodeEdges.get(busNode.svgId) ?? [];
                busEdges.forEach((edge) => {
                    const edgeAngle = this.getEdgeAngle(busNode, edge, edge.svgId, edge.node1 == edge.node2);
                    if (typeof edgeAngle !== 'undefined') {
                        traversingBusEdgesAngles.push(edgeAngle);
                    }
                });
                const busInjectionsEdges = injectionsEdges.get(busNode.svgId) ?? [];
                busInjectionsEdges.forEach((inj) => {
                    const edgeAngle = this.getInjectionEdgeAngle(inj);
                    if (typeof edgeAngle !== 'undefined') {
                        traversingBusEdgesAngles.push(edgeAngle);
                    }
                });
            }
        }
    }

    private getEdgeAngle(busNode: BusNodeMetadata, edge: EdgeMetadata, edgeId: string, isLoopEdge: boolean) {
        const side = busNode.svgId == edge.busNode1 ? '1' : '2';
        const edgeAngles = busNode.svgId == edge.busNode1 ? this.edgeAngles1 : this.edgeAngles2;
        if (!edgeAngles.has(edgeId)) {
            // if not yet stored in angle map -> compute and store it
            const halfEdgeDrawElement: HTMLElement | null = <HTMLElement>(
                (this.svgDiv
                    .querySelector("[id='" + edgeId + "']")
                    ?.querySelector(':scope > .nad-edge-path:nth-of-type(' + side + ')') as Element)
            );
            if (halfEdgeDrawElement != null) {
                const angle = isLoopEdge
                    ? DiagramUtils.getPathAngle(halfEdgeDrawElement)
                    : DiagramUtils.getPolylineAngle(halfEdgeDrawElement);
                if (angle != null) {
                    edgeAngles.set(edgeId, angle);
                }
            }
        }
        return edgeAngles.get(edgeId);
    }

    private getInjectionEdgeAngle(injection: InjectionMetadata) {
        const injectionEdgeDrawElement: HTMLElement | null = <HTMLElement>(
            (this.svgDiv.querySelector(`#${CSS.escape(injection.svgId)} polyline.nad-edge-path`) as Element)
        );
        if (injectionEdgeDrawElement != null) {
            return DiagramUtils.getPolylineAngle(injectionEdgeDrawElement) ?? undefined;
        }
        return undefined;
    }

    private redrawBusNode(
        node: SVGGraphicsElement,
        busNode: BusNodeMetadata,
        nodeMetadata: NodeMetadata | undefined,
        traversingBusEdgesAngles: number[]
    ) {
        const busNodeRadius = DiagramUtils.getNodeRadius(busNode, nodeMetadata, this.svgParameters);
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
        const busElement: HTMLElement | null = <HTMLElement>node.querySelectorAll('.nad-busnode')[busNode.index];
        if (busElement != null) {
            busElement.setAttribute('d', path);
        }
    }

    private redrawOtherVoltageLevelNode(otherNode: SVGGraphicsElement | null) {
        if (otherNode != null) {
            // group other voltage level node edges by bus node
            const busNodeEdges: Map<string, EdgeMetadata[]> = new Map<string, EdgeMetadata[]>();
            this.addBusNodeEdges(otherNode?.id ?? -1, busNodeEdges);

            const injectionsEdges: Map<string, InjectionMetadata[]> = new Map<string, InjectionMetadata[]>();
            this.addInjectionEdges(otherNode.id, injectionsEdges);

            // redraw other voltage level node
            this.redrawVoltageLevelNode(otherNode, busNodeEdges, injectionsEdges);
        }
    }

    private addBusNodeEdges(nodeId: string, busNodeEdges: Map<string, EdgeMetadata[]>) {
        // get other voltage level node edges
        const edges: EdgeMetadata[] | undefined = this.diagramMetadata?.edges.filter(
            (edge) => edge.node1 == nodeId || edge.node2 == nodeId
        );
        // group other voltage level node edges by bus node
        edges?.forEach((edge) => {
            if (edge.node1 == edge.node2) {
                // loop edge
                this.addBusNodeEdge(edge.busNode1, edge, busNodeEdges);
                this.addBusNodeEdge(edge.busNode2, edge, busNodeEdges);
            } else {
                const busNodeId = edge.node1 == nodeId ? edge.busNode1 : edge.busNode2;
                this.addBusNodeEdge(busNodeId, edge, busNodeEdges);
            }
        });
    }

    private redrawThreeWtEdge(edge: EdgeMetadata, edgeNode: SVGGraphicsElement, vlNode: SVGGraphicsElement) {
        const position = DiagramUtils.getPosition(vlNode);
        const twtEdge: HTMLElement = <HTMLElement>edgeNode.firstElementChild;
        if (!twtEdge) return;

        // compute polyline points
        const threeWtMoved = edge.node1 != this.draggedElement?.id;
        const translation = this.getTranslation(position);
        const halfEdge = DiagramUtils.getThreeWtHalfEdge(
            twtEdge,
            edge,
            threeWtMoved,
            translation,
            this.diagramMetadata,
            this.svgParameters
        );
        if (!halfEdge) return;

        // move polyline
        twtEdge.setAttribute('points', DiagramUtils.getFormattedPolyline(halfEdge.edgePoints));

        // redraw edge arrow and label
        this.redrawEdgeArrowAndLabel(halfEdge);

        // store edge angles, to use them for bus node redrawing
        this.edgeAngles1.set(edgeNode.id, DiagramUtils.getEdgeStartAngle(halfEdge));
        // redraw voltage level node connected to three windings transformer
        if (threeWtMoved) {
            this.redrawOtherVoltageLevelNode(vlNode);
        }
    }

    private redrawBoundaryNode(node: SVGGraphicsElement | null, halfEdge: HalfEdge | null) {
        if (!node || !halfEdge) return;

        const edgeStartAngle = DiagramUtils.getAngle(halfEdge.edgePoints[0], halfEdge.edgePoints[1]);
        const path: string = DiagramUtils.getBoundarySemicircle(edgeStartAngle, halfEdge.busOuterRadius);
        const pathElement: HTMLElement | null = <HTMLElement>node.firstElementChild;
        if (pathElement != null && pathElement.tagName == 'path') {
            pathElement.setAttribute('d', path);
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

    public checkAndUpdateLevelOfDetail() {
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

        if (this.innerSvg) {
            const zoomLevel = this.getZoomLevel(maxDisplayedSize);
            const isZoomLevelClassDefined = [...this.innerSvg.classList].some((c) =>
                c.startsWith(NetworkAreaDiagramViewer.ZOOM_CLASS_PREFIX)
            );
            if (!isZoomLevelClassDefined || zoomLevel != this.lastZoomLevel) {
                this.innerSvg.setAttribute('class', NetworkAreaDiagramViewer.ZOOM_CLASS_PREFIX + zoomLevel);
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
            const textNodeMetadata: TextNodeMetadata | undefined = this.diagramMetadata?.textNodes.find(
                (tnm) => tnm.equipmentId == vlState.voltageLevelId
            );
            if (!textNodeMetadata) {
                console.warn(`Text node for ${vlState.voltageLevelId} not found`);
                return;
            }

            const textNodeElement = this.container.querySelector(`[id='${textNodeMetadata.svgId}']`);
            if (!textNodeElement) {
                console.warn(`Text node element ${textNodeMetadata.svgId} not found in DOM`);
                return;
            }

            // Get all buses for this voltage level
            const vlBusNodes = this.diagramMetadata?.busNodes.filter((bus) => bus.vlNode === textNodeMetadata.vlNode);
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
            arrowGElement.classList.remove('nad-arrow-in', 'nad-arrow-out');
            if (typeof value === 'number') {
                const arrowDirection = DiagramUtils.getArrowDirection(value);
                const arrowClass = DiagramUtils.getArrowClass(arrowDirection);
                if (arrowClass) {
                    arrowGElement.classList.add(arrowClass);
                }
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
        const mousePosition: Point = this.getMousePosition(event);
        let elementData = DiagramUtils.getRightClickableElementData(
            event.target as SVGElement,
            this.diagramMetadata?.nodes,
            this.diagramMetadata?.textNodes,
            this.diagramMetadata?.edges
        );
        if (!elementData && this.hoveredElement && this.existsNearbyHoveredElement(mousePosition)) {
            elementData = DiagramUtils.getRightClickableElementData(
                this.hoveredElement,
                this.diagramMetadata?.nodes,
                this.diagramMetadata?.textNodes,
                this.diagramMetadata?.edges
            );
        }
        if (!elementData) {
            return;
        }
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

    private handleHighlightableElementHover(element: SVGElement, mousePosition: Point): void {
        if (isTextNode(element)) {
            const textNode = this.diagramMetadata?.textNodes.find((node) => node.svgId === element.id);
            if (textNode) {
                this.highlightRelatedElements(textNode);
                this.debounceToggleHoverCallback(
                    true,
                    mousePosition,
                    textNode.equipmentId,
                    ElementType[ElementType.TEXT_NODE]
                );
            }
        } else if (isVoltageLevelElement(element)) {
            const vlNode = this.diagramMetadata?.nodes.find((node) => node.svgId === element.id);
            if (vlNode) {
                this.highlightRelatedElements(vlNode);
                this.debounceToggleHoverCallback(
                    true,
                    mousePosition,
                    vlNode.equipmentId,
                    ElementType[ElementType.VOLTAGE_LEVEL]
                );
            }
        }
    }

    private handleInjectionHover(element: SVGElement, mousePosition: Point) {
        const injection = this.diagramMetadata?.injections?.find((inj) => inj.svgId === element.id);
        if (injection) {
            const equipmentId = injection.equipmentId ?? '';
            const equipmentType = injection.componentType ?? '';
            this.debounceToggleHoverCallback(true, mousePosition, equipmentId, equipmentType);
        }
    }

    private handleEdgeHover(element: SVGElement, mousePosition: Point): void {
        const edge = this.diagramMetadata?.edges.find((edge) => edge.svgId === element.id);
        if (edge) {
            const equipmentId = edge.equipmentId ?? '';
            const edgeType = DiagramUtils.getStringEdgeType(edge) ?? '';
            this.debounceToggleHoverCallback(true, mousePosition, equipmentId, edgeType);

            // Show preview points for bending if bend lines is enabled and edge is bendable
            if (this.bendLines) {
                const isBendable = this.bendableLines.includes(edge.svgId);
                if (isBendable) {
                    this.showEdgePreviewPoints(edge);
                }
            }
        }
    }

    private highlightRelatedElements(element: NodeMetadata | TextNodeMetadata): void {
        if (!this.diagramMetadata) return;

        const vlNodeId = 'vlNode' in element ? element.vlNode : element.svgId;
        const relatedBusNodes = this.diagramMetadata.busNodes.filter((busNode) => busNode.vlNode === vlNodeId);
        const relatedTextNode = this.diagramMetadata.textNodes.find((textNode) => textNode.vlNode === vlNodeId);

        relatedBusNodes.forEach((busNode) => this.addHighlightBusClass(busNode.svgId));
        if (relatedTextNode) {
            this.addHighlightTextClass(relatedTextNode.svgId);
        }
    }

    private addHighlightBusClass(svgId: string) {
        const element = this.svgDiv.querySelector(`[id='${svgId}']`);
        if (element) {
            element.classList.add('nad-busnode-highlight');
        }
    }
    private addHighlightTextClass(svgId: string) {
        const element = this.svgDiv.querySelector(`[id='${svgId}']`);
        if (element) {
            element.classList.add('nad-textnode-highlight');
        }
    }

    private clearHighlights() {
        const highlightedBusElements = this.svgDiv.querySelectorAll('.nad-busnode-highlight');
        const highlightedTextElements = this.svgDiv.querySelectorAll('.nad-textnode-highlight');
        highlightedBusElements.forEach((element) => {
            element.classList.remove('nad-busnode-highlight');
        });
        highlightedTextElements.forEach((element) => {
            element.classList.remove('nad-textnode-highlight');
        });
    }

    private enableLineBending() {
        const linesPointsElement = document.createElementNS('http://www.w3.org/2000/svg', 'g');
        linesPointsElement.classList.add('nad-line-points');
        const bendableEdges = DiagramUtils.getBendableLines(this.diagramMetadata?.edges);
        for (const edge of bendableEdges) {
            if (edge.bendingPoints) {
                for (let index = 0; index < edge.bendingPoints.length; index++) {
                    this.addLinePoint(
                        edge.svgId,
                        index,
                        new Point(edge.bendingPoints[index].x, edge.bendingPoints[index].y),
                        linesPointsElement
                    );
                }
                this.bendableLines.push(edge.svgId);
            } else {
                this.bendableLines.push(edge.svgId);
                this.bendLines = true;
            }
        }
        if (this.bendLines) {
            this.svgDraw?.node.firstElementChild?.appendChild(linesPointsElement);
        }
    }

    private addLinePoint(
        lineId: string,
        index: number,
        point: Point,
        linePointsElement?: SVGElement | null
    ): SVGElement {
        linePointsElement ??= this.svgDraw?.node.querySelector('.nad-line-points');
        const pointElement = DiagramUtils.createLinePointElement(lineId, point, index, false, this.linePointIndexMap);
        linePointsElement?.appendChild(pointElement);
        return pointElement;
    }

    private disableLineBending() {
        const linePointsElement = this.svgDraw?.node.querySelector('.nad-line-points');
        linePointsElement?.remove();
        this.linePointIndexMap.clear();
        this.bendableLines = [];
        this.bendLines = false;
    }

    private createEdgeBendPoint(bendableElem: SVGElement | undefined, event: MouseEvent) {
        if (!bendableElem) {
            return;
        }

        this.ctm = this.svgDraw?.node.getScreenCTM(); // used to compute mouse movement
        const mousePosition = this.getMousePosition(event);
        const pointElement = this.addLinePoint(bendableElem.id, -1, mousePosition); // add line point, to be moved

        this.initDrag(pointElement);
        this.onDragStart();

        this.updateEdgeMetadata(pointElement as SVGGraphicsElement, mousePosition, LineOperation.BEND);
    }

    private onStraightenStart(bendableElem: SVGElement | undefined) {
        if (!bendableElem) {
            return;
        }
        const edgeId = bendableElem.id ? this.linePointIndexMap.get(bendableElem.id)?.edgeId : '-1';
        const edge: EdgeMetadata | undefined = this.diagramMetadata?.edges.find((edge) => edge.svgId == edgeId);
        if (edge?.bendingPoints == undefined) {
            return;
        }
        this.disablePanzoom(); // to avoid panning the whole SVG when straightening a line
        this.straightenedElement = bendableElem as SVGGraphicsElement; // element to be straightened
    }

    private updateEdgeMetadata(
        linePointElement: SVGGraphicsElement,
        position: Point | null,
        lineOperation: LineOperation
    ) {
        const edge: EdgeMetadata | undefined = this.diagramMetadata?.edges.find(
            (edge) => edge.svgId == this.linePointIndexMap.get(linePointElement.id)?.edgeId
        );
        if (edge) {
            if (position && lineOperation == LineOperation.BEND) {
                this.updateEdgeMetadataWhenBending(edge, linePointElement, position);
            } else {
                this.updateEdgeMetadataWhenStraightening(edge, linePointElement);
            }
        }
    }

    private updateEdgeMetadataWhenBending(edge: EdgeMetadata, linePointElement: SVGGraphicsElement, position: Point) {
        const index = this.linePointIndexMap.get(linePointElement.id)?.index;
        if (index == -1) {
            // first time this point is added to metadata
            // get nodes for computing where to put the point in the list
            const node1 = this.diagramMetadata?.nodes.find((node) => node.svgId == edge.node1);
            const node2 = this.diagramMetadata?.nodes.find((node) => node.svgId == edge.node2);
            if (node1 && node2) {
                // insert the point in the list of points
                const linePoints = DiagramUtils.addPointToList(
                    edge.bendingPoints?.slice(),
                    new Point(node1.x, node1.y),
                    new Point(node2.x, node2.y),
                    position
                );
                edge.bendingPoints = linePoints.linePoints;
                this.linePointIndexMap.set(linePointElement.id, { edgeId: edge.svgId, index: linePoints.index });

                for (const [key, value] of this.linePointIndexMap) {
                    if (key !== linePointElement.id && value.edgeId == edge.svgId && value.index >= linePoints.index) {
                        value.index++;
                    }
                }
            }
        } else if (edge.bendingPoints) {
            // update line point
            edge.bendingPoints[index!] = { x: DiagramUtils.round(position.x), y: DiagramUtils.round(position.y) };
        } else {
            // it should not come here, anyway, add the new point
            edge.bendingPoints = [{ x: DiagramUtils.round(position.x), y: DiagramUtils.round(position.y) }];
        }
    }

    private updateEdgeMetadataWhenStraightening(edge: EdgeMetadata, linePointElement: SVGGraphicsElement) {
        const index = this.linePointIndexMap.get(linePointElement.id)?.index ?? -1;

        if (edge.bendingPoints) {
            for (const [key, value] of this.linePointIndexMap) {
                if (key !== linePointElement.id && value.edgeId == edge.svgId && value.index >= index) {
                    value.index--;
                }
            }
            // delete point
            edge.bendingPoints.splice(index, 1);
            if (edge.bendingPoints.length == 0) {
                edge.bendingPoints = undefined;
            }
        }
    }

    private redrawBentLine(linePoint: SVGGraphicsElement, lineOperation: LineOperation) {
        globalThis.getSelection()?.empty();
        this.initialPosition = DiagramUtils.getPosition(linePoint);

        // get edge data
        const edgeId = linePoint.id ? this.linePointIndexMap.get(linePoint.id)?.edgeId : '-1';
        const edge: EdgeMetadata | undefined = this.diagramMetadata?.edges.find((edge) => edge.svgId == edgeId);
        if (!edge || (lineOperation == LineOperation.BEND && !edge.bendingPoints)) return;

        const edgeNode: SVGGraphicsElement | null = this.svgDiv.querySelector("[id='" + edgeId + "']");
        if (!edgeNode) return;

        // bend line
        // compute moved edge data: polyline points
        const halfEdges = this.getHalfEdges(edge, 0, 1);
        this.redrawEdge(edgeNode, halfEdges[0], halfEdges[1], DiagramUtils.getEdgeType(edge));

        const vlNode1: SVGGraphicsElement | null = this.svgDiv.querySelector("[id='" + edge?.node1 + "']");
        const vlNode2: SVGGraphicsElement | null = this.svgDiv.querySelector("[id='" + edge?.node2 + "']");
        this.redrawOtherVoltageLevelNode(vlNode1);
        this.redrawOtherVoltageLevelNode(vlNode2);

        if (edge.bendingPoints && lineOperation == LineOperation.BEND) {
            // move line point
            const index = this.linePointIndexMap.get(linePoint.id)?.index ?? 0;
            const position: Point = new Point(edge.bendingPoints[index].x, edge.bendingPoints[index].y);
            this.updateNodePosition(linePoint, position);
        } else {
            linePoint.remove();
            this.linePointIndexMap.delete(linePoint.id);
        }
    }

    private getHalfEdges(edge: EdgeMetadata, iEdge: number, nbGroupedEdges: number) {
        return DiagramUtils.getHalfEdges(edge, iEdge, nbGroupedEdges, this.diagramMetadata, this.svgParameters);
    }

    private onStraightenEnd() {
        if (!this.straightenedElement) {
            return;
        }
        // Update metadata
        this.updateEdgeMetadata(this.straightenedElement, null, LineOperation.STRAIGHTEN);
        // straighten line
        this.redrawBentLine(this.straightenedElement, LineOperation.STRAIGHTEN);
        // call callback
        this.callBendLineCallback(this.straightenedElement, LineOperation.STRAIGHTEN);
        // reset data
        this.straightenedElement = null;
        this.enablePanzoom();
    }

    private callBendLineCallback(linePointElement: SVGGraphicsElement, lineOperation: LineOperation) {
        if (this.onBendLineCallback) {
            const edge: EdgeMetadata | undefined = this.diagramMetadata?.edges.find(
                (edge) => edge.svgId == this.linePointIndexMap.get(linePointElement.id)?.edgeId
            );
            if (edge) {
                const linePoints: Point[] | null = edge.bendingPoints
                    ? edge.bendingPoints.map((point) => new Point(point.x, point.y))
                    : null;
                this.onBendLineCallback(
                    edge.svgId,
                    edge.equipmentId,
                    DiagramUtils.getStringEdgeType(edge),
                    linePoints,
                    LineOperation[lineOperation]
                );
            }
        }
    }

    private showEdgePreviewPoints(edge: EdgeMetadata): void {
        if (!edge.svgId) return;

        const previewPoints = this.calculateEdgeSegmentMidpoints(edge);
        if (previewPoints.length === 0) return;

        let previewContainer = this.svgDraw?.node.querySelector('.nad-edge-preview-points');
        if (!previewContainer) {
            previewContainer = document.createElementNS('http://www.w3.org/2000/svg', 'g');
            previewContainer.classList.add('nad-edge-preview-points');
            this.svgDraw?.node.firstElementChild?.appendChild(previewContainer);
        }

        previewContainer.innerHTML = '';

        for (const [index, point] of previewPoints.entries()) {
            const previewPoint = DiagramUtils.createLinePointElement(edge.svgId, point, index, true);
            previewContainer?.appendChild(previewPoint);
        }
    }

    private calculateEdgeSegmentMidpoints(edge: EdgeMetadata): Point[] {
        if (!edge.node1 || !edge.node2) return [];

        const halfEdges = this.getHalfEdges(edge, 0, 1);
        if (!halfEdges[0] || !halfEdges[1]) return [];

        const midpoints: Point[] = [];

        if (edge.bendingPoints && edge.bendingPoints.length > 0) {
            const previousPoint = halfEdges[0].edgePoints[0];

            midpoints.push(
                DiagramUtils.getMidPosition(previousPoint, new Point(edge.bendingPoints[0].x, edge.bendingPoints[0].y))
            );

            for (let i = 0; i < edge.bendingPoints.length - 1; i++) {
                const current = new Point(edge.bendingPoints[i].x, edge.bendingPoints[i].y);
                const next = new Point(edge.bendingPoints[i + 1].x, edge.bendingPoints[i + 1].y);
                midpoints.push(DiagramUtils.getMidPosition(current, next));
            }

            const lastPoint = new Point(edge.bendingPoints.at(-1)!.x, edge.bendingPoints.at(-1)!.y);
            midpoints.push(DiagramUtils.getMidPosition(lastPoint, halfEdges[1].edgePoints[0]));
        } else {
            midpoints.push(DiagramUtils.getMidPosition(halfEdges[0].edgePoints[0], halfEdges[1].edgePoints[0]));
        }

        return midpoints;
    }

    private hideEdgePreviewPoints(): void {
        const previewContainer = this.svgDraw?.node.querySelector('.nad-edge-preview-points');
        if (previewContainer) {
            previewContainer.remove();
        }
    }
}
