/**
 * Copyright (c) 2020, RTE (http://www.rte-france.com)
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

import type { Accessor, DefaultProps } from '@deck.gl/core';
import { LineLayer, type LineLayerProps } from '@deck.gl/layers';
import type { UniformValue } from '@luma.gl/core';
import { ShaderModule } from '@luma.gl/shadertools';

const forkLineUniformBlock = `\
uniform forkLineUniforms {
    float distanceBetweenLines;
    float maxParallelOffset;
    float minParallelOffset;
    float substationRadius;
    float substationMaxPixel;
    float minSubstationRadiusPixel;
} forkLine;
`;

type ForkLineProps = {
    distanceBetweenLines: number;
    maxParallelOffset: number;
    minParallelOffset: number;
    substationRadius: number;
    substationMaxPixel: number;
    minSubstationRadiusPixel: number;
};

const forkLineUniforms = {
    name: 'forkLine',
    vs: forkLineUniformBlock,
    fs: forkLineUniformBlock,
    uniformTypes: {
        distanceBetweenLines: 'f32',
        maxParallelOffset: 'f32',
        minParallelOffset: 'f32',
        substationRadius: 'f32',
        substationMaxPixel: 'f32',
        minSubstationRadiusPixel: 'f32',
    },
} as const satisfies ShaderModule<ForkLineProps>;

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
    getProximityFactor: Accessor<DataT, number>;
    getSubstationOffset: Accessor<DataT, number>;
};
export type ForkLineLayerProps<DataT = unknown> = _ForkLineLayerProps<DataT> & LineLayerProps<DataT>;

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
in float instanceLineParallelIndex;
in float instanceLineAngle;
in float instanceOffsetStart;
in float instanceProximityFactor;
            `,
            'float segmentIndex = positions.x': `;
    target = source;
    target_commonspace = source_commonspace;

    float offsetPixels = clamp(project_size_to_pixel(forkLine.distanceBetweenLines), forkLine.minParallelOffset, forkLine.maxParallelOffset);
    float offsetCommonSpace = project_pixel_size(offsetPixels);

    float offsetSubstation = clamp(
        project_size_to_pixel(forkLine.substationRadius * instanceOffsetStart),
        forkLine.minSubstationRadiusPixel,
        forkLine.substationMaxPixel * instanceOffsetStart
    );
    float offsetSubstationCommonSpace = project_pixel_size(offsetSubstation);

    vec4 trans = vec4(cos(instanceLineAngle), -sin(instanceLineAngle), 0.0, 0.0) * instanceLineParallelIndex;

    trans.x -= sin(instanceLineAngle) * instanceProximityFactor;
    trans.y -= cos(instanceLineAngle) * instanceProximityFactor;

    float transLen = max(1e-6, length(trans.xy));
    vec4 transTargetCommon = trans * offsetCommonSpace;
    vec4 transSourceCommon = trans * (offsetSubstationCommonSpace / transLen);

    source_commonspace += transSourceCommon;
    target_commonspace += transTargetCommon;

    source += project_common_position_to_clipspace(transSourceCommon) - project.center;
    target += project_common_position_to_clipspace(transTargetCommon) - project.center;

            `,
        };
        shaders.modules.push(forkLineUniforms);
        return shaders;
    }

    override initializeState() {
        super.initializeState();
        this.getAttributeManager()?.addInstanced({
            instanceLineParallelIndex: {
                size: 1,
                type: 'float32',
                accessor: 'getLineParallelIndex',
            },
            instanceLineAngle: {
                size: 1,
                type: 'float32',
                accessor: 'getLineAngle',
            },
            instanceOffsetStart: {
                size: 1,
                type: 'float32',
                accessor: 'getSubstationOffset',
            },
            instanceProximityFactor: {
                size: 1,
                type: 'float32',
                accessor: 'getProximityFactor',
            },
        });
    }

    // TODO find the full type for record values
    override draw({ uniforms }: { uniforms: Record<string, UniformValue> }) {
        const model = this.state.model!;
        const forkLine = {
            distanceBetweenLines: this.props.getDistanceBetweenLines,
            maxParallelOffset: this.props.getMaxParallelOffset,
            minParallelOffset: this.props.getMinParallelOffset,
            substationRadius: this.props.getSubstationRadius,
            substationMaxPixel: this.props.getSubstationMaxPixel,
            minSubstationRadiusPixel: this.props.getMinSubstationRadiusPixel,
        };
        model.shaderInputs.setProps({ forkLine });
        super.draw({ uniforms });
    }
}
