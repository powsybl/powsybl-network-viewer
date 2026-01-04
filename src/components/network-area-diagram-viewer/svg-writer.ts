/**
 * Copyright (c) 2025, RTE (http://www.rte-france.com)
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 * SPDX-License-Identifier: MPL-2.0
 */

import { Point } from '@svgdotjs/svg.js';
import { BusNodeMetadata, DiagramMetadata, EdgeMetadata, NodeMetadata } from './diagram-metadata';
import * as DiagramUtils from './diagram-utils';
import { SvgParameters } from './svg-parameters';
import * as MetadataUtils from './metadata-utils';
import { EdgeRouter } from './edge-router';
import { EdgeType } from './diagram-types';

export class SvgWriter {
    static readonly NODES_CLASS = 'nad-vl-nodes';
    static readonly BUS_CLASS = 'nad-busnode';
    static readonly EDGES_CLASS = 'nad-branch-edges';
    static readonly THREEWT_EDGES_CLASS = 'nad-3wt-edges';
    static readonly EDGE_CLASS = 'nad-edge-path';
    static readonly HVDC_EDGE_CLASS = 'nad-hvdc-edge';
    static readonly DANGLING_LINE_EDGE_CLASS = 'nad-dangling-line-edge';
    static readonly WINDING_CLASS = 'nad-winding';
    static readonly HVDC_CLASS = 'nad-hvdc';
    static readonly PST_CLASS = 'nad-pst-arrow';
    static readonly PST_ARROW_PATH = 'M60.00,0 0,60.00 M52.00,0 60.00,0 60.00,8.00';

    diagramMetadata: DiagramMetadata;
    svgParameters: SvgParameters;
    edgeRouter: EdgeRouter | undefined;

    constructor(diagramMetadata: DiagramMetadata) {
        this.diagramMetadata = diagramMetadata;
        this.svgParameters = new SvgParameters(this.diagramMetadata.svgParameters);
    }

    public getSvg(): string {
        // get edge router, for computing edges points
        this.edgeRouter = new EdgeRouter(this.diagramMetadata);
        // create XML doc
        const xmlDoc = this.getXmlDoc();
        // add SVG root element
        const svg = this.getSvgRootElement();
        xmlDoc.appendChild(svg);
        // add nodes
        svg.appendChild(this.getNodes());
        // add edges
        svg.appendChild(this.getEdges());
        // add 3wt edges
        const threeWtEdges = MetadataUtils.getThreeWtEdges(this.diagramMetadata.edges);
        if (threeWtEdges && threeWtEdges.length > 0) {
            svg.appendChild(this.getThreeWtEdges(threeWtEdges));
        }
        return new XMLSerializer().serializeToString(xmlDoc);
    }

    private getXmlDoc(): XMLDocument {
        const xmlDoc = document.implementation.createDocument('', '', null);
        const pi = xmlDoc.createProcessingInstruction('xml', 'version="1.0" encoding="UTF-8"');
        xmlDoc.insertBefore(pi, xmlDoc.firstChild);
        return xmlDoc;
    }

    private getSvgRootElement(): SVGSVGElement {
        const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        const viewBox = MetadataUtils.getViewBox(
            this.diagramMetadata.nodes,
            this.diagramMetadata.textNodes,
            this.svgParameters
        );
        svg.setAttribute('viewBox', [viewBox.x, viewBox.y, viewBox.width, viewBox.height].join(' '));
        return svg;
    }

    private getNodes(): SVGGElement {
        // create g nodes element
        const gNodesElement = document.createElementNS('http://www.w3.org/2000/svg', 'g');
        gNodesElement.classList.add(SvgWriter.NODES_CLASS);
        // add nodes
        this.diagramMetadata.nodes.forEach((node) => {
            gNodesElement.appendChild(this.getNode(node));
        });
        return gNodesElement;
    }

    private getNode(node: NodeMetadata): SVGGElement {
        // create node
        const gNodeElement = document.createElementNS('http://www.w3.org/2000/svg', 'g');
        gNodeElement.id = node.svgId;
        gNodeElement.setAttribute(
            'transform',
            'translate(' + DiagramUtils.getFormattedPoint(new Point(node.x, node.y)) + ')'
        );
        // add buses
        const busNodes = MetadataUtils.getBusNodesMetadata(node.svgId, this.diagramMetadata.busNodes);
        const busEgdes = MetadataUtils.getBusEdgesMetadata(node.svgId, this.diagramMetadata.edges);
        const traversingBusEdgesAngles: number[] = [];
        busNodes.forEach((busNode) => {
            gNodeElement.appendChild(this.getBusNode(busNode, node, traversingBusEdgesAngles));
            this.addBusEdgeAngles(node, busNode, busEgdes.get(busNode.svgId) ?? [], traversingBusEdgesAngles);
        });
        return gNodeElement;
    }

    private getBusNode(busNode: BusNodeMetadata, node: NodeMetadata, traversingBusEdgesAngles: number[]): SVGElement {
        const nodeRadius = MetadataUtils.getNodeRadius(busNode, node, this.svgParameters);
        if (busNode.index == 0) {
            const circleElement = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
            circleElement.id = busNode.svgId;
            circleElement.classList.add(SvgWriter.BUS_CLASS);
            circleElement.setAttribute('r', DiagramUtils.getFormattedValue(nodeRadius.busOuterRadius));
            return circleElement;
        } else {
            const pathElement = document.createElementNS('http://www.w3.org/2000/svg', 'path');
            pathElement.id = busNode.svgId;
            pathElement.classList.add(SvgWriter.BUS_CLASS);
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

    private getEdges(): SVGGElement {
        // create g edges element
        const gEdgesElement = document.createElementNS('http://www.w3.org/2000/svg', 'g');
        gEdgesElement.classList.add(SvgWriter.EDGES_CLASS);
        // add edges
        this.diagramMetadata.edges.forEach((edge) => {
            if (!MetadataUtils.isThreeWtEdge(edge)) {
                gEdgesElement.appendChild(this.getEdge(edge));
            }
        });
        return gEdgesElement;
    }

    private getEdge(edge: EdgeMetadata): SVGGElement {
        const edgeType = MetadataUtils.getEdgeType(edge);
        const gEdgeElement = document.createElementNS('http://www.w3.org/2000/svg', 'g');
        gEdgeElement.id = edge.svgId;
        if (DiagramUtils.isHVDCLineEdge(edgeType)) {
            gEdgeElement.classList.add(SvgWriter.HVDC_EDGE_CLASS);
        } else if (DiagramUtils.isDanglingLineEdge(edgeType)) {
            gEdgeElement.classList.add(SvgWriter.DANGLING_LINE_EDGE_CLASS);
        }
        const halfEdgePoints1 = this.edgeRouter?.getEdgePoints(edge.svgId, '1');
        if (halfEdgePoints1) {
            gEdgeElement.appendChild(this.getHalfEdge(edge, halfEdgePoints1));
        }
        const halfEdgePoints2 = this.edgeRouter?.getEdgePoints(edge.svgId, '2');
        if (halfEdgePoints2) {
            gEdgeElement.appendChild(this.getHalfEdge(edge, halfEdgePoints2));
        }
        if (DiagramUtils.isTransformerEdge(edgeType) && (halfEdgePoints1 || halfEdgePoints2)) {
            const gTranformerElement = document.createElementNS('http://www.w3.org/2000/svg', 'g');
            if (halfEdgePoints1) {
                gTranformerElement.appendChild(this.getTransformerWinding(halfEdgePoints1));
            }
            if (halfEdgePoints2) {
                gTranformerElement.appendChild(this.getTransformerWinding(halfEdgePoints2));
            }
            if (edgeType == EdgeType.PHASE_SHIFT_TRANSFORMER) {
                gTranformerElement.appendChild(this.getTransformerArrow(halfEdgePoints1, halfEdgePoints2));
            }
            gEdgeElement.appendChild(gTranformerElement);
        }
        if (DiagramUtils.isHVDCLineEdge(edgeType) && halfEdgePoints1) {
            const gHVDCLineElement = document.createElementNS('http://www.w3.org/2000/svg', 'g');
            gHVDCLineElement.appendChild(this.getHVDCLine(halfEdgePoints1));
            gEdgeElement.appendChild(gHVDCLineElement);
        }
        return gEdgeElement;
    }

    private getHalfEdge(edge: EdgeMetadata, points: Point[]): SVGPolylineElement | SVGPathElement {
        if (edge.node1 == edge.node2) {
            const pathElement = document.createElementNS('http://www.w3.org/2000/svg', 'path');
            pathElement.classList.add(SvgWriter.EDGE_CLASS);
            pathElement.setAttribute('d', DiagramUtils.getHalfLoopPath(points));
            return pathElement;
        } else {
            const polylineElement = document.createElementNS('http://www.w3.org/2000/svg', 'polyline');
            polylineElement.classList.add(SvgWriter.EDGE_CLASS);
            polylineElement.setAttribute('points', DiagramUtils.getFormattedPolyline(points));
            return polylineElement;
        }
    }

    private getTransformerWinding(points: Point[]): SVGCircleElement {
        const transformerCircleElement = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
        transformerCircleElement.classList.add(SvgWriter.WINDING_CLASS);
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
        const arrowPathElement = document.createElementNS('http://www.w3.org/2000/svg', 'path');
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

    private getHVDCLine(points: Point[]): SVGPolylineElement {
        const polylineElement = document.createElementNS('http://www.w3.org/2000/svg', 'polyline');
        polylineElement.classList.add(SvgWriter.HVDC_CLASS);
        const csPoints = DiagramUtils.getConverterStationPoints(points, this.svgParameters.getConverterStationWidth());
        polylineElement.setAttribute('points', DiagramUtils.getFormattedPolyline(csPoints));
        return polylineElement;
    }

    private getThreeWtEdges(threeWtEdges: EdgeMetadata[]): SVGGElement {
        // create g 3wt edges element
        const gThreeWtEdgesElement = document.createElementNS('http://www.w3.org/2000/svg', 'g');
        gThreeWtEdgesElement.classList.add(SvgWriter.THREEWT_EDGES_CLASS);
        // add 3wt edges
        threeWtEdges.forEach((edge) => {
            const points = this.edgeRouter?.getThreeWtEdgePoints(edge.svgId);
            if (points) {
                gThreeWtEdgesElement.appendChild(this.getThreeWtEdge(edge, points));
            }
        });
        return gThreeWtEdgesElement;
    }

    private getThreeWtEdge(edge: EdgeMetadata, points: Point[]): SVGGElement {
        const gTreeWtEdgeElement = document.createElementNS('http://www.w3.org/2000/svg', 'g');
        gTreeWtEdgeElement.id = edge.svgId;
        gTreeWtEdgeElement.appendChild(this.getThreeWtPolyline(points));
        return gTreeWtEdgeElement;
    }

    private getThreeWtPolyline(points: Point[]): SVGPolylineElement {
        const polylineElement = document.createElementNS('http://www.w3.org/2000/svg', 'polyline');
        polylineElement.classList.add(SvgWriter.EDGE_CLASS);
        polylineElement.setAttribute('points', DiagramUtils.getFormattedPolyline(points));
        return polylineElement;
    }
}
