/**
 * Copyright (c) 2022-2024, RTE (http://www.rte-france.com)
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

import { Point, SVG, ViewBoxLike, Svg } from '@svgdotjs/svg.js';
import '@svgdotjs/svg.panzoom.js';
import * as DiagramUtils from './diagram-utils';
import { ElementType, isTextNode, isVoltageLevelElement } from './diagram-utils';
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
import {
    OnMoveNodeCallbackType,
    OnMoveTextNodeCallbackType,
    OnRightClickCallbackType,
    OnSelectNodeCallbackType,
    OnToggleNadHoverCallbackType,
    OnBendLineCallbackType,
    NadViewerParameters,
    NadViewerParametersOptions,
} from './nad-viewer-parameters';

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
    nadViewerParameters: NadViewerParameters;
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
    bendLines: boolean = false;
    bentElement: SVGGraphicsElement | null = null;
    onBendLineCallback: OnBendLineCallbackType | null;
    straightenedElement: SVGGraphicsElement | null = null;
    bendableLines: string[] = [];

    linePointIndexMap = new Map<SVGGElement, { edgeId: string; index: number }>();
    linePointByEdgeIndexMap = new Map<string, SVGGElement>();

    parallelBentElement: SVGGraphicsElement | undefined = undefined;
    parallelOffset: Point = new Point(0, 0);
    parallelStraightenedElement: SVGGraphicsElement | undefined = undefined;

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
        this.onBendLineCallback = this.nadViewerParameters.getOnBendingLineCallback();
        this.zoomLevels = this.nadViewerParameters.getZoomLevels();
        this.zoomLevels.sort((a, b) => b - a);
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

    public init(): void {
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
        if (this.nadViewerParameters.getAddButtons()) {
            nadViewerDiv.appendChild(this.getZoomButtonsBar());
            nadViewerDiv.appendChild(this.getActionButtonsBar());
            nadViewerDiv.appendChild(this.getEditButtonBar());
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
        const drawnSvg: HTMLElement = <HTMLElement>this.svgDraw.svg(this.svgContent).node.firstElementChild;
        drawnSvg.style.overflow = 'visible';

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
                this.handleHoverExit();
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

        if (this.nadViewerParameters.getEnableLevelOfDetail()) {
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
            if (this.bendLines) {
                // straightening line
                this.onStraightenStart(DiagramUtils.getBendableFrom(targetElement));
            }
        } else {
            // Interaction mode (could be drag or select)
            // next 'mousemove' event will determine it
            this.initSelection(selectableElem);
            if (this.enableDragInteraction) {
                this.initDrag(draggableElem);
            }
            if (this.bendLines) {
                // bend line moving already defined line point
                this.onBendStart(DiagramUtils.getBendableFrom(targetElement));
                // bend line moving new line point
                this.onBendLineStart(DiagramUtils.getBendableLineFrom(targetElement, this.bendableLines), event);
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
        if (!this.draggedElement && !this.bentElement) {
            return;
        }

        if (this.draggedElement) {
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
        } else if (this.bentElement) {
            event.preventDefault();
            this.ctm = this.svgDraw?.node.getScreenCTM(); // used to compute SVG transformations
            const mousePosition = this.getMousePosition(event);
            // Update metadata first
            this.updateEdgeMetadata(this.bentElement, mousePosition, LineOperation.BEND);
            if (this.parallelBentElement) {
                this.updateEdgeMetadata(
                    this.parallelBentElement,
                    new Point(mousePosition.x + this.parallelOffset.x, mousePosition.y + this.parallelOffset.y),
                    LineOperation.BEND
                );
            }
            // Then update line visually using updated metadata
            this.redrawBentLine(this.bentElement, LineOperation.BEND);
            if (this.parallelBentElement) {
                this.redrawBentLine(this.parallelBentElement, LineOperation.BEND);
            }
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
            this.handleHoverExit();
            return;
        }

        this.clearHighlights();
        const mousePosition = this.getMousePosition(mouseEvent);

        if (DiagramUtils.isHighlightableElement(hoverableElem)) {
            this.handleHighlightableElementHover(hoverableElem, mousePosition);
        } else {
            this.handleEdgeHover(hoverableElem, mousePosition);
        }
    }

    private onMouseLeftUpOrLeave(mouseEvent: MouseEvent) {
        // check if I moved or selected an element
        if (this.isDragging) {
            // moving element
            this.onDragEnd();
            this.resetMouseEventParams();
        } else if (this.draggedElement) {
            // dragging but not moved yet
            this.resetMouseEventParams();
        } else if (this.selectedElement) {
            // selecting element
            const mousePosition = this.getMousePosition(mouseEvent);
            this.onSelectEnd(mousePosition);
            this.resetMouseEventParams();
        } else if (this.bentElement) {
            // bending line
            this.onBendEnd();
        } else if (this.straightenedElement) {
            // straightening line
            this.onStraightenEnd();
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

        // Calculate reference angles based on the first edge's bend points (if any)
        // All parallel edges will use these same reference angles to maintain parallelism
        let angle1: number;
        let angle2: number;
        if (edges[0].points && edges[0].points.length > 0) {
            // Fork should point towards first bend point on each side
            const firstBendPoint = new Point(edges[0].points[0].x, edges[0].points[0].y);
            const lastBendPoint = new Point(
                edges[0].points[edges[0].points.length - 1].x,
                edges[0].points[edges[0].points.length - 1].y
            );
            angle1 = DiagramUtils.getAngle(point1, firstBendPoint);
            angle2 = DiagramUtils.getAngle(point2, lastBendPoint);
        } else {
            // No bend points: use traditional node-to-node angle
            const angle = DiagramUtils.getAngle(point1, point2);
            angle1 = angle;
            angle2 = angle + Math.PI;
        }

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
                const angleFork1 = angle1 - alpha;
                const angleFork2 = angle2 + alpha;
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

                let halfEdgePoints1: Point[];
                let halfEdgePoints2: Point[];

                if (edge.points && edge.points?.length > 0) {
                    halfEdgePoints1 = [edgeStart1, edgeFork1, ...edge.points.map((p) => new Point(p.x, p.y))];
                    halfEdgePoints2 = [edgeStart2, edgeFork2, ...edge.points.map((p) => new Point(p.x, p.y)).reverse()];
                } else {
                    const edgeMiddle = DiagramUtils.getMidPosition(edgeFork1, edgeFork2);
                    halfEdgePoints1 = [edgeStart1, edgeFork1, edgeMiddle];
                    halfEdgePoints2 = [edgeStart2, edgeFork2, edgeMiddle];
                }

                // redraw edge
                this.redrawEdge(
                    edgeNode,
                    halfEdgePoints1,
                    halfEdgePoints2,
                    nodeRadius1,
                    nodeRadius2,
                    edgeType,
                    edge.points != undefined
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

        const edgeData = this.getEdgeData(edge);
        this.redrawEdge(
            edgeNode,
            edgeData.edgePoints != undefined
                ? edgeData.edgePoints[0]
                : [edgeData.edgeStartPoints[0], edgeData.edgeMiddle],
            edgeData.edgePoints != undefined
                ? edgeData.edgePoints[1]
                : [edgeData.edgeStartPoints[1], edgeData.edgeMiddle],
            edgeData.nodeRadius1,
            edgeData.nodeRadius2,
            edgeType,
            edge.points != undefined
        );

        // if dangling line edge -> redraw boundary node
        if (edgeType == DiagramUtils.EdgeType.DANGLING_LINE) {
            this.redrawBoundaryNode(
                edgeNodes[1],
                DiagramUtils.getAngle(edgeData.edgeStartPoints[1], edgeData.edgeMiddle),
                edgeData.nodeRadius2[1]
            );
            if (vlNode.id == edgeNodes[1]?.id) {
                // if boundary node moved -> redraw other voltage level node
                this.redrawOtherVoltageLevelNode(edgeNodes[0]);
            }
        } else {
            // redraw other voltage level node
            const otherNode: SVGGraphicsElement | null = this.getOtherNode(edgeNodes, vlNode);
            this.redrawOtherVoltageLevelNode(otherNode);
        }

        if (this.bendLines && edge.points == undefined) {
            this.moveLinePoint(edge.svgId, edgeData.edgeMiddle);
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

    private getEdgeStartPoints(edge: EdgeMetadata): Point[] | null {
        const vlNode1: SVGGraphicsElement | null = this.svgDiv.querySelector("[id='" + edge.node1 + "']");
        const vlNode2: SVGGraphicsElement | null = this.svgDiv.querySelector("[id='" + edge.node2 + "']");
        if (!vlNode1 || !vlNode2) return null;

        const nodeRadius1 = this.getNodeRadius(edge.busNode1 ?? '-1', edge.node1 ?? '-1');
        const nodeRadius2 = this.getNodeRadius(edge.busNode2 ?? '-1', edge.node2 ?? '-1');

        const startPoints: Point[] = [];

        startPoints[0] = this.getEdgeStart(
            edge.busNode1,
            nodeRadius1[1],
            vlNode1,
            edge.points ? new Point(edge.points[0].x, edge.points[0].y) : vlNode2
        );

        startPoints[1] = this.getEdgeStart(
            edge.busNode2,
            nodeRadius2[1],
            vlNode2,
            edge.points ? new Point(edge.points.at(-1)!.x, edge.points.at(-1)!.y) : vlNode1
        );

        return startPoints;
    }

    private getEdgeStart(
        busNodeId: string | null,
        outerRadius: number,
        point1: SVGGraphicsElement | null,
        point2: SVGGraphicsElement | null | Point
    ): Point {
        const unknownBusNode = busNodeId != null && busNodeId.length == 0;
        return DiagramUtils.getPointAtDistance(
            DiagramUtils.getPosition(point1),
            point2 instanceof Point ? point2 : DiagramUtils.getPosition(point2),
            unknownBusNode ? outerRadius + this.svgParameters.getUnknownBusNodeExtraRadius() : outerRadius
        );
    }

    private redrawEdge(
        edgeNode: SVGGraphicsElement,
        halfEdgePoints1: Point[],
        halfEdgePoints2: Point[],
        nodeRadius1: [number, number, number],
        nodeRadius2: [number, number, number],
        edgeType: DiagramUtils.EdgeType,
        bentLine: boolean
    ) {
        const isTransformerEdge =
            edgeType == DiagramUtils.EdgeType.TWO_WINDINGS_TRANSFORMER ||
            edgeType == DiagramUtils.EdgeType.PHASE_SHIFT_TRANSFORMER;
        const isHVDCLineEdge = edgeType == DiagramUtils.EdgeType.HVDC_LINE;

        this.redrawHalfEdge(edgeNode, '1', halfEdgePoints1.slice(), isTransformerEdge, nodeRadius1, bentLine);
        this.redrawHalfEdge(edgeNode, '2', halfEdgePoints2.slice(), isTransformerEdge, nodeRadius2, bentLine);

        if (isTransformerEdge) {
            this.redrawTransformer(
                edgeNode,
                halfEdgePoints1.at(-2)!,
                halfEdgePoints1.at(-1)!,
                halfEdgePoints2.at(-2)!,
                halfEdgePoints2.at(-1)!,
                edgeType
            );
        } else if (isHVDCLineEdge) {
            this.redrawConverterStation(
                edgeNode,
                halfEdgePoints1.at(-2)!,
                halfEdgePoints1.at(-1)!,
                halfEdgePoints2.at(-2)!,
                halfEdgePoints2.at(-1)!
            );
        }
        // if present, move edge name
        if (this.svgParameters.getEdgeNameDisplayed()) {
            this.updateEdgeName(edgeNode, halfEdgePoints1.at(-1)!, halfEdgePoints2.at(-2)!);
        }
        // store edge angles, to use them for bus node redrawing
        this.edgeAngles.set(edgeNode.id + '.1', DiagramUtils.getAngle(halfEdgePoints1[0], halfEdgePoints1[1]));
        this.edgeAngles.set(edgeNode.id + '.2', DiagramUtils.getAngle(halfEdgePoints2[0], halfEdgePoints2[1]));
    }

    private redrawHalfEdge(
        edgeNode: SVGGraphicsElement,
        side: string,
        polylinePoints: Point[],
        transformerEdge: boolean,
        nodeRadius: [number, number, number],
        bentLine: boolean
    ) {
        // get half edge element
        const halfEdge: SVGGraphicsElement | null = edgeNode.querySelector("[id='" + edgeNode.id + '.' + side + "']");
        // get polyline
        const polylineElement: SVGGraphicsElement | null | undefined = halfEdge?.querySelector('polyline');

        // if transformer edge reduce edge polyline, leaving space for the transformer
        if (transformerEdge) {
            polylinePoints[polylinePoints.length - 1] = DiagramUtils.getPointAtDistance(
                polylinePoints.at(-1)!,
                polylinePoints.at(-2)!,
                1.5 * this.svgParameters.getTransformerCircleRadius()
            );
        }

        const polyline: string = polylinePoints.map((p) => DiagramUtils.getFormattedPoint(p)).join(' ');
        polylineElement?.setAttribute('points', polyline);

        // redraw edge arrow and label
        if (halfEdge != null && halfEdge.children.length > 1) {
            this.redrawEdgeArrowAndLabel(
                halfEdge,
                polylinePoints[0],
                polylinePoints.length == 2 ? null : polylinePoints[1],
                polylinePoints.at(-1)!,
                nodeRadius,
                bentLine
            );
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
                    ? new Point(points.at(-1)!.x + translation.x, points.at(-1)!.y + translation.y)
                    : points.at(-1)!;
                // move polyline
                const polylinePoints: string = DiagramUtils.getFormattedPolyline(edgeStart, null, edgeEnd);
                twtEdge.setAttribute('points', polylinePoints);
                // redraw edge arrow and label
                if (edgeNode.children.length > 1) {
                    this.redrawEdgeArrowAndLabel(edgeNode, edgeStart, null, edgeEnd, nodeRadius1, false);
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
            const isZoomLevelClassDefined = [...innerSvg.classList].some((c) =>
                c.startsWith(NetworkAreaDiagramViewer.ZOOM_CLASS_PREFIX)
            );
            if (!isZoomLevelClassDefined || zoomLevel != this.lastZoomLevel) {
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

    private handleHighlightableElementHover(element: SVGElement, mousePosition: Point): void {
        if (isTextNode(element)) {
            const textNode = this.diagramMetadata?.textNodes.find((node) => node.svgId === element.id);
            if (textNode) {
                this.highlightRelatedElements(textNode);
                this.onToggleHoverCallback?.(
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
                this.onToggleHoverCallback?.(
                    true,
                    mousePosition,
                    vlNode.equipmentId,
                    ElementType[ElementType.VOLTAGE_LEVEL]
                );
            }
        }
    }

    private handleEdgeHover(element: SVGElement, mousePosition: Point): void {
        const edge = this.diagramMetadata?.edges.find((edge) => edge.svgId === element.id);
        if (edge) {
            const equipmentId = edge.equipmentId ?? '';
            const edgeType = DiagramUtils.getStringEdgeType(edge) ?? '';
            this.onToggleHoverCallback?.(true, mousePosition, equipmentId, edgeType);

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

    private handleHoverExit() {
        this.onToggleHoverCallback?.(false, null, '', '');
        this.clearHighlights();
        this.hideEdgePreviewPoints();
    }

    private getEditButtonBar(): HTMLDivElement {
        const buttonsDiv = document.createElement('div');
        buttonsDiv.id = 'edit-button-bar';
        buttonsDiv.style.display = 'flex';
        buttonsDiv.style.alignItems = 'center';
        buttonsDiv.style.position = 'absolute';
        buttonsDiv.style.right = '6px';
        buttonsDiv.style.top = '6px';

        const bendLinesButton = DiagramUtils.getBendLinesButton();
        buttonsDiv.appendChild(bendLinesButton);
        bendLinesButton.addEventListener('click', () => {
            if (this.bendLines) {
                this.disableLineBending();
                bendLinesButton.style.border = 'none';
                bendLinesButton.title = 'Enable line bending';
            } else {
                this.enableLineBending();
                if (this.bendLines) {
                    bendLinesButton.style.border = '2px solid orange';
                    bendLinesButton.title = 'Disable line bending';
                }
            }
        });
        return buttonsDiv;
    }

    private enableLineBending() {
        const linesPointsElement = document.createElementNS('http://www.w3.org/2000/svg', 'g');
        linesPointsElement.id = 'lines-points';
        linesPointsElement.classList.add('nad-line-points');
        const bendableEdges = DiagramUtils.getBendableLines(this.diagramMetadata?.edges);
        for (const edge of bendableEdges) {
            if (edge.points) {
                for (let index = 0; index < edge.points.length; index++) {
                    this.addLinePoint(
                        edge.svgId,
                        index,
                        new Point(edge.points[index].x, edge.points[index].y),
                        linesPointsElement
                    );
                }
                this.bendableLines.push(edge.svgId);
            } else {
                /*const edgeNode1: SVGGraphicsElement | null = this.svgDiv.querySelector("[id='" + edge.svgId + ".1']");
                const edgeNode2: SVGGraphicsElement | null = this.svgDiv.querySelector("[id='" + edge.svgId + ".2']");
                const middle1 = DiagramUtils.getEdgeMidPoint(edgeNode1);
                const middle2 = DiagramUtils.getEdgeMidPoint(edgeNode2);
                if (middle1 && middle2 && middle1.x == middle2.x && middle1.y == middle2.y) {
                    this.addLinePoint(edge.svgId, -1, new Point(middle1.x, middle1.y), linesPointsElement);
                    this.bendableLines.push(edge.svgId);
                    this.bendLines = true;
                }*/
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
        linePointsElement ??= this.svgDraw?.node.querySelector('#lines-points');
        const pointElement = DiagramUtils.createLinePointElement(
            lineId,
            point,
            index,
            false,
            this.linePointIndexMap,
            this.linePointByEdgeIndexMap
        );
        linePointsElement?.appendChild(pointElement);
        return pointElement;
    }

    private disableLineBending() {
        const linePointsElement = this.svgDraw?.node.querySelector('#lines-points');
        linePointsElement?.remove();
        this.linePointIndexMap.clear();
        this.linePointByEdgeIndexMap.clear();
        this.bendableLines = [];
        this.bendLines = false;
    }

    private moveLinePoint(svgId: string, newPosition: Point) {
        const linePointElement: SVGGraphicsElement | undefined = this.linePointByEdgeIndexMap.get(
            DiagramUtils.getLinePointMapKey(svgId, 0)
        );
        if (linePointElement) {
            this.updateNodePosition(linePointElement, newPosition);
        }
    }

    private onBendStart(bendableElem: SVGElement | undefined) {
        if (!bendableElem) {
            return;
        }

        // change cursor style
        const svg: HTMLElement = <HTMLElement>this.svgDraw?.node.firstElementChild?.parentElement;
        svg.style.cursor = 'grabbing';

        this.disablePanzoom(); // to avoid panning the whole SVG when bending a line
        this.bentElement = bendableElem as SVGGraphicsElement; // line point to be moved
        this.ctm = this.svgDraw?.node.getScreenCTM(); // used to compute mouse movement
        this.initialPosition = DiagramUtils.getPosition(this.bentElement); // used for the offset

        const edgeId = DiagramUtils.getEdgeId(this.linePointIndexMap, this.bentElement);
        if (edgeId) {
            this.parallelBentElement = this.getParallelPointElement(this.bentElement, edgeId);
            if (this.parallelBentElement) {
                const p1 = DiagramUtils.getPosition(this.bentElement);
                const p2 = DiagramUtils.getPosition(this.parallelBentElement);
                this.parallelOffset = DiagramUtils.calculateParallelOffset(p1, p2);
            }
        }
    }

    private findClosestPreviewPointIndex(previewPoints: Point[], mousePosition: Point): number {
        let closestIndex = 0;
        let minDistance = Number.MAX_VALUE;
        for (let i = 0; i < previewPoints.length; i++) {
            const distance = Math.hypot(mousePosition.x - previewPoints[i].x, mousePosition.y - previewPoints[i].y);
            if (distance < minDistance) {
                minDistance = distance;
                closestIndex = i;
            }
        }
        return closestIndex;
    }

    private calculateLocalParallelOffset(
        selectedEdge: EdgeMetadata,
        parallelEdge: EdgeMetadata,
        mousePosition: Point
    ): Point | null {
        const previewPointsSelected = this.calculateParallelEdgeSegmentMidpoints(selectedEdge);
        const previewPointsParallel = this.calculateParallelEdgeSegmentMidpoints(parallelEdge);

        if (previewPointsSelected.length > 0 && previewPointsParallel.length > 0) {
            const closestIndex = this.findClosestPreviewPointIndex(previewPointsSelected, mousePosition);
            if (closestIndex < previewPointsParallel.length) {
                return DiagramUtils.calculateParallelOffset(
                    previewPointsSelected[closestIndex],
                    previewPointsParallel[closestIndex]
                );
            }
        }

        // Fallback to edge midpoint offset
        const middleSelectedEdge = DiagramUtils.getEdgeMidPointPosition(selectedEdge.svgId, this.svgDiv);
        const middleParallelEdge = DiagramUtils.getEdgeMidPointPosition(parallelEdge.svgId, this.svgDiv);
        if (middleSelectedEdge && middleParallelEdge) {
            return DiagramUtils.calculateParallelOffset(middleSelectedEdge, middleParallelEdge);
        }

        return null;
    }

    private onBendParallelLinesStart(bendableElem: SVGElement, parallelGroup: EdgeMetadata[], mousePosition: Point) {
        if (!bendableElem) {
            return;
        }

        const selectedEdge = parallelGroup.find((e) => e.svgId === bendableElem.id);
        const parallelEdge = parallelGroup.find((e) => e.svgId !== bendableElem.id);

        if (!selectedEdge || !parallelEdge) {
            return;
        }

        const parallelOffset = this.calculateLocalParallelOffset(selectedEdge, parallelEdge, mousePosition);
        if (!parallelOffset) {
            return;
        }

        this.parallelOffset = parallelOffset;
        const pointElement1 = this.addLinePoint(selectedEdge.svgId, -1, mousePosition);
        const position2 = new Point(mousePosition.x + parallelOffset.x, mousePosition.y + parallelOffset.y);
        const pointElement2 = this.addLinePoint(parallelEdge.svgId, -1, position2);

        this.bentElement = pointElement1 as SVGGraphicsElement;
        this.parallelBentElement = pointElement2 as SVGGraphicsElement;
        this.initialPosition = DiagramUtils.getPosition(this.bentElement);

        this.updateEdgeMetadata(this.bentElement, mousePosition, LineOperation.BEND);
        this.updateEdgeMetadata(this.parallelBentElement, position2, LineOperation.BEND);
    }

    private onBendLineStart(bendableElem: SVGElement | undefined, event: MouseEvent) {
        if (!bendableElem) {
            return;
        }

        // change cursor style
        const svg: HTMLElement = <HTMLElement>this.svgDraw?.node.firstElementChild?.parentElement;
        svg.style.cursor = 'grabbing';
        this.disablePanzoom(); // to avoid panning the whole SVG when bending a line
        this.ctm = this.svgDraw?.node.getScreenCTM(); // used to compute mouse movement
        const mousePosition = this.getMousePosition(event);

        const parallelGroup = DiagramUtils.getParallelEdgeGroup(bendableElem.id, this.diagramMetadata?.edges);

        if (parallelGroup) {
            this.onBendParallelLinesStart(bendableElem, parallelGroup, mousePosition);
        } else {
            const pointElement = this.addLinePoint(bendableElem.id, -1, mousePosition);
            this.bentElement = pointElement as SVGGraphicsElement;
            this.initialPosition = DiagramUtils.getPosition(this.bentElement);
            this.updateEdgeMetadata(this.bentElement, mousePosition, LineOperation.BEND);
        }
    }

    private onStraightenStart(bendableElem: SVGElement | undefined) {
        if (!bendableElem) {
            return;
        }
        const edgeId =
            bendableElem.id !== undefined
                ? DiagramUtils.getEdgeId(this.linePointIndexMap, bendableElem as SVGGraphicsElement)
                : '-1';
        const edge: EdgeMetadata | undefined = this.diagramMetadata?.edges.find((edge) => edge.svgId == edgeId);
        if (edge?.points == undefined) {
            return;
        }
        this.disablePanzoom(); // to avoid panning the whole SVG when straightening a line
        this.straightenedElement = bendableElem as SVGGraphicsElement; // element to be straightened

        if (edgeId && edgeId !== '-1') {
            this.parallelStraightenedElement = this.getParallelPointElement(this.straightenedElement, edgeId);
        }
    }

    private updateEdgeMetadata(
        linePointElement: SVGGraphicsElement,
        position: Point | null,
        lineOperation: LineOperation
    ) {
        const edge: EdgeMetadata | undefined = this.diagramMetadata?.edges.find(
            (edge) => edge.svgId == DiagramUtils.getEdgeId(this.linePointIndexMap, linePointElement)
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
        const index = this.linePointIndexMap.get(linePointElement)?.index ?? -1;
        if (index == -1) {
            // first time this point is added to metadata
            // get nodes for computing where to put the point in the list
            const node1 = this.diagramMetadata?.nodes.find((node) => node.svgId == edge.node1);
            const node2 = this.diagramMetadata?.nodes.find((node) => node.svgId == edge.node2);
            if (node1 && node2) {
                // insert the point in the list of points
                const linePoints = DiagramUtils.addPointToList(
                    edge.points?.slice(),
                    new Point(node1.x, node1.y),
                    new Point(node2.x, node2.y),
                    position
                );
                edge.points = linePoints.linePoints;
                // update line point elements with shifted index
                for (let i = edge.points.length - 1; i > linePoints.index; i--) {
                    const linePoint: SVGGraphicsElement | undefined = this.linePointByEdgeIndexMap.get(
                        DiagramUtils.getLinePointMapKey(edge.svgId, i - 1)
                    );
                    if (linePoint) {
                        // Delete old map entry
                        this.linePointByEdgeIndexMap.delete(DiagramUtils.getLinePointMapKey(edge.svgId, i - 1));
                        // Update maps with new index
                        this.linePointIndexMap.set(linePoint, { edgeId: edge.svgId, index: i });
                        this.linePointByEdgeIndexMap.set(DiagramUtils.getLinePointMapKey(edge.svgId, i), linePoint);
                        linePoint.id = DiagramUtils.getLinePointId(edge.svgId, i);
                    }
                }
                // Clean up the temporary -1
                this.linePointByEdgeIndexMap.delete(DiagramUtils.getLinePointMapKey(edge.svgId, -1));
                // update line point element
                this.linePointIndexMap.set(linePointElement, { edgeId: edge.svgId, index: linePoints.index });
                this.linePointByEdgeIndexMap.set(
                    DiagramUtils.getLinePointMapKey(edge.svgId, linePoints.index),
                    linePointElement
                );
                linePointElement.id = DiagramUtils.getLinePointId(edge.svgId, linePoints.index);
            }
        } else if (edge.points) {
            // update line point
            edge.points[index] = { x: DiagramUtils.round(position.x), y: DiagramUtils.round(position.y) };
        } else {
            // it should not come here, anyway, add the new point
            edge.points = [{ x: DiagramUtils.round(position.x), y: DiagramUtils.round(position.y) }];
        }
    }

    private updateEdgeMetadataWhenStraightening(edge: EdgeMetadata, linePointElement: SVGGraphicsElement) {
        const index = this.linePointIndexMap.get(linePointElement)?.index ?? -1;

        if (edge.points) {
            this.linePointByEdgeIndexMap.delete(DiagramUtils.getLinePointMapKey(edge.svgId, index));
            for (let i = index + 1; i < edge.points.length; i++) {
                const linePoint: SVGGraphicsElement | undefined = this.linePointByEdgeIndexMap.get(
                    DiagramUtils.getLinePointMapKey(edge.svgId, i)
                );
                if (linePoint) {
                    this.linePointByEdgeIndexMap.delete(DiagramUtils.getLinePointMapKey(edge.svgId, i));
                    this.linePointIndexMap.set(linePoint, { edgeId: edge.svgId, index: i - 1 });
                    this.linePointByEdgeIndexMap.set(DiagramUtils.getLinePointMapKey(edge.svgId, i - 1), linePoint);
                    linePoint.id = DiagramUtils.getLinePointId(edge.svgId, i - 1);
                }
            }
            // delete point
            edge.points.splice(index, 1);
            if (edge.points.length == 0) {
                edge.points = undefined;
            }
        }
    }

    private redrawBentLine(linePoint: SVGGraphicsElement, lineOperation: LineOperation) {
        globalThis.getSelection()?.empty();
        this.initialPosition = DiagramUtils.getPosition(linePoint);

        // get edge data
        const edgeId = linePoint.id !== undefined ? DiagramUtils.getEdgeId(this.linePointIndexMap, linePoint) : '-1';
        const edge: EdgeMetadata | undefined = this.diagramMetadata?.edges.find((edge) => edge.svgId == edgeId);
        if (!edge || (lineOperation == LineOperation.BEND && !edge.points)) {
            return;
        }

        const edgeNode: SVGGraphicsElement | null = this.svgDiv.querySelector("[id='" + edgeId + "']");
        if (!edgeNode) {
            return;
        }
        const vlNode1: SVGGraphicsElement | null = this.svgDiv.querySelector("[id='" + edge?.node1 + "']");
        const vlNode2: SVGGraphicsElement | null = this.svgDiv.querySelector("[id='" + edge?.node2 + "']");
        const edgeType = DiagramUtils.getEdgeType(edge);

        const edgeData = this.getEdgeData(edge);

        const parallelGroup = DiagramUtils.getParallelEdgeGroup(edge.svgId, this.diagramMetadata?.edges);

        if (parallelGroup) {
            this.redrawForkEdge(parallelGroup, vlNode1 ?? vlNode2!);
        } else {
            // bend line
            this.redrawEdge(
                edgeNode,
                edgeData.edgePoints != undefined
                    ? edgeData.edgePoints[0]
                    : [edgeData.edgeStartPoints[0], edgeData.edgeMiddle],
                edgeData.edgePoints != undefined
                    ? edgeData.edgePoints[1]
                    : [edgeData.edgeStartPoints[1], edgeData.edgeMiddle],
                edgeData.nodeRadius1,
                edgeData.nodeRadius2,
                edgeType,
                edge.points != undefined
            );
        }

        this.redrawOtherVoltageLevelNode(vlNode1);
        this.redrawOtherVoltageLevelNode(vlNode2);
        if (edge.points && lineOperation == LineOperation.BEND) {
            // move line point
            const index = this.linePointIndexMap.get(linePoint)?.index ?? 0;
            const position: Point = new Point(edge.points[index].x, edge.points[index].y);
            this.updateNodePosition(linePoint, position);
        } else {
            linePoint.remove();
            this.linePointIndexMap.delete(linePoint);
        }
    }

    private onBendEnd() {
        if (!this.bentElement) {
            return;
        }
        // update metadata and call callback
        this.callBendLineCallback(this.bentElement, LineOperation.BEND);
        if (this.parallelBentElement) {
            this.callBendLineCallback(this.parallelBentElement, LineOperation.BEND);
        }
        // reset data
        this.bentElement = null;
        this.parallelBentElement = undefined;
        this.parallelOffset = new Point(0, 0);
        this.initialPosition = new Point(0, 0);
        this.ctm = null;
        this.enablePanzoom();

        // change cursor style back to normal
        const svg: HTMLElement = <HTMLElement>this.svgDraw?.node.firstElementChild?.parentElement;
        svg.style.removeProperty('cursor');
    }

    private onStraightenEnd() {
        if (!this.straightenedElement) {
            return;
        }

        this.updateEdgeMetadata(this.straightenedElement, null, LineOperation.STRAIGHTEN);
        if (this.parallelStraightenedElement) {
            this.updateEdgeMetadata(this.parallelStraightenedElement, null, LineOperation.STRAIGHTEN);
        }

        this.redrawBentLine(this.straightenedElement, LineOperation.STRAIGHTEN);
        if (this.parallelStraightenedElement) {
            this.redrawBentLine(this.parallelStraightenedElement, LineOperation.STRAIGHTEN);
        }

        this.callBendLineCallback(this.straightenedElement, LineOperation.STRAIGHTEN);
        if (this.parallelStraightenedElement) {
            this.callBendLineCallback(this.parallelStraightenedElement, LineOperation.STRAIGHTEN);
        }

        this.straightenedElement = null;
        this.parallelStraightenedElement = undefined;
        this.enablePanzoom();
    }

    private callBendLineCallback(linePointElement: SVGGraphicsElement, lineOperation: LineOperation) {
        if (this.onBendLineCallback) {
            const edge: EdgeMetadata | undefined = this.diagramMetadata?.edges.find(
                (edge) => edge.svgId == DiagramUtils.getEdgeId(this.linePointIndexMap, linePointElement)
            );
            if (edge) {
                const linePoints: Point[] | null = edge.points
                    ? edge.points.map((point) => new Point(point.x, point.y))
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

    private redrawEdgeArrowAndLabel(
        edgeNode: SVGGraphicsElement,
        startPolyline: Point,
        middlePolyline: Point | null, // if null -> straight line
        endPolyline: Point,
        nodeRadius: [number, number, number],
        bentLine: boolean
    ) {
        // move edge arrow
        const arrowCenter = DiagramUtils.getPointAtDistance(
            middlePolyline == null || bentLine ? startPolyline : middlePolyline,
            bentLine && middlePolyline ? middlePolyline : endPolyline,
            middlePolyline == null || bentLine
                ? this.svgParameters.getArrowShift() + (nodeRadius[2] - nodeRadius[1])
                : this.svgParameters.getArrowShift()
        );
        const arrowElement = edgeNode.lastElementChild as SVGGraphicsElement;
        arrowElement?.setAttribute('transform', 'translate(' + DiagramUtils.getFormattedPoint(arrowCenter) + ')');
        const arrowAngle = DiagramUtils.getArrowAngle(
            middlePolyline == null || bentLine ? startPolyline : middlePolyline,
            bentLine && middlePolyline ? middlePolyline : endPolyline
        );
        const arrowRotationElement = arrowElement.firstElementChild?.firstElementChild as SVGGraphicsElement;
        arrowRotationElement.setAttribute('transform', 'rotate(' + DiagramUtils.getFormattedValue(arrowAngle) + ')');

        // move edge label
        const labelData = DiagramUtils.getLabelData(
            middlePolyline == null || bentLine ? startPolyline : middlePolyline,
            bentLine && middlePolyline ? middlePolyline : endPolyline,
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

    private showEdgePreviewPoints(edge: EdgeMetadata): void {
        if (!edge.svgId) return;

        const previewPoints = this.calculateEdgeSegmentMidpoints(edge);
        if (previewPoints.length === 0) return;

        let previewContainer = this.svgDraw?.node.querySelector('#edge-preview-points');
        if (!previewContainer) {
            previewContainer = document.createElementNS('http://www.w3.org/2000/svg', 'g');
            previewContainer.id = 'edge-preview-points';
            previewContainer.classList.add('nad-edge-preview-points');
            this.svgDraw?.node.firstElementChild?.appendChild(previewContainer);
        }

        previewContainer.innerHTML = '';

        const parallelGroup = DiagramUtils.getParallelEdgeGroup(edge.svgId, this.diagramMetadata?.edges);
        if (parallelGroup) {
            for (const parallelEdge of parallelGroup) {
                const previewPoints = this.calculateParallelEdgeSegmentMidpoints(parallelEdge);
                for (const [index, point] of previewPoints.entries()) {
                    const previewPoint = DiagramUtils.createLinePointElement(parallelEdge.svgId, point, index, true);
                    previewContainer?.appendChild(previewPoint);
                }
            }
        } else {
            const previewPoints = this.calculateEdgeSegmentMidpoints(edge);
            for (const [index, point] of previewPoints.entries()) {
                const previewPoint = DiagramUtils.createLinePointElement(edge.svgId, point, index, true);
                previewContainer?.appendChild(previewPoint);
            }
        }
    }

    private getEdgeData(edge: EdgeMetadata): {
        edgeStartPoints: Point[];
        edgeMiddle: Point;
        nodeRadius1: [number, number, number];
        nodeRadius2: [number, number, number];
        edgePoints: Point[][] | undefined;
    } {
        const edgeStartPoints = this.getEdgeStartPoints(edge);
        if (!edgeStartPoints) {
            return {
                edgeStartPoints: [],
                edgeMiddle: new Point(0, 0),
                nodeRadius1: [0, 0, 0],
                nodeRadius2: [0, 0, 0],
                edgePoints: undefined,
            };
        }

        const edgeMiddle = DiagramUtils.getMidPosition(edgeStartPoints[0], edgeStartPoints[1]);
        const nodeRadius1 = this.getNodeRadius(edge.busNode1 ?? '-1', edge.node1 ?? '-1');
        const nodeRadius2 = this.getNodeRadius(edge.busNode2 ?? '-1', edge.node2 ?? '-1');
        const edgePoints = edge.points
            ? DiagramUtils.getEdgePoints(edgeStartPoints[0], edgeStartPoints[1], edge.points.slice())
            : undefined;

        return {
            edgeStartPoints,
            edgeMiddle,
            nodeRadius1,
            nodeRadius2,
            edgePoints,
        };
    }

    private calculateParallelEdgeSegmentMidpoints(edge: EdgeMetadata): Point[] {
        const midpoints: Point[] = [];

        const parallelGroup = DiagramUtils.getParallelEdgeGroup(edge.svgId, this.diagramMetadata?.edges);
        if (parallelGroup) {
            const halfEdge1: SVGGraphicsElement | null = this.svgDiv.querySelector(`[id='${edge.svgId}.1']`);
            const halfEdge2: SVGGraphicsElement | null = this.svgDiv.querySelector(`[id='${edge.svgId}.2']`);

            if (halfEdge1 && halfEdge2) {
                const polyline1 = halfEdge1.querySelector('polyline');
                const polyline2 = halfEdge2.querySelector('polyline');

                if (polyline1 && polyline2) {
                    const points1 = DiagramUtils.getPolylinePoints(<HTMLElement>(<unknown>polyline1));
                    const points2 = DiagramUtils.getPolylinePoints(<HTMLElement>(<unknown>polyline2));

                    if (points1 && points2) {
                        // Exclude fork segments: skip first point of each half-edge
                        const allPoints: Point[] = [...points1.slice(1), ...points2.slice(1, 2)];

                        for (let i = 0; i < allPoints.length - 1; i++) {
                            midpoints.push(DiagramUtils.getMidPosition(allPoints[i], allPoints[i + 1]));
                        }
                    }
                }
            }
        }
        return midpoints;
    }

    private calculateEdgeSegmentMidpoints(edge: EdgeMetadata): Point[] {
        if (!edge.node1 || !edge.node2) return [];
        const midpoints: Point[] = [];

        const startPoints = this.getEdgeStartPoints(edge);
        if (!startPoints) return [];

        if (edge.points && edge.points.length > 0) {
            const previousPoint = startPoints[0];

            midpoints.push(DiagramUtils.getMidPosition(previousPoint, new Point(edge.points[0].x, edge.points[0].y)));

            for (let i = 0; i < edge.points.length - 1; i++) {
                const current = new Point(edge.points[i].x, edge.points[i].y);
                const next = new Point(edge.points[i + 1].x, edge.points[i + 1].y);
                midpoints.push(DiagramUtils.getMidPosition(current, next));
            }

            const lastPoint = new Point(edge.points.at(-1)!.x, edge.points.at(-1)!.y);
            midpoints.push(DiagramUtils.getMidPosition(lastPoint, startPoints[1]));
        } else {
            midpoints.push(DiagramUtils.getMidPosition(startPoints[0], startPoints[1]));
        }

        return midpoints;
    }

    private getParallelPointElement(pointElement: SVGGraphicsElement, edgeId: string): SVGGraphicsElement | undefined {
        const parallelGroup = DiagramUtils.getParallelEdgeGroup(edgeId, this.diagramMetadata?.edges);

        if (parallelGroup) {
            const pointElementData = this.linePointIndexMap.get(pointElement);
            if (pointElementData) {
                const otherEdge = parallelGroup.find((e) => e.svgId !== pointElementData.edgeId);
                if (otherEdge) {
                    return this.linePointByEdgeIndexMap.get(
                        DiagramUtils.getLinePointMapKey(otherEdge.svgId, pointElementData.index)
                    );
                }
            }
        }
        return undefined;
    }

    private hideEdgePreviewPoints(): void {
        const previewContainer = this.svgDraw?.node.querySelector('#edge-preview-points');
        if (previewContainer) {
            previewContainer.remove();
        }
    }
}
