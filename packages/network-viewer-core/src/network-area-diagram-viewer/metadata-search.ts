/**
 * Copyright (c) 2026, RTE (http://www.rte-france.com)
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 * SPDX-License-Identifier: MPL-2.0
 */

import { BusNodeMetadata, DiagramMetadata, EdgeMetadata, NodeMetadata, TextNodeMetadata } from './diagram-metadata';

export class MetadataSearch {
    nodes: Record<string, NodeMetadata> = {};
    buses: Record<string, BusNodeMetadata> = {};
    nodeBuses: Record<string, BusNodeMetadata[]> = {};
    textNodes: Record<string, TextNodeMetadata> = {};
    nodeEdges: Record<string, EdgeMetadata[]> = {};

    constructor(diagramMetadata: DiagramMetadata) {
        diagramMetadata.nodes.forEach((node) => {
            this.nodes[node.svgId] = node;
        });
        diagramMetadata.busNodes.forEach((bus) => {
            this.buses[bus.svgId] = bus;
            this.nodeBuses[bus.vlNode] ??= [];
            this.nodeBuses[bus.vlNode].push(bus);
        });
        diagramMetadata.textNodes.forEach((textNode) => {
            this.textNodes[textNode.svgId] = textNode;
        });
        diagramMetadata.edges.forEach((edge) => {
            this.nodeEdges[edge.node1] ??= [];
            this.nodeEdges[edge.node1].push(edge);
            if (edge.node2 != edge.node1) {
                this.nodeEdges[edge.node2] ??= [];
                this.nodeEdges[edge.node2].push(edge);
            }
        });
    }

    public getNode(nodeId: string): NodeMetadata | undefined {
        return this.nodes[nodeId];
    }

    public getBus(busId: string): BusNodeMetadata | undefined {
        return this.buses[busId];
    }

    public getNodeBuses(nodeId: string): BusNodeMetadata[] {
        return this.nodeBuses[nodeId] ?? [];
    }

    public getTextNode(textNodeId: string): TextNodeMetadata | undefined {
        return this.textNodes[textNodeId];
    }

    // edges connected to the node, loops included once
    public getNodeEdges(nodeId: string): EdgeMetadata[] {
        return this.nodeEdges[nodeId] ?? [];
    }
}
