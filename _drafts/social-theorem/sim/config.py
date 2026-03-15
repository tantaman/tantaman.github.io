"""SimConfig dataclass with all simulation parameters."""

from dataclasses import dataclass, field


@dataclass
class SimConfig:
    # Population
    N: int = 300              # number of subjects
    n: int = 64               # dimension of grammatical subspace V_B

    # Prototype structure
    K: int = 10               # number of prototype T matrices
    fix_dim_range: tuple = (2, 8)   # range of Fix(T) dimensions per prototype
    perturb_scale: float = 0.02     # perturbation magnitude for per-subject T_i

    # Recognition signal
    epsilon: float = 1.0      # sensitivity parameter in sigma

    # Want dynamics (MC7)
    eta: float = 0.01         # learning rate for form updates
    lambda_W: float = 1.0     # weight on Want gradient
    lambda_C: float = 0.3     # weight on Concealment gradient

    # Concealment (MC8)
    delta: float = 1.0        # concealment sensitivity

    # Strategy distribution (fractions, must sum to 1)
    strategy_fractions: dict = field(default_factory=lambda: {
        "constructive": 0.25,
        "disclosure": 0.25,
        "evasive": 0.25,
        "collective": 0.25,
    })

    # Strategy-specific params
    constructive_norm_boost: float = 0.002  # norm amplification per step
    disclosure_pull: float = 0.02           # pull toward s_i per step
    evasive_residual: float = 0.01          # small residual Want to prevent collapse
    collective_pull: float = 0.05           # pull toward cluster centroid

    # Graph
    edge_prob: float = 0.05       # Erdos-Renyi edge probability
    omega_init_range: tuple = (0.1, 0.5)  # initial omega weight range

    # Remainder norm
    r_norm_range: tuple = (0.5, 2.0)  # U(0.5, 2.0) for ||r_i|| in V_B^perp

    # Deficit
    lambda_1: float = 0.4    # lossiness weight
    lambda_2: float = 0.4    # distortion weight
    lambda_3: float = 0.2    # concealment violation weight
    discharge_theta: float = 5.0   # discharge threshold
    discharge_reduction: float = 0.3  # omega reduction on discharge

    # T co-evolution
    eta_T: float = 0.002            # grammar learning rate (0 = fixed T, v1 behavior)
    T_eigenvalue_range: tuple = (0.1, 1.0)  # clip eigenvalues after T update
    T_update_interval: int = 5      # update T every N steps (expensive)

    # Rewiring
    rewire_interval: int = 50       # timesteps between rewire events
    rewire_drop_threshold: float = 0.3   # drop edges with signal below this
    rewire_add_count: int = 3       # edges to add per rewire

    # Clustering
    cluster_interval: int = 20      # timesteps between cluster assignments
    cluster_eps: float = 0.0        # DBSCAN epsilon (0 = adaptive)
    cluster_min_samples: int = 3    # DBSCAN min_samples

    # Simulation
    T_steps: int = 1500       # total timesteps
    snapshot_interval: int = 10    # save full form snapshots every N steps
    seed: int = 42
