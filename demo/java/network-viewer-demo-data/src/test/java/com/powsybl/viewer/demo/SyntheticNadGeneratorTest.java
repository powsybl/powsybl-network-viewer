/*
 * Copyright (c) 2026, RTE (http://www.rte-france.com)
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 * SPDX-License-Identifier: MPL-2.0
 */
package com.powsybl.viewer.demo;

import com.powsybl.iidm.network.Network;
import com.powsybl.nad.model.Point;
import org.junit.jupiter.api.Test;

import java.nio.file.Path;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;

class SyntheticNadGeneratorTest {

    @Test
    void shouldParseConsistentDensityParameters() {
        SyntheticNadGenerator.GenerationOptions options = SyntheticNadGenerator.parseOptions(new String[]{
            "--voltage-levels", "100",
            "--branches", "160",
            "--average-degree", "3.2",
            "--output", "synthetic.svg"
        });

        assertEquals(100, options.voltageLevelCount());
        assertEquals(160, options.branchCount());
        assertEquals(3.2, options.averageDegree());
        assertEquals(SyntheticNadGenerator.GenerationProfile.GRID, options.profile());
        assertEquals(220.0, options.spacing());
        assertEquals(Path.of("synthetic.svg"), options.output());
    }

    @Test
    void shouldDeriveBranchCountFromAverageDegree() {
        SyntheticNadGenerator.GenerationOptions options = SyntheticNadGenerator.parseOptions(new String[]{
            "--voltage-levels", "100",
            "--average-degree", "3.2",
            "--output", "synthetic.svg"
        });

        assertEquals(160, options.branchCount());
    }

    @Test
    void shouldRejectInconsistentDensityParameters() {
        String[] args = {
            "--voltage-levels", "100",
            "--branches", "160",
            "--average-degree", "4.0",
            "--output", "synthetic.svg"
        };

        assertThrows(IllegalArgumentException.class, () -> SyntheticNadGenerator.parseOptions(args));
    }

    @Test
    void shouldParseStressProfileDefaults() {
        SyntheticNadGenerator.GenerationOptions options = SyntheticNadGenerator.parseOptions(new String[]{
            "--voltage-levels", "100",
            "--branches", "160",
            "--profile", "stress",
            "--output", "synthetic.svg"
        });

        assertEquals(SyntheticNadGenerator.GenerationProfile.STRESS, options.profile());
        assertEquals(520.0, options.spacing());
    }

    @Test
    void shouldCreateTheExactRequestedTopology() {
        Set<Long> firstRun = SyntheticNadGenerator.createEdges(100, 160, 10, 42);
        Set<Long> secondRun = SyntheticNadGenerator.createEdges(100, 160, 10, 42);

        assertEquals(160, firstRun.size());
        assertEquals(firstRun, secondRun);

        SyntheticNadGenerator.GenerationOptions options = new SyntheticNadGenerator.GenerationOptions(
                100, 160, 3.2, SyntheticNadGenerator.GenerationProfile.GRID,
                42, 220.0, Path.of("synthetic.svg"));
        Map<String, Point> positions = new HashMap<>();
        Network network = SyntheticNadGenerator.createNetwork(options, 10, positions);

        assertEquals(100, network.getVoltageLevelStream().count());
        assertEquals(160, network.getLineStream().count());
        assertEquals(100, positions.size());
    }

    @Test
    void shouldCreateDeterministicStressTopologyAndEquipmentMix() {
        Set<Long> firstRun = SyntheticNadGenerator.createStressEdges(1_000, 1_635, 32, 42);
        Set<Long> secondRun = SyntheticNadGenerator.createStressEdges(1_000, 1_635, 32, 42);

        assertEquals(1_635, firstRun.size());
        assertEquals(firstRun, secondRun);

        List<Long> firstBranches = SyntheticNadGenerator.createStressBranches(1_000, 1_635, 32, 42);
        List<Long> secondBranches = SyntheticNadGenerator.createStressBranches(1_000, 1_635, 32, 42);
        assertEquals(1_635, firstBranches.size());
        assertEquals(firstBranches, secondBranches);
        assertEquals(20, firstBranches.stream()
                .filter(edge -> (int) (edge >>> 32) == (int) (long) edge)
                .count());
        assertEquals(284, firstBranches.size() - Set.copyOf(firstBranches).size());

        SyntheticNadGenerator.GenerationOptions options = new SyntheticNadGenerator.GenerationOptions(
                1_000, 1_635, 3.27, SyntheticNadGenerator.GenerationProfile.STRESS,
                42, 520.0, Path.of("synthetic-stress.svg"));
        Map<String, Point> positions = new HashMap<>();
        Network network = SyntheticNadGenerator.createNetwork(options, 32, positions);

        assertEquals(1_000, network.getVoltageLevelStream().count());
        assertEquals(1_114, network.getLineStream().count());
        assertEquals(518, network.getTwoWindingsTransformerStream().count());
        assertEquals(3, network.getHvdcLineStream().count());
        assertEquals(18, network.getTwoWindingsTransformerStream()
                .filter(transformer -> transformer.getPhaseTapChanger() != null)
                .count());
        assertEquals(1_000, positions.size());
    }
}
