/*
 * Copyright (c) 2025, RTE (http://www.rte-france.com)
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 * SPDX-License-Identifier: MPL-2.0
 */
package com.powsybl.viewer.demo;

import java.nio.file.Path;

/**
 * @author Florian Dupuy {@literal <florian.dupuy at rte-france.com>}
 */
public final class DemoFilesGenerator {

    private DemoFilesGenerator() {
    }

    public static void main(String[] args) {
        Path demoResources = Path.of("..", "..", "src", "diagram-viewers", "data");

        NadDemoFiles.drawCase1354Pegase(demoResources);
        NadDemoFiles.drawEurostag(demoResources);
        NadDemoFiles.draw9ZeroImpedance(demoResources);
        NadDemoFiles.drawScada(demoResources);
        NadDemoFiles.drawFourSubstations(demoResources);
        NadDemoFiles.drawFourSubstationsWithMultipleLabels(demoResources);
        NadDemoFiles.draw14Solved(demoResources);
        NadDemoFiles.drawVL9006(demoResources);
        NadDemoFiles.draw9ZeroImpedanceMiddleArrow(demoResources);
        NadDemoFiles.draw9ZeroImpedanceLimitPercentage(demoResources);
        NadDemoFiles.drawFourSubstationsCustomLabelAndStyle(demoResources);
        NadDemoFiles.drawNetworkWithSvcVscScDlDoubleArrows(demoResources);

        SldDemoFiles.drawSldExample(demoResources);
        SldDemoFiles.drawSldSubExample(demoResources);
    }
}
