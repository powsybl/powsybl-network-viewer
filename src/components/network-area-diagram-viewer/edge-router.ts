/**
 * Copyright (c) 2025, RTE (http://www.rte-france.com)
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 * SPDX-License-Identifier: MPL-2.0
 */

import { Point } from '@svgdotjs/svg.js';
import { DiagramMetadata, EdgeMetadata, NodeMetadata } from './diagram-metadata';
import { SvgParameters } from './svg-parameters';
import * as DiagramUtils from './diagram-utils';
import * as MetadataUtils from './metadata-utils';
import * as HalfEdgeUtils from './half-edge-utils';

export class EdgeRouter {
    diagramMetadata: DiagramMetadata;
    svgParameters: SvgParameters;
    edgePoints: Record<string, [Point[], Point[]]> = {};
    threeWtEdgePoints: Record<string, [Point, Point]> = {};
    nodeAngles: Record<string, number[]> = {};

    constructor(diagramMetadata: DiagramMetadata) {
        this.diagramMetadata = diagramMetadata;
        this.svgParameters = new SvgParameters(this.diagramMetadata.svgParameters);
        this.init();
    }

    public getEdgeAngle(edgeId: string, side: string): number | undefined {
        const egdesPoints = this.edgePoints[edgeId];
        if (!egdesPoints) {
            return undefined;
        }
        const halfEdgePoints = side == '1' ? egdesPoints[0] : egdesPoints[1];
        return DiagramUtils.getAngle(halfEdgePoints[0], halfEdgePoints[1]);
    }

    public getEdgePoints(edgeId: string, side: string): Point[] | undefined {
        const egdesPoints = this.edgePoints[edgeId];
        if (!egdesPoints) {
            return undefined;
        }
        return side == '1' ? egdesPoints[0] : egdesPoints[1];
    }

    public getThreeWtEdgePoints(edgeId: string): Point[] | undefined {
        const points = this.threeWtEdgePoints[edgeId];
        return points ? points : undefined;
    }

    private init() {
        const edgeGroups = this.groupEdges();
        this.storeGroupedEdges(edgeGroups.groupedEdges);
        this.storeLoopEdges(edgeGroups.loopEdges);
        this.storeThreeWtEdges(edgeGroups.threeWtEdges);
    }

    private groupEdges(): {
        groupedEdges: Record<string, EdgeMetadata[]>;
        loopEdges: Record<string, EdgeMetadata[]>;
        threeWtEdges: Record<string, EdgeMetadata[]>;
    } {
        const groupedEdges: Record<string, EdgeMetadata[]> = {};
        const loopEdges: Record<string, EdgeMetadata[]> = {};
        const threeWtEdges: Record<string, EdgeMetadata[]> = {};
        this.diagramMetadata.edges.forEach((edge) => {
            const is3wtEdge = MetadataUtils.isThreeWtEdge(edge);
            const isLoop = edge.node1 === edge.node2;
            let key: string;
            let targetMap: Record<string, EdgeMetadata[]>;
            if (is3wtEdge) {
                key = edge.node2;
                targetMap = threeWtEdges;
            } else if (isLoop) {
                key = edge.node1;
                targetMap = loopEdges;
            } else {
                key = MetadataUtils.getGroupedEdgesIndexKey(edge);
                targetMap = groupedEdges;
            }
            targetMap[key] ??= [];
            targetMap[key].push(edge);
        });
        return { groupedEdges, loopEdges, threeWtEdges };
    }

    private storeGroupedEdges(edges: Record<string, EdgeMetadata[]>) {
        for (const edgeId in edges) {
            const groupedEdges = edges[edgeId];
            if (groupedEdges.length == 1) {
                this.storeHalfEdges(groupedEdges[0], 1, 0);
            } else {
                for (let iEdge = 0; iEdge < groupedEdges.length; iEdge++) {
                    if (2 * iEdge + 1 == groupedEdges.length) {
                        this.storeHalfEdges(groupedEdges[iEdge], 1, 0);
                    } else {
                        this.storeHalfEdges(groupedEdges[iEdge], groupedEdges.length, iEdge);
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
        this.edgePoints[edge.svgId] = [halfEgdes[0].edgePoints, halfEgdes[1].edgePoints];
        const angle1 = DiagramUtils.getAngle(halfEgdes[0].edgePoints[0], halfEgdes[0].edgePoints[1]);
        const angle2 = DiagramUtils.getAngle(halfEgdes[1].edgePoints[0], halfEgdes[1].edgePoints[1]);
        const node1Angles: number[] = this.nodeAngles[edge.node1] ?? [];
        node1Angles.push(angle1);
        this.nodeAngles[edge.node1] = node1Angles;
        const node2Angles: number[] = this.nodeAngles[edge.node2] ?? [];
        node2Angles.push(angle2);
        this.nodeAngles[edge.node2] = node2Angles;
    }

    private storeLoopEdges(edges: Record<string, EdgeMetadata[]>) {
        for (const edgeId in edges) {
            const loopEdges = edges[edgeId];
            const availableAngles = this.findAvailableAngles(
                this.nodeAngles[loopEdges[0].node1] ?? [],
                loopEdges.length
            );
            loopEdges.forEach((loopEdge, index) => {
                const angle = availableAngles[index];
                this.storeLoopHalfEdges(loopEdge, angle);
            });
        }
    }

    private findAvailableAngles(anglesOtherEdges: number[], nbAngles: number): number[] {
        let availableAngles: number[] = [];
        const slotAperture = this.svgParameters.getLoopEdgesAperture() * 1.2;
        if (anglesOtherEdges.length == 0) {
            Array.from(new Array(nbAngles).keys())
                .map((index) => (index * 2 * Math.PI) / nbAngles)
                .forEach((angle) => {
                    availableAngles.push(angle);
                });
        } else {
            anglesOtherEdges = DiagramUtils.getSortedAnglesWithWrapAround(anglesOtherEdges);
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
            if (nbAngles <= nbAvailableSlots.reduce((a, b) => a + b, 0) && totalDeltaAvailable > 0) {
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
                Array.from(new Array(nbAngles).keys())
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
        const totalInsertedAngles = nbInsertedAngles.reduce((a, b) => a + b, 0);
        if (totalInsertedAngles > nbAngles) {
            // Too many slots found: remove slots taken starting from the smallest sliced intervals
            const sortedIndices: number[] = Array.from(new Array(deltaAngles.length).keys()).sort(function (a, b) {
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
            Array.from(new Array(nbAnglesInDelta).keys())
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
        this.edgePoints[edge.svgId] = [halfEgdes[0].edgePoints, halfEgdes[1].edgePoints];
    }

    private storeThreeWtEdges(edgesMap: Record<string, EdgeMetadata[]>) {
        for (const threeWtId in edgesMap) {
            const threeWtNode = MetadataUtils.getNodeMetadata(threeWtId, this.diagramMetadata);
            if (!threeWtNode) {
                continue;
            }
            const threeWtEdges: EdgeMetadata[] = edgesMap[threeWtId] ?? [];
            if (threeWtEdges.length > 0) {
                this.storeThreeWtNodeEdges(threeWtNode, threeWtEdges);
            }
        }
    }

    private storeThreeWtNodeEdges(threeWtNode: NodeMetadata, threeWtEdges: EdgeMetadata[]) {
        const pointTwt = new Point(threeWtNode.x, threeWtNode.y);
        const angles: number[] = threeWtEdges.map((edge) => {
            const vlNode = MetadataUtils.getNodeMetadata(edge.node1, this.diagramMetadata);
            if (!vlNode) {
                return 0;
            }
            const pointVl = new Point(vlNode.x, vlNode.y);
            return DiagramUtils.getAngle(pointTwt, pointVl);
        });
        const sortedIndices: number[] = Array.from(Array(angles.length).keys()).sort(function (a, b) {
            return angles[a] - angles[b];
        });
        const leadingSortedIndex = this.getSortedIndexMaximumAperture(angles.slice());
        const leadingAngle = angles[sortedIndices[leadingSortedIndex]];
        const sortedThreeWtEdges: EdgeMetadata[] = Array.from(Array(3).keys())
            .map((index) => (leadingSortedIndex + index) % 3)
            .map((index) => sortedIndices[index])
            .map((index) => threeWtEdges[index]);
        const dNodeToAnchor = this.svgParameters.getTransformerCircleRadius() * 1.6;
        for (let index = 0; index < sortedThreeWtEdges.length; index++) {
            this.storeThreeWtEdge(sortedThreeWtEdges[index], pointTwt, leadingAngle, index, dNodeToAnchor);
        }
    }

    private getSortedIndexMaximumAperture(angles: number[]): number {
        const sortedAngles = angles.sort(function (a, b) {
            return a - b;
        });
        sortedAngles.push(sortedAngles[0] + 2 * Math.PI);
        const deltaAngles: number[] = [];
        for (let index = 0; index < 3; index++) {
            deltaAngles[index] = sortedAngles[index + 1] - sortedAngles[index];
        }
        const minDeltaIndex = deltaAngles.reduce(
            (minIndex, currentValue, currentIndex, array) => (currentValue < array[minIndex] ? currentIndex : minIndex),
            0
        );
        return (minDeltaIndex - 1 + 3) % 3;
    }

    private storeThreeWtEdge(
        edge: EdgeMetadata,
        pointTwt: Point,
        leadingAngle: number,
        index: number,
        dNodeToAnchor: number
    ) {
        const vlNode = MetadataUtils.getNodeMetadata(edge.node1, this.diagramMetadata);
        if (!vlNode) {
            return;
        }
        const busNode = MetadataUtils.getBusNodeMetadata(edge.busNode1, this.diagramMetadata);
        const nodeRadius = MetadataUtils.getNodeRadius(busNode, vlNode, this.svgParameters);
        const edgeStart = DiagramUtils.getEdgeStart(
            edge.busNode1,
            new Point(vlNode.x, vlNode.y),
            pointTwt,
            nodeRadius.busOuterRadius,
            this.svgParameters.getUnknownBusNodeExtraRadius()
        );
        const anchorAngle = leadingAngle + (index * 2 * Math.PI) / 3;
        const threeWtAnchor: Point = DiagramUtils.shiftRhoTheta(pointTwt, dNodeToAnchor, anchorAngle);
        this.threeWtEdgePoints[edge.svgId] = [edgeStart, threeWtAnchor];
    }
}
