#!/usr/bin/env python3

#  Copyright (c) 2026, RTE (https://www.rte-france.com)
#  This Source Code Form is subject to the terms of the Mozilla Public
#  License, v. 2.0. If a copy of the MPL was not distributed with this
#  file, You can obtain one at http://mozilla.org/MPL/2.0/.
#  SPDX-License-Identifier: MPL-2.0

"""
Use pypowsybl to extract a JSON scenario from a network, to be rendered by the sankey viewer demo.
Outputs all power quantities in per-unit (base MVA = 100, hardcoded by pypowsybl).

Example, used to create the demo's input data:
    python pypowsybl_to_sankey_scenario.py --network ieee14 --outage L2-5-1 --output scenarios_pypowsybl.json

"""

from __future__ import annotations

import json
import math
import warnings
from pathlib import Path

import pypowsybl.loadflow as lf
import pypowsybl.network as pn

# DCPF runner                                                                   #
def run_dcpf(network) -> None:
    params = lf.Parameters(distributed_slack=False)
    results = lf.run_dc(network, parameters=params)
    for comp in results:
        if comp.status.name != "CONVERGED":
            warnings.warn(
                f"DC load flow component {comp.connected_component_num} "
                f"status = {comp.status.name}"
            )

# p_max extraction                                                              #
def _safe_float(value, default: float = float("nan")) -> float:
    try:
        f = float(value)
        return default if math.isnan(f) else f
    except (TypeError, ValueError):
        return default


def _build_p_max_dict(network) -> dict[str, float]:
    p_max: dict[str, float] = {}

    # Permanent current limit: I_pu from get_operational_limits() equals p_max_pu at nominal voltage
    try:
        lim_df = network.get_operational_limits().reset_index()
        perm = lim_df[
            (lim_df["acceptable_duration"] == -1)
            & (lim_df["type"] == "CURRENT")
            & (lim_df["side"] == "ONE")
        ]
        for _, row in perm.iterrows():
            eid = row["element_id"]
            i_pu = _safe_float(row["value"])
            if i_pu > 0:
                p_max[eid] = i_pu
    except Exception as exc:
        warnings.warn(f"Could not read operational limits: {exc}")

    # Transformer rated_s in pu if no current limit
    for eid, row in network.get_2_windings_transformers().iterrows():
        if eid not in p_max:
            rated_s_pu = _safe_float(row.get("rated_s", float("nan")))
            if rated_s_pu > 0:
                p_max[eid] = rated_s_pu

    return p_max


# scenario extraction helpers
def _extract_buses(network) -> list[dict]:
    buses = []
    for bus_id, row in network.get_buses().iterrows():
        angle = _safe_float(row.get("v_angle"))
        if math.isnan(angle):
            continue
        buses.append({"id": bus_id, "voltage_angle": angle})
    return buses


def _extract_branches(network, p_max_dict: dict[str, float], p_max_factor: float) -> list[dict]:
    branches: list[dict] = []
    for elem_df, kind in [
        (network.get_lines(), "line"),
        (network.get_2_windings_transformers(), "transformer"),
    ]:
        for eid, row in elem_df.iterrows():
            if not bool(row.get("connected1", True)) or not bool(row.get("connected2", True)):
                continue
            from_bus = str(row.get("bus1_id", "") or "")
            to_bus = str(row.get("bus2_id", "") or "")
            flow = _safe_float(row.get("p1"), default=0.0)
            p_max = p_max_dict.get(eid)
            if p_max is None:
                fallback = abs(flow) * p_max_factor or 1.0
                warnings.warn(
                    f"{kind} '{eid}' has no defined limit; "
                    f"using flow-based p_max = {fallback:.3f} pu, (flow = {flow:.3f})"
                )
                p_max = fallback
            branches.append(
                {
                    "id": eid,
                    "from_bus": from_bus,
                    "to_bus": to_bus,
                    "flow": flow,
                    "p_max": p_max,
                }
            )
    return branches


def extract_scenario(network, p_max_factor: float = 2.0) -> dict:
    """
    Build a SankeyScenario dict (per-unit) from a network solved by run_dcpf().
    Branches with an open terminal (connected1/connected2 == False) are skipped.

    if p_max for a branch is not available from _build_p_max_dict, use abs(flow) * p_max_factor. 
    p_max_factor = 2.0 (default) gives a load ratio of 0.5 (green bands).
    A lower value (e.g. 1.05) forces orange/red.
    """
    network.per_unit = True
    try:
        buses = _extract_buses(network)
        p_max_dict = _build_p_max_dict(network)
        branches = _extract_branches(network, p_max_dict, p_max_factor)
    finally:
        network.per_unit = False
    return {"buses": buses, "branches": branches}


# scenario builder
def create_scenarios(
    network,
    outage_ids: list[str] | str | None = None,
    p_max_factor: float = 2.0,
) -> tuple[dict, dict | None]:
    """
    Run DC power flow and return (baseline, contingency).
    contingency is None when outage_ids is None.
    The network is restored to its original connected state after this call.

    network      : pypowsybl Network object
    outage_ids   : one branch ID (str) or a list of branch IDs; None means no contingency
    p_max_factor : fallback factor to use when a branch has no limit defined (default 2.0)
    """
    if outage_ids is None:
        ids: list[str] = []
    elif isinstance(outage_ids, str):
        ids = [outage_ids]
    else:
        ids = list(outage_ids)

    # Base case
    run_dcpf(network)
    baseline = extract_scenario(network, p_max_factor=p_max_factor)

    if not ids:
        return baseline, None

    # open all branches in the ids list, re-run scpf, restore the branches at the end
    for eid in ids:
        network.disconnect(eid)
    run_dcpf(network)
    ctg_raw = extract_scenario(network, p_max_factor=p_max_factor)
    for eid in ids:
        network.connect(eid)

    # Re-add the outaged branches with outage=True, flow=0
    patched_branches = list(ctg_raw["branches"])
    for eid in ids:
        outaged = next((b for b in baseline["branches"] if b["id"] == eid), None)
        if outaged is None:
            warnings.warn(
                f"Branch '{eid}' not found in baseline; outage annotation skipped"
            )
        else:
            patched_branches.append({**outaged, "flow": 0.0, "outage": True})

    contingency = {"buses": ctg_raw["buses"], "branches": patched_branches}
    return baseline, contingency


# export JSON
_DECIMAL_PLACES: int = 6

def _round_floats(obj, ndigits: int):
    if isinstance(obj, float):
        return round(obj, ndigits)
    if isinstance(obj, dict):
        return {k: _round_floats(v, ndigits) for k, v in obj.items()}
    if isinstance(obj, list):
        return [_round_floats(v, ndigits) for v in obj]
    return obj


def export_json(
    baseline: dict,
    contingency: dict | None = None,
    *,
    path: str | Path,
) -> None:
    path = Path(path)
    payload: dict = {"baseline": baseline}
    if contingency is not None:
        payload["contingency"] = contingency
    path.write_text(json.dumps(_round_floats(payload, _DECIMAL_PLACES), indent=2), encoding="utf-8")
    print(f"Wrote {path}")


# command line
_NETWORKS = {
    "ieee14": pn.create_ieee14,
    "ieee118": pn.create_ieee118,
}


def _main() -> None:
    import argparse

    parser = argparse.ArgumentParser(
        description="Generate a sankey scenario JSON file from a pypowsybl network (per unit)"
    )
    net_group = parser.add_mutually_exclusive_group(required=True)
    net_group.add_argument(
        "--network",
        choices=list(_NETWORKS),
        help="Test networks available in pypowsybl.",
    )
    net_group.add_argument(
        "--xiidm",
        metavar="FILE",
        help="Load s network from an .xiidm file.",
    )
    parser.add_argument(
        "--output",
        required=True,
        metavar="FILE",
        help="Output file path (e.g. scenarios_pypowsybl.json).",
    )
    parser.add_argument(
        "--outage",
        metavar="BRANCH_ID",
        nargs="+",
        default=None,
        help="One or more branch IDs to trip simultaneously for the contingency scenario.",
    )
    parser.add_argument(
        "--p-max-factor",
        type=float,
        default=2.0,
        metavar="F",
        help="Define a fallback p_max for branches with no limit (default 2.0)"
    )
    parser.add_argument(
        "--list-branches",
        action="store_true",
        help="Print all branch IDs for the selected network and exit",
    )
    args = parser.parse_args()

    if args.xiidm:
        net = pn.load(args.xiidm)
    else:
        net = _NETWORKS[args.network]()

    if args.list_branches:
        run_dcpf(net)
        print("Lines:")
        for eid in net.get_lines().index:
            print(f"  {eid}")
        print("Transformers:")
        for eid in net.get_2_windings_transformers().index:
            print(f"  {eid}")
        return

    baseline, contingency = create_scenarios(net, args.outage, p_max_factor=args.p_max_factor)

    export_json(
        baseline,
        contingency,
        path=Path(args.output),
    )


if __name__ == "__main__":
    _main()
