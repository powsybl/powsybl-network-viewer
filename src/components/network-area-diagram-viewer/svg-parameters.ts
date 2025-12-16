/**
 * Copyright (c) 2024, RTE (http://www.rte-france.com)
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

import { SvgParametersMetadata } from './diagram-metadata';
import { degToRad } from './diagram-utils';

export enum EdgeInfoEnum {
    ACTIVE_POWER,
    REACTIVE_POWER,
    CURRENT,
}

const EdgeInfoEnumMapping: { [key: string]: EdgeInfoEnum } = {
    ACTIVE_POWER: EdgeInfoEnum.ACTIVE_POWER,
    REACTIVE_POWER: EdgeInfoEnum.REACTIVE_POWER,
    CURRENT: EdgeInfoEnum.CURRENT,
};

type DiagramPadding = {
    left: number;
    top: number;
    right: number;
    bottom: number;
};

export enum CssLocationEnum {
    INSERTED_IN_SVG,
    EXTERNAL_IMPORTED,
    EXTERNAL_NO_IMPORT,
}

const CssLocationEnumMapping: { [key: string]: CssLocationEnum } = {
    INSERTED_IN_SVG: CssLocationEnum.INSERTED_IN_SVG,
    EXTERNAL_IMPORTED: CssLocationEnum.EXTERNAL_IMPORTED,
    EXTERNAL_NO_IMPORT: CssLocationEnum.EXTERNAL_NO_IMPORT,
};

export class SvgParameters {
    static readonly VOLTAGE_LEVEL_CIRCLE_RADIUS_DEFAULT = 30.0;
    static readonly INTER_ANNULUS_SPACE_DEFAULT = 5.0;
    static readonly TRANSFORMER_CIRCLE_RADIUS_DEFAULT = 20.0;
    static readonly EDGES_FORK_APERTURE_DEFAULT = 60;
    static readonly EDGES_FORK_LENGTH_DEFAULT = 80.0;
    static readonly ARROW_SHIFT_DEFAULT = 30.0;
    static readonly ARROW_LABEL_SHIFT_DEFAULT = 19.0;
    static readonly CONVERTER_STATION_WIDTH_DEFAULT = 70.0;
    static readonly NODE_HOLLOW_WIDTH_DEFAULT = 15.0;
    static readonly UNKNOWN_BUS_NODE_EXTRA_RADIUS_DEFAULT = 10.0;
    static readonly EDGE_NAME_DISPLAYED_DEFAULT = true;
    static readonly FICTITIOUS_VOLTAGE_LEVEL_CIRCLE_RADIUS_DEFAULT = 15.0;
    static readonly EDGE_INFO_DISPLAYED_DEFAULT = EdgeInfoEnum.ACTIVE_POWER;
    static readonly POWER_VALUE_PRECISION_RADIUS_DEFAULT = 0;
    static readonly CURRENT_VALUE_PRECISION_DEFAULT = 0;
    static readonly ANGLE_VALUE_PRECISION_DEFAULT = 1;
    static readonly VOLTAGE_VALUE_PRECISION_DEFAULT = 1;
    static readonly DIAGRAM_PADDING_LEFT_DEFAULT = 200.0;
    static readonly DIAGRAM_PADDING_TOP_DEFAULT = 200.0;
    static readonly DIAGRAM_PADDING_RIGHT_DEFAULT = 200.0;
    static readonly DIAGRAM_PADDING_BOTTON_DEFAULT = 200.0;
    static readonly CSS_LOCATION_DEFAULT = CssLocationEnum.EXTERNAL_NO_IMPORT;
    static readonly ARROW_PATH_IN_DEFAULT = 'M-10 -10 H10 L0 10z';
    static readonly ARROW_PATH_OUT_DEFAULT = 'M-10 10 H10 L0 -10z';
    static readonly LOOP_EDGE_APERTURE_DEFAULT = 60;
    static readonly LOOP_DISTANCE_DEFAULT = 120;
    static readonly LOOP_CONTROL_DISTANCE_DEFAULT = 40;

    svgParametersMetadata: SvgParametersMetadata | undefined;

    constructor(svgParametersMetadata: SvgParametersMetadata | undefined) {
        this.svgParametersMetadata = svgParametersMetadata;
    }

    public getVoltageLevelCircleRadius(): number {
        return (
            this.svgParametersMetadata?.voltageLevelCircleRadius ?? SvgParameters.VOLTAGE_LEVEL_CIRCLE_RADIUS_DEFAULT
        );
    }

    public getInterAnnulusSpace(): number {
        return this.svgParametersMetadata?.interAnnulusSpace ?? SvgParameters.INTER_ANNULUS_SPACE_DEFAULT;
    }

    public getTransformerCircleRadius(): number {
        return this.svgParametersMetadata?.transformerCircleRadius ?? SvgParameters.TRANSFORMER_CIRCLE_RADIUS_DEFAULT;
    }

    public getEdgesForkAperture(): number {
        return degToRad(this.svgParametersMetadata?.edgesForkAperture ?? SvgParameters.EDGES_FORK_APERTURE_DEFAULT);
    }

    public getEdgesForkLength(): number {
        return this.svgParametersMetadata?.edgesForkLength ?? SvgParameters.EDGES_FORK_LENGTH_DEFAULT;
    }

    public getArrowShift(): number {
        return this.svgParametersMetadata?.arrowShift ?? SvgParameters.ARROW_SHIFT_DEFAULT;
    }

    public getArrowLabelShift(): number {
        return this.svgParametersMetadata?.arrowLabelShift ?? SvgParameters.ARROW_LABEL_SHIFT_DEFAULT;
    }

    public getArrowPathIn(): string {
        return this.svgParametersMetadata?.arrowPathIn ?? SvgParameters.ARROW_PATH_IN_DEFAULT;
    }

    public getArrowPathOut(): string {
        return this.svgParametersMetadata?.arrowPathOut ?? SvgParameters.ARROW_PATH_OUT_DEFAULT;
    }

    public getConverterStationWidth(): number {
        return this.svgParametersMetadata?.converterStationWidth ?? SvgParameters.CONVERTER_STATION_WIDTH_DEFAULT;
    }

    public getNodeHollowWidth(): number {
        return this.svgParametersMetadata?.nodeHollowWidth ?? SvgParameters.NODE_HOLLOW_WIDTH_DEFAULT;
    }

    public getUnknownBusNodeExtraRadius(): number {
        return (
            this.svgParametersMetadata?.unknownBusNodeExtraRadius ?? SvgParameters.UNKNOWN_BUS_NODE_EXTRA_RADIUS_DEFAULT
        );
    }

    public getEdgeNameDisplayed(): boolean {
        return this.svgParametersMetadata?.edgeNameDisplayed ?? SvgParameters.EDGE_NAME_DISPLAYED_DEFAULT;
    }

    public getFictitiousVoltageLevelCircleRadius(): number {
        return (
            this.svgParametersMetadata?.fictitiousVoltageLevelCircleRadius ??
            SvgParameters.FICTITIOUS_VOLTAGE_LEVEL_CIRCLE_RADIUS_DEFAULT
        );
    }

    public getEdgeInfoDisplayed(): EdgeInfoEnum {
        return this.svgParametersMetadata?.edgeInfoDisplayed
            ? EdgeInfoEnumMapping[this.svgParametersMetadata?.edgeInfoDisplayed]
            : SvgParameters.EDGE_INFO_DISPLAYED_DEFAULT;
    }

    public getPowerValuePrecision(): number {
        return this.svgParametersMetadata?.powerValuePrecision ?? SvgParameters.POWER_VALUE_PRECISION_RADIUS_DEFAULT;
    }

    public getCurrentValuePrecision(): number {
        return this.svgParametersMetadata?.currentValuePrecision ?? SvgParameters.CURRENT_VALUE_PRECISION_DEFAULT;
    }

    public getAngleValuePrecision(): number {
        return this.svgParametersMetadata?.angleValuePrecision ?? SvgParameters.ANGLE_VALUE_PRECISION_DEFAULT;
    }

    public getVoltageValuePrecision(): number {
        return this.svgParametersMetadata?.voltageValuePrecision ?? SvgParameters.VOLTAGE_VALUE_PRECISION_DEFAULT;
    }

    public getDiagramPadding(): DiagramPadding {
        return {
            left: this.svgParametersMetadata?.diagramPadding.left ?? SvgParameters.DIAGRAM_PADDING_LEFT_DEFAULT,
            top: this.svgParametersMetadata?.diagramPadding.top ?? SvgParameters.DIAGRAM_PADDING_TOP_DEFAULT,
            right: this.svgParametersMetadata?.diagramPadding.right ?? SvgParameters.DIAGRAM_PADDING_RIGHT_DEFAULT,
            bottom: this.svgParametersMetadata?.diagramPadding.bottom ?? SvgParameters.DIAGRAM_PADDING_BOTTON_DEFAULT,
        };
    }

    public getCssLocation(): CssLocationEnum {
        return this.svgParametersMetadata?.cssLocation
            ? CssLocationEnumMapping[this.svgParametersMetadata?.cssLocation]
            : SvgParameters.CSS_LOCATION_DEFAULT;
    }

    public getLoopEdgesAperture(): number {
        return this.svgParametersMetadata?.loopEdgesAperture ?? SvgParameters.LOOP_EDGE_APERTURE_DEFAULT;
    }

    public getLoopDistance(): number {
        return this.svgParametersMetadata?.loopDistance ?? SvgParameters.LOOP_DISTANCE_DEFAULT;
    }

    public getLoopControlDistance(): number {
        return this.svgParametersMetadata?.loopControlDistance ?? SvgParameters.LOOP_CONTROL_DISTANCE_DEFAULT;
    }
}
