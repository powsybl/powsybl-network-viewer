# Synthetic NAD generator

This module can generate a deterministic synthetic IIDM network and its SVG Network Area Diagram for performance
testing.

From this directory, generate a network with the given dimensions and a production-like stress profile with:

```bash
MAVEN_OPTS="-Xmx8g" mvn compile exec:java \
  -Dexec.args="--voltage-levels 20000 --branches 40000 \
  --profile stress \
  --output ../../src/diagram-viewers/data/synthetic-grid-vl20k-b40k.svg"
```

`--branches` and `--average-degree` describe the same density through
`average degree = 2 * branches / voltage levels`. At least one is required; when both are supplied, the generator
checks that they are consistent. If only the average degree is supplied, the branch count is rounded to the nearest
integer.

Optional parameters:

- `--profile`: `grid` by default, or `stress` for a production-like rendering workload.
- `--seed`: topology seed, default `42`.
- `--spacing`: base distance between nodes, default `220` for `grid` and `520` for `stress`.

The `grid` profile is deliberately regular: one bus per voltage level, line branches only, a maximum degree close to
the average degree, and short edges. It is useful as a stable baseline, but it is much easier for the SVG renderer
than a real transmission network of the same size.

The `stress` profile remains fully procedural and deterministic. It adds the structural characteristics that affect
SVG interaction performance:

- a heavy-tailed degree distribution with low-degree nodes and hubs;
- a clustered layout and local branches with a broad length distribution;
- multiple buses on some voltage levels and disconnected branch sides;
- parallel circuits and loops, which produce bent polylines and curved SVG paths;
- a production-like nominal-voltage distribution;
- a mix of lines, two-winding transformers, phase-shifting transformers, and HVDC lines.

It uses only aggregate ratios and the requested seed; it does not copy identifiers, coordinates, topology, or any
other source-network data.

The command writes both `synthetic-grid-vl20k-b40k.svg` and `synthetic-grid-vl20k-b40k_metadata.json`. Run the SVG performance
benchmark from the repository root with:

```bash
NAD_SVG=demo/src/diagram-viewers/data/synthetic-grid-vl20k-b40k.svg \
  npm run test:browser:performance -- --browser.headless=false
```
