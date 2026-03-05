/*
 * Copyright (c) 2026, RTE (http://www.rte-france.com)
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 * SPDX-License-Identifier: MPL-2.0
 */
 package com.powsybl.viewer.demo;

import com.powsybl.computation.local.LocalComputationManager;
import com.powsybl.ieeecdf.converter.IeeeCdfNetworkFactory;
import com.powsybl.iidm.network.ImportConfig;
import com.powsybl.iidm.network.Line;
import com.powsybl.iidm.network.Network;
import com.powsybl.iidm.network.Terminal;
import com.powsybl.iidm.network.TwoSides;
import com.powsybl.iidm.network.test.EurostagTutorialExample1Factory;
import com.powsybl.iidm.network.test.FourSubstationsNodeBreakerFactory;
import com.powsybl.iidm.network.test.ScadaNetworkFactory;
import com.powsybl.loadflow.LoadFlow;
import com.powsybl.nad.NadParameters;
import com.powsybl.nad.NetworkAreaDiagram;
import com.powsybl.nad.build.iidm.VoltageLevelFilter;
import com.powsybl.nad.svg.LabelProvider;
import com.powsybl.nad.svg.LabelProviderParameters;
import com.powsybl.nad.svg.SvgParameters;
import com.powsybl.nad.svg.iidm.DefaultLabelProvider;

import java.nio.file.Path;
import java.util.Properties;

/**
 * @author Nicolas Rol {@literal <nicolas.rol at rte-france.com>}
 */
public final class NadDemoFiles {

    private NadDemoFiles() {
        /* This utility class should not be instantiated */
    }

    public static void drawCase1354Pegase(Path demoResourcesDirectory) {
        Properties properties = new Properties();
        properties.put("matpower.import.ignore-base-voltage", "false");

        Network network = Network.read("case1354pegase.mat",
            DemoFilesGenerator.class.getResourceAsStream("/case1354pegase.mat"),
            LocalComputationManager.getDefault(), new ImportConfig(), properties);

        NetworkAreaDiagram.draw(network, demoResourcesDirectory.resolve("case1354pegase.svg"),
            getNadParametersWithSvgWidthAndHeightAdded(),
            VoltageLevelFilter.NO_FILTER);
    }

    public static void drawEurostag(Path demoResourcesDirectory) {
        Network network = EurostagTutorialExample1Factory.create();
        Line lineToDuplicateAndInvert = network.getLine("NHV1_NHV2_2");
        Terminal terminal1 = lineToDuplicateAndInvert.getTerminal(TwoSides.ONE);
        Terminal terminal2 = lineToDuplicateAndInvert.getTerminal(TwoSides.TWO);
        String bus1 = terminal1.getBusBreakerView().getBus().getId();
        String bus2 = terminal2.getBusBreakerView().getBus().getId();
        network.newLine(lineToDuplicateAndInvert).setId("NHV1_NHV2_3")
            .setVoltageLevel1(terminal2.getVoltageLevel().getId())
            .setVoltageLevel2(terminal1.getVoltageLevel().getId())
            .setBus1(bus2)
            .setBus2(bus1)
            .add();
        NetworkAreaDiagram.draw(network, demoResourcesDirectory.resolve("nad-eurostag-tutorial-example1.svg"),
            getNadParametersWithDefaultLabelProviderFilled(),
            VoltageLevelFilter.NO_FILTER);
    }

    public static void draw9ZeroImpedance(Path demoResourcesDirectory) {
        Network network = IeeeCdfNetworkFactory.create9zeroimpedance();
        NetworkAreaDiagram.draw(network, demoResourcesDirectory.resolve("nad-ieee9-zeroimpedance-cdf.svg"),
            getNadParametersWithDefaultLabelProviderFilled(),
            VoltageLevelFilter.createVoltageLevelDepthFilter(network, "VL3", 1));
    }

    public static void draw9ZeroImpedanceMiddleArrow(Path demoResources) {
        Network network = IeeeCdfNetworkFactory.create9zeroimpedance();
        LoadFlow.run(network);
        DefaultLabelProvider.EdgeInfoParameters edgeInfoParameters = new DefaultLabelProvider.EdgeInfoParameters(
                DefaultLabelProvider.EdgeInfoEnum.ACTIVE_POWER,
                DefaultLabelProvider.EdgeInfoEnum.NAME,
                DefaultLabelProvider.EdgeInfoEnum.CURRENT,
                DefaultLabelProvider.EdgeInfoEnum.EMPTY);
        NetworkAreaDiagram.draw(network, demoResources.resolve("nad-ieee9-zeroimpedance-cdf-middle-arrow.svg"),
                getNadParametersWithDefaultLabelProviderFilled(edgeInfoParameters),
                VoltageLevelFilter.createVoltageLevelDepthFilter(network, "VL2", 1));
    }

    public static void draw9ZeroImpedanceLimitPercentage(Path demoResources) {
        Network network = IeeeCdfNetworkFactory.create9zeroimpedance();
        LoadFlow.run(network);
        Line line = network.getLine("L9-8-0");
        line.getTerminal1().setP(800).setQ(400.0);
        line.getTerminal2().setP(810).setQ(410.0);
        line.getOrCreateSelectedOperationalLimitsGroup1().newCurrentLimits()
                .setPermanentLimit(2000.0)
                .beginTemporaryLimit()
                .setName("20'")
                .setValue(2100)
                .setAcceptableDuration(20 * 60)
                .endTemporaryLimit()
                .beginTemporaryLimit()
                .setName("10'")
                .setValue(2200.0)
                .setAcceptableDuration(10 * 60)
                .endTemporaryLimit()
                .add();
        line.getOrCreateSelectedOperationalLimitsGroup2().newCurrentLimits()
                .setPermanentLimit(2000.0)
                .beginTemporaryLimit()
                .setName("20'")
                .setValue(2100)
                .setAcceptableDuration(20 * 60)
                .endTemporaryLimit()
                .beginTemporaryLimit()
                .setName("10'")
                .setValue(2400.0)
                .setAcceptableDuration(10 * 60)
                .endTemporaryLimit()
                .add();

        DefaultLabelProvider.EdgeInfoParameters edgeInfoParameters = new DefaultLabelProvider.EdgeInfoParameters(
                DefaultLabelProvider.EdgeInfoEnum.ACTIVE_POWER,
                DefaultLabelProvider.EdgeInfoEnum.NAME,
                DefaultLabelProvider.EdgeInfoEnum.VALUE_PERMANENT_LIMIT_PERCENTAGE,
                DefaultLabelProvider.EdgeInfoEnum.EMPTY);
        NetworkAreaDiagram.draw(network, demoResources.resolve("nad-ieee9-zeroimpedance-cdf-limit-percentage.svg"),
                getNadParametersWithDefaultLabelProviderFilled(edgeInfoParameters),
                VoltageLevelFilter.createVoltageLevelDepthFilter(network, "VL2", 1));

    }


    public static void drawScada(Path demoResourcesDirectory) {
        Network network = ScadaNetworkFactory.create();
        NetworkAreaDiagram.draw(network, demoResourcesDirectory.resolve("nad-scada.svg"),
            getNadParametersWithDefaultLabelProviderFilled(),
            VoltageLevelFilter.NO_FILTER);
    }

    public static void drawFourSubstations(Path demoResourcesDirectory) {
        Network network = FourSubstationsNodeBreakerFactory.create();
        NetworkAreaDiagram.draw(network, demoResourcesDirectory.resolve("nad-four-substations.svg"),
            getNadParametersWithDefaultLabelProvider(),
            VoltageLevelFilter.NO_FILTER);
    }

    public static void draw14Solved(Path demoResourcesDirectory) {
        Network network = IeeeCdfNetworkFactory.create14Solved();
        NetworkAreaDiagram.draw(network, demoResourcesDirectory.resolve("nad-ieee14cdf-solved.svg"),
            getNadParametersWithDefaultLabelProvider(),
            VoltageLevelFilter.NO_FILTER);
    }

    public static void drawVL9006(Path demoResourcesDirectory) {
        Network n6 = IeeeCdfNetworkFactory.create300();
        LoadFlow.run(n6);
        NetworkAreaDiagram.draw(n6, demoResourcesDirectory.resolve("nad-ieee300cdf-VL9006.svg"),
            getNadParametersWithInjectionsAdded(),
            VoltageLevelFilter.createVoltageLevelDepthFilter(n6, "VL9006", 1));
    }

    private static NadParameters getNadParametersWithSvgWidthAndHeightAdded() {
        SvgParameters svgParameters = new SvgParameters()
            .setCssLocation(SvgParameters.CssLocation.EXTERNAL_NO_IMPORT)
            .setSvgWidthAndHeightAdded(true);
        return new NadParameters()
            .setSvgParameters(svgParameters);
    }

    private static NadParameters getNadParametersWithDefaultLabelProviderFilled() {
        DefaultLabelProvider.EdgeInfoParameters edgeInfoParameters = new DefaultLabelProvider.EdgeInfoParameters(
                DefaultLabelProvider.EdgeInfoEnum.ACTIVE_POWER,
                DefaultLabelProvider.EdgeInfoEnum.NAME,
                DefaultLabelProvider.EdgeInfoEnum.EMPTY,
                DefaultLabelProvider.EdgeInfoEnum.EMPTY);
        return getNadParametersWithDefaultLabelProviderFilled(edgeInfoParameters);
    }

    private static NadParameters getNadParametersWithDefaultLabelProviderFilled(DefaultLabelProvider.EdgeInfoParameters edgeInfoParameters) {
        SvgParameters svgParameters = new SvgParameters()
                .setCssLocation(SvgParameters.CssLocation.EXTERNAL_NO_IMPORT);
        LabelProviderParameters parameters = new LabelProviderParameters();
        return new NadParameters()
                .setSvgParameters(svgParameters)
                .setLabelProviderFactory((n, s) ->
                        new DefaultLabelProvider(n, edgeInfoParameters, s.createValueFormatter(), parameters));
    }

    private static NadParameters getNadParametersWithDefaultLabelProvider() {
        SvgParameters svgParameters = new SvgParameters()
            .setCssLocation(SvgParameters.CssLocation.EXTERNAL_NO_IMPORT);
        return new NadParameters()
            .setSvgParameters(svgParameters)
            .setLabelProviderFactory(DefaultLabelProvider::new);
    }

    private static NadParameters getNadParametersWithInjectionsAdded() {
        SvgParameters svgParameters = new SvgParameters()
            .setCssLocation(SvgParameters.CssLocation.EXTERNAL_NO_IMPORT);
        NadParameters nadParameters = new NadParameters()
            .setSvgParameters(svgParameters)
            .setLabelProviderFactory(DefaultLabelProvider::new);
        nadParameters.getLayoutParameters().setInjectionsAdded(true);
        return nadParameters;
    }
}
