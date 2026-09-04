/**
 * Copyright (c) 2025, RTE (http://www.rte-france.com)
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 * SPDX-License-Identifier: MPL-2.0
 */

import { Point } from '@svgdotjs/svg.js';
import { BusNodeMetadata, DiagramMetadata, EdgeMetadata, InjectionMetadata, NodeMetadata } from './diagram-metadata';
import { SvgParameters } from './svg-parameters';
import * as DiagramUtils from './diagram-utils';
import * as MetadataUtils from './metadata-utils';
import * as HalfEdgeUtils from './half-edge-utils';
import { HalfEdge, LabelData, NodeRadius } from './diagram-types';

export class EdgeRouter {
    static readonly LOOP_EDGES_SLOT_APERTURE_SCALING = 1.2;

    diagramMetadata: DiagramMetadata;
    svgParameters: SvgParameters;
    edgePoints: Record<string, [Point[], Point[]]> = {};
    edgeSideData: Record<string, [[Point, number], [Point, number]]> = {};
    edgeSideLabelData: Record<string, [LabelData, LabelData]> = {};
    edgeMiddleData: Record<string, [Point, number]> = {};
    edgeMiddleLabelData: Record<string, LabelData> = {};
    threeWTEdgePoints: Record<string, [Point, Point]> = {};
    injectionData: Record<string, [Point, Point, Point, number]> = {};
    injectionLabelData: Record<string, LabelData> = {};
    nodeAngles: Record<string, number[]> = {};

    constructor(diagramMetadata: DiagramMetadata) {
        this.diagramMetadata = diagramMetadata;
        this.svgParameters = new SvgParameters(this.diagramMetadata.svgParameters);
        this.init();
    }

    public getEdgeAngle(edgeId: string, side: string): number | undefined {
        const edgesPoints = this.edgePoints[edgeId];
        if (!edgesPoints) {
            return undefined;
        }
        const halfEdgePoints = side == '1' ? edgesPoints[0] : edgesPoints[1];
        return DiagramUtils.getAngle(halfEdgePoints[0], halfEdgePoints[1]);
    }

    public getEdgePoints(edgeId: string, side: string): Point[] | undefined {
        const edgesPoints = this.edgePoints[edgeId];
        if (!edgesPoints) {
            return undefined;
        }
        return side == '1' ? edgesPoints[0] : edgesPoints[1];
    }

    public getEdgeSideinfoPoint(edgeId: string, side: string): Point | undefined {
        const edgeSideData = this.edgeSideData[edgeId];
        if (!edgeSideData) {
            return undefined;
        }
        return side == '1' ? edgeSideData[0][0] : edgeSideData[1][0];
    }

    public getEdgeSideInfoAngle(edgeId: string, side: string): number | undefined {
        const edgeSideData = this.edgeSideData[edgeId];
        if (!edgeSideData) {
            return undefined;
        }
        return side == '1' ? edgeSideData[0][1] : edgeSideData[1][1];
    }

    public getEdgeSideLabelData(edgeId: string, side: string): LabelData | undefined {
        const edgeSideLabelData = this.edgeSideLabelData[edgeId];
        if (!edgeSideLabelData) {
            return undefined;
        }
        return side == '1' ? edgeSideLabelData[0] : edgeSideLabelData[1];
    }

    public getEdgeMiddleInfoPoint(edgeId: string): Point | undefined {
        const edgeMiddleData = this.edgeMiddleData[edgeId];
        if (!edgeMiddleData) {
            return undefined;
        }
        return edgeMiddleData[0];
    }

    public getEdgeMiddleInfoAngle(edgeId: string): number | undefined {
        const edgeMiddleData = this.edgeMiddleData[edgeId];
        if (!edgeMiddleData) {
            return undefined;
        }
        return edgeMiddleData[1];
    }

    public getEdgeMiddleLabelData(edgeId: string): LabelData | undefined {
        return this.edgeMiddleLabelData[edgeId];
    }

    public getThreeWTEdgePoints(edgeId: string): Point[] | undefined {
        return this.threeWTEdgePoints[edgeId];
    }

    public getInjectionEdgePoints(injectionId: string): Point[] | undefined {
        const injData = this.injectionData[injectionId];
        if (!injData) {
            return undefined;
        }
        return [injData[0], injData[1]];
    }

    public getInjectionInfoPoint(injectionId: string): Point | undefined {
        const injData = this.injectionData[injectionId];
        if (!injData) {
            return undefined;
        }
        return injData[2];
    }

    public getInjectionInfoAngle(injectionId: string): number | undefined {
        const injData = this.injectionData[injectionId];
        if (!injData) {
            return undefined;
        }
        return injData[3];
    }

    public getInjectionLabelData(injectionId: string): LabelData | undefined {
        return this.injectionLabelData[injectionId];
    }

    private init() {
        const edgeGroups = this.groupEdges();
        this.storeGroupedEdges(edgeGroups.groupedEdges);
        this.storeLoopEdges(edgeGroups.loopEdges);
        this.storeThreeWtEdges(edgeGroups.threeWtEdges);
        this.storeInjections();
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
            const is3wtEdge = MetadataUtils.isThreeWTEdge(edge);
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
            const edgeNodePoints = MetadataUtils.getEdgeNodePoints(groupedEdges[0], this.diagramMetadata);
            for (let iEdge = 0; iEdge < groupedEdges.length; iEdge++) {
                this.storeHalfEdges(
                    groupedEdges[iEdge],
                    groupedEdges.length,
                    iEdge,
                    edgeNodePoints[0],
                    edgeNodePoints[1]
                );
            }
        }
    }

    private storeHalfEdges(
        edge: EdgeMetadata,
        groupedEdgesCount: number,
        iEdge: number,
        point1?: Point,
        point2?: Point
    ) {
        const halfEdges = HalfEdgeUtils.getHalfEdges(
            edge,
            iEdge,
            groupedEdgesCount,
            this.diagramMetadata,
            this.svgParameters,
            point1,
            point2
        );
        if (!halfEdges[0] || !halfEdges[1]) {
            return;
        }
        this.edgePoints[edge.svgId] = [halfEdges[0].edgePoints, halfEdges[1].edgePoints];
        const angle1 = DiagramUtils.getAngle(halfEdges[0].edgePoints[0], halfEdges[0].edgePoints[1]);
        const angle2 = DiagramUtils.getAngle(halfEdges[1].edgePoints[0], halfEdges[1].edgePoints[1]);
        const node1Angles: number[] = this.nodeAngles[edge.node1] ?? [];
        node1Angles.push(angle1);
        this.nodeAngles[edge.node1] = node1Angles;
        const node2Angles: number[] = this.nodeAngles[edge.node2] ?? [];
        node2Angles.push(angle2);
        this.nodeAngles[edge.node2] = node2Angles;
        this.storeEdgeInfos(edge, halfEdges);
    }

    private storeEdgeInfos(edge: EdgeMetadata, halfEdges: HalfEdge[] | null[]) {
        if (edge.edgeInfo1 || edge.edgeInfo2) {
            this.storeEdgeSideData(edge.svgId, halfEdges);
        }
        if (edge.edgeInfoMiddle) {
            this.storeEdgeMiddleData(edge.svgId, halfEdges);
        }
    }

    private storeEdgeSideData(edgeId: string, halfEdges: HalfEdge[] | null[]) {
        if (!halfEdges[0] || !halfEdges[1]) {
            return;
        }
        this.edgeSideData[edgeId] = [
            [
                HalfEdgeUtils.getInfoPoint(halfEdges[0], this.svgParameters),
                HalfEdgeUtils.getArrowRotation(halfEdges[0]),
            ],
            [
                HalfEdgeUtils.getInfoPoint(halfEdges[1], this.svgParameters),
                HalfEdgeUtils.getArrowRotation(halfEdges[1]),
            ],
        ];
        this.edgeSideLabelData[edgeId] = [
            HalfEdgeUtils.getHalfEdgeLabelData(halfEdges[0], this.svgParameters.getArrowLabelShift()),
            HalfEdgeUtils.getHalfEdgeLabelData(halfEdges[1], this.svgParameters.getArrowLabelShift()),
        ];
    }

    private storeEdgeMiddleData(edgeId: string, halfEdges: HalfEdge[] | null[]) {
        const infoPointAndAngle = HalfEdgeUtils.getInfoPointAndAngle(halfEdges[0], halfEdges[1]);
        const edgesPoints = this.edgePoints[edgeId];
        const halfEdgePoints = edgesPoints ? edgesPoints[0] : undefined;
        if (infoPointAndAngle && halfEdgePoints) {
            const angle = DiagramUtils.getAngle(halfEdgePoints.at(-2)!, halfEdgePoints.at(-1)!);
            const rotationAngle = DiagramUtils.radToDeg(
                angle + (angle > Math.PI / 2 ? (-3 * Math.PI) / 2 : Math.PI / 2)
            );
            this.edgeMiddleData[edgeId] = [infoPointAndAngle[0], rotationAngle];
            const internalShiftAndStyle = DiagramUtils.getLabelShiftAndStyle(
                angle,
                false,
                this.svgParameters.getArrowLabelShift()
            );
            const externalShiftAndStyle = DiagramUtils.getLabelShiftAndStyle(
                angle,
                true,
                this.svgParameters.getArrowLabelShift()
            );
            this.edgeMiddleLabelData[edgeId] = {
                angle: infoPointAndAngle[1],
                internal: { shift: internalShiftAndStyle[0], style: internalShiftAndStyle[1] },
                external: { shift: externalShiftAndStyle[0], style: externalShiftAndStyle[1] },
            };
        }
    }

    private storeLoopEdges(edges: Record<string, EdgeMetadata[]>) {
        for (const edgeId in edges) {
            const loopEdges = edges[edgeId];
            const availableAngles = this.findAvailableAngles(
                this.nodeAngles[loopEdges[0].node1] ?? [],
                loopEdges.length,
                this.svgParameters.getLoopEdgesAperture() * EdgeRouter.LOOP_EDGES_SLOT_APERTURE_SCALING
            );
            loopEdges.forEach((loopEdge, index) => {
                const angle = availableAngles[index];
                this.storeLoopHalfEdges(loopEdge, angle);
            });
        }
    }

    private findAvailableAngles(anglesOtherEdges: number[], nbAngles: number, slotAperture: number): number[] {
        let availableAngles: number[] = [];
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
        const halfEdges = HalfEdgeUtils.getLoopHalfEdges(edge, angle, this.diagramMetadata, this.svgParameters);
        if (!halfEdges[0] || !halfEdges[1]) {
            return;
        }
        this.edgePoints[edge.svgId] = [halfEdges[0].edgePoints, halfEdges[1].edgePoints];
        this.storeEdgeInfos(edge, halfEdges);
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
        const sortedIndices: number[] = Array.from(new Array(angles.length).keys()).sort(function (a, b) {
            return angles[a] - angles[b];
        });
        const leadingSortedIndex = this.getSortedIndexMaximumAperture(angles.slice());
        const leadingAngle = angles[sortedIndices[leadingSortedIndex]];
        const sortedThreeWtEdges: EdgeMetadata[] = Array.from(new Array(3).keys())
            .map((index) => (leadingSortedIndex + index) % 3)
            .map((index) => sortedIndices[index])
            .map((index) => threeWtEdges[index]);
        const dNodeToAnchor = this.svgParameters.getTransformerCircleRadius() * 1.6;
        for (let index = 0; index < sortedThreeWtEdges.length; index++) {
            this.storeThreeWtEdge(sortedThreeWtEdges[index], pointTwt, leadingAngle, index, dNodeToAnchor);
        }
    }

    private getSortedIndexMaximumAperture(angles: number[]): number {
        const sortedAngles = angles.slice().sort(function (a, b) {
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
        this.threeWTEdgePoints[edge.svgId] = [edgeStart, threeWtAnchor];
    }

    private storeInjections() {
        // group injections by node
        const injectionsByNode: Record<string, InjectionMetadata[]> = {};
        this.diagramMetadata.injections?.forEach((injection) => {
            const nodeInjections: InjectionMetadata[] = injectionsByNode[injection.vlNodeId] ?? [];
            nodeInjections.push(injection);
            injectionsByNode[injection.vlNodeId] = nodeInjections;
        });
        // store injections
        for (const nodeId in injectionsByNode) {
            const nodeInjections = injectionsByNode[nodeId];
            const availableAngles = this.findAvailableAngles(
                this.nodeAngles[nodeId] ?? [],
                nodeInjections.length,
                this.svgParameters.getInjectionAperture()
            );
            const vlNode = MetadataUtils.getNodeMetadata(nodeId, this.diagramMetadata);
            const vlPoint = new Point(vlNode?.x ?? 0, vlNode?.y ?? 0);
            const busNodes = MetadataUtils.getBusNodesMetadata(nodeId, this.diagramMetadata.busNodes);
            busNodes.forEach((busNode) => {
                const nodeRadius = MetadataUtils.getNodeRadius(busNode, vlNode, this.svgParameters);
                nodeInjections.forEach((injection, index) => {
                    this.storeInjectionData(injection.svgId, vlPoint, busNode, nodeRadius, availableAngles, index);
                });
            });
        }
    }

    private storeInjectionData(
        injectionId: string,
        vlPoint: Point,
        busNode: BusNodeMetadata,
        nodeRadius: NodeRadius,
        availableAngles: number[],
        index: number
    ) {
        const angle = availableAngles[index];
        const injPoint: Point = DiagramUtils.getPointAtDistanceWithAngle(
            vlPoint,
            this.svgParameters.getInjectionEdgeLength(),
            angle
        );
        const busNodePoint = DiagramUtils.getEdgeStart(
            busNode.svgId,
            vlPoint,
            injPoint,
            nodeRadius.busOuterRadius,
            this.svgParameters.getUnknownBusNodeExtraRadius()
        );
        const arrowShift =
            this.svgParameters.getArrowShift() + (nodeRadius.voltageLevelRadius - nodeRadius.busOuterRadius);
        // point of the arrow added to the injection edge info
        const arrowCenter = DiagramUtils.getPointAtDistance(busNodePoint, injPoint, arrowShift);
        // rotation of the arrow added to the injection edge info
        const rotationAngle = DiagramUtils.radToDeg(angle + (angle > Math.PI / 2 ? (-3 * Math.PI) / 2 : Math.PI / 2));
        this.injectionData[injectionId] = [busNodePoint, injPoint, arrowCenter, rotationAngle];

        this.injectionLabelData[injectionId] = DiagramUtils.getLabelData(
            angle,
            this.svgParameters.getArrowLabelShift()
        );
    }
}
