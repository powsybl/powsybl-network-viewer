/**
 * Copyright (c) 2026, RTE (http://www.rte-france.com)
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 * SPDX-License-Identifier: MPL-2.0
 */

import './nad-style.css';
import './style.css';
import typescriptLogo from './assets/typescript.svg';
import viteLogo from './assets/vite.svg';
import heroImg from './assets/hero.png';
import svgContent from './data/nad.svg?raw';
import metadata from './data/nad_metadata.json';
import { setupNadV1_9_0 } from './nad_v1_9_0.ts';
import { setupNadV3_6_0 } from './nad_v3_6_0.ts';

document.querySelector<HTMLDivElement>('#app')!.innerHTML = `
<section >
  <div id="center" class="hero">
    <img src="${heroImg}" class="base" width="170" height="179">
    <img src="${typescriptLogo}" class="framework" alt="TypeScript logo"/>
    <img src="${viteLogo}" class="vite" alt="Vite logo" />
  </div>
  <div>
    <pre>Test Issue 241</pre>
  </div>
</section>
<section id="next-steps">
   <pre>V 1.9.0</pre>
  <div id="container-nad-241-v1_9_0"></div>
</section>
<section id="next-steps">
   <pre>V 3.6.0</pre>
  <div id="container-nad-241-v3_6_0"></div>
</section>
`;

const containerV1_9_0 = document.getElementById('container-nad-241-v1_9_0');
if (!containerV1_9_0) {
    throw new Error('#container-nad-v1_9_0 not found');
}

const containerV3_6_0 = document.getElementById('container-nad-241-v3_6_0');
if (!containerV3_6_0) {
    throw new Error('#container-nad-241-v3_6_0 not found');
}
const zoomLebels = [0, 1000, 2200, 2500, 3000, 4000, 9000, 12000, 20000];

setupNadV1_9_0(containerV1_9_0, <string>svgContent, metadata, true, zoomLebels);
setupNadV3_6_0(containerV3_6_0, <string>svgContent, metadata, true, zoomLebels);
