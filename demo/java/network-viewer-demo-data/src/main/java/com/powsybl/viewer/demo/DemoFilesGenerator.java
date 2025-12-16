/*
 * Copyright (c) 2025, RTE (http://www.rte-france.com)
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 * SPDX-License-Identifier: MPL-2.0
 */
package com.powsybl.viewer.demo;

import com.powsybl.cgmes.conformity.ReliCapGridCatalog;
import com.powsybl.computation.local.LocalComputationManager;
import com.powsybl.ieeecdf.converter.IeeeCdfNetworkFactory;
import com.powsybl.iidm.network.*;
import com.powsybl.iidm.network.test.EurostagTutorialExample1Factory;
import com.powsybl.iidm.network.test.FourSubstationsNodeBreakerFactory;
import com.powsybl.iidm.network.test.ScadaNetworkFactory;
import com.powsybl.loadflow.LoadFlow;
import com.powsybl.nad.NadParameters;
import com.powsybl.nad.NetworkAreaDiagram;
import com.powsybl.nad.build.iidm.VoltageLevelFilter;
import com.powsybl.nad.model.Point;
import com.powsybl.nad.routing.CustomPathRouting;
import com.powsybl.nad.svg.LabelProviderParameters;
import com.powsybl.nad.svg.SvgParameters;
import com.powsybl.nad.svg.iidm.DefaultLabelProvider;
import com.powsybl.sld.SingleLineDiagram;
import com.powsybl.sld.SldParameters;

import java.nio.file.Path;
import java.util.List;
import java.util.Map;
import java.util.Properties;

import static com.powsybl.nad.build.iidm.VoltageLevelFilter.NO_FILTER;

/**
 * @author Florian Dupuy {@literal <florian.dupuy at rte-france.com>}
 */
public final class DemoFilesGenerator {

    private DemoFilesGenerator() {
    }

    public static void main(String[] args) {
        Path demoResources = Path.of("..", "..", "src", "diagram-viewers", "data");

        Properties properties = new Properties();
        properties.put("matpower.import.ignore-base-voltage", "false");
        Network n1 = Network.read("case1354pegase.mat", DemoFilesGenerator.class.getResourceAsStream("/case1354pegase.mat"),
                LocalComputationManager.getDefault(), new ImportConfig(), properties);

        NadParameters nadParameters = new NadParameters().setSvgParameters(
                new SvgParameters().setCssLocation(SvgParameters.CssLocation.EXTERNAL_NO_IMPORT).setSvgWidthAndHeightAdded(true));
        NetworkAreaDiagram.draw(n1, demoResources.resolve("case1354pegase.svg"), nadParameters, VoltageLevelFilter.NO_FILTER);

        Network n2 = EurostagTutorialExample1Factory.create();
        var lineToDuplicateAndInvert = n2.getLine("NHV1_NHV2_2");
        Terminal terminal1 = lineToDuplicateAndInvert.getTerminal(TwoSides.ONE);
        Terminal terminal2 = lineToDuplicateAndInvert.getTerminal(TwoSides.TWO);
        String bus1 = terminal1.getBusBreakerView().getBus().getId();
        String bus2 = terminal2.getBusBreakerView().getBus().getId();
        n2.newLine(lineToDuplicateAndInvert).setId("NHV1_NHV2_3")
                .setVoltageLevel1(terminal2.getVoltageLevel().getId())
                .setVoltageLevel2(terminal1.getVoltageLevel().getId())
                .setBus1(bus2)
                .setBus2(bus1)
                .add();
        nadParameters.getSvgParameters().setSvgWidthAndHeightAdded(false);
        var edgeInfoParameters = new DefaultLabelProvider.EdgeInfoParameters(DefaultLabelProvider.EdgeInfoEnum.ACTIVE_POWER, DefaultLabelProvider.EdgeInfoEnum.NAME, DefaultLabelProvider.EdgeInfoEnum.EMPTY, DefaultLabelProvider.EdgeInfoEnum.EMPTY);
        var parameters = new LabelProviderParameters();
        nadParameters.setLabelProviderFactory((n, s) ->
                new DefaultLabelProvider(n, edgeInfoParameters, s.createValueFormatter(), parameters));
        NetworkAreaDiagram.draw(n2, demoResources.resolve("nad-eurostag-tutorial-example1.svg"), nadParameters, VoltageLevelFilter.NO_FILTER);

        Network n4 = IeeeCdfNetworkFactory.create9zeroimpedance();
        NetworkAreaDiagram.draw(n4, demoResources.resolve("nad-ieee9-zeroimpedance-cdf.svg"), nadParameters, VoltageLevelFilter.createVoltageLevelDepthFilter(n4, "VL3", 1));

        Network n7 = ScadaNetworkFactory.create();
        NetworkAreaDiagram.draw(n7, demoResources.resolve("nad-scada.svg"), nadParameters, VoltageLevelFilter.NO_FILTER);

        nadParameters.setLabelProviderFactory(DefaultLabelProvider::new);
        Network n3 = FourSubstationsNodeBreakerFactory.create();
        NetworkAreaDiagram.draw(n3, demoResources.resolve("nad-four-substations.svg"), nadParameters, VoltageLevelFilter.NO_FILTER);

        Network n5 = IeeeCdfNetworkFactory.create14Solved();
        NetworkAreaDiagram.draw(n5, demoResources.resolve("nad-ieee14cdf-solved.svg"), nadParameters, VoltageLevelFilter.NO_FILTER);

        Network n6 = IeeeCdfNetworkFactory.create300();
        LoadFlow.run(n6);
        nadParameters.getLayoutParameters().setInjectionsAdded(true);
        NetworkAreaDiagram.draw(n6, demoResources.resolve("nad-ieee300cdf-VL9006.svg"), nadParameters,
                VoltageLevelFilter.createVoltageLevelDepthFilter(n6, "VL9006", 1));
        nadParameters.getLayoutParameters().setInjectionsAdded(false);

        Network n8 = Network.read(ReliCapGridCatalog.belgovia().dataSource(), properties);
        SldParameters sldParameters = new SldParameters().setSvgParameters(
                new com.powsybl.sld.svg.SvgParameters().setUseName(true).setBusesLegendAdded(true));
        Switch switchBeBreaker3 = n8.getSwitch("2922c1dd-4113-466e-8cad-002572f3f557");
        switchBeBreaker3.setOpen(true);
        SingleLineDiagram.draw(n8, "37e14a0f-5e34-4647-a062-8bfd9305fa9d", demoResources.resolve("sld-sub-example.svg"), sldParameters);

        switchBeBreaker3.setOpen(false);
        n8.getSwitch("969470b9-e74c-40d2-b3f7-bcfd88400fd1").setOpen(true);
        n8.getSwitch("96c2b5c8-8e28-4b08-96d2-ca9b09cdbd83").setOpen(true);
        SingleLineDiagram.draw(n8, "469df5f7-058f-4451-a998-57a48e8a56fe", demoResources.resolve("sld-example.svg"), sldParameters);

        Network network = IeeeCdfNetworkFactory.create14Solved();
        Map<String, List<Point>> edgesMap = Map.of(
                "L1-2-1", List.of(new Point(-0.89, -652.83)),
                "L1-5-1", List.of(new Point(296.10, -502.39), new Point(717.04, -455.84), new Point(737.27, -51.09))
        );
        Map<String, List<Point>> textMap = Map.of(
                "VL3", List.of(new Point(450, -400), new Point(479.01, -375.27))
        );
        nadParameters.setEdgeRouting(new CustomPathRouting(edgesMap, textMap));
        NetworkAreaDiagram.draw(network, demoResources.resolve("bent_lines.svg"), nadParameters, NO_FILTER);
    }
}
