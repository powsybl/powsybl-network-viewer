/**
 * Copyright (c) 2020, RTE (http://www.rte-france.com)
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

import { type Accessor, LineLayer, type LineLayerProps } from 'deck.gl';
import type { DefaultProps } from '@deck.gl/core';
import GL from '@luma.gl/constants';
import { type UniformValues } from 'maplibre-gl';

type _ForkLineLayerProps<DataT> = {
    /** real number representing the parallel translation, normalized to distanceBetweenLines */
    getLineParallelIndex: Accessor<DataT, number>;
    /** line angle in radian */
    getLineAngle: Accessor<DataT, number>;
    /** distance in meters between line when no pixel clamping is applied */
    distanceBetweenLines: Accessor<DataT, number>;
    /** max pixel distance */
    maxParallelOffset: Accessor<DataT, number>;
    /** min pixel distance */
    minParallelOffset: Accessor<DataT, number>;
    /** radius for a voltage level in substation */
    substationRadius: Accessor<DataT, number>;
    /** max pixel for a voltage level in substation */
    substationMaxPixel: Accessor<DataT, number>;
    /** min pixel for a substation */
    minSubstationRadiusPixel: Accessor<DataT, number>;
    getDistanceBetweenLines: Accessor<DataT, number>;
    getMaxParallelOffset: Accessor<DataT, number>;
    getMinParallelOffset: Accessor<DataT, number>;
    getSubstationRadius: Accessor<DataT, number>;
    getSubstationMaxPixel: Accessor<DataT, number>;
    getMinSubstationRadiusPixel: Accessor<DataT, number>;
};
export type ForkLineLayerProps<DataT = unknown> = _ForkLineLayerProps<DataT> & LineLayerProps;

const defaultProps: DefaultProps<ForkLineLayerProps> = {
    getLineParallelIndex: { type: 'accessor', value: 0 },
    getLineAngle: { type: 'accessor', value: 0 },
    distanceBetweenLines: { type: 'number', value: 1000 },
    maxParallelOffset: { type: 'number', value: 100 },
    minParallelOffset: { type: 'number', value: 3 },
    substationRadius: { type: 'number', value: 500 },
    substationMaxPixel: { type: 'number', value: 5 },
    minSubstationRadiusPixel: { type: 'number', value: 1 },
};

/**
 * A layer based on LineLayer that draws a fork line at a substation when there are multiple parallel lines
 * Needs to be kept in sync with ArrowLayer and ParallelPathLayer because connect to the end of the fork lines.
 * props : instanceOffsetStart: distance from the origin point
 */
export default class ForkLineLayer<DataT = unknown> extends LineLayer<DataT, Required<_ForkLineLayerProps<DataT>>> {
    // noinspection JSUnusedGlobalSymbols -- it's dynamically get by deck.gl
    static readonly layerName = 'ForkLineLayer';
    // noinspection JSUnusedGlobalSymbols -- it's dynamically get by deck.gl
    static readonly defaultProps = defaultProps;

    override getShaders() {
        const shaders = super.getShaders();
        shaders.inject = {
            'vs:#decl': `
attribute float instanceLineParallelIndex;
attribute float instanceLineAngle;
attribute float instanceOffsetStart;
attribute float instanceProximityFactor;
uniform float distanceBetweenLines;
uniform float maxParallelOffset;
uniform float minParallelOffset;
uniform float substationRadius;
uniform float substationMaxPixel;
uniform float minSubstationRadiusPixel;
            `,
            'float segmentIndex = positions.x': `;
    target = source ;
    float offsetPixels = clamp(project_size_to_pixel( distanceBetweenLines), minParallelOffset, maxParallelOffset );
    float offsetCommonSpace = project_pixel_size(offsetPixels);

    float offsetSubstation = clamp(project_size_to_pixel(substationRadius*instanceOffsetStart ), 
                                    minSubstationRadiusPixel, 
                                    substationMaxPixel * instanceOffsetStart );
    float offsetSubstationCommonSpace = project_pixel_size(offsetSubstation) ;

    vec4 trans = vec4(cos(instanceLineAngle), -sin(instanceLineAngle ), 0, 0.) * instanceLineParallelIndex;

    trans.x -= sin(instanceLineAngle) * instanceProximityFactor;
    trans.y -= cos(instanceLineAngle) * instanceProximityFactor;

    source+=project_common_position_to_clipspace(trans * (offsetSubstationCommonSpace / sqrt(trans.x*trans.x+trans.y*trans.y))) - project_uCenter;
    target+=project_common_position_to_clipspace(trans * offsetCommonSpace) - project_uCenter;

            `,
        };
        return shaders;
    }

    override initializeState() {
        super.initializeState();
        const attributeManager = this.getAttributeManager();
        attributeManager?.addInstanced({
            instanceLineParallelIndex: {
                size: 1,
                type: GL.FLOAT,
                accessor: 'getLineParallelIndex',
            },
            instanceLineAngle: {
                size: 1,
                type: GL.FLOAT,
                accessor: 'getLineAngle',
            },
            instanceOffsetStart: {
                size: 1,
                type: GL.FLOAT,
                accessor: 'getSubstationOffset',
            },
            instanceProximityFactor: {
                size: 1,
                type: GL.FLOAT,
                accessor: 'getProximityFactor',
            },
        });
    }

    // TODO find the full type for record values
    override draw({ uniforms }: { uniforms: Record<string, UniformValues<object>> }) {
        super.draw({
            uniforms: {
                ...uniforms,
                distanceBetweenLines: this.props.getDistanceBetweenLines,
                maxParallelOffset: this.props.getMaxParallelOffset,
                minParallelOffset: this.props.getMinParallelOffset,
                substationRadius: this.props.getSubstationRadius,
                substationMaxPixel: this.props.getSubstationMaxPixel,
                minSubstationRadiusPixel: this.props.getMinSubstationRadiusPixel,
            },
        });
    }
}
