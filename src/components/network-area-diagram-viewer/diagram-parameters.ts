/**
 * Copyright (c) 2025, RTE (http://www.rte-france.com)
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

export interface DiagramParametersMetadata {
    // The minimum width of the viewer.
    minWidth?: number;

    // The minimum height of the viewer.
    minHeight?: number;

    // The maximum width of the viewer.
    maxWidth?: number;

    // The maximum height of the viewer.
    maxHeight?: number;

    // Whether dragging interaction on node or label is enabled.
    enableDragInteraction?: boolean;

    // Whether level-of-detail rendering is enabled based on zoom level.
    enableLevelOfDetail?: boolean;

    // Array of zoom levels used to determine level-of-detail rendering by applying corresponding
    // css class 'nad-zoom-{level}' to 'svg' element. If null, default zoom levels are used.
    zoomLevels?: number[];

    // Whether to add zoom control buttons (zoom in, zoom out, zoom to fit) to the viewer.
    addButtons?: boolean;
}

export class DiagramParameters {
    static readonly MIN_WIDTH_DEFAULT = 500;
    static readonly MIN_HEIGHT_DEFAULT = 600;
    static readonly MAX_WIDTH_DEFAULT = 1000;
    static readonly MAX_HEIGHT_DEFAULT = 1200;
    static readonly ENABLE_DRAG_INTERACTION_DEFAULT = false;
    static readonly ENABLE_LEVEL_OF_DETAIL_DEFAULT = false;
    static readonly ZOOM_LEVELS_DEFAULT = [0, 1000, 2200, 2500, 3000, 4000, 9000, 12000, 20000];
    static readonly ADD_BUTTONS_DEFAULT = false;

    diagramParametersMetadata: DiagramParametersMetadata | undefined;

    constructor(diagramParametersMetadata: DiagramParametersMetadata | undefined) {
        this.diagramParametersMetadata = diagramParametersMetadata;
    }

    public getMinWidth(): number {
        return this.diagramParametersMetadata?.minWidth ?? DiagramParameters.MIN_WIDTH_DEFAULT;
    }
    public getMinHeight(): number {
        return this.diagramParametersMetadata?.minHeight ?? DiagramParameters.MIN_HEIGHT_DEFAULT;
    }
    public getMaxWidth(): number {
        return this.diagramParametersMetadata?.maxWidth ?? DiagramParameters.MAX_WIDTH_DEFAULT;
    }
    public getMaxHeight(): number {
        return this.diagramParametersMetadata?.maxHeight ?? DiagramParameters.MAX_HEIGHT_DEFAULT;
    }
    public getEnableDragInteraction(): boolean {
        return (
            this.diagramParametersMetadata?.enableDragInteraction ?? DiagramParameters.ENABLE_DRAG_INTERACTION_DEFAULT
        );
    }
    public getEnableLevelOfDetail(): boolean {
        return this.diagramParametersMetadata?.enableLevelOfDetail ?? DiagramParameters.ENABLE_LEVEL_OF_DETAIL_DEFAULT;
    }
    public getZoomLevels(): number[] {
        return this.diagramParametersMetadata?.zoomLevels ?? DiagramParameters.ZOOM_LEVELS_DEFAULT;
    }
    public getAddButtons(): boolean {
        return this.diagramParametersMetadata?.addButtons ?? DiagramParameters.ADD_BUTTONS_DEFAULT;
    }
}
