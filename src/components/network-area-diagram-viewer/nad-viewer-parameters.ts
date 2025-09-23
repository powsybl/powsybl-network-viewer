/**
 * Copyright (c) 2025, RTE (http://www.rte-france.com)
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */
import {
    OnMoveNodeCallbackType,
    OnMoveTextNodeCallbackType,
    OnRightClickCallbackType,
    OnSelectNodeCallbackType,
    OnToggleNadHoverCallbackType,
} from './network-area-diagram-viewer';

export interface NadViewerParametersOptions {
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

    // Callback function triggered when a node is moved.
    onMoveNodeCallback?: OnMoveNodeCallbackType | null;

    // Callback function triggered when a text node is moved.
    onMoveTextNodeCallback?: OnMoveTextNodeCallbackType | null;

    // Callback function triggered when a node is selected.
    onSelectNodeCallback?: OnSelectNodeCallbackType | null;

    // Callback function triggered when hovering over a node or edge.
    onToggleHoverCallback?: OnToggleNadHoverCallbackType | null;

    // Callback function triggered when right-clicking on a node or edge.
    onRightClickCallback?: OnRightClickCallbackType | null;
}

export class NadViewerParameters {
    static readonly MIN_WIDTH_DEFAULT = 500;
    static readonly MIN_HEIGHT_DEFAULT = 600;
    static readonly MAX_WIDTH_DEFAULT = 1000;
    static readonly MAX_HEIGHT_DEFAULT = 1200;
    static readonly ENABLE_DRAG_INTERACTION_DEFAULT = false;
    static readonly ENABLE_LEVEL_OF_DETAIL_DEFAULT = false;
    static readonly ZOOM_LEVELS_DEFAULT = [0, 1000, 2200, 2500, 3000, 4000, 9000, 12000, 20000];
    static readonly ADD_BUTTONS_DEFAULT = false;

    nadViewerParametersOptions: NadViewerParametersOptions | undefined;

    constructor(nadViewerParametersOptions: NadViewerParametersOptions | undefined) {
        this.nadViewerParametersOptions = nadViewerParametersOptions;
    }

    public getMinWidth(): number {
        return this.nadViewerParametersOptions?.minWidth ?? NadViewerParameters.MIN_WIDTH_DEFAULT;
    }
    public getMinHeight(): number {
        return this.nadViewerParametersOptions?.minHeight ?? NadViewerParameters.MIN_HEIGHT_DEFAULT;
    }
    public getMaxWidth(): number {
        return this.nadViewerParametersOptions?.maxWidth ?? NadViewerParameters.MAX_WIDTH_DEFAULT;
    }
    public getMaxHeight(): number {
        return this.nadViewerParametersOptions?.maxHeight ?? NadViewerParameters.MAX_HEIGHT_DEFAULT;
    }
    public getEnableDragInteraction(): boolean {
        return (
            this.nadViewerParametersOptions?.enableDragInteraction ??
            NadViewerParameters.ENABLE_DRAG_INTERACTION_DEFAULT
        );
    }
    public getEnableLevelOfDetail(): boolean {
        return (
            this.nadViewerParametersOptions?.enableLevelOfDetail ?? NadViewerParameters.ENABLE_LEVEL_OF_DETAIL_DEFAULT
        );
    }
    public getZoomLevels(): number[] {
        return this.nadViewerParametersOptions?.zoomLevels ?? NadViewerParameters.ZOOM_LEVELS_DEFAULT;
    }
    public getAddButtons(): boolean {
        return this.nadViewerParametersOptions?.addButtons ?? NadViewerParameters.ADD_BUTTONS_DEFAULT;
    }
    public getOnMoveNodeCallback(): OnMoveNodeCallbackType | null {
        return this.nadViewerParametersOptions?.onMoveNodeCallback ?? null;
    }
    public getOnMoveTextNodeCallback(): OnMoveTextNodeCallbackType | null {
        return this.nadViewerParametersOptions?.onMoveTextNodeCallback ?? null;
    }
    public getOnSelectNodeCallback(): OnSelectNodeCallbackType | null {
        return this.nadViewerParametersOptions?.onSelectNodeCallback ?? null;
    }
    public getOnToggleHoverCallback(): OnToggleNadHoverCallbackType | null {
        return this.nadViewerParametersOptions?.onToggleHoverCallback ?? null;
    }
    public getOnRightClickCallback(): OnRightClickCallbackType | null {
        return this.nadViewerParametersOptions?.onRightClickCallback ?? null;
    }
}
