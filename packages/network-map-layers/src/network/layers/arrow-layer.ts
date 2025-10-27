/**
 * Copyright (c) 2020, RTE (http://www.rte-france.com)
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

import { GL } from '@luma.gl/constants';
import { Geometry, Model } from '@luma.gl/engine';
import { Device, RenderPass, Texture, TextureFormat, TextureProps, UniformValue } from '@luma.gl/core';

import {
    type Accessor,
    type Color,
    DefaultProps,
    Layer,
    type LayerContext,
    type LayerProps,
    picking,
    type Position,
    project32,
    type UpdateParameters,
} from '@deck.gl/core';
import { type MapAnyLineWithType } from '../../equipment-types';

import vs from './arrow-layer-vertex.vert?raw';
import fs from './arrow-layer-fragment.frag?raw';

const DEFAULT_COLOR = [0, 0, 0, 255] satisfies Color;

// this value has to be consistent with the one in vertex shader
const MAX_LINE_POINT_COUNT = 2 ** 15;

export enum ArrowDirection {
    NONE = 'none',
    FROM_SIDE_1_TO_SIDE_2 = 'fromSide1ToSide2',
    FROM_SIDE_2_TO_SIDE_1 = 'fromSide2ToSide1',
}

type LineAttributes = {
    distance: number;
    positionsTextureOffset: number;
    distancesTextureOffset: number;
    pointCount: number;
};

export type Arrow = {
    line: MapAnyLineWithType;
    distance: number;
};

type _ArrowLayerProps = {
    data: Arrow[];
    sizeMinPixels?: number;
    sizeMaxPixels?: number;
    getDistance: Accessor<Arrow, number>;
    getLine: (arrow: Arrow) => MapAnyLineWithType;
    getLinePositions: (line: MapAnyLineWithType) => Position[];
    getSize?: Accessor<Arrow, number>;
    getColor?: Accessor<Arrow, Color>;
    getSpeedFactor?: Accessor<Arrow, number>;
    getDirection?: Accessor<Arrow, ArrowDirection>;
    animated?: boolean;
    /** accessor for real number representing the parallel translation, normalized to distanceBetweenLines */
    getLineParallelIndex?: Accessor<Arrow, number>;
    /** accessor for line angle in radian (3 angle substation1 / first pylon ; substation1/substation2 ; last pylon / substation2 */
    getLineAngles?: Accessor<Arrow, number[]>;
    /** distance in meters between line when no pixel clamping is applied */
    getDistanceBetweenLines?: Accessor<Arrow, number>;
    // TODO missing getProximityFactors?: Accessor<Arrow, number[]>;
    /** max pixel distance */
    maxParallelOffset?: number;
    /** min pixel distance */
    minParallelOffset?: number;
    opacity?: number;
} & LayerProps;
export type ArrowLayerProps = _ArrowLayerProps & LayerProps;

const defaultProps: DefaultProps<ArrowLayerProps> = {
    sizeMinPixels: { type: 'number', min: 0, value: 0 }, //  min size in pixels
    sizeMaxPixels: { type: 'number', min: 0, value: Number.MAX_SAFE_INTEGER }, // max size in pixels

    getDistance: { type: 'accessor', value: (arrow) => arrow.distance },
    getLine: { type: 'accessor', value: (arrow) => arrow.line },
    getLinePositions: { type: 'accessor', value: (line) => line.positions ?? [] },
    getSize: { type: 'accessor', value: 1 },
    getColor: { type: 'accessor', value: DEFAULT_COLOR },
    getSpeedFactor: { type: 'accessor', value: 1.0 },
    getDirection: { type: 'accessor', value: ArrowDirection.NONE },
    animated: { type: 'boolean', value: true },
    getLineParallelIndex: { type: 'accessor', value: 0 },
    getLineAngles: { type: 'accessor', value: [0, 0, 0] },
    maxParallelOffset: { type: 'number', value: 100 },
    minParallelOffset: { type: 'number', value: 3 },
    opacity: { type: 'number', value: 1.0 },
};

/**
 * A layer that draws arrows over the lines between voltage levels. The arrows are drawn on a direct line
 * or with a parallel offset. The initial point is also shifted to coincide with the fork line ends.
 * Needs to be kept in sync with ForkLineLayer and ParallelPathLayer because they draw the lines.
 */
export default class ArrowLayer extends Layer<Required<_ArrowLayerProps>> {
    // noinspection JSUnusedGlobalSymbols -- it's dynamically get by deck.gl
    static readonly layerName = 'ArrowLayer';
    // noinspection JSUnusedGlobalSymbols -- it's dynamically get by deck.gl
    static readonly defaultProps = defaultProps;

    declare state: {
        linePositionsTexture?: Texture;
        lineDistancesTexture?: Texture;
        lineAttributes?: Map<MapAnyLineWithType, LineAttributes>;
        model?: Model;
        timestamp?: number;
        stop?: boolean;
        maxTextureSize: number;
    };

    override getShaders() {
        return super.getShaders({ vs, fs, modules: [project32, picking] });
    }

    getArrowLineAttributes(arrow: Arrow) {
        const line = this.props.getLine(arrow);
        if (!line) {
            throw new Error('Invalid line');
        }
        const attributes = this.state.lineAttributes?.get(line);
        if (!attributes) {
            throw new Error(`Line ${line.id} not found`);
        }
        return attributes;
    }

    override initializeState() {
        const { device } = this.context;

        const maxTextureSize = device.limits.maxTextureDimension2D;
        this.state = {
            maxTextureSize,
        };

        this.getAttributeManager()?.addInstanced({
            instanceSize: {
                size: 1,
                type: 'float32',
                transition: true,
                accessor: 'getSize',
                defaultValue: 1,
            },
            instanceColor: {
                size: this.props.colorFormat.length,
                transition: true,
                type: 'unorm8', // normalized: true,
                accessor: 'getColor',
                defaultValue: [0, 0, 0, 255],
            },
            instanceSpeedFactor: {
                size: 1,
                type: 'float32',
                transition: true,
                accessor: 'getSpeedFactor',
                defaultValue: 1.0,
            },
            instanceArrowDistance: {
                size: 1,
                transition: true,
                accessor: 'getDistance',
                type: 'float32',
                defaultValue: 0,
            },
            instanceArrowDirection: {
                size: 1,
                type: 'float32',
                transition: true,
                accessor: 'getDirection',
                transform: (direction) => {
                    switch (direction) {
                        case ArrowDirection.NONE:
                            return 0.0;
                        case ArrowDirection.FROM_SIDE_1_TO_SIDE_2:
                            return 1.0;
                        case ArrowDirection.FROM_SIDE_2_TO_SIDE_1:
                            return 2.0;
                        default:
                            throw new Error('impossible');
                    }
                },
                defaultValue: 0.0,
            },
            instanceLineDistance: {
                size: 1,
                transition: true,
                type: 'float32',
                accessor: (arrow) => this.getArrowLineAttributes(arrow).distance,
            },
            instanceLinePositionsTextureOffset: {
                size: 1,
                transition: true,
                type: 'sint32',
                accessor: (arrow) => this.getArrowLineAttributes(arrow).positionsTextureOffset,
            },
            instanceLineDistancesTextureOffset: {
                size: 1,
                transition: true,
                type: 'sint32',
                accessor: (arrow) => this.getArrowLineAttributes(arrow).distancesTextureOffset,
            },
            instanceLinePointCount: {
                size: 1,
                transition: true,
                type: 'sint32',
                accessor: (arrow) => this.getArrowLineAttributes(arrow).pointCount,
            },
            instanceLineParallelIndex: {
                size: 1,
                accessor: 'getLineParallelIndex',
                type: 'float32',
            },
            instanceLineAngles: {
                size: 3,
                accessor: 'getLineAngles',
                type: 'float32',
            },
            instanceProximityFactors: {
                size: 2,
                accessor: 'getProximityFactors',
                type: 'float32',
            },
            instanceDistanceBetweenLines: {
                size: 1,
                transition: true,
                accessor: 'getDistanceBetweenLines',
                type: 'float32',
                defaultValue: 1000,
            },
        });
    }

    override finalizeState(context: LayerContext) {
        super.finalizeState(context);
        // we do not use setState to avoid a redraw, it is just used to stop the animation
        this.state.stop = true;
    }

    createTexture2D(device: Device, data: Array<number>, elementSize: number, format: TextureFormat) {
        const start = performance.now();

        const { maxTextureSize } = this.state;
        // we calculate the smallest texture width less or equals to MAX_TEXTURE_SIZE
        // (which is an property of the graphic card)
        const elementCount = data.length / elementSize;
        const expSum = Math.ceil(Math.log2(elementCount));
        const widthExp = Math.ceil(expSum / 2);
        const heightExp = expSum - widthExp;
        const width = 2 ** widthExp;
        const height = 2 ** heightExp;
        if (height > maxTextureSize || width > maxTextureSize) {
            throw new Error(`Texture size ${width}*${height} cannot be greater than ${maxTextureSize}`);
        }

        // data length needs to be width * height (otherwise we get an error), so we pad the data array with zero until
        // reaching the correct size.
        const newLength = width * height * elementSize;
        const oldLength = data.length;
        if (data.length < newLength) {
            data.length = newLength;
            data.fill(0, oldLength, newLength);
        }

        const texture2d = device.createTexture({
            width,
            height,
            format,
            type: GL.FLOAT,
            data: new Float32Array(data),
            parameters: {
                [GL.TEXTURE_MAG_FILTER]: GL.NEAREST,
                [GL.TEXTURE_MIN_FILTER]: GL.NEAREST,
                [GL.TEXTURE_WRAP_S]: GL.CLAMP_TO_EDGE,
                [GL.TEXTURE_WRAP_T]: GL.CLAMP_TO_EDGE,
            },
            mipmaps: false,
        } as TextureProps);

        const stop = performance.now();
        console.info(
            `Texture of ${elementCount} elements of size ${elementSize} (${width} * ${height}) created in ${
                stop - start
            } ms`
        );

        return texture2d;
    }

    createTexturesStructure(props: this['props']) {
        const start = performance.now();

        const linePositionsTextureData: number[] = [];
        const lineDistancesTextureData: number[] = [];
        const lineAttributes = new Map<MapAnyLineWithType, LineAttributes>();
        let lineDistance = 0;

        // build line list from arrow list
        const lines = [...new Set(props.data.map((arrow) => this.props.getLine(arrow)))];

        lines.forEach((line) => {
            const positions = props.getLinePositions(line);
            if (!positions) {
                throw new Error(`Invalid positions for line ${line.id}`);
            }
            const linePositionsTextureOffset = linePositionsTextureData.length / 2;
            const lineDistancesTextureOffset = lineDistancesTextureData.length;
            let linePointCount = 0;
            if (positions.length > 0) {
                positions.forEach((position) => {
                    // fill line positions texture
                    linePositionsTextureData.push(position[0]);
                    linePositionsTextureData.push(position[1]);
                    linePointCount++;
                });
                lineDistancesTextureData.push(...(line.cumulativeDistances ?? []));
                //@ts-expect-error TODO TS18048: line. cumulativeDistances is possibly undefined
                lineDistance = line.cumulativeDistances[line.cumulativeDistances.length - 1];
            }
            if (linePointCount > MAX_LINE_POINT_COUNT) {
                throw new Error(`Too many line point count (${linePointCount}), maximum is ${MAX_LINE_POINT_COUNT}`);
            }

            lineAttributes.set(line, {
                distance: lineDistance,
                positionsTextureOffset: linePositionsTextureOffset,
                distancesTextureOffset: lineDistancesTextureOffset,
                pointCount: linePointCount,
            });
        });

        const stop = performance.now();
        console.info(`Texture data created in ${stop - start} ms`);

        return {
            linePositionsTextureData,
            lineDistancesTextureData,
            lineAttributes,
        };
    }

    updateGeometry({ props, changeFlags }: UpdateParameters<this>) {
        const geometryChanged =
            changeFlags.dataChanged ||
            (changeFlags.updateTriggersChanged &&
                (changeFlags.updateTriggersChanged.all || changeFlags.updateTriggersChanged.getLinePositions));

        if (geometryChanged) {
            const { device } = this.context;

            const { linePositionsTextureData, lineDistancesTextureData, lineAttributes } =
                this.createTexturesStructure(props);

            const linePositionsTexture = this.createTexture2D(
                device,
                linePositionsTextureData,
                2,
                'rg32float' //GL.RG32F,
            );
            const lineDistancesTexture = this.createTexture2D(
                device,
                lineDistancesTextureData,
                1,
                'r32float' //GL.R32F,
            );

            this.setState({
                linePositionsTexture,
                lineDistancesTexture,
                lineAttributes,
            });

            if (!changeFlags.dataChanged) {
                this.getAttributeManager()?.invalidateAll();
            }
        }
    }

    updateModel({ changeFlags }: UpdateParameters<this>) {
        if (changeFlags.somethingChanged) {
            const { device } = this.context;

            const { model } = this.state;
            if (model) {
                model.destroy();
            }

            this.setState({
                model: this._getModel(device),
            });

            this.getAttributeManager()?.invalidateAll();
        }
    }

    override updateState(updateParams: UpdateParameters<this>) {
        super.updateState(updateParams);

        this.updateGeometry(updateParams);
        this.updateModel(updateParams);

        const { props, oldProps } = updateParams;

        if (props.animated !== oldProps.animated) {
            this.setState({
                stop: !props.animated,
                timestamp: 0,
            });
            if (props.animated) {
                this.startAnimation();
            }
        }
    }

    animate(timestamp: number) {
        if (this.state.stop) {
            return;
        }
        this.setState({
            timestamp: timestamp,
        });
        this.startAnimation();
    }

    startAnimation() {
        window.requestAnimationFrame((timestamp) => this.animate(timestamp));
    }

    draw({ uniforms, renderPass }: { uniforms: Record<string, UniformValue>; renderPass: RenderPass }) {
        const { sizeMinPixels, sizeMaxPixels, opacity } = this.props;

        const {
            model,
            linePositionsTexture,
            lineDistancesTexture,
            timestamp,
            // maxTextureSize,
        } = this.state;
        // TODO we ask an opacity but we don't seem to set or used it?
        model!.setBindings({
            // @ts-expect-error TODO TS2339: Properties width and height does not exists on type Texture2D
            linePositionsTexture,
            // @ts-expect-error TODO TS2339: Properties width and height does not exists on type Texture2D
            lineDistancesTexture,
        });

        model!.setUniforms({
            ...uniforms,
            sizeMinPixels,
            sizeMaxPixels,
            // maxTextureSize,
            // @ts-expect-error TODO TS2339: Properties width and height does not exists on type Texture2D
            linePositionsTextureSize: [linePositionsTexture.width, linePositionsTexture.height],
            opacity,
            // @ts-expect-error TODO TS2339: Properties width and height does not exists on type Texture2D
            lineDistancesTextureSize: [lineDistancesTexture.width, lineDistancesTexture.height],
            // @ts-expect-error TODO TS2339: Properties width and height does not exists on type Texture2D
            timestamp,
            maxParallelOffset: this.props.maxParallelOffset,
            minParallelOffset: this.props.minParallelOffset,
        });
        model!.draw(renderPass);
    }

    _getModel(device: Device) {
        const positions = [-1, -1, 0, 0, 1, 0, 0, -0.6, 0, 1, -1, 0, 0, 1, 0, 0, -0.6, 0];

        return new Model(
            device,
            Object.assign(this.getShaders(), {
                id: this.props.id,
                bufferLayout: this.getAttributeManager()!.getBufferLayouts(),
                geometry: new Geometry({
                    topology: 'triangle-list',
                    vertexCount: 6,
                    attributes: {
                        positions: {
                            size: 3,
                            value: new Float32Array(positions),
                        },
                    },
                }),
                isInstanced: true,
            })
        );
    }
}
