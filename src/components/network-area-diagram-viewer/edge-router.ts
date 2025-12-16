/**
 * Copyright (c) 2025, RTE (http://www.rte-france.com)
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 * SPDX-License-Identifier: MPL-2.0
 */

import { Point } from '@svgdotjs/svg.js';
import { DiagramMetadata, EdgeMetadata } from './diagram-metadata';
import { SvgParameters } from './svg-parameters';
import * as DiagramUtils from './diagram-utils';
import * as MetadataUtils from './metadata-utils';
import * as HalfEdgeUtils from './half-edge-utils';

export class EdgeRouter {
    diagramMetadata: DiagramMetadata;
    svgParameters: SvgParameters;
    edgeMap: Map<string, [Point[], Point[]]> = new Map<string, [Point[], Point[]]>();
    nodeAngleMap: Map<string, number[]> = new Map<string, number[]>();

    constructor(diagramMetadata: DiagramMetadata) {
        this.diagramMetadata = diagramMetadata;
        this.svgParameters = new SvgParameters(this.diagramMetadata.svgParameters);
        this.init();
    }

    public getEdgeAngle(edgeId: string, side: string): number | undefined {
        const egdesPoints = this.edgeMap.get(edgeId);
        if (!egdesPoints) {
            return undefined;
        }
        const halfEdgePoints = side == '1' ? egdesPoints[0] : egdesPoints[1];
        return DiagramUtils.getAngle(halfEdgePoints[0], halfEdgePoints[1]);
    }

    private init() {
        const edgeGroups = this.groupEdges();
        this.storeGroupedEdges(edgeGroups.groupedEdges);
        this.storeLoopEdges(edgeGroups.loopEdges);
    }

    private groupEdges(): { groupedEdges: Map<string, EdgeMetadata[]>; loopEdges: Map<string, EdgeMetadata[]> } {
        const groupedEdges: Map<string, EdgeMetadata[]> = new Map<string, EdgeMetadata[]>();
        const loopEdges: Map<string, EdgeMetadata[]> = new Map<string, EdgeMetadata[]>();
        this.diagramMetadata.edges.forEach((edge) => {
            let edgeGroup: EdgeMetadata[] = [];
            if (edge.node1 == edge.node2) {
                if (loopEdges.has(edge.node1)) {
                    edgeGroup = loopEdges.get(edge.node1) ?? [];
                }
                edgeGroup.push(edge);
                loopEdges.set(edge.node1, edgeGroup);
            } else {
                const edgeGroupId = MetadataUtils.getGroupedEdgesIndexKey(edge);
                if (groupedEdges.has(edgeGroupId)) {
                    edgeGroup = groupedEdges.get(edgeGroupId) ?? [];
                }
                edgeGroup.push(edge);
                groupedEdges.set(edgeGroupId, edgeGroup);
            }
        });
        return { groupedEdges: groupedEdges, loopEdges: loopEdges };
    }

    private storeGroupedEdges(edgesMap: Map<string, EdgeMetadata[]>) {
        for (const edgeGroup of edgesMap.values()) {
            if (edgeGroup.length == 1) {
                this.storeHalfEdges(edgeGroup[0], 1, 0);
            } else {
                for (let iEdge = 0; iEdge < edgeGroup.length; iEdge++) {
                    if (2 * iEdge + 1 == edgeGroup.length) {
                        this.storeHalfEdges(edgeGroup[iEdge], 1, 0);
                    } else {
                        this.storeHalfEdges(edgeGroup[iEdge], edgeGroup.length, iEdge);
                    }
                }
            }
        }
    }

    private storeHalfEdges(edge: EdgeMetadata, groupedEdgesCount: number, iEdge: number) {
        const halfEgdes = HalfEdgeUtils.getHalfEdges(
            edge,
            iEdge,
            groupedEdgesCount,
            this.diagramMetadata,
            this.svgParameters
        );
        if (!halfEgdes[0] || !halfEgdes[1]) {
            return;
        }
        this.edgeMap.set(edge.svgId, [halfEgdes[0].edgePoints, halfEgdes[1].edgePoints]);
        const angle1 = DiagramUtils.getAngle(halfEgdes[0].edgePoints[0], halfEgdes[0].edgePoints[1]);
        const angle2 = DiagramUtils.getAngle(halfEgdes[1].edgePoints[0], halfEgdes[1].edgePoints[1]);
        const node1Angles: number[] = this.nodeAngleMap.get(edge.node1) ?? [];
        node1Angles.push(angle1);
        this.nodeAngleMap.set(edge.node1, node1Angles);
        const node2Angles: number[] = this.nodeAngleMap.get(edge.node2) ?? [];
        node2Angles.push(angle2);
        this.nodeAngleMap.set(edge.node2, node2Angles);
    }

    private storeLoopEdges(edgesMap: Map<string, EdgeMetadata[]>) {
        for (const loopEdges of edgesMap.values()) {
            const availableAngles = this.findAvailableAngles(
                this.nodeAngleMap.get(loopEdges[0].node1) ?? [],
                loopEdges.length
            );
            let index: number = 0;
            loopEdges.forEach((loopEdge) => {
                const angle = availableAngles[index++];
                this.storeLoopHalfEdges(loopEdge, angle);
            });
        }
    }

    private findAvailableAngles(anglesOtherEdges: number[], nbAngles: number): number[] {
        let availableAngles: number[] = [];
        const slotAperture = this.svgParameters.getLoopEdgesAperture() * 1.2;
        if (anglesOtherEdges.length == 0) {
            Array.from(Array(nbAngles).keys())
                .map((index) => (index * 2 * Math.PI) / nbAngles)
                .forEach((angle) => {
                    availableAngles.push(angle);
                });
        } else {
            anglesOtherEdges = DiagramUtils.completeEdgeAngles(anglesOtherEdges);
            const deltaAngles: number[] = [];
            const nbAvailableSlots: number[] = [];
            let totalDeltaAvailable = 0;
            for (let index = 0; index < anglesOtherEdges.length - 1; index++) {
                deltaAngles[index] = anglesOtherEdges[index + 1] - anglesOtherEdges[index];
                nbAvailableSlots[index] = Math.floor(deltaAngles[index] / DiagramUtils.degToRad(slotAperture));
                if (nbAvailableSlots[index] > 0) {
                    totalDeltaAvailable += deltaAngles[index];
                }
            }
            if (nbAngles <= nbAvailableSlots.reduce((a, b) => a + b) && totalDeltaAvailable > 0) {
                const nbInsertedAngles: number[] = this.computeAnglesInsertedNumber(
                    nbAngles,
                    nbAvailableSlots,
                    totalDeltaAvailable,
                    deltaAngles
                );
                availableAngles = this.calculateInsertedAngles(
                    nbInsertedAngles,
                    deltaAngles,
                    anglesOtherEdges,
                    slotAperture
                );
            } else {
                const iMaxDelta = deltaAngles.reduce(
                    (maxIndex, currentValue, currentIndex, array) =>
                        currentValue > array[maxIndex] ? currentIndex : maxIndex,
                    0
                );
                const startAngle = (anglesOtherEdges[iMaxDelta] + anglesOtherEdges[iMaxDelta + 1]) / 2;
                Array.from(Array(nbAngles).keys())
                    .map((index) => startAngle + (index * 2 * Math.PI) / nbAngles)
                    .forEach((angle) => {
                        availableAngles.push(angle);
                    });
            }
        }
        return availableAngles;
    }

    private computeAnglesInsertedNumber(
        nbAngles: number,
        nbAvailableSlots: number[],
        totalDeltaAvailable: number,
        deltaAngles: number[]
    ): number[] {
        const nbInsertedAngles: number[] = [];
        for (let index = 0; index < deltaAngles.length; index++) {
            const deltaAngleNormalized = deltaAngles[index] / totalDeltaAvailable;
            const nbSlotsFractions = deltaAngleNormalized * nbAngles;
            const nbSlotsCeil = Math.ceil(nbSlotsFractions);
            if (nbSlotsCeil <= nbAvailableSlots[index]) {
                nbInsertedAngles[index] = nbSlotsCeil;
            } else {
                nbInsertedAngles[index] = nbSlotsCeil - 1;
            }
        }
        const totalInsertedAngles = nbInsertedAngles.reduce((a, b) => a + b);
        if (totalInsertedAngles > nbAngles) {
            // Too many slots found: remove slots taken starting from the smallest sliced intervals
            const sortedIndices: number[] = Array.from(Array(deltaAngles.length).keys()).sort(function (a, b) {
                return deltaAngles[a] / nbInsertedAngles[a] - deltaAngles[b] / nbInsertedAngles[b];
            });
            let nbExcessiveAngles = totalInsertedAngles - nbAngles;
            for (const iSorted of sortedIndices) {
                nbInsertedAngles[iSorted]--;
                if (--nbExcessiveAngles == 0) {
                    break;
                }
            }
        }
        return nbInsertedAngles;
    }

    calculateInsertedAngles(
        nbInsertedAngles: number[],
        deltaAngles: number[],
        anglesOtherEdges: number[],
        slotAperture: number
    ): number[] {
        const insertedAngles: number[] = [];
        for (let index = 0; index < nbInsertedAngles.length; index++) {
            const nbAnglesInDelta = nbInsertedAngles[index];
            if (nbAnglesInDelta == 0) {
                continue;
            }
            const extraSpace = deltaAngles[index] - DiagramUtils.degToRad(slotAperture) * nbAnglesInDelta;
            const intraSpace = extraSpace / (nbAnglesInDelta + 1);
            const angleStep = intraSpace + DiagramUtils.degToRad(slotAperture);
            const startAngle = anglesOtherEdges[index] + intraSpace + DiagramUtils.degToRad(slotAperture) / 2;
            Array.from(Array(nbAnglesInDelta).keys())
                .map((iLoop) => startAngle + iLoop * angleStep)
                .forEach((angle) => {
                    insertedAngles.push(angle);
                });
        }
        return insertedAngles;
    }

    private storeLoopHalfEdges(edge: EdgeMetadata, angle: number) {
        const halfEgdes = HalfEdgeUtils.getLoopHalfEdges(edge, angle, this.diagramMetadata, this.svgParameters);
        if (!halfEgdes[0] || !halfEgdes[1]) {
            return;
        }
        this.edgeMap.set(edge.svgId, [halfEgdes[0].edgePoints, halfEgdes[1].edgePoints]);
    }
}
