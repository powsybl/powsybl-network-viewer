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

_DECIMAL_PLACES: int = 6

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
                fallback = round(abs(flow) * p_max_factor, _DECIMAL_PLACES) or 1.0
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


# bus-breaker map helpers
def get_bus_breaker_map(network) -> dict[str, list[str]]:
    """
    Return {bus_view_id: [bb_bus_id, ...]} for the current network state.

    Calls get_bus_breaker_view_buses() whose index is the BB bus ID and whose
    'bus_id' column holds the bus-view ID each BB bus currently belongs to.
    This is stateless — call it on each network state independently.
    """
    bb_buses = network.get_bus_breaker_view_buses()
    result: dict[str, list[str]] = {}
    for bb_id, row in bb_buses.iterrows():
        bus_view_id = row["bus_id"]
        result.setdefault(bus_view_id, []).append(bb_id)
    return result


def compute_inherited_positions(
    old_bb_map: dict[str, list[str]],
    new_bb_map: dict[str, list[str]],
) -> dict[str, str]:
    """
    Return {new_bus_view_id: predecessor_bus_view_id} for bus-view IDs that
    appeared in new_bb_map but were absent from old_bb_map.
    """
    bb_to_old_view = {bb: bv for bv, bbs in old_bb_map.items() for bb in bbs}
    result: dict[str, str] = {}
    for new_bv, bbs in new_bb_map.items():
        if new_bv not in old_bb_map:
            for bb in bbs:
                old_bv = bb_to_old_view.get(bb)
                if old_bv:
                    result[new_bv] = old_bv
                    break
    return result


def canonicalize_bus_view_ids(
    old_bb_map: dict[str, list[str]],
    new_bb_map: dict[str, list[str]],
) -> dict[str, str]:
    """
    Return {raw_new_id: canonical_id}, relabeling bus-view IDs whose BB-bus set is
    unchanged back to their old label.
    """
    old_by_set = {frozenset(bbs): old_id for old_id, bbs in old_bb_map.items()}
    rename: dict[str, str] = {}
    claimed: set[str] = set()
    unmatched: list[str] = []
    for new_id, bbs in new_bb_map.items():
        old_id = old_by_set.get(frozenset(bbs))
        if old_id is not None:
            rename[new_id] = old_id
            claimed.add(old_id)
        else:
            unmatched.append(new_id)

    leftover = sorted(set(new_bb_map) - claimed)
    for new_id in unmatched:
        if new_id in leftover:
            rename[new_id] = new_id
            leftover.remove(new_id)
        else:
            rename[new_id] = leftover.pop(0)
    return rename


def _apply_rename(raw: dict, bb_map: dict[str, list[str]], rename: dict[str, str]) -> dict[str, list[str]]:
    """Apply a {raw_id: canonical_id} rename to a scenario's buses/branches and bb_map."""
    for bus in raw["buses"]:
        bus["id"] = rename.get(bus["id"], bus["id"])
    for branch in raw["branches"]:
        branch["from_bus"] = rename.get(branch["from_bus"], branch["from_bus"])
        branch["to_bus"] = rename.get(branch["to_bus"], branch["to_bus"])
    return {rename.get(k, k): v for k, v in bb_map.items()}


# topology-change scenario builder
def create_topology_change_scenario(
    network,
    old_bb_map: dict[str, list[str]],
    open_breakers: list[str] | None,
    close_breakers: list[str] | None,
    baseline_p_max: dict[str, float],
    p_max_factor: float = 2.0,
    emit_metadata: bool = True,
) -> dict:
    """
    Apply switch opens/closes, run DCPF, export scenario, then restore the network.

    Emits bus_breaker_map and inherited_positions (derived from the before/after BB maps)
    when emit_metadata is True.
    """
    for bid in (open_breakers or []):
        network.open_switch(bid)
    for bid in (close_breakers or []):
        network.close_switch(bid)
    run_dcpf(network)
    raw = extract_scenario(network, p_max_factor=p_max_factor)
    new_bb_map = get_bus_breaker_map(network)   # captured before restore
    for bid in (open_breakers or []):
        network.close_switch(bid)               # restore opened switches
    for bid in (close_breakers or []):
        network.open_switch(bid)                # restore closed switches
    for br in raw["branches"]:
        if br["id"] in baseline_p_max:
            br["p_max"] = baseline_p_max[br["id"]]

    rename = canonicalize_bus_view_ids(old_bb_map, new_bb_map)
    new_bb_map = _apply_rename(raw, new_bb_map, rename)

    if emit_metadata:
        raw["bus_breaker_map"] = new_bb_map
        raw["inherited_positions"] = compute_inherited_positions(old_bb_map, new_bb_map)
    return raw


def _normalize_outage_ids(outage_ids: list[str] | str | None) -> list[str]:
    if outage_ids is None:
        return []
    if isinstance(outage_ids, str):
        return [outage_ids]
    return list(outage_ids)


def _build_contingency_scenario(network, ids: list[str], baseline: dict, p_max_factor: float) -> dict:
    """
    Open ids, run DCPF, restore, and patch p_max + outage annotations to match baseline.
    """
    for eid in ids:
        network.disconnect(eid)
    run_dcpf(network)
    ctg_raw = extract_scenario(network, p_max_factor=p_max_factor)
    for eid in ids:
        network.connect(eid)

    # p_max must be consistent with the baseline (fallback values depend on flow)
    baseline_p_max = {b["id"]: b["p_max"] for b in baseline["branches"]}
    for branch in ctg_raw["branches"]:
        if branch["id"] in baseline_p_max:
            branch["p_max"] = baseline_p_max[branch["id"]]

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

    return {"buses": ctg_raw["buses"], "branches": patched_branches}


# scenario builder
def create_scenarios(
    network,
    outage_ids: list[str] | str | None = None,
    open_breakers: list[str] | None = None,
    close_breakers: list[str] | None = None,
    p_max_factor: float = 2.0,
    emit_topology_metadata: bool = True,
) -> tuple[dict, dict | None, dict | None]:
    """
    Run DC power flow and return (baseline, contingency, topology_change).
    contingency is None when outage_ids is None.
    topology_change is None when neither open_breakers nor close_breakers is set.
    The network is restored to its original state after this call.

    network                 : pypowsybl Network object
    outage_ids              : one branch ID (str) or a list of branch IDs; None means no contingency
    open_breakers           : switch IDs to open for the topology-change scenario (causes bus splits)
    close_breakers          : switch IDs to close for the topology-change scenario (causes bus merges)
    p_max_factor            : fallback factor for branches with no defined limit (default 2.0)
    emit_topology_metadata  : if False, omit bus_breaker_map (baseline and topology_change) and
                               inherited_positions (topology_change) from the output.
    """
    ids = _normalize_outage_ids(outage_ids)

    # Base case
    run_dcpf(network)
    baseline = extract_scenario(network, p_max_factor=p_max_factor)

    contingency = None
    if ids:
        contingency = _build_contingency_scenario(network, ids, baseline, p_max_factor)

    topology_change = None
    if open_breakers or close_breakers:
        bb_map = get_bus_breaker_map(network)
        if emit_topology_metadata:
            baseline["bus_breaker_map"] = bb_map
        baseline_p_max = {b["id"]: b["p_max"] for b in baseline["branches"]}
        topology_change = create_topology_change_scenario(
            network, bb_map, open_breakers, close_breakers, baseline_p_max, p_max_factor,
            emit_metadata=emit_topology_metadata,
        )

    return baseline, contingency, topology_change


# export JSON
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
    topology_change: dict | None = None,
    *,
    path: str | Path,
) -> None:
    path = Path(path)
    payload: dict = {"baseline": baseline}
    if contingency is not None:
        payload["contingency"] = contingency
    if topology_change is not None:
        payload["topology_change"] = topology_change
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
        "--open-breaker",
        metavar="BREAKER_ID",
        nargs="+",
        default=None,
        help="Breaker IDs to open for the topology-change scenario (causes bus splits).",
    )
    parser.add_argument(
        "--close-breaker",
        metavar="BREAKER_ID",
        nargs="+",
        default=None,
        help=(
            "Breaker IDs to close for the topology-change scenario (causes bus merges). "
            "The breakers must already be open in the network file."
        ),
    )
    parser.add_argument(
        "--p-max-factor",
        type=float,
        default=2.0,
        metavar="F",
        help="Define a fallback p_max for branches with no limit (default 2.0)"
    )
    parser.add_argument(
        "--no-topology-metadata",
        action="store_true",
        help=(
            "Omit bus_breaker_map and inherited_positions from the topology-change "
            "output, even when breakers are toggled."
        ),
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

    baseline, contingency, topology_change = create_scenarios(
        net,
        args.outage,
        open_breakers=args.open_breaker,
        close_breakers=args.close_breaker,
        p_max_factor=args.p_max_factor,
        emit_topology_metadata=not args.no_topology_metadata,
    )

    export_json(
        baseline,
        contingency,
        topology_change,
        path=Path(args.output),
    )


if __name__ == "__main__":
    _main()
