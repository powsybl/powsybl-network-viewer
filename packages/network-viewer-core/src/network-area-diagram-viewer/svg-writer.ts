/**
 * Copyright (c) 2025, RTE (http://www.rte-france.com)
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 * SPDX-License-Identifier: MPL-2.0
 */

import { Point } from '@svgdotjs/svg.js';
import {
    BusNodeMetadata,
    DiagramMetadata,
    EdgeInfoMetadata,
    EdgeMetadata,
    InjectionMetadata,
    NodeMetadata,
} from './diagram-metadata';
import * as DiagramUtils from './diagram-utils';
import { SvgParameters } from './svg-parameters';
import * as MetadataUtils from './metadata-utils';
import { EdgeRouter } from './edge-router';
import { EdgeType, LabelData } from './diagram-types';
import * as SvgUtils from './svg-utils';
import { LibraryComponent } from './library-component';
import DefaultLibraryComponents from '../resources/default-library/components.json';
import * as ComponentUtils from './component-utils';

export class SvgWriter {
    static readonly SVG_NAMESPACE = 'http://www.w3.org/2000/svg';
    static readonly NODES_CLASS = 'nad-vl-nodes';
    static readonly BUS_CLASS = 'nad-busnode';
    static readonly EDGES_CLASS = 'nad-branch-edges';
    static readonly EDGE_INFOS_CLASS = 'nad-edge-infos';
    static readonly THREEWT_EDGES_CLASS = 'nad-3wt-edges';
    static readonly TEXT_NODES_CLASS = 'nad-text-nodes';
    static readonly TEXT_EDGES_CLASS = 'nad-text-edges';
    static readonly INJECTIONS_CLASS = 'nad-injections';
    static readonly EDGE_CLASS = 'nad-edge-path';
    static readonly HVDC_EDGE_CLASS = 'nad-hvdc-edge';
    static readonly BOUNDARY_LINE_EDGE_CLASS = 'nad-boundary-line-edge';
    static readonly WINDING_CLASS = 'nad-winding';
    static readonly HVDC_CLASS = 'nad-hvdc';
    static readonly PST_CLASS = 'nad-pst-arrow';
    static readonly UNKNOWN_BUS_CLASS = 'nad-unknown-busnode';
    static readonly BOUNDARY_BUS_CLASS = 'nad-boundary-node';
    static readonly THREEWTS_CLASS = 'nad-3wt-nodes';
    static readonly PST_ARROW_PATH = 'M60.00,0 0,60.00 M52.00,0 60.00,0 60.00,8.00';

    diagramMetadata: DiagramMetadata;
    svgParameters: SvgParameters;
    edgeRouter: EdgeRouter | undefined;
    threeWindingsTransformers: NodeMetadata[] = [];
    threeWindingsTransformerEdges: EdgeMetadata[] = [];
    windingSideMapping: { [key: number]: string } = {
        1: 'ONE',
        2: 'TWO',
        3: 'THREE',
    };
    componentLibrary: LibraryComponent[] = DefaultLibraryComponents;
    urlResolver: ((fileName: string) => string) | undefined = undefined;

    constructor(
        diagramMetadata: DiagramMetadata,
        componentLibrary?: LibraryComponent[],
        urlResolver?: (fileName: string) => string
    ) {
        this.diagramMetadata = diagramMetadata;
        this.svgParameters = new SvgParameters(this.diagramMetadata.svgParameters);
        if (componentLibrary) {
            this.componentLibrary = componentLibrary;
        }
        if (urlResolver) {
            this.urlResolver = urlResolver;
        }
        // get edge router, for computing edges points
        this.edgeRouter = new EdgeRouter(this.diagramMetadata);
    }

    public getSvg(textBoxSize?: { width: number; height: number }): string {
        const baseSvg = this.createBaseSvg(textBoxSize);
        this.addSvgContent(baseSvg.svg);
        return new XMLSerializer().serializeToString(baseSvg.xmlDoc);
    }

    public getEmptySvg(): string {
        const vb = MetadataUtils.getViewBox(
            this.diagramMetadata.nodes,
            this.diagramMetadata.textNodes,
            this.svgParameters
        );
        return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${vb.x} ${vb.y} ${vb.width} ${vb.height}"></svg>`;
    }

    private createBaseSvg(textBoxSize?: { width: number; height: number }): {
        xmlDoc: XMLDocument;
        svg: SVGSVGElement;
    } {
        // create XML doc
        const xmlDoc = this.getXmlDoc();
        // add SVG root element
        const svg = this.getSvgRootElement(textBoxSize);
        xmlDoc.appendChild(svg);
        return { xmlDoc, svg };
    }

    public addSvgContent(svg: SVGSVGElement) {
        // add nodes and injections
        const nodesAndInjectionsAndInfos = this.getNodesAndInjectionsAndInfos();
        svg.appendChild(nodesAndInjectionsAndInfos.nodes);
        if (nodesAndInjectionsAndInfos.injections.hasChildNodes()) {
            svg.appendChild(nodesAndInjectionsAndInfos.injections);
        }
        // add edges and infos
        const edgesAndInfos = this.getEdgesAndInfos();
        svg.appendChild(edgesAndInfos.edges);
        // append injections infos
        nodesAndInjectionsAndInfos.infos.forEach((info) => {
            edgesAndInfos.edgeInfos.appendChild(info);
        });
        svg.appendChild(edgesAndInfos.edgeInfos);
        // add 3wt edges
        if (this.threeWindingsTransformerEdges.length > 0) {
            svg.appendChild(this.getThreeWTEdges(this.threeWindingsTransformerEdges));
        }
        // add 3wt nodes
        if (this.threeWindingsTransformers.length > 0) {
            svg.appendChild(this.getThreeWTs(this.threeWindingsTransformers));
        }
        // add text nodes and edges
        const textNodeAndEdges = this.getTextNodesAndEdges();
        svg.appendChild(textNodeAndEdges.textEdges);
        svg.appendChild(textNodeAndEdges.textNodes);
    }

    private getXmlDoc(): XMLDocument {
        const xmlDoc = document.implementation.createDocument('', '', null);
        const pi = xmlDoc.createProcessingInstruction('xml', 'version="1.0" encoding="UTF-8"');
        xmlDoc.insertBefore(pi, xmlDoc.firstChild);
        return xmlDoc;
    }

    private getSvgRootElement(textBoxSize?: { width: number; height: number }): SVGSVGElement {
        const svg = document.createElementNS(SvgWriter.SVG_NAMESPACE, 'svg');
        const viewBox = MetadataUtils.getViewBox(
            this.diagramMetadata.nodes,
            this.diagramMetadata.textNodes,
            this.svgParameters,
            textBoxSize
        );
        svg.setAttribute('viewBox', [viewBox.x, viewBox.y, viewBox.width, viewBox.height].join(' '));
        return svg;
    }

    private getNodesAndInjectionsAndInfos(): { nodes: SVGGElement; injections: SVGGElement; infos: SVGGElement[] } {
        // create g nodes element
        const gNodesElement = document.createElementNS(SvgWriter.SVG_NAMESPACE, 'g');
        gNodesElement.classList.add(SvgWriter.NODES_CLASS);
        // create g injections element
        const gInjectionsElement = document.createElementNS(SvgWriter.SVG_NAMESPACE, 'g');
        gInjectionsElement.classList.add(SvgWriter.INJECTIONS_CLASS);
        // create injection infos elements list
        let injectionsInfos: SVGGElement[] = [];
        // add nodes
        this.diagramMetadata.nodes.forEach((node) => {
            if (!node.invisible) {
                if (MetadataUtils.isThreeWTNode(node)) {
                    this.threeWindingsTransformers.push(node);
                } else {
                    const nodeAndInjectsionAndInfos = this.getNodeAndInjectionAndInfos(node);
                    gNodesElement.appendChild(nodeAndInjectsionAndInfos.node);
                    if (nodeAndInjectsionAndInfos.injection.hasChildNodes()) {
                        gInjectionsElement.appendChild(nodeAndInjectsionAndInfos.injection);
                    }
                    injectionsInfos = injectionsInfos.concat(nodeAndInjectsionAndInfos.infos);
                }
            }
        });
        return { nodes: gNodesElement, injections: gInjectionsElement, infos: injectionsInfos };
    }

    private getNodeAndInjectionAndInfos(node: NodeMetadata): {
        node: SVGGElement;
        injection: SVGGElement;
        infos: SVGGElement[];
    } {
        // create node
        const gNodeElement = document.createElementNS(SvgWriter.SVG_NAMESPACE, 'g');
        gNodeElement.id = node.svgId;
        if (MetadataUtils.isBoundaryNode(node)) {
            gNodeElement.classList.add(SvgWriter.BOUNDARY_BUS_CLASS);
        }
        SvgUtils.addCssClasses(gNodeElement, node.classes);
        gNodeElement.setAttribute(
            'transform',
            'translate(' + DiagramUtils.getFormattedPoint(new Point(node.x, node.y)) + ')'
        );
        // create injection
        const gInjectionNodeElement = document.createElementNS(SvgWriter.SVG_NAMESPACE, 'g');
        SvgUtils.addCssClasses(gInjectionNodeElement, node.classes);
        // create injection infos elements list
        const injectionsInfos: SVGGElement[] = [];
        // add buses
        if (node.unknownBus) {
            const circleElement = document.createElementNS(SvgWriter.SVG_NAMESPACE, 'circle');
            circleElement.classList.add(SvgWriter.UNKNOWN_BUS_CLASS);
            circleElement.setAttribute(
                'r',
                DiagramUtils.getFormattedValue(
                    this.svgParameters.getVoltageLevelCircleRadius() + this.svgParameters.getUnknownBusNodeExtraRadius()
                )
            );
            gNodeElement.appendChild(circleElement);
        } else {
            const busNodes = MetadataUtils.getBusNodesMetadata(node.svgId, this.diagramMetadata.busNodes);
            const busEgdes = MetadataUtils.getBusEdgesMetadata(node.svgId, this.diagramMetadata.edges);
            const traversingBusEdgesAngles: number[] = [];
            busNodes.forEach((busNode) => {
                gNodeElement.appendChild(this.getBusNode(busNode, node, traversingBusEdgesAngles));
                this.addBusEdgeAngles(node, busNode, busEgdes.get(busNode.svgId) ?? [], traversingBusEdgesAngles);
                if (this.diagramMetadata.injections) {
                    const injections: InjectionMetadata[] = MetadataUtils.getInjectionMetadata(
                        node.svgId,
                        busNode.svgId,
                        this.diagramMetadata.injections
                    );
                    if (injections.length > 0) {
                        this.addBusNodeInjections(gInjectionNodeElement, injections, busNode, injectionsInfos);
                    }
                }
            });
        }
        return { node: gNodeElement, injection: gInjectionNodeElement, infos: injectionsInfos };
    }

    private getBusNode(busNode: BusNodeMetadata, node: NodeMetadata, traversingBusEdgesAngles: number[]): SVGElement {
        const nodeRadius = MetadataUtils.getNodeRadius(busNode, node, this.svgParameters);
        if (MetadataUtils.isBoundaryNode(node)) {
            const pathElement = document.createElementNS(SvgWriter.SVG_NAMESPACE, 'path');
            pathElement.id = busNode.svgId;
            SvgUtils.addCssClasses(pathElement, busNode.classes, SvgWriter.BUS_CLASS);
            SvgUtils.addElementStyle(pathElement, busNode.style);
            const edges: EdgeMetadata[] = MetadataUtils.getNodeEdgesMetadata(node.svgId, this.diagramMetadata.edges);
            const edgeAngle = this.edgeRouter?.getEdgeAngle(edges[0].svgId, '2');
            const path: string = edgeAngle
                ? DiagramUtils.getBoundarySemicircle(edgeAngle, nodeRadius.busOuterRadius)
                : '';
            pathElement.setAttribute('d', path);
            return pathElement;
        } else if (busNode.index == 0) {
            const circleElement = document.createElementNS(SvgWriter.SVG_NAMESPACE, 'circle');
            circleElement.id = busNode.svgId;
            SvgUtils.addCssClasses(circleElement, busNode.classes, SvgWriter.BUS_CLASS);
            SvgUtils.addElementStyle(circleElement, busNode.style);
            circleElement.setAttribute('r', DiagramUtils.getFormattedValue(nodeRadius.busOuterRadius));
            return circleElement;
        } else {
            const pathElement = document.createElementNS(SvgWriter.SVG_NAMESPACE, 'path');
            pathElement.id = busNode.svgId;
            SvgUtils.addCssClasses(pathElement, busNode.classes, SvgWriter.BUS_CLASS);
            SvgUtils.addElementStyle(pathElement, busNode.style);
            const edgeAngles = DiagramUtils.getSortedAnglesWithWrapAround(traversingBusEdgesAngles);
            const path: string = DiagramUtils.getFragmentedAnnulusPath(
                edgeAngles,
                nodeRadius,
                this.svgParameters.getNodeHollowWidth()
            );
            pathElement.setAttribute('d', path);
            return pathElement;
        }
    }

    private addBusEdgeAngles(
        node: NodeMetadata,
        busNode: BusNodeMetadata,
        busEdges: EdgeMetadata[],
        traversingBusEdgesAngles: number[]
    ) {
        busEdges.forEach((edge) => {
            let angle: number | undefined = undefined;
            if (edge.node1 == edge.node2) {
                if (busNode.svgId == edge.busNode1) {
                    angle = this.edgeRouter?.getEdgeAngle(edge.svgId, '1');
                } else if (busNode.svgId == edge.busNode2) {
                    angle = this.edgeRouter?.getEdgeAngle(edge.svgId, '2');
                }
            } else {
                angle = this.edgeRouter?.getEdgeAngle(edge.svgId, node.svgId == edge.node1 ? '1' : '2');
            }
            if (angle) {
                traversingBusEdgesAngles.push(angle);
            }
        });
    }

    private addBusNodeInjections(
        gInjectionNodeElement: SVGGElement,
        injections: InjectionMetadata[],
        busNode: BusNodeMetadata,
        injectionsInfos: SVGGElement[]
    ) {
        const gInjectionBusElement = document.createElementNS(SvgWriter.SVG_NAMESPACE, 'g');
        SvgUtils.addCssClasses(gInjectionBusElement, busNode.classes);
        gInjectionNodeElement.appendChild(gInjectionBusElement);

        injections.forEach((injection) => {
            const gInjectionElement = document.createElementNS(SvgWriter.SVG_NAMESPACE, 'g');
            gInjectionElement.id = injection.svgId;
            SvgUtils.addCssClasses(gInjectionElement, injection.classes);
            SvgUtils.addElementStyle(gInjectionElement, injection.style);
            const points = this.edgeRouter?.getInjectionEdgePoints(injection.svgId);
            if (points) {
                gInjectionElement.appendChild(this.getInjectionEdge(points));
                gInjectionElement.appendChild(this.getInjectionIcon(points, injection.componentType));
            }
            gInjectionBusElement.appendChild(gInjectionElement);

            if (injection.edgeInfo) {
                injectionsInfos.push(this.getInjectionInfo(injection.svgId, injection.edgeInfo));
            }
        });
    }

    private getInjectionEdge(points: Point[]): SVGPolylineElement {
        const polylineInjectionEdgeElement = document.createElementNS(SvgWriter.SVG_NAMESPACE, 'polyline');
        polylineInjectionEdgeElement.classList.add(SvgWriter.EDGE_CLASS);
        polylineInjectionEdgeElement.setAttribute('points', DiagramUtils.getFormattedPolyline(points));
        return polylineInjectionEdgeElement;
    }

    private getInjectionIcon(points: Point[], componentType: string): SVGGElement {
        const gInjectionIconElement = document.createElementNS(SvgWriter.SVG_NAMESPACE, 'g');

        const injectionCircleElement = document.createElementNS(SvgWriter.SVG_NAMESPACE, 'circle');
        const circleCenter = DiagramUtils.getPointAtDistance(
            points[1],
            points[0],
            -this.svgParameters.getInjectionCircleRadius()
        );
        injectionCircleElement.setAttribute('cx', DiagramUtils.getFormattedValue(circleCenter.x));
        injectionCircleElement.setAttribute('cy', DiagramUtils.getFormattedValue(circleCenter.y));
        injectionCircleElement.setAttribute(
            'r',
            DiagramUtils.getFormattedValue(this.svgParameters.getInjectionCircleRadius())
        );
        gInjectionIconElement.appendChild(injectionCircleElement);

        gInjectionIconElement.appendChild(this.getComponentElement(componentType, circleCenter));

        return gInjectionIconElement;
    }

    private getInjectionInfo(injectionId: string, info: EdgeInfoMetadata): SVGGElement {
        const infoPoint = this.edgeRouter?.getInjectionInfoPoint(injectionId);
        const infoAngle = this.edgeRouter?.getInjectionInfoAngle(injectionId);
        const labelData = this.edgeRouter?.getInjectionLabelData(injectionId);
        return this.getInfoElement(info, infoPoint, infoAngle, labelData);
    }

    private getEdgesAndInfos(): { edges: SVGGElement; edgeInfos: SVGGElement } {
        // create g edges element
        const gEdgesElement = document.createElementNS(SvgWriter.SVG_NAMESPACE, 'g');
        gEdgesElement.classList.add(SvgWriter.EDGES_CLASS);
        // create g edge infos element
        const gEdgeInfosElement = document.createElementNS(SvgWriter.SVG_NAMESPACE, 'g');
        gEdgeInfosElement.classList.add(SvgWriter.EDGE_INFOS_CLASS);
        // add edges
        this.diagramMetadata.edges.forEach((edge) => {
            if (MetadataUtils.isThreeWTEdge(edge)) {
                this.threeWindingsTransformerEdges.push(edge);
            } else {
                gEdgesElement.appendChild(this.getEdge(edge));
                if (edge.edgeInfo1 && !edge.invisible1) {
                    gEdgeInfosElement.appendChild(this.getEdgeSideInfo(edge.svgId, '1', edge.edgeInfo1));
                }
                if (edge.edgeInfo2 && !edge.invisible2) {
                    gEdgeInfosElement.appendChild(this.getEdgeSideInfo(edge.svgId, '2', edge.edgeInfo2));
                }
                if (edge.edgeInfoMiddle) {
                    gEdgeInfosElement.appendChild(this.getEdgeMiddleInfo(edge, edge.edgeInfoMiddle));
                }
            }
        });
        return { edges: gEdgesElement, edgeInfos: gEdgeInfosElement };
    }

    private getEdge(edge: EdgeMetadata): SVGGElement {
        const edgeType = MetadataUtils.getEdgeType(edge);
        const gEdgeElement = document.createElementNS(SvgWriter.SVG_NAMESPACE, 'g');
        gEdgeElement.id = edge.svgId;
        if (DiagramUtils.isHVDCLineEdge(edgeType)) {
            gEdgeElement.classList.add(SvgWriter.HVDC_EDGE_CLASS);
        } else if (DiagramUtils.isBoundaryLineEdge(edgeType)) {
            gEdgeElement.classList.add(SvgWriter.BOUNDARY_LINE_EDGE_CLASS);
        }
        const halfEdgePoints1 = this.edgeRouter?.getEdgePoints(edge.svgId, '1');
        if (halfEdgePoints1 && !edge.invisible1) {
            gEdgeElement.appendChild(this.getHalfEdge(edge, halfEdgePoints1, edge.classes1, edge.style1));
        }
        const halfEdgePoints2 = this.edgeRouter?.getEdgePoints(edge.svgId, '2');
        if (halfEdgePoints2 && !edge.invisible2) {
            gEdgeElement.appendChild(this.getHalfEdge(edge, halfEdgePoints2, edge.classes2, edge.style2));
        }
        if (DiagramUtils.isTransformerEdge(edgeType) && (halfEdgePoints1 || halfEdgePoints2)) {
            gEdgeElement.appendChild(this.getTransformer(edge, halfEdgePoints1, halfEdgePoints2, edgeType));
        }
        if (DiagramUtils.isHVDCLineEdge(edgeType) && halfEdgePoints1) {
            gEdgeElement.appendChild(this.getHVDCLine(halfEdgePoints1));
        }
        return gEdgeElement;
    }

    private getHalfEdge(
        edge: EdgeMetadata,
        points: Point[],
        cssClasses: string[] | undefined,
        style: string | undefined
    ): SVGPolylineElement | SVGPathElement {
        if (edge.node1 == edge.node2) {
            const pathElement = document.createElementNS(SvgWriter.SVG_NAMESPACE, 'path');
            SvgUtils.addCssClasses(pathElement, cssClasses, SvgWriter.EDGE_CLASS);
            SvgUtils.addElementStyle(pathElement, style);
            pathElement.setAttribute('d', DiagramUtils.getHalfLoopPath(points));
            return pathElement;
        } else {
            const polylineElement = document.createElementNS(SvgWriter.SVG_NAMESPACE, 'polyline');
            SvgUtils.addCssClasses(polylineElement, cssClasses, SvgWriter.EDGE_CLASS);
            SvgUtils.addElementStyle(polylineElement, style);
            polylineElement.setAttribute('points', DiagramUtils.getFormattedPolyline(points));
            return polylineElement;
        }
    }

    private getTransformer(
        edge: EdgeMetadata,
        points1: Point[] | undefined,
        points2: Point[] | undefined,
        edgeType: EdgeType
    ): SVGGElement {
        const gTranformerElement = document.createElementNS(SvgWriter.SVG_NAMESPACE, 'g');
        if (points1) {
            gTranformerElement.appendChild(this.getTransformerWinding(points1, edge.classes1, edge.style1));
        }
        if (points2) {
            gTranformerElement.appendChild(this.getTransformerWinding(points2, edge.classes2, edge.style2));
        }
        if (edgeType == EdgeType.PHASE_SHIFT_TRANSFORMER) {
            gTranformerElement.appendChild(this.getTransformerArrow(points1, points2));
        }
        return gTranformerElement;
    }

    private getTransformerWinding(
        points: Point[],
        cssClasses: string[] | undefined,
        style: string | undefined
    ): SVGCircleElement {
        const transformerCircleElement = document.createElementNS(SvgWriter.SVG_NAMESPACE, 'circle');
        SvgUtils.addCssClasses(transformerCircleElement, cssClasses, SvgWriter.WINDING_CLASS);
        SvgUtils.addElementStyle(transformerCircleElement, style);
        const circleCenter = DiagramUtils.getPointAtDistance(
            points.at(-1)!,
            points.at(-2)!,
            -this.svgParameters.getTransformerCircleRadius()
        );
        transformerCircleElement.setAttribute('cx', DiagramUtils.getFormattedValue(circleCenter.x));
        transformerCircleElement.setAttribute('cy', DiagramUtils.getFormattedValue(circleCenter.y));
        transformerCircleElement.setAttribute(
            'r',
            DiagramUtils.getFormattedValue(this.svgParameters.getTransformerCircleRadius())
        );
        return transformerCircleElement;
    }

    private getTransformerArrow(points1: Point[] | undefined, points2: Point[] | undefined): SVGPathElement {
        const arrowPathElement = document.createElementNS(SvgWriter.SVG_NAMESPACE, 'path');
        arrowPathElement.classList.add(SvgWriter.PST_CLASS);
        const matrix: string = DiagramUtils.getTransformerArrowMatrixString(
            points1,
            points2,
            this.svgParameters.getTransformerCircleRadius()
        );
        arrowPathElement.setAttribute('transform', 'matrix(' + matrix + ')');
        arrowPathElement.setAttribute('d', SvgWriter.PST_ARROW_PATH);
        return arrowPathElement;
    }

    private getHVDCLine(points: Point[]): SVGGElement {
        const gHVDCLineElement = document.createElementNS(SvgWriter.SVG_NAMESPACE, 'g');
        const polylineElement = document.createElementNS(SvgWriter.SVG_NAMESPACE, 'polyline');
        polylineElement.classList.add(SvgWriter.HVDC_CLASS);
        const csPoints = DiagramUtils.getConverterStationPoints(points, this.svgParameters.getConverterStationWidth());
        polylineElement.setAttribute('points', DiagramUtils.getFormattedPolyline(csPoints));
        gHVDCLineElement.appendChild(polylineElement);
        return gHVDCLineElement;
    }

    private getThreeWTEdges(threeWTEdges: EdgeMetadata[]): SVGGElement {
        // create g 3wt edges element
        const gThreeWTEdgesElement = document.createElementNS(SvgWriter.SVG_NAMESPACE, 'g');
        gThreeWTEdgesElement.classList.add(SvgWriter.THREEWT_EDGES_CLASS);
        // add 3wt edges
        threeWTEdges.forEach((edge) => {
            const points = this.edgeRouter?.getThreeWTEdgePoints(edge.svgId);
            if (points) {
                gThreeWTEdgesElement.appendChild(this.getThreeWTEdge(edge, points));
            }
        });
        return gThreeWTEdgesElement;
    }

    private getThreeWTEdge(edge: EdgeMetadata, points: Point[]): SVGGElement {
        const gThreeWTEdgeElement = document.createElementNS(SvgWriter.SVG_NAMESPACE, 'g');
        gThreeWTEdgeElement.id = edge.svgId;
        SvgUtils.addCssClasses(gThreeWTEdgeElement, edge.classes1);
        gThreeWTEdgeElement.appendChild(this.getThreeWTPolyline(points));
        return gThreeWTEdgeElement;
    }

    private getThreeWTPolyline(points: Point[]): SVGPolylineElement {
        const polylineElement = document.createElementNS(SvgWriter.SVG_NAMESPACE, 'polyline');
        polylineElement.classList.add(SvgWriter.EDGE_CLASS);
        polylineElement.setAttribute('points', DiagramUtils.getFormattedPolyline(points));
        return polylineElement;
    }

    private getThreeWTs(threeWTs: NodeMetadata[]): SVGGElement {
        // create g 3wts element
        const gThreeWTsElement = document.createElementNS(SvgWriter.SVG_NAMESPACE, 'g');
        gThreeWTsElement.classList.add(SvgWriter.THREEWTS_CLASS);
        // add 3wts
        threeWTs.forEach((threeWT) => {
            if (!threeWT.invisible) {
                gThreeWTsElement.appendChild(this.getThreeWT(threeWT));
            }
        });
        return gThreeWTsElement;
    }

    private getThreeWT(threeWT: NodeMetadata): SVGGElement {
        // create 3wt
        const gThreeWTElement = document.createElementNS(SvgWriter.SVG_NAMESPACE, 'g');
        gThreeWTElement.id = threeWT.svgId;
        gThreeWTElement.setAttribute(
            'transform',
            'translate(' + DiagramUtils.getFormattedPoint(new Point(threeWT.x, threeWT.y)) + ')'
        );
        // add windings
        const twtEdges = MetadataUtils.getNodeEdgesMetadata(threeWT.svgId, this.diagramMetadata.edges);
        for (let index = 0; index < twtEdges.length; index++) {
            const twtEdge = twtEdges[index];
            const points = this.edgeRouter?.getThreeWTEdgePoints(twtEdge.svgId);
            if (points) {
                const threeWTPoint: Point = new Point(threeWT.x, threeWT.y);
                gThreeWTElement.appendChild(this.getThreeWTWinding(threeWTPoint, points, twtEdge.classes1));
                if (MetadataUtils.isPSThreeWTEdge(twtEdge)) {
                    gThreeWTElement.appendChild(
                        this.getThreeWTArrow(
                            threeWTPoint,
                            points,
                            twtEdge.side ?? this.windingSideMapping[index],
                            twtEdge.classes1
                        )
                    );
                }
            }
        }
        return gThreeWTElement;
    }

    private getThreeWTWinding(
        threeWTPoint: Point,
        points: Point[],
        cssClasses: string[] | undefined
    ): SVGCircleElement {
        const transformerCircleElement = document.createElementNS(SvgWriter.SVG_NAMESPACE, 'circle');
        SvgUtils.addCssClasses(transformerCircleElement, cssClasses, SvgWriter.WINDING_CLASS);
        const circleCenter = DiagramUtils.getPointAtDistance(
            points[1],
            threeWTPoint,
            this.svgParameters.getTransformerCircleRadius()
        );
        transformerCircleElement.setAttribute('cx', DiagramUtils.getFormattedValue(circleCenter.x - threeWTPoint.x));
        transformerCircleElement.setAttribute('cy', DiagramUtils.getFormattedValue(circleCenter.y - threeWTPoint.y));
        transformerCircleElement.setAttribute(
            'r',
            DiagramUtils.getFormattedValue(this.svgParameters.getTransformerCircleRadius())
        );
        return transformerCircleElement;
    }

    private getThreeWTArrow(
        threeWTPoint: Point,
        points: Point[],
        side: string,
        cssClasses: string[] | undefined
    ): SVGPathElement {
        const arrowPathElement = document.createElementNS(SvgWriter.SVG_NAMESPACE, 'path');
        SvgUtils.addCssClasses(arrowPathElement, cssClasses, SvgWriter.WINDING_CLASS);
        const matrix: string = DiagramUtils.getThreeWTArrowMatrixString(
            threeWTPoint,
            points,
            side,
            this.svgParameters.getTransformerCircleRadius()
        );
        arrowPathElement.setAttribute('transform', 'matrix(' + matrix + ')');
        arrowPathElement.setAttribute('d', SvgWriter.PST_ARROW_PATH);
        return arrowPathElement;
    }

    private getEdgeSideInfo(edgeId: string, side: string, info: EdgeInfoMetadata): SVGGElement {
        const infoPoint = this.edgeRouter?.getEdgeSideinfoPoint(edgeId, side);
        const infoAngle = this.edgeRouter?.getEdgeSideInfoAngle(edgeId, side);
        const labelData = this.edgeRouter?.getEdgeSideLabelData(edgeId, side);
        return this.getInfoElement(info, infoPoint, infoAngle, labelData);
    }

    private getInfoElement(
        info: EdgeInfoMetadata,
        infoPoint: Point | undefined,
        infoAngle: number | undefined,
        labelData: LabelData | undefined
    ): SVGGElement {
        // create info element
        const gInfoElement = document.createElementNS(SvgWriter.SVG_NAMESPACE, 'g');
        gInfoElement.id = info.svgId;
        if (infoPoint) {
            gInfoElement.setAttribute('transform', 'translate(' + DiagramUtils.getFormattedPoint(infoPoint) + ')');
        }
        if (info.componentType) {
            gInfoElement.appendChild(this.getComponentElement(info.componentType));
        } else {
            // add arrows
            this.addEdgeInfoArrows(gInfoElement, info, infoAngle);
        }
        // add labels
        if (labelData === undefined) return gInfoElement;
        const factor: number =
            info.directionA && info.directionB ? this.svgParameters.getDoubleArrowShiftFactorText() : 1;
        // add labelB element
        if (info.labelB) {
            gInfoElement.appendChild(
                this.getEdgeInfoLabel(
                    labelData.angle,
                    labelData.external.shift * factor,
                    labelData.external.style,
                    info.labelB,
                    info.infoTypeB
                )
            );
        }
        // add labelA element
        if (info.labelA) {
            gInfoElement.appendChild(
                this.getEdgeInfoLabel(
                    labelData.angle,
                    labelData.internal.shift * factor,
                    labelData.internal.style,
                    info.labelA,
                    info.infoTypeA
                )
            );
        }
        return gInfoElement;
    }

    private getComponentElement(componentType: string, initTrans?: Point): SVGGElement {
        const component = ComponentUtils.getComponent(this.componentLibrary, componentType);
        const gComponentElement = document.createElementNS(SvgWriter.SVG_NAMESPACE, 'g');
        if (component) {
            const trans = new Point(
                (initTrans?.x ?? 0) - component.size.width / 2,
                (initTrans?.y ?? 0) - component.size.height / 2
            );
            gComponentElement.setAttribute('transform', 'translate(' + DiagramUtils.getFormattedPoint(trans) + ')');
            gComponentElement.classList.add(component.styleClass);
            component.subComponents.forEach((subComponent) => {
                void ComponentUtils.getComponentPath(subComponent.fileName, this.urlResolver).then((path) => {
                    gComponentElement.appendChild(path);
                });
            });
        }
        return gComponentElement;
    }

    private addEdgeInfoArrows(
        gEdgeInfoElement: SVGGElement,
        info: EdgeInfoMetadata,
        edgeSideInfoAngle: number | undefined
    ) {
        if (info.directionA && info.directionB) {
            const arrowShift: number =
                this.svgParameters.getArrowLabelShift() / this.svgParameters.getDoubleArrowShiftFactorArrows();
            gEdgeInfoElement.appendChild(
                this.getEdgeInfoArrow(edgeSideInfoAngle, info.directionB, info.infoTypeB, -arrowShift)
            );
            gEdgeInfoElement.appendChild(
                this.getEdgeInfoArrow(edgeSideInfoAngle, info.directionA, info.infoTypeA, arrowShift)
            );
        } else if (info.direction) {
            gEdgeInfoElement.appendChild(
                this.getEdgeInfoArrow(edgeSideInfoAngle, info.direction, info.infoTypeB, undefined)
            );
        }
    }

    private getEdgeInfoArrow(
        arrowAngle: number | undefined,
        direction: string,
        type: string | undefined,
        shift: number | undefined
    ): SVGPathElement {
        const edgeInfoArrowElement = document.createElementNS(SvgWriter.SVG_NAMESPACE, 'path');
        if (arrowAngle) {
            let arrowString: string = 'rotate(' + DiagramUtils.getFormattedValue(arrowAngle) + ')';
            if (shift) {
                arrowString += ' translate(' + DiagramUtils.getFormattedPoint(new Point(0, shift)) + ')';
            }
            edgeInfoArrowElement.setAttribute('transform', arrowString);
        }
        const arrowPath = DiagramUtils.getArrowPath(direction, this.svgParameters);
        if (arrowPath) {
            edgeInfoArrowElement.setAttribute('d', arrowPath);
        }
        const edgeInfoTypeClass = DiagramUtils.getEdgeInfoTypeClass(type);
        if (edgeInfoTypeClass) {
            edgeInfoArrowElement.classList.add(edgeInfoTypeClass);
        }
        const edgeInfoDirectionClass = DiagramUtils.getEdgeInfoDirectionClass(direction);
        if (edgeInfoDirectionClass) {
            edgeInfoArrowElement.classList.add(edgeInfoDirectionClass);
        }
        return edgeInfoArrowElement;
    }

    private getEdgeInfoLabel(
        angle: number,
        shift: number,
        style: string | undefined,
        label: string | undefined,
        type: string | undefined
    ): SVGTextElement {
        const edgeInfoLabelElement = document.createElementNS(SvgWriter.SVG_NAMESPACE, 'text');
        edgeInfoLabelElement.innerHTML = DiagramUtils.getFormattedInfoLabel(label, type, this.svgParameters);
        edgeInfoLabelElement.setAttribute('transform', 'rotate(' + DiagramUtils.getFormattedValue(angle) + ')');
        edgeInfoLabelElement.setAttribute('x', DiagramUtils.getFormattedValue(shift));
        if (style) {
            edgeInfoLabelElement.setAttribute('style', style);
        }
        const edgeInfoTypeClass = DiagramUtils.getEdgeInfoTypeClass(type);
        if (edgeInfoTypeClass) {
            edgeInfoLabelElement.classList.add(edgeInfoTypeClass);
        }
        return edgeInfoLabelElement;
    }

    private getEdgeMiddleInfo(edge: EdgeMetadata, info: EdgeInfoMetadata): SVGGElement {
        const gEdgeMiddleInfoElement = document.createElementNS(SvgWriter.SVG_NAMESPACE, 'g');
        gEdgeMiddleInfoElement.id = info.svgId;
        const middleInfoPoint = this.edgeRouter?.getEdgeMiddleInfoPoint(edge.svgId);
        if (middleInfoPoint) {
            gEdgeMiddleInfoElement.setAttribute(
                'transform',
                'translate(' + DiagramUtils.getFormattedPoint(middleInfoPoint) + ')'
            );
        }
        if (info.componentType) {
            gEdgeMiddleInfoElement.appendChild(this.getComponentElement(info.componentType));
        } else {
            // add arrows
            this.addEdgeInfoArrows(gEdgeMiddleInfoElement, info, this.edgeRouter?.getEdgeMiddleInfoAngle(edge.svgId));
        }
        // add labels
        let shift = 0;
        let style: string | undefined = 'text-anchor:middle';
        const labelData = this.edgeRouter?.getEdgeMiddleLabelData(edge.svgId);
        if (labelData === undefined) return gEdgeMiddleInfoElement;
        const factor: number =
            info.directionA && info.directionB ? this.svgParameters.getDoubleArrowShiftFactorText() : 1;
        // add labelB element
        if (info.labelB && info.labelA) {
            gEdgeMiddleInfoElement.appendChild(
                this.getEdgeInfoLabel(
                    labelData.angle,
                    labelData.external.shift * factor,
                    labelData.external.style,
                    info.labelB,
                    info.infoTypeB
                )
            );
            shift = labelData.internal.shift * factor;
            style = labelData.internal.style;
        }
        // add labelA element
        gEdgeMiddleInfoElement.appendChild(
            this.getEdgeInfoLabel(labelData.angle, shift, style, info.labelA, info.infoTypeA)
        );
        return gEdgeMiddleInfoElement;
    }

    private getTextNodesAndEdges(): { textNodes: SVGGElement; textEdges: SVGGElement } {
        // create text nodes g element
        const textNodesGElement = document.createElementNS(SvgWriter.SVG_NAMESPACE, 'g');
        textNodesGElement.classList.add(SvgWriter.TEXT_NODES_CLASS);
        // create text edges g element
        const textEdgesGElement = document.createElementNS(SvgWriter.SVG_NAMESPACE, 'g');
        textEdgesGElement.classList.add(SvgWriter.TEXT_EDGES_CLASS);
        // create text nodes and edges
        this.diagramMetadata.textNodes.forEach((textNode) => {
            const node = MetadataUtils.getNodeMetadata(textNode.vlNode, this.diagramMetadata);
            if (node && !node.invisible) {
                const busNodes = MetadataUtils.getBusNodesMetadata(node.svgId, this.diagramMetadata.busNodes);
                textNodesGElement.appendChild(SvgUtils.createTextNode(textNode, node, busNodes));
                textEdgesGElement.appendChild(SvgUtils.createTextEdge(textNode, node, busNodes, this.svgParameters));
            }
        });
        return { textNodes: textNodesGElement, textEdges: textEdgesGElement };
    }
}
