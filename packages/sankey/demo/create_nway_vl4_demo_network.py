#  Copyright (c) 2026, RTE (https://www.rte-france.com)
#  This Source Code Form is subject to the terms of the Mozilla Public
#  License, v. 2.0. If a copy of the MPL was not distributed with this
#  file, You can obtain one at http://mozilla.org/MPL/2.0/.
#  SPDX-License-Identifier: MPL-2.0

# Create a modified ieee14 with VL4 split into 3 buses for the N-way bus-split demo.
#
# Generate scenario JSON after running this script:
#   python pypowsybl_to_sankey_scenario.py \
#     --xiidm ieee14_with_vl4_nway.xiidm \
#     --outage L2-3-1 \
#     --open-breaker BREAKER_VL4_1 BREAKER_VL4_2 \
#     --output scenarios_nway_vl4_pypowsybl.json

import pypowsybl.network as pn

net = pn.create_ieee14()

voltage_level_id = 'VL4'
existing_bus_id = net.get_bus_breaker_topology(voltage_level_id).buses.index[0]

# Add two new buses to VL4
net.create_buses(id='busnew1', voltage_level_id=voltage_level_id)
net.create_buses(id='busnew2', voltage_level_id=voltage_level_id)

# Add two breakers, normally closed
net.create_switches(
    id='BREAKER_VL4_1',
    voltage_level_id=voltage_level_id,
    bus1_id='busnew1',
    bus2_id=existing_bus_id,
    kind='BREAKER',
    open=False,
)
net.create_switches(
    id='BREAKER_VL4_2',
    voltage_level_id=voltage_level_id,
    bus1_id='busnew2',
    bus2_id=existing_bus_id,
    kind='BREAKER',
    open=False,
)

# Move L3-4-1 (VL4 side is bus2) to busnew1.
# L2-4-1 and L4-5-1 remain on B4.
line = net.get_lines(all_attributes=True).loc[['L3-4-1']]
bus1_bb_id = line['bus_breaker_bus1_id'].iloc[0]
net.update_lines(id='L3-4-1', bus_breaker_bus1_id=bus1_bb_id, bus_breaker_bus2_id='busnew1')

# Move T4-7-1 and T4-9-1 (VL4 side is bus1) to busnew2
for trafo_id in ['T4-7-1', 'T4-9-1']:
    trafo = net.get_2_windings_transformers(all_attributes=True).loc[[trafo_id]]
    bus2_bb_id = trafo['bus_breaker_bus2_id'].iloc[0]
    net.update_2_windings_transformers(id=trafo_id, bus_breaker_bus1_id='busnew2', bus_breaker_bus2_id=bus2_bb_id)

# Redistribute B4-L load across the three buses (total preserved: 47.8 MW / -3.9 MVAR)
net.update_loads(id='B4-L', p0=20.0, q0=-2.0)
net.create_loads(id='B4-L2', voltage_level_id=voltage_level_id, bus_id='busnew1', p0=14.0, q0=-1.0)
net.create_loads(id='B4-L3', voltage_level_id=voltage_level_id, bus_id='busnew2', p0=13.8, q0=-0.9)

net.save('ieee14_with_vl4_nway.xiidm')
print('Saved ieee14_with_vl4_nway.xiidm')
