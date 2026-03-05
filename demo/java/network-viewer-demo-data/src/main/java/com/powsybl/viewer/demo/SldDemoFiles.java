/*
 * Copyright (c) 2026, RTE (http://www.rte-france.com)
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 * SPDX-License-Identifier: MPL-2.0
 */
 package com.powsybl.viewer.demo;

import com.powsybl.cgmes.conformity.ReliCapGridCatalog;
import com.powsybl.iidm.network.Network;
import com.powsybl.sld.SingleLineDiagram;
import com.powsybl.sld.SldParameters;
import com.powsybl.sld.svg.SvgParameters;

import java.nio.file.Path;
import java.util.Properties;

/**
 * @author Nicolas Rol {@literal <nicolas.rol at rte-france.com>}
 */
public final class SldDemoFiles {

    private SldDemoFiles() {
        /* This utility class should not be instantiated */
    }


    public static void drawSldExample(Path demoResourcesDirectory) {
        Network n8 = Network.read(ReliCapGridCatalog.belgovia().dataSource(), getProperties());
        n8.getSwitch("2922c1dd-4113-466e-8cad-002572f3f557").setOpen(false);
        n8.getSwitch("969470b9-e74c-40d2-b3f7-bcfd88400fd1").setOpen(true);
        n8.getSwitch("96c2b5c8-8e28-4b08-96d2-ca9b09cdbd83").setOpen(true);
        SingleLineDiagram.draw(n8, "469df5f7-058f-4451-a998-57a48e8a56fe",
            demoResourcesDirectory.resolve("sld-example.svg"),
            getSldParameters());
    }

    public static void drawSldSubExample(Path demoResourcesDirectory) {
        Network n8 = Network.read(ReliCapGridCatalog.belgovia().dataSource(), getProperties());
        n8.getSwitch("2922c1dd-4113-466e-8cad-002572f3f557").setOpen(true);
        SingleLineDiagram.draw(n8, "37e14a0f-5e34-4647-a062-8bfd9305fa9d",
            demoResourcesDirectory.resolve("sld-sub-example.svg"),
            getSldParameters());
    }

    private static SldParameters getSldParameters() {
        return new SldParameters().setSvgParameters(
            new SvgParameters().setUseName(true).setBusesLegendAdded(true));
    }

    private static Properties getProperties() {
        Properties properties = new Properties();
        properties.put("matpower.import.ignore-base-voltage", "false");
        return properties;
    }
}
