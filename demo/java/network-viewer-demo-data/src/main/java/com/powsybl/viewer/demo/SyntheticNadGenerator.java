/*
 * Copyright (c) 2026, RTE (http://www.rte-france.com)
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 * SPDX-License-Identifier: MPL-2.0
 */
package com.powsybl.viewer.demo;

import com.powsybl.iidm.network.Line;
import com.powsybl.iidm.network.Network;
import com.powsybl.iidm.network.PhaseTapChanger;
import com.powsybl.iidm.network.Substation;
import com.powsybl.iidm.network.TopologyKind;
import com.powsybl.iidm.network.TwoWindingsTransformer;
import com.powsybl.iidm.network.VoltageLevel;
import com.powsybl.nad.NadParameters;
import com.powsybl.nad.NetworkAreaDiagram;
import com.powsybl.nad.build.iidm.VoltageLevelFilter;
import com.powsybl.nad.layout.FixedLayoutFactory;
import com.powsybl.nad.model.Point;
import com.powsybl.nad.svg.EdgeInfoEnum;
import com.powsybl.nad.svg.EdgeInfoParameters;
import com.powsybl.nad.svg.LabelProviderParameters;
import com.powsybl.nad.svg.SvgParameters;
import com.powsybl.nad.svg.iidm.DefaultLabelProvider;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.time.Duration;
import java.time.Instant;
import java.util.ArrayList;
import java.util.Collections;
import java.util.HashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.PriorityQueue;
import java.util.Random;
import java.util.Set;
import java.util.SplittableRandom;

/**
 * Generates a deterministic synthetic IIDM network and its SVG NAD for performance testing.
 */
public final class SyntheticNadGenerator {

    private static final int DEFAULT_SEED = 42;
    private static final double DEFAULT_GRID_SPACING = 220.0;
    private static final double DEFAULT_STRESS_SPACING = 520.0;
    private static final double AVERAGE_DEGREE_TOLERANCE = 0.01;
    private static final double STRESS_TRANSFORMER_RATIO = 0.3167;
    private static final double STRESS_PHASE_SHIFTER_RATIO = 0.0112;
    private static final double STRESS_HVDC_RATIO = 0.0017;
    private static final double STRESS_DISCONNECTED_SIDE_RATIO = 0.059;
    private static final double STRESS_LOOP_RATIO = 369.0 / 29_938.0;
    private static final int STRESS_REFERENCE_BRANCH_COUNT = 29_938;
    private static final int[] STRESS_PARALLEL_MULTIPLICITIES = {2, 3, 4, 5, 6, 7, 9, 10};
    private static final int[] STRESS_PARALLEL_GROUP_COUNTS = {3_428, 450, 196, 18, 40, 1, 1, 2};
    private static final int STRESS_CLUSTER_SIDE = 10;

    private SyntheticNadGenerator() {
        // Utility class.
    }

    public static void main(String[] args) {
        if (containsHelp(args)) {
            printUsage();
            return;
        }

        try {
            GenerationOptions options = parseOptions(args);
            generate(options);
        } catch (IllegalArgumentException | IOException e) {
            System.err.println("Error: " + e.getMessage());
            System.err.println();
            printUsage();
            System.exit(2);
        }
    }

    static void generate(GenerationOptions options) throws IOException {
        Path output = options.output().toAbsolutePath().normalize();
        if (output.getParent() != null) {
            Files.createDirectories(output.getParent());
        }

        int columns = (int) Math.ceil(Math.sqrt(options.voltageLevelCount()));
        Map<String, Point> positions = new HashMap<>(options.voltageLevelCount());

        System.out.printf(Locale.ROOT,
                "Generating synthetic IIDM network: %,d voltage levels, %,d branches, average degree %.4f%n",
                options.voltageLevelCount(), options.branchCount(), options.averageDegree());
        System.out.printf(Locale.ROOT, "Profile: %s | seed: %d | spacing: %.1f%n",
                options.profile().cliName, options.seed(), options.spacing());

        Instant networkStartedAt = Instant.now();
        Network network = createNetwork(options, columns, positions);
        Duration networkDuration = Duration.between(networkStartedAt, Instant.now());

        Instant svgStartedAt = Instant.now();
        NetworkAreaDiagram.draw(network, output, createNadParameters(positions), VoltageLevelFilter.NO_FILTER);
        Duration svgDuration = Duration.between(svgStartedAt, Instant.now());

        String svgFileName = output.getFileName().toString();
        Path metadata = output.resolveSibling(svgFileName.substring(0, svgFileName.length() - 4) + "_metadata.json");
        System.out.printf(Locale.ROOT, "%nSynthetic NAD generated successfully%n");
        System.out.printf(Locale.ROOT, "SVG:      %s (%,d bytes)%n", output, Files.size(output));
        System.out.printf(Locale.ROOT, "Metadata: %s (%,d bytes)%n", metadata, Files.size(metadata));
        System.out.printf(Locale.ROOT, "Network construction: %.2f s%n", networkDuration.toMillis() / 1000.0);
        System.out.printf(Locale.ROOT, "SVG generation:       %.2f s%n", svgDuration.toMillis() / 1000.0);
    }

    static Network createNetwork(GenerationOptions options, int columns, Map<String, Point> positions) {
        Network network = Network.create("synthetic-nad", "synthetic");
        Substation stressSubstation = options.profile() == GenerationProfile.STRESS
                ? network.newSubstation().setId("SYNTHETIC_SUBSTATION").add()
                : null;
        List<String> voltageLevelIds = new ArrayList<>(options.voltageLevelCount());
        List<List<String>> busIds = new ArrayList<>(options.voltageLevelCount());

        for (int index = 0; index < options.voltageLevelCount(); index++) {
            String voltageLevelId = "VL_" + index;
            VoltageLevel voltageLevel = (stressSubstation == null
                    ? network.newVoltageLevel()
                    : stressSubstation.newVoltageLevel())
                    .setId(voltageLevelId)
                    .setName("VL " + index)
                    .setNominalV(nominalVoltage(index, options.profile()))
                    .setTopologyKind(TopologyKind.BUS_BREAKER)
                    .add();
            int busCount = options.profile() == GenerationProfile.STRESS
                    ? stressBusCount(index, options.seed())
                    : 1;
            List<String> voltageLevelBusIds = new ArrayList<>(busCount);
            for (int busIndex = 0; busIndex < busCount; busIndex++) {
                String busId = "BUS_" + index + "_" + busIndex;
                voltageLevel.getBusBreakerView().newBus()
                        .setId(busId)
                        .add();
                if (options.profile() == GenerationProfile.STRESS) {
                    var load = voltageLevel.newLoad()
                            .setId("LOAD_" + index + "_" + busIndex)
                            .setConnectableBus(busId)
                            .setBus(busId)
                            .setP0(10.0 + busIndex)
                            .setQ0(3.0 + busIndex)
                            .add();
                    load.getTerminal().setP(10.0 + busIndex).setQ(3.0 + busIndex);
                }
                voltageLevelBusIds.add(busId);
            }

            voltageLevelIds.add(voltageLevelId);
            busIds.add(voltageLevelBusIds);
            positions.put(voltageLevelId, createPosition(index, columns, options));
        }

        List<Long> edges = options.profile() == GenerationProfile.STRESS
                ? createStressBranches(options.voltageLevelCount(), options.branchCount(), columns, options.seed())
                : new ArrayList<>(createEdges(
                        options.voltageLevelCount(), options.branchCount(), columns, options.seed()));
        List<BranchKind> branchKinds = createBranchKinds(options, edges);
        int lineIndex = 0;
        for (long encodedEdge : edges) {
            int node1 = firstNode(encodedEdge);
            int node2 = secondNode(encodedEdge);
            String bus1 = selectBus(busIds.get(node1), lineIndex, 1, options.seed());
            String bus2 = selectBus(busIds.get(node2), lineIndex, 2, options.seed());
            if (node1 == node2 && bus1.equals(bus2) && busIds.get(node1).size() > 1) {
                bus2 = busIds.get(node1).get((busIds.get(node1).indexOf(bus1) + 1) % busIds.get(node1).size());
            }
            boolean connected1 = isSideConnected(options, lineIndex, 1);
            boolean connected2 = isSideConnected(options, lineIndex, 2);
            createBranch(network, stressSubstation, branchKinds.get(lineIndex), lineIndex,
                    voltageLevelIds.get(node1), bus1, connected1,
                    voltageLevelIds.get(node2), bus2, connected2);
            lineIndex++;
        }
        return network;
    }

    private static Point createPosition(int index, int columns, GenerationOptions options) {
        double x = (index % columns) * options.spacing();
        double y = (index / columns) * options.spacing();
        if (options.profile() == GenerationProfile.STRESS) {
            int column = index % columns;
            int row = index / columns;
            int clusterColumn = column / STRESS_CLUSTER_SIDE;
            int clusterRow = row / STRESS_CLUSTER_SIDE;
            int clusterIndex = clusterRow * ((columns + STRESS_CLUSTER_SIDE - 1) / STRESS_CLUSTER_SIDE)
                    + clusterColumn;
            double innerSpacing = options.spacing() * 0.67;
            double clusterPitch = options.spacing() * 9.6;
            double clusterJitter = options.spacing() * 1.5;
            double nodeJitter = innerSpacing * 0.15;
            x = clusterColumn * clusterPitch
                    + (column % STRESS_CLUSTER_SIDE) * innerSpacing
                    + signedUnitDouble(mix64(options.seed() + clusterIndex * 2L)) * clusterJitter
                    + signedUnitDouble(mix64(options.seed() + index * 2L)) * nodeJitter;
            y = clusterRow * clusterPitch
                    + (row % STRESS_CLUSTER_SIDE) * innerSpacing
                    + signedUnitDouble(mix64(options.seed() + clusterIndex * 2L + 1)) * clusterJitter
                    + signedUnitDouble(mix64(options.seed() + index * 2L + 1)) * nodeJitter;
        }
        return new Point(x, y);
    }

    private static int stressBusCount(int nodeIndex, long seed) {
        double value = unitDouble(mix64(seed ^ (0x632be59bd9b4e019L * (nodeIndex + 1L))));
        if (value < 0.000055) {
            return 8;
        }
        if (value < 0.00022) {
            return 7;
        }
        if (value < 0.00088) {
            return 6;
        }
        if (value < 0.00176) {
            return 5;
        }
        if (value < 0.0049) {
            return 4;
        }
        if (value < 0.0152) {
            return 3;
        }
        if (value < 0.0906) {
            return 2;
        }
        return 1;
    }

    private static String selectBus(List<String> busIds, int edgeIndex, int side, long seed) {
        long hash = mix64(seed + 31L * edgeIndex + side * 0x9e3779b97f4a7c15L);
        return busIds.get((int) Long.remainderUnsigned(hash, busIds.size()));
    }

    private static boolean isSideConnected(GenerationOptions options, int edgeIndex, int side) {
        if (options.profile() != GenerationProfile.STRESS) {
            return true;
        }
        long hash = mix64(options.seed() ^ (edgeIndex * 2L + side) * 0xd6e8feb86659fd93L);
        return unitDouble(hash) >= STRESS_DISCONNECTED_SIDE_RATIO;
    }

    private static List<BranchKind> createBranchKinds(GenerationOptions options, List<Long> edges) {
        List<BranchKind> branchKinds = new ArrayList<>(Collections.nCopies(options.branchCount(), BranchKind.LINE));
        if (options.profile() != GenerationProfile.STRESS) {
            return branchKinds;
        }

        int transformerCount = (int) Math.round(options.branchCount() * STRESS_TRANSFORMER_RATIO);
        int phaseShifterCount = Math.min(transformerCount,
                (int) Math.round(options.branchCount() * STRESS_PHASE_SHIFTER_RATIO));
        int hvdcCount = Math.min(options.branchCount() - transformerCount,
                (int) Math.round(options.branchCount() * STRESS_HVDC_RATIO));
        for (int index = 0; index < transformerCount - phaseShifterCount; index++) {
            branchKinds.set(index, BranchKind.TRANSFORMER);
        }
        for (int index = transformerCount - phaseShifterCount; index < transformerCount; index++) {
            branchKinds.set(index, BranchKind.PHASE_SHIFTER);
        }
        for (int index = transformerCount; index < transformerCount + hvdcCount; index++) {
            branchKinds.set(index, BranchKind.HVDC);
        }
        Collections.shuffle(branchKinds, new Random(options.seed() ^ 0x5deece66dL));
        int nextLine = 0;
        for (int index = 0; index < edges.size(); index++) {
            if (firstNode(edges.get(index)) != secondNode(edges.get(index))
                    || branchKinds.get(index) == BranchKind.LINE) {
                continue;
            }
            while (nextLine < edges.size()
                    && (branchKinds.get(nextLine) != BranchKind.LINE
                    || firstNode(edges.get(nextLine)) == secondNode(edges.get(nextLine)))) {
                nextLine++;
            }
            if (nextLine == edges.size()) {
                throw new IllegalStateException("The stress profile requires more line branches for its loops");
            }
            BranchKind loopKind = branchKinds.get(index);
            branchKinds.set(index, BranchKind.LINE);
            branchKinds.set(nextLine, loopKind);
            nextLine++;
        }
        return branchKinds;
    }

    private static void createBranch(Network network, Substation substation, BranchKind kind, int index,
                                     String voltageLevel1, String bus1, boolean connected1,
                                     String voltageLevel2, String bus2, boolean connected2) {
        double activePower = 50.0 + index % 200;
        double reactivePower = 10.0 + index % 50;
        if (kind == BranchKind.LINE) {
            var adder = network.newLine()
                    .setId("LINE_" + index)
                    .setName("L " + index)
                    .setVoltageLevel1(voltageLevel1)
                    .setConnectableBus1(bus1)
                    .setVoltageLevel2(voltageLevel2)
                    .setConnectableBus2(bus2)
                    .setR(3.0)
                    .setX(30.0)
                    .setG1(0.0)
                    .setB1(0.0)
                    .setG2(0.0)
                    .setB2(0.0);
            if (connected1) {
                adder.setBus1(bus1);
            }
            if (connected2) {
                adder.setBus2(bus2);
            }
            Line line = adder.add();
            line.getTerminal1().setP(activePower).setQ(reactivePower);
            line.getTerminal2().setP(-activePower).setQ(-reactivePower);
        } else if (kind == BranchKind.HVDC) {
            createHvdcBranch(network, index, voltageLevel1, bus1, connected1,
                    voltageLevel2, bus2, connected2, activePower, reactivePower);
        } else {
            var adder = substation.newTwoWindingsTransformer()
                    .setId("TWT_" + index)
                    .setName("T " + index)
                    .setVoltageLevel1(voltageLevel1)
                    .setConnectableBus1(bus1)
                    .setVoltageLevel2(voltageLevel2)
                    .setConnectableBus2(bus2)
                    .setRatedU1(network.getVoltageLevel(voltageLevel1).getNominalV())
                    .setRatedU2(network.getVoltageLevel(voltageLevel2).getNominalV())
                    .setR(2.0)
                    .setX(100.0)
                    .setG(0.0)
                    .setB(0.0);
            if (connected1) {
                adder.setBus1(bus1);
            }
            if (connected2) {
                adder.setBus2(bus2);
            }
            TwoWindingsTransformer transformer = adder.add();
            transformer.getTerminal1().setP(activePower).setQ(reactivePower);
            transformer.getTerminal2().setP(-activePower).setQ(-reactivePower);
            if (kind == BranchKind.PHASE_SHIFTER) {
                addPhaseTapChanger(transformer);
            }
        }
    }

    private static void createHvdcBranch(Network network, int index,
                                         String voltageLevel1, String bus1, boolean connected1,
                                         String voltageLevel2, String bus2, boolean connected2,
                                         double activePower, double reactivePower) {
        String converter1Id = "VSC_" + index + "_1";
        String converter2Id = "VSC_" + index + "_2";
        var converter1Adder = network.getVoltageLevel(voltageLevel1).newVscConverterStation()
                .setId(converter1Id)
                .setConnectableBus(bus1)
                .setLossFactor(1.0f)
                .setVoltageSetpoint(network.getVoltageLevel(voltageLevel1).getNominalV())
                .setVoltageRegulatorOn(true);
        if (connected1) {
            converter1Adder.setBus(bus1);
        }
        var converter1 = converter1Adder.add();
        converter1.getTerminal().setP(activePower).setQ(reactivePower);

        var converter2Adder = network.getVoltageLevel(voltageLevel2).newVscConverterStation()
                .setId(converter2Id)
                .setConnectableBus(bus2)
                .setLossFactor(1.0f)
                .setReactivePowerSetpoint(reactivePower)
                .setVoltageRegulatorOn(false);
        if (connected2) {
            converter2Adder.setBus(bus2);
        }
        var converter2 = converter2Adder.add();
        converter2.getTerminal().setP(-activePower).setQ(-reactivePower);

        network.newHvdcLine()
                .setId("HVDC_" + index)
                .setName("H " + index)
                .setConverterStationId1(converter1Id)
                .setConverterStationId2(converter2Id)
                .setR(1.0)
                .setNominalV(400.0)
                .setConvertersMode(com.powsybl.iidm.network.HvdcLine.ConvertersMode.SIDE_1_INVERTER_SIDE_2_RECTIFIER)
                .setMaxP(500.0)
                .setActivePowerSetpoint(activePower)
                .add();
    }

    private static void addPhaseTapChanger(TwoWindingsTransformer transformer) {
        transformer.newPhaseTapChanger()
                .setTapPosition(1)
                .setRegulationTerminal(transformer.getTerminal2())
                .setRegulationMode(PhaseTapChanger.RegulationMode.CURRENT_LIMITER)
                .setRegulationValue(200.0)
                .beginStep().setAlpha(-20.0).setRho(1.0).setR(0.0).setX(0.0).setG(0.0).setB(0.0).endStep()
                .beginStep().setAlpha(0.0).setRho(1.0).setR(0.0).setX(0.0).setG(0.0).setB(0.0).endStep()
                .beginStep().setAlpha(20.0).setRho(1.0).setR(0.0).setX(0.0).setG(0.0).setB(0.0).endStep()
                .add();
    }

    static Set<Long> createEdges(int nodeCount, int edgeCount, int columns, long seed) {
        Set<Long> edges = new LinkedHashSet<>(capacityFor(edgeCount));

        // Connect every row from left to right.
        for (int node = 1; node < nodeCount && edges.size() < edgeCount; node++) {
            if (node % columns != 0) {
                edges.add(encodeEdge(node - 1, node));
            }
        }
        // Connect the rows together through their first node. With at least N-1
        // branches, the generated graph is therefore connected.
        int rowCount = (nodeCount + columns - 1) / columns;
        for (int row = 1; row < rowCount && edges.size() < edgeCount; row++) {
            edges.add(encodeEdge((row - 1) * columns, row * columns));
        }

        // Prefer short vertical branches before adding arbitrary chords.
        List<Long> localCandidates = new ArrayList<>(Math.max(0, nodeCount - columns));
        for (int node = 0; node + columns < nodeCount; node++) {
            if (node % columns != 0) {
                localCandidates.add(encodeEdge(node, node + columns));
            }
        }
        Collections.shuffle(localCandidates, new Random(seed));
        for (long candidate : localCandidates) {
            if (edges.size() == edgeCount) {
                break;
            }
            edges.add(candidate);
        }

        SplittableRandom random = new SplittableRandom(seed);
        long rejectedCandidates = 0;
        long rejectionLimit = Math.max(10_000L, nodeCount * 20L);
        while (edges.size() < edgeCount && rejectedCandidates < rejectionLimit) {
            int node1 = random.nextInt(nodeCount);
            int node2 = random.nextInt(nodeCount - 1);
            if (node2 >= node1) {
                node2++;
            }
            if (edges.add(encodeEdge(node1, node2))) {
                rejectedCandidates = 0;
            } else {
                rejectedCandidates++;
            }
        }

        // Dense graphs cause many random collisions. Complete deterministically
        // in that uncommon case so every valid requested branch count is supported.
        for (int node1 = 0; edges.size() < edgeCount && node1 < nodeCount; node1++) {
            for (int node2 = node1 + 1; edges.size() < edgeCount && node2 < nodeCount; node2++) {
                edges.add(encodeEdge(node1, node2));
            }
        }
        return edges;
    }

    static Set<Long> createStressEdges(int nodeCount, int edgeCount, int columns, long seed) {
        return createStressEdges(nodeCount, edgeCount, columns, seed, 31);
    }

    private static Set<Long> createStressEdges(int nodeCount, int edgeCount, int columns, long seed,
                                               int minimumMaximumDegree) {
        if (edgeCount == 0) {
            return Collections.emptySet();
        }
        for (int attempt = 0; attempt < 20; attempt++) {
            SplittableRandom random = new SplittableRandom(seed + attempt * 0x9e3779b97f4a7c15L);
            int[] degrees = createStressDegrees(nodeCount, edgeCount, minimumMaximumDegree, random);
            Set<Long> edges = wireStressEdges(degrees, edgeCount, columns, random);
            if (edges != null) {
                return edges;
            }
        }
        throw new IllegalStateException("Unable to create the requested stress topology");
    }

    static List<Long> createStressBranches(int nodeCount, int branchCount, int columns, long seed) {
        if (branchCount == 0) {
            return Collections.emptyList();
        }

        List<Integer> loopCandidates = new ArrayList<>();
        for (int node = 0; node < nodeCount; node++) {
            if (stressBusCount(node, seed) > 1) {
                loopCandidates.add(node);
            }
        }
        Collections.shuffle(loopCandidates, new Random(seed ^ 0x243f6a8885a308d3L));
        int loopCount = Math.min(loopCandidates.size(), (int) Math.round(branchCount * STRESS_LOOP_RATIO));

        int[] groupCounts = new int[STRESS_PARALLEL_GROUP_COUNTS.length];
        int groupedBranchCount = 0;
        int groupedPairCount = 0;
        for (int index = 0; index < groupCounts.length; index++) {
            groupCounts[index] = (int) Math.round((double) branchCount
                    * STRESS_PARALLEL_GROUP_COUNTS[index] / STRESS_REFERENCE_BRANCH_COUNT);
            groupedBranchCount += groupCounts[index] * STRESS_PARALLEL_MULTIPLICITIES[index];
            groupedPairCount += groupCounts[index];
        }
        int singleBranchCount = branchCount - loopCount - groupedBranchCount;
        if (singleBranchCount < 0) {
            throw new IllegalArgumentException("The branch count is too small for the stress profile ratios");
        }

        int uniquePairCount = singleBranchCount + groupedPairCount;
        List<Long> uniquePairs = new ArrayList<>(createStressEdges(
                nodeCount, uniquePairCount, columns, seed, 20));
        Collections.shuffle(uniquePairs, new Random(seed ^ 0x13198a2e03707344L));
        List<Long> branches = new ArrayList<>(branchCount);
        int pairIndex = 0;
        for (; pairIndex < singleBranchCount; pairIndex++) {
            branches.add(uniquePairs.get(pairIndex));
        }
        for (int groupIndex = 0; groupIndex < groupCounts.length; groupIndex++) {
            int multiplicity = STRESS_PARALLEL_MULTIPLICITIES[groupIndex];
            for (int group = 0; group < groupCounts[groupIndex]; group++) {
                long pair = uniquePairs.get(pairIndex++);
                for (int occurrence = 0; occurrence < multiplicity; occurrence++) {
                    branches.add(pair);
                }
            }
        }
        for (int index = 0; index < loopCount; index++) {
            int node = loopCandidates.get(index);
            branches.add(encodeEdge(node, node));
        }
        Collections.shuffle(branches, new Random(seed ^ 0xa4093822299f31d0L));
        return branches;
    }

    private static int[] createStressDegrees(int nodeCount, int edgeCount, int minimumMaximumDegree,
                                             SplittableRandom random) {
        int[] degrees = new int[nodeCount];
        long requiredDegreeSum = edgeCount * 2L;
        double averageDegree = (double) requiredDegreeSum / nodeCount;
        int maximumDegree = Math.min(nodeCount - 1,
                Math.max(minimumMaximumDegree, (int) Math.ceil(averageDegree * 4.0)));
        double continuationProbability = averageDegree / (averageDegree + 1.0);
        long degreeSum = 0;
        for (int node = 0; node < nodeCount; node++) {
            int degree = continuationProbability == 0
                    ? 0
                    : (int) Math.floor(Math.log1p(-random.nextDouble()) / Math.log(continuationProbability));
            degrees[node] = Math.min(degree, maximumDegree);
            degreeSum += degrees[node];
        }

        while (degreeSum < requiredDegreeSum) {
            int node = random.nextInt(nodeCount);
            if (degrees[node] < maximumDegree) {
                degrees[node]++;
                degreeSum++;
            }
        }
        while (degreeSum > requiredDegreeSum) {
            int node = random.nextInt(nodeCount);
            if (degrees[node] > 0) {
                degrees[node]--;
                degreeSum--;
            }
        }
        return degrees;
    }

    private static Set<Long> wireStressEdges(int[] degrees, int edgeCount, int columns,
                                             SplittableRandom random) {
        int[] remainingDegrees = degrees.clone();
        PriorityQueue<DegreeEntry> queue = new PriorityQueue<>((left, right) -> {
            int degreeComparison = Integer.compare(right.degree(), left.degree());
            return degreeComparison != 0 ? degreeComparison : Integer.compare(left.node(), right.node());
        });
        for (int node = 0; node < remainingDegrees.length; node++) {
            if (remainingDegrees[node] > 0) {
                queue.add(new DegreeEntry(node, remainingDegrees[node]));
            }
        }

        Set<Long> edges = new LinkedHashSet<>(capacityFor(edgeCount));
        while (edges.size() < edgeCount) {
            int node1 = pollNode(queue, remainingDegrees);
            if (node1 < 0) {
                return null;
            }
            int node2 = findStressNeighbour(node1, remainingDegrees, columns, edges, random);
            if (node2 < 0) {
                return null;
            }

            edges.add(encodeEdge(node1, node2));
            remainingDegrees[node1]--;
            remainingDegrees[node2]--;
            if (remainingDegrees[node1] > 0) {
                queue.add(new DegreeEntry(node1, remainingDegrees[node1]));
            }
            if (remainingDegrees[node2] > 0) {
                queue.add(new DegreeEntry(node2, remainingDegrees[node2]));
            }
        }
        return edges;
    }

    private static int findStressNeighbour(int node, int[] remainingDegrees, int columns, Set<Long> edges,
                                           SplittableRandom random) {
        int row = node / columns;
        int column = node % columns;
        int rowCount = (remainingDegrees.length + columns - 1) / columns;
        for (int attempt = 0; attempt < 160; attempt++) {
            int radius = Math.min(16,
                    1 + (int) Math.floor(Math.log1p(-random.nextDouble()) / Math.log(0.25)));
            double angle = random.nextDouble(2.0 * Math.PI);
            int deltaColumn = (int) Math.round(radius * Math.cos(angle));
            int deltaRow = (int) Math.round(radius * Math.sin(angle));
            if (deltaColumn == 0 && deltaRow == 0) {
                continue;
            }
            int candidateColumn = column + deltaColumn;
            int candidateRow = row + deltaRow;
            if (candidateColumn < 0 || candidateColumn >= columns || candidateRow < 0 || candidateRow >= rowCount) {
                continue;
            }
            int candidate = candidateRow * columns + candidateColumn;
            if (!sameStressCluster(node, candidate, columns) && random.nextDouble() >= 0.15) {
                continue;
            }
            if (isAvailableNeighbour(node, candidate, remainingDegrees, edges)) {
                return candidate;
            }
        }

        int nearestCandidate = -1;
        int nearestDistanceSquared = Integer.MAX_VALUE;
        for (int candidate = 0; candidate < remainingDegrees.length; candidate++) {
            if (!isAvailableNeighbour(node, candidate, remainingDegrees, edges)) {
                continue;
            }
            int deltaColumn = stressLayoutCoordinate(candidate % columns) - stressLayoutCoordinate(column);
            int deltaRow = stressLayoutCoordinate(candidate / columns) - stressLayoutCoordinate(row);
            int distanceSquared = deltaColumn * deltaColumn + deltaRow * deltaRow;
            if (distanceSquared < nearestDistanceSquared) {
                nearestCandidate = candidate;
                nearestDistanceSquared = distanceSquared;
            }
        }
        return nearestCandidate;
    }

    private static boolean sameStressCluster(int node1, int node2, int columns) {
        return node1 % columns / STRESS_CLUSTER_SIDE == node2 % columns / STRESS_CLUSTER_SIDE
                && node1 / columns / STRESS_CLUSTER_SIDE == node2 / columns / STRESS_CLUSTER_SIDE;
    }

    private static int stressLayoutCoordinate(int coordinate) {
        return coordinate / STRESS_CLUSTER_SIDE * 14 + coordinate % STRESS_CLUSTER_SIDE;
    }

    private static boolean isAvailableNeighbour(int node, int candidate, int[] remainingDegrees, Set<Long> edges) {
        return candidate != node
                && candidate >= 0
                && candidate < remainingDegrees.length
                && remainingDegrees[candidate] > 0
                && !edges.contains(encodeEdge(node, candidate));
    }

    private static int pollNode(PriorityQueue<DegreeEntry> queue, int[] remainingDegrees) {
        DegreeEntry entry = pollEntry(queue, remainingDegrees);
        return entry == null ? -1 : entry.node();
    }

    private static DegreeEntry pollEntry(PriorityQueue<DegreeEntry> queue, int[] remainingDegrees) {
        while (!queue.isEmpty()) {
            DegreeEntry entry = queue.poll();
            if (remainingDegrees[entry.node()] == entry.degree() && entry.degree() > 0) {
                return entry;
            }
        }
        return null;
    }

    static GenerationOptions parseOptions(String[] args) {
        Map<String, String> values = parseArguments(args);
        int voltageLevelCount = parsePositiveInt(values, "--voltage-levels");
        Integer requestedBranchCount = parseOptionalNonNegativeInt(values, "--branches");
        Double requestedAverageDegree = parseOptionalNonNegativeDouble(values, "--average-degree");
        if (requestedBranchCount == null && requestedAverageDegree == null) {
            throw new IllegalArgumentException("Either --branches or --average-degree must be provided");
        }

        int branchCount = resolveBranchCount(voltageLevelCount, requestedBranchCount, requestedAverageDegree);
        GenerationProfile profile = GenerationProfile.parse(values.getOrDefault("--profile", "grid"));
        long seed = parseOptionalLong(values, "--seed", DEFAULT_SEED);
        double defaultSpacing = profile == GenerationProfile.STRESS ? DEFAULT_STRESS_SPACING : DEFAULT_GRID_SPACING;
        double spacing = parseOptionalPositiveDouble(values, "--spacing", defaultSpacing);
        String outputValue = requiredValue(values, "--output");
        Path output = Path.of(outputValue);
        if (!output.getFileName().toString().toLowerCase(Locale.ROOT).endsWith(".svg")) {
            throw new IllegalArgumentException("--output must reference an .svg file");
        }
        return new GenerationOptions(voltageLevelCount, branchCount, 2.0 * branchCount / voltageLevelCount,
                profile, seed, spacing, output);
    }

    static int resolveBranchCount(int voltageLevelCount, Integer requestedBranchCount, Double requestedAverageDegree) {
        long maximumBranchCount = (long) voltageLevelCount * (voltageLevelCount - 1) / 2;
        long branchCount = requestedBranchCount != null
                ? requestedBranchCount
                : Math.round(requestedAverageDegree * voltageLevelCount / 2.0);
        if (branchCount > maximumBranchCount) {
            throw new IllegalArgumentException("The requested density requires " + branchCount
                    + " branches, but a simple graph with " + voltageLevelCount
                    + " voltage levels supports at most " + maximumBranchCount);
        }
        if (branchCount > Integer.MAX_VALUE) {
            throw new IllegalArgumentException("The requested branch count exceeds the generator limit of "
                    + Integer.MAX_VALUE);
        }

        double actualAverageDegree = 2.0 * branchCount / voltageLevelCount;
        if (requestedBranchCount != null && requestedAverageDegree != null
                && Math.abs(actualAverageDegree - requestedAverageDegree) > AVERAGE_DEGREE_TOLERANCE) {
            throw new IllegalArgumentException(String.format(Locale.ROOT,
                    "--branches %,d implies an average degree of %.4f, inconsistent with --average-degree %.4f",
                    branchCount, actualAverageDegree, requestedAverageDegree));
        }
        return (int) branchCount;
    }

    private static NadParameters createNadParameters(Map<String, Point> positions) {
        SvgParameters svgParameters = new SvgParameters()
                .setCssLocation(SvgParameters.CssLocation.EXTERNAL_NO_IMPORT)
                .setSvgWidthAndHeightAdded(true);
        EdgeInfoParameters edgeInfoParameters = new EdgeInfoParameters(
                EdgeInfoEnum.ACTIVE_POWER,
                EdgeInfoEnum.NAME,
                EdgeInfoEnum.REACTIVE_POWER,
                EdgeInfoEnum.EMPTY);
        LabelProviderParameters labelProviderParameters = new LabelProviderParameters();
        labelProviderParameters.setEdgeInfoParameters(edgeInfoParameters);
        return new NadParameters()
                .setSvgParameters(svgParameters)
                .setLayoutFactory(new FixedLayoutFactory(positions))
                .setLabelProviderFactory((network, parameters) -> new DefaultLabelProvider(
                        network, parameters.createValueFormatter(), labelProviderParameters));
    }

    private static Map<String, String> parseArguments(String[] args) {
        Map<String, String> values = new HashMap<>();
        Set<String> supportedOptions = Set.of(
                "--voltage-levels", "--branches", "--average-degree", "--profile", "--output", "--seed",
                "--spacing");
        for (int index = 0; index < args.length; index += 2) {
            String option = args[index];
            if (!supportedOptions.contains(option)) {
                throw new IllegalArgumentException("Unknown option: " + option);
            }
            if (index + 1 >= args.length) {
                throw new IllegalArgumentException("Missing value for " + option);
            }
            if (values.put(option, args[index + 1]) != null) {
                throw new IllegalArgumentException("Duplicate option: " + option);
            }
        }
        return values;
    }

    private static int parsePositiveInt(Map<String, String> values, String option) {
        int value = parseInt(requiredValue(values, option), option);
        if (value <= 0) {
            throw new IllegalArgumentException(option + " must be greater than zero");
        }
        return value;
    }

    private static Integer parseOptionalNonNegativeInt(Map<String, String> values, String option) {
        String rawValue = values.get(option);
        if (rawValue == null) {
            return null;
        }
        int value = parseInt(rawValue, option);
        if (value < 0) {
            throw new IllegalArgumentException(option + " must be zero or greater");
        }
        return value;
    }

    private static Double parseOptionalNonNegativeDouble(Map<String, String> values, String option) {
        String rawValue = values.get(option);
        if (rawValue == null) {
            return null;
        }
        double value = parseDouble(rawValue, option);
        if (value < 0 || !Double.isFinite(value)) {
            throw new IllegalArgumentException(option + " must be a finite number equal to or greater than zero");
        }
        return value;
    }

    private static double parseOptionalPositiveDouble(Map<String, String> values, String option, double defaultValue) {
        String rawValue = values.get(option);
        if (rawValue == null) {
            return defaultValue;
        }
        double value = parseDouble(rawValue, option);
        if (value <= 0 || !Double.isFinite(value)) {
            throw new IllegalArgumentException(option + " must be a finite number greater than zero");
        }
        return value;
    }

    private static long parseOptionalLong(Map<String, String> values, String option, long defaultValue) {
        String rawValue = values.get(option);
        if (rawValue == null) {
            return defaultValue;
        }
        try {
            return Long.parseLong(rawValue);
        } catch (NumberFormatException e) {
            throw new IllegalArgumentException(option + " must be an integer", e);
        }
    }

    private static int parseInt(String rawValue, String option) {
        try {
            return Integer.parseInt(rawValue);
        } catch (NumberFormatException e) {
            throw new IllegalArgumentException(option + " must be an integer", e);
        }
    }

    private static double parseDouble(String rawValue, String option) {
        try {
            return Double.parseDouble(rawValue);
        } catch (NumberFormatException e) {
            throw new IllegalArgumentException(option + " must be a number", e);
        }
    }

    private static String requiredValue(Map<String, String> values, String option) {
        String value = values.get(option);
        if (value == null || value.isBlank()) {
            throw new IllegalArgumentException("Missing required option " + option);
        }
        return value;
    }

    private static int capacityFor(int edgeCount) {
        return edgeCount < 3 ? edgeCount + 1 : (int) Math.min(Integer.MAX_VALUE - 8L, edgeCount * 4L / 3L + 1L);
    }

    private static long encodeEdge(int node1, int node2) {
        int first = Math.min(node1, node2);
        int second = Math.max(node1, node2);
        return ((long) first << 32) | (second & 0xffffffffL);
    }

    private static int firstNode(long edge) {
        return (int) (edge >>> 32);
    }

    private static int secondNode(long edge) {
        return (int) edge;
    }

    private static double nominalVoltage(int index, GenerationProfile profile) {
        int bucket = Math.floorMod(index * 37, 10_000);
        if (profile == GenerationProfile.STRESS) {
            if (bucket < 1_117) {
                return 20.0;
            } else if (bucket < 1_580) {
                return 45.0;
            } else if (bucket < 3_453) {
                return 63.0;
            } else if (bucket < 5_261) {
                return 90.0;
            } else if (bucket < 6_082) {
                return 150.0;
            } else if (bucket < 8_063) {
                return 225.0;
            }
            return 400.0;
        }
        bucket /= 10;
        if (bucket < 546) {
            return 63.0;
        } else if (bucket < 739) {
            return 90.0;
        } else if (bucket < 914) {
            return 225.0;
        } else if (bucket < 958) {
            return 400.0;
        } else if (bucket < 977) {
            return 20.0;
        } else if (bucket < 989) {
            return 45.0;
        }
        return 150.0;
    }

    private static long mix64(long value) {
        long firstMix = (value ^ (value >>> 30)) * 0xbf58476d1ce4e5b9L;
        long secondMix = (firstMix ^ (firstMix >>> 27)) * 0x94d049bb133111ebL;
        return secondMix ^ (secondMix >>> 31);
    }

    private static double unitDouble(long value) {
        return (value >>> 11) * 0x1.0p-53;
    }

    private static double signedUnitDouble(long value) {
        return unitDouble(value) * 2.0 - 1.0;
    }

    private static boolean containsHelp(String[] args) {
        for (String arg : args) {
            if ("--help".equals(arg) || "-h".equals(arg)) {
                return true;
            }
        }
        return false;
    }

    private static void printUsage() {
        System.out.println("""
                Generate a deterministic synthetic IIDM network and its SVG NAD.

                Usage:
                  mvn compile exec:java -Dexec.args="\
                    --voltage-levels <count> \
                    [--branches <count>] \
                    [--average-degree <degree>] \
                    [--profile <grid|stress>] \
                    --output <file.svg> \
                    [--seed <integer>] \
                    [--spacing <number>]"

                Required:
                  --voltage-levels   Number of voltage-level nodes to generate.
                  --output           Destination SVG. The metadata JSON is written next to it.

                Density:
                  At least one of --branches or --average-degree is required.
                  When both are provided they must satisfy average-degree = 2 * branches / voltage-levels.

                Defaults:
                  --profile          grid; use stress to reproduce production-like SVG complexity
                  --seed             42
                  --spacing          220 for grid, 520 for stress
                """);
    }

    enum GenerationProfile {
        GRID("grid"),
        STRESS("stress");

        private final String cliName;

        GenerationProfile(String cliName) {
            this.cliName = cliName;
        }

        private static GenerationProfile parse(String value) {
            for (GenerationProfile profile : values()) {
                if (profile.cliName.equalsIgnoreCase(value)) {
                    return profile;
                }
            }
            throw new IllegalArgumentException("--profile must be either grid or stress");
        }
    }

    private enum BranchKind {
        LINE,
        TRANSFORMER,
        PHASE_SHIFTER,
        HVDC
    }

    private record DegreeEntry(int node, int degree) {
    }

    record GenerationOptions(
            int voltageLevelCount,
            int branchCount,
            double averageDegree,
            GenerationProfile profile,
            long seed,
            double spacing,
            Path output) {
    }
}
