/**
 * Copyright (c) 2026, RTE (http://www.rte-france.com)
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 * SPDX-License-Identifier: MPL-2.0
 */

import { DiagramMetadata, EdgeMetadata, NodeMetadata } from './diagram-metadata';
import { MetadataSearch } from './metadata-search';

export interface SvgWriterParameters {
    // diagram metadata
    diagramMetadata: DiagramMetadata;

    // nodes and edges to be added by the SVG writer
    elementList?: { nodes: NodeMetadata[]; edges: EdgeMetadata[] };

    // elements with these CSS classes should not be added
    voltageLevels?: string[];

    // object for searching diagram metadata
    metadataSearch?: MetadataSearch;
}
