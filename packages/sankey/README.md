# powsybl-network-viewer - Sankey

**@powsybl/sankey** is a TypeScript/SVG renderer and viewer for Sankey diagrams of DC power-flow data. It is a port of the [SankeyPF.jl](https://github.com/CRESYM/sankeypf) Julia package, designed to be embedded in a web application.

It takes a network scenario (buses with voltage angles, branches with flows and thermal limits) and produces a force-laid-out Sankey diagram in an SVG element.

## Features

- Visualization of DC power flows
- One axis maps bus voltage angles; the other uses a force-based layout (attractive + repulsive forces)
- Switchable orientation: vertical (voltage angles on the Y-axis) or horizontal (voltage angles on the X-axis)
- Band width proportional to branch flow magnitude
- Branch colors by loading ratio: green (0-80 %), yellow (80-100 %), red (> 100 %)
- Scenario switching with animated transitions
- Pan + zoom

## Usage

```typescript
import { SankeyRenderer } from '@powsybl/sankey';

const container = document.getElementById('sankey-container')!;

// scenario shape:
// { buses: { id: string, voltage_angle: number }[],
//   branches: { from_bus: string, to_bus: string, flow: number, p_max: number, id?: string }[] }
const renderer = new SankeyRenderer(container, scenario);
renderer.startLayout();

// switch scenario (e.g. contingency) with animated transition:
renderer.updateScenarioFlows(contingencyScenario);

// switch scenario (to be used when buses differ - e.g. due to split/merge) with animated transition:
updateTopology(topologyChangedScenario)

// controls:
renderer.setStretch(); 
renderer.setAlign();
renderer.setRepulse();
renderer.autoscale();
```

---

## For developers

### Install

From the **workspace root** (`powsybl-network-viewer/`):

```bash
npm install
```

### Build

```bash
npm run build -w packages/sankey
```

Output lands in `packages/sankey/dist/`.

---

## Demo

The `demo/` directory contains a self-contained Vite app that loads the IEEE case-14 network (baseline + one contingency scenario), plus a couple of customized IEEE case-14 networks (iidm + scenario data + script to create the iidm) to demonstrate bus-splitting/merging scenarios.

From the **workspace root** (`powsybl-network-viewer/`), start it with:

```bash
npm run demo -w packages/sankey
```

Then open the URL printed by Vite (typically `http://localhost:5173`).


The demo UI integrates the sankey component and provides:
- a dropdown menu to select case scenarios
- buttons to switch between a baseline, a contingency scenario, and a topology change scenario (when available in the case scenarios JSON)
- a button to toggle the layout orientation
- sliders for the stretch, align and repulse paramteters
- a button to download the current diagram as an SVG file
- buttons to export/import the layoyt position as JSON


### Local install in another app

```bash
# from packages/sankey/:
npm pack
# produces powsybl-sankey-X.Y.Z.tgz

# in your app:
npm install /path/to/powsybl-sankey-X.Y.Z.tgz
```
