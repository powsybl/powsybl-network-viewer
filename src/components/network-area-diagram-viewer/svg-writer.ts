/**
 * Copyright (c) 2025, RTE (http://www.rte-france.com)
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 * SPDX-License-Identifier: MPL-2.0
 */

import { Point } from '@svgdotjs/svg.js';
import { BusNodeMetadata, DiagramMetadata, NodeMetadata } from './diagram-metadata';
import * as DiagramUtils from './diagram-utils';
import { SvgParameters } from './svg-parameters';
import * as MetadataUtils from './metadata-utils';

export class SvgWriter {
    static readonly NODES_CLASS = 'nad-vl-nodes';

    diagramMetadata: DiagramMetadata;
    svgParameters: SvgParameters;

    constructor(diagramMetadata: DiagramMetadata) {
        this.diagramMetadata = diagramMetadata;
        this.svgParameters = new SvgParameters(this.diagramMetadata.svgParameters);
    }

    public getSvg(): string {
        // create XML doc
        const xmlDoc = this.getXmlDoc();
        // add SVG root element
        const svg = this.getSvgRootElement();
        xmlDoc.appendChild(svg);
        // add nodes
        svg.appendChild(this.getNodes());

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
        busNodes.forEach((busNode) => {
            gNodeElement.appendChild(this.getBusNode(busNode, node));
        });
        return gNodeElement;
    }

    private getBusNode(busNode: BusNodeMetadata, node: NodeMetadata): SVGElement {
        const nodeRadius = MetadataUtils.getNodeRadius(busNode, node, this.svgParameters);
        if (busNode.index == 0) {
            const circleElement = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
            circleElement.id = busNode.svgId;
            circleElement.setAttribute('r', DiagramUtils.getFormattedValue(nodeRadius.busOuterRadius));
            return circleElement;
        } else {
            const pathElement = document.createElementNS('http://www.w3.org/2000/svg', 'path');
            pathElement.id = busNode.svgId;
            const path: string = DiagramUtils.getFragmentedAnnulusPath(
                [],
                nodeRadius,
                this.svgParameters.getNodeHollowWidth()
            );
            pathElement.setAttribute('d', path);
            return pathElement;
        }
    }
}
