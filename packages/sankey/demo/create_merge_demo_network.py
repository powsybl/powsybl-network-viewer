#  Copyright (c) 2026, RTE (https://www.rte-france.com)
#  This Source Code Form is subject to the terms of the Mozilla Public
#  License, v. 2.0. If a copy of the MPL was not distributed with this
#  file, You can obtain one at http://mozilla.org/MPL/2.0/.
#  SPDX-License-Identifier: MPL-2.0

# Create a modified ieee14 with VL5 split into 3 buses for the bus-merge demo.
#
# Generate scenario JSON after running this script:
#   python pypowsybl_to_sankey_scenario.py \
#     --xiidm ieee14_merge_demo.xiidm \
#     --close-breaker BREAKER_VL5_1 BREAKER_VL5_2 \
#     --output scenarios_merge_demo_pypowsybl.json

import math

import pandas as pd
import pypowsybl.loadflow as lf
import pypowsybl.network as pn

S_BASE_MVA = 100.0
P_MAX_FACTOR = 2.0

net = pn.create_ieee14()

params = lf.Parameters(distributed_slack=False)
lf.run_dc(net, parameters=params)
net.per_unit = True
lines = net.get_lines()
trafos = net.get_2_windings_transformers()
natural_flow_pu = {
    'L1-5-1': abs(lines.loc['L1-5-1', 'p1']),
    'L2-5-1': abs(lines.loc['L2-5-1', 'p1']),
    'L4-5-1': abs(lines.loc['L4-5-1', 'p1']),
    'T5-6-1': abs(trafos.loc['T5-6-1', 'p1']),
}
net.per_unit = False

side1_vl = {
    'L1-5-1': lines.loc['L1-5-1', 'voltage_level1_id'],
    'L2-5-1': lines.loc['L2-5-1', 'voltage_level1_id'],
    'L4-5-1': lines.loc['L4-5-1', 'voltage_level1_id'],
    'T5-6-1': trafos.loc['T5-6-1', 'voltage_level1_id'],
}
elem_type = {
    'L1-5-1': 'LINE',
    'L2-5-1': 'LINE',
    'L4-5-1': 'LINE',
    'T5-6-1': 'TWO_WINDINGS_TRANSFORMER',
}
vl_nominal_v = net.get_voltage_levels()['nominal_v']


def pu_to_amps(pu_value: float, voltage_level_id: str) -> float:
    v_base_kv = vl_nominal_v[voltage_level_id]
    i_base_a = S_BASE_MVA * 1e6 / (math.sqrt(3) * v_base_kv * 1e3)
    return pu_value * i_base_a


limits_df = pd.DataFrame.from_records(
    [
        {
            'element_id': branch_id,
            'element_type': elem_type[branch_id],
            'side': 'ONE',
            'name': 'permanent_limit',
            'type': 'CURRENT',
            'value': pu_to_amps(P_MAX_FACTOR * natural_flow_pu[branch_id], side1_vl[branch_id]),
            'acceptable_duration': -1,
            'is_fictitious': False,
        }
        for branch_id in natural_flow_pu
    ]
).set_index('element_id')
net.create_operational_limits(limits_df)

voltage_level_id = 'VL5'
existing_bus_id = net.get_bus_breaker_topology(voltage_level_id).buses.index[0]

# Add two new buses to VL5
net.create_buses(id='busnew1', voltage_level_id=voltage_level_id)
net.create_buses(id='busnew2', voltage_level_id=voltage_level_id)

# Add two breakers, normally OPEN
net.create_switches(
    id='BREAKER_VL5_1',
    voltage_level_id=voltage_level_id,
    bus1_id='busnew1',
    bus2_id=existing_bus_id,
    kind='BREAKER',
    open=True,
)
net.create_switches(
    id='BREAKER_VL5_2',
    voltage_level_id=voltage_level_id,
    bus1_id='busnew2',
    bus2_id=existing_bus_id,
    kind='BREAKER',
    open=True,
)

# Move L2-5-1 (VL5 side is bus2) to busnew1.
# L1-5-1 and T5-6-1 remain on B5.
line = net.get_lines(all_attributes=True).loc[['L2-5-1']]
bus1_bb_id = line['bus_breaker_bus1_id'].iloc[0]
net.update_lines(id='L2-5-1', bus_breaker_bus1_id=bus1_bb_id, bus_breaker_bus2_id='busnew1')

# Move L4-5-1 (VL5 side is bus2) to busnew2.
line = net.get_lines(all_attributes=True).loc[['L4-5-1']]
bus1_bb_id = line['bus_breaker_bus1_id'].iloc[0]
net.update_lines(id='L4-5-1', bus_breaker_bus1_id=bus1_bb_id, bus_breaker_bus2_id='busnew2')

# Redistribute B5-L load across the three buses (total preserved: 7.6 MW / 1.6 MVAR)
net.update_loads(id='B5-L', p0=3.6, q0=0.6)
net.create_loads(id='B5-L2', voltage_level_id=voltage_level_id, bus_id='busnew1', p0=2.0, q0=0.5)
net.create_loads(id='B5-L3', voltage_level_id=voltage_level_id, bus_id='busnew2', p0=2.0, q0=0.5)

net.save('ieee14_merge_demo.xiidm')
print('Saved ieee14_merge_demo.xiidm')
