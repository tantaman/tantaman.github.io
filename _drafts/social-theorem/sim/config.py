"""SimConfig dataclass — all simulation parameters."""

from dataclasses import dataclass, field


@dataclass
class SimConfig:
    # Space dimensions
    D: int = 512           # ambient dimension (proxy for infinity)
    n: int = 64            # grammar subspace dimension
    fix_dim: int = 8       # dimension of Fix(T)

    # Population
    N: int = 200           # number of subjects
    K_prototypes: int = 10 # number of distinct T matrices
    turnover_rate: float = 0.01  # open population turnover

    # Dynamics
    eta: float = 0.005     # learning rate
    epsilon: float = 0.1   # signal sensitivity
    lambda_W: float = 1.0  # want weight
    lambda_C: float = 0.3  # concealment weight
    delta_concealment: float = 0.2  # concealment Gaussian width

    # Deficit
    lambda_1: float = 1.0  # channel 1 weight (lossiness)
    lambda_2: float = 1.0  # channel 2 weight (distortion)
    lambda_3: float = 0.5  # channel 3 weight (exposure)
    kappa: float = 0.5     # exposure cost width
    theta_discharge: float = 1.5  # discharge threshold

    # Graph
    topology: str = "erdos_renyi"
    edge_prob: float = 0.05

    # Trap
    gamma: float = 0.3     # prior rigidity
    theta_membership: float = 0.3  # trap membership threshold

    # Meta-awareness
    theta_M: float = 1.3   # meta-awareness threshold
    tau_window: int = 100   # observation window
    eta_prime: float = 0.3  # disclosure gradient learning rate

    # Simulation control
    T_steps: int = 2000
    seed: int = 42
    snapshot_interval: int = 10

    # Open population
    field_formation_rate: float = 0.01   # nu
    field_dissolution_rate: float = 0.005  # delta

    def copy(self, **overrides):
        """Return a new SimConfig with selected fields overridden."""
        from dataclasses import asdict
        d = asdict(self)
        d.update(overrides)
        return SimConfig(**d)
