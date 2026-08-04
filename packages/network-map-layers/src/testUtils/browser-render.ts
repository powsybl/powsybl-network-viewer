/**
 * Copyright (c) 2026, RTE (http://www.rte-france.com)
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

import { Deck, MapViewState, type LayersList } from '@deck.gl/core';
import { expect } from 'vitest';

export const VIEW_STATE = {
    longitude: 2.36,
    latitude: 48.86,
    zoom: 11,
    pitch: 0,
    bearing: 0,
};

export const SCREENSHOT_OPTIONS = {
    comparatorName: 'pixelmatch' as const,
    comparatorOptions: {
        allowedMismatchedPixelRatio: 0.0,
    },
};

type BrowserExpect = {
    element: (element: Element) => {
        toMatchScreenshot: (name?: string, options?: typeof SCREENSHOT_OPTIONS) => Promise<void>;
    };
};

export function expectElement(element: Element) {
    return (expect as unknown as BrowserExpect).element(element);
}

export function setupBrowserLayerRenderer() {
    let currentDeck: Deck | null = null;
    let currentContainer: HTMLDivElement | null = null;

    function createContainer(): HTMLDivElement {
        const container = document.createElement('div');
        container.style.width = '1000px';
        container.style.height = '1000px';
        container.style.position = 'fixed';
        container.style.top = '0';
        container.style.left = '0';
        document.body.append(container);
        return container;
    }

    async function renderLayers(
        layers: LayersList,
        initialViewState: MapViewState = VIEW_STATE
    ): Promise<HTMLCanvasElement> {
        currentContainer = createContainer();

        currentDeck = new Deck({
            parent: currentContainer,
            width: 1000,
            height: 1000,
            useDevicePixels: false,
            initialViewState,
            controller: false,
            layers,
        });

        currentDeck.redraw();
        await new Promise<void>((resolve) => setTimeout(resolve, 250));

        const canvas = currentContainer.querySelector('canvas');
        if (!(canvas instanceof HTMLCanvasElement)) {
            throw new Error('Unable to find deck.gl canvas for screenshot assertion');
        }

        return canvas;
    }

    function cleanup(): void {
        currentDeck?.finalize();
        currentDeck = null;
        currentContainer?.remove();
        currentContainer = null;
    }

    return {
        renderLayers,
        cleanup,
    };
}
