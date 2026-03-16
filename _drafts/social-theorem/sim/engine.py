"""Main simulation loop and orchestration."""

import numpy as np
from config import SimConfig
from core import (
    make_subjects, make_grammar, make_distortion, project_to_subspace,
    remainder_norm, recognition_signal, fix_projection
)
from graph import make_graph, get_neighbors
from dynamics import (
    update_want, update_constructive, update_disclosure,
    update_evasive, update_collective, update_meta_disclosure
)
from deficit import compute_deficit, process_discharges
from fields import assign_to_fields, FieldTracker, dissolve_fields, seed_new_fields
from trap import PriorTracker, sigma_trap, trap_attractor, rebellion_threshold, detect_rebellion
from meta import MetaAwareness


class SimState:
    """Full simulation state at a point in time."""

    def __init__(self):
        self.forms = None           # (N, n) forms in grammar coords
        self.subjects = None        # (N, D) true-self vectors
        self.s_proj = None          # (N, n) projected true selves
        self.r_norms = None         # (N,) remainder norms
        self.V_B = None             # (D, n) grammar basis
        self.T_prototypes = None    # list of K (n,n) distortion ops
        self.Q_prototypes = None    # list of K (n,n) eigenvector matrices
        self.eig_prototypes = None  # list of K (n,) eigenvalue arrays
        self.T_assignments = None   # (N,) which T each subject's neighborhood uses
        self.adj = None             # (N, N) adjacency
        self.omega = None           # (N, N) attention weights
        self.strategies = None      # (N,) strategy labels
        self.field_tracker = None
        self.prior_tracker = None
        self.meta = None


class Snapshot:
    """Recorded measurements at a single time step."""

    def __init__(self, t):
        self.t = t
        self.forms = None           # (N, n)
        self.deficits = None        # (N,) total deficits
        self.deficit_channels = None  # (N, 3) per-channel
        self.field_assignments = None  # (N,)
        self.field_sizes = None     # (K,)
        self.discharge_events = []
        self.meta_aware_count = 0
        self.mean_signal = 0.0
        self.form_norms = None      # (N,)
        self.form_self_dists = None  # (N,) ||f_i - s_i_proj||


def init_simulation(config, strategy="want"):
    """Initialize full simulation state.

    strategy: one of "want", "constructive", "disclosure", "evasive", "collective", "mixed"
    """
    rng = np.random.default_rng(config.seed)
    state = SimState()

    # Create subjects
    state.subjects = make_subjects(config.N, config.D, rng)

    # Create grammar
    state.V_B = make_grammar(config.D, config.n, rng)

    # Project true selves and compute remainder norms
    state.s_proj = np.array([project_to_subspace(s, state.V_B) for s in state.subjects])
    state.r_norms = np.array([remainder_norm(s, state.V_B) for s in state.subjects])

    # Create K prototype distortion operators
    state.T_prototypes = []
    state.Q_prototypes = []
    state.eig_prototypes = []
    for _ in range(config.K_prototypes):
        T, Q, eigs = make_distortion(config.n, config.fix_dim, rng)
        state.T_prototypes.append(T)
        state.Q_prototypes.append(Q)
        state.eig_prototypes.append(eigs)

    # Assign each subject to a prototype (round-robin for simplicity)
    state.T_assignments = np.array([i % config.K_prototypes for i in range(config.N)])

    # Initialize forms: small random perturbation of projected true selves
    state.forms = state.s_proj.copy() + 0.01 * rng.standard_normal((config.N, config.n))

    # Create social graph
    state.adj, state.omega = make_graph(
        config.N, config.topology, rng, edge_prob=config.edge_prob
    )

    # Assign strategies
    if strategy == "mixed":
        strategies_list = ["want", "constructive", "disclosure", "evasive", "collective"]
        state.strategies = np.array([
            strategies_list[i % len(strategies_list)] for i in range(config.N)
        ])
    else:
        state.strategies = np.array([strategy] * config.N)

    # Initialize trackers
    state.field_tracker = FieldTracker(config.K_prototypes)
    state.prior_tracker = PriorTracker(config.N)
    state.prior_tracker.initialize(state.forms)
    state.meta = MetaAwareness(config.N, config)

    return state, rng


def step(state, config, rng, t, enable_trap=False, enable_meta=False,
         enable_open_pop=False):
    """Execute one simulation step.

    Returns: Snapshot if t % snapshot_interval == 0, else None.
    """
    N = config.N
    n = config.n
    forms = state.forms
    T_protos = state.T_prototypes

    # 1. Compute recognition signals for all pairs (used for diagnostics)
    # We compute on the fly during updates to avoid N^2 storage

    # 2. Update forms per strategy/meta-state
    new_forms = np.empty_like(forms)
    for i in range(N):
        neighbors = get_neighbors(state.adj, i)
        if len(neighbors) == 0:
            new_forms[i] = forms[i]
            continue

        # Gather neighbor T operators
        T_neighbors = [T_protos[state.T_assignments[j]] for j in neighbors]

        # Check meta-awareness
        if enable_meta and state.meta.is_meta_aware(i):
            new_forms[i] = update_meta_disclosure(
                forms[i], state.s_proj[i], config.eta_prime
            )
        elif state.strategies[i] == "want":
            new_forms[i] = update_want(forms[i], state.s_proj[i], T_neighbors, config)
        elif state.strategies[i] == "constructive":
            new_forms[i] = update_constructive(forms[i], state.s_proj[i], T_neighbors, config)
        elif state.strategies[i] == "disclosure":
            new_forms[i] = update_disclosure(forms[i], state.s_proj[i], config)
        elif state.strategies[i] == "evasive":
            new_forms[i] = update_evasive(forms[i], state.s_proj[i], T_neighbors, config)
        elif state.strategies[i] == "collective":
            # Compute cluster centroid of same-field neighbors
            my_field = state.T_assignments[i]
            same_field = [j for j in neighbors if state.T_assignments[j] == my_field]
            if same_field:
                centroid = np.mean(forms[same_field], axis=0)
            else:
                centroid = forms[i]
            new_forms[i] = update_collective(forms[i], centroid, config)
        else:
            new_forms[i] = update_want(forms[i], state.s_proj[i], T_neighbors, config)

    state.forms = new_forms

    # 3. Compute deficits
    deficits = np.zeros(N)
    deficit_channels = np.zeros((N, 3))
    for i in range(N):
        neighbors = get_neighbors(state.adj, i)
        T_neighbors = [T_protos[state.T_assignments[j]] for j in neighbors]
        total, ch1, ch2, ch3 = compute_deficit(
            state.forms[i], state.subjects[i], state.V_B, T_neighbors, config
        )
        deficits[i] = total
        deficit_channels[i] = [ch1, ch2, ch3]

    # 4. Process discharge events
    priors_dict = [{} for _ in range(N)]
    for i in range(N):
        for j in get_neighbors(state.adj, i):
            p = state.prior_tracker.priors_by_neighbor[i].get(j)
            priors_dict[i][j] = p

    T_per_subject = [T_protos[state.T_assignments[i]] for i in range(N)]
    discharge_events, state.omega = process_discharges(
        deficits, state.forms, T_per_subject, state.adj, state.omega,
        priors_dict, config
    )

    # 5. Update trap priors (slow timescale)
    if enable_trap:
        for i in range(N):
            state.prior_tracker.update_prior(i, state.forms[i], decay=0.01)

    # 6. Check meta-awareness transitions
    if enable_meta:
        for i in range(N):
            state.meta.record_deficit(i, deficits[i], t)
            state.meta.check_transition(i, t)

    # 7. Open population: births/deaths
    if enable_open_pop:
        _open_population_step(state, config, rng)

    # 8. Field detection & tracking
    assignments = assign_to_fields(state.forms, T_protos, config.epsilon)
    state.field_tracker.record(assignments)

    # 9. Snapshot
    if t % config.snapshot_interval == 0:
        snap = Snapshot(t)
        snap.forms = state.forms.copy()
        snap.deficits = deficits.copy()
        snap.deficit_channels = deficit_channels.copy()
        snap.field_assignments = assignments.copy()
        from fields import field_sizes as fs_func
        snap.field_sizes = fs_func(assignments, config.K_prototypes)
        snap.discharge_events = discharge_events
        snap.meta_aware_count = state.meta.get_meta_aware_count() if enable_meta else 0
        snap.form_norms = np.linalg.norm(state.forms, axis=1)
        snap.form_self_dists = np.linalg.norm(state.forms - state.s_proj, axis=1)

        # Mean signal (each subject vs their assigned T)
        signals = []
        for i in range(N):
            T_i = T_protos[state.T_assignments[i]]
            diff = T_i @ state.forms[i] - state.forms[i]
            sig = np.exp(-np.dot(diff, diff) / (2.0 * config.epsilon ** 2))
            signals.append(sig)
        snap.mean_signal = np.mean(signals)

        return snap

    return None


def _open_population_step(state, config, rng):
    """Handle births and deaths for open population."""
    N = len(state.forms)
    # Deaths: remove subjects at turnover rate
    death_mask = rng.random(N) < config.turnover_rate
    # Births: replace dead subjects with new ones
    for i in np.where(death_mask)[0]:
        # New subject
        new_s = rng.standard_normal(config.D)
        new_s /= np.linalg.norm(new_s)
        state.subjects[i] = new_s
        state.s_proj[i] = project_to_subspace(new_s, state.V_B)
        state.r_norms[i] = remainder_norm(new_s, state.V_B)
        # Initialize form near projected true self
        state.forms[i] = state.s_proj[i] + 0.01 * rng.standard_normal(config.n)
        # Reset meta state
        state.meta.states[i] = 0
        state.meta.deficit_history[i] = []
        # Reset prior
        state.prior_tracker.priors[i] = state.forms[i].copy()


def run_simulation(config, strategy="want", enable_trap=False, enable_meta=False,
                   enable_open_pop=False, progress=False):
    """Run full simulation, return state and snapshots."""
    state, rng = init_simulation(config, strategy=strategy)
    snapshots = []

    for t in range(config.T_steps):
        snap = step(state, config, rng, t,
                    enable_trap=enable_trap,
                    enable_meta=enable_meta,
                    enable_open_pop=enable_open_pop)
        if snap is not None:
            snapshots.append(snap)

        if progress and t % 200 == 0:
            print(f"  step {t}/{config.T_steps}")

    return state, snapshots


def calibrate(config):
    """Run short diagnostic to verify parameter scales."""
    cal_config = config.copy(N=50, K_prototypes=1, T_steps=200, snapshot_interval=10)
    state, snapshots = run_simulation(cal_config, strategy="want", progress=False)

    last = snapshots[-1]
    print("=== Calibration Report ===")
    print(f"  N={cal_config.N}, n={cal_config.n}, D={cal_config.D}, fix_dim={cal_config.fix_dim}")
    print(f"  epsilon={cal_config.epsilon}, eta={cal_config.eta}")
    print()

    # Form norms
    print(f"  Form norms:    mean={np.mean(last.form_norms):.4f}  std={np.std(last.form_norms):.4f}")
    print(f"  ||f - s_proj||: mean={np.mean(last.form_self_dists):.4f}  std={np.std(last.form_self_dists):.4f}")
    print(f"  ||r_i||:        mean={np.mean(state.r_norms):.4f}  std={np.std(state.r_norms):.4f}")
    print()

    # Recognition signals
    print(f"  Mean signal:   {last.mean_signal:.4f}")
    print()

    # Deficit channels
    ch1 = last.deficit_channels[:, 0]
    ch2 = last.deficit_channels[:, 1]
    ch3 = last.deficit_channels[:, 2]
    print(f"  Ch1 (lossiness):  mean={np.mean(ch1):.4f}  std={np.std(ch1):.4f}")
    print(f"  Ch2 (distortion): mean={np.mean(ch2):.4f}  std={np.std(ch2):.4f}")
    print(f"  Ch3 (exposure):   mean={np.mean(ch3):.4f}  std={np.std(ch3):.4f}")
    print(f"  Total deficit:    mean={np.mean(last.deficits):.4f}  std={np.std(last.deficits):.4f}")
    print()

    # Discharge events
    total_discharges = sum(len(s.discharge_events) for s in snapshots)
    print(f"  Total discharge events: {total_discharges}")
    print()

    # Check discriminating range
    if last.mean_signal < 0.05:
        print("  WARNING: signals near 0 — epsilon too small or forms too far from Fix(T)")
        print(f"  Recommended: increase epsilon to ~{cal_config.epsilon * 2:.3f}")
    elif last.mean_signal > 0.95:
        print("  WARNING: signals near 1 — epsilon too large or forms already at Fix(T)")
        print(f"  Recommended: decrease epsilon to ~{cal_config.epsilon * 0.5:.3f}")
    else:
        print("  Signal range looks good (discriminating)")

    # Check gradient scale
    expected_step = cal_config.eta * last.mean_signal / (cal_config.epsilon ** 2) * np.mean(ch2)
    print(f"  Expected step size: ~{expected_step:.4f}")
    if expected_step > 0.5:
        print(f"  WARNING: steps too large — reduce eta to ~{cal_config.eta * 0.1:.4f}")
    elif expected_step < 1e-5:
        print(f"  WARNING: steps too small — increase eta to ~{cal_config.eta * 10:.4f}")

    print("=== End Calibration ===")
    return state, snapshots
