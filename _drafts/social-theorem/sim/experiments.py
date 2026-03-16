"""Named experiment configs — one per theorem/question."""

from config import SimConfig


# === Tier 1: Sanity checks ===

def irreducibility_config():
    """Quick check: all strategies maintain deficit floor."""
    return SimConfig(
        N=100, K_prototypes=5, T_steps=500, snapshot_interval=1, seed=42
    )


# === Tier 2: Quantitative predictions ===

def power_law_config():
    """Large N, long run for power-law measurement."""
    return SimConfig(
        N=500, K_prototypes=20, T_steps=5000, snapshot_interval=50,
        turnover_rate=0.01, field_formation_rate=0.01,
        field_dissolution_rate=0.005, seed=42
    )


def inverse_law_config():
    """Multiple fields at equilibrium."""
    return SimConfig(
        N=500, K_prototypes=10, T_steps=2000, snapshot_interval=10, seed=42
    )


def rebellion_config():
    """Sweep gamma values for rebellion threshold."""
    return SimConfig(
        N=50, K_prototypes=1, T_steps=500, snapshot_interval=50, seed=42
    )


# === Tier 3: Open questions ===

def topology_configs():
    """Same dynamics, different graph structures."""
    base = SimConfig(
        N=200, K_prototypes=5, T_steps=3000, snapshot_interval=20,
        turnover_rate=0.005, seed=42
    )
    return {
        "erdos_renyi": base.copy(topology="erdos_renyi"),
        "watts_strogatz": base.copy(topology="watts_strogatz"),
        "barabasi_albert": base.copy(topology="barabasi_albert"),
        "lattice": base.copy(topology="lattice"),
    }


def meta_awareness_config():
    """Meta-awareness with trap enabled."""
    return SimConfig(
        N=200, K_prototypes=5, T_steps=3000, snapshot_interval=10,
        theta_M=1.0, tau_window=100, eta_prime=0.3, seed=42
    )


def confidently_wrong_config():
    """Grammar estimation error sweep."""
    return SimConfig(
        N=100, K_prototypes=1, T_steps=1000, snapshot_interval=50, seed=42
    )


def boom_bust_config():
    """The most diagnostic test: long run with open population."""
    return SimConfig(
        N=300, K_prototypes=5, T_steps=5000, snapshot_interval=10,
        turnover_rate=0.005, field_formation_rate=0.01,
        field_dissolution_rate=0.005, seed=42
    )


def field_formation_config():
    """Single shared T, verify convergence to Fix(T)."""
    return SimConfig(
        N=100, K_prototypes=1, T_steps=2000, snapshot_interval=10, seed=42
    )


def self_acceleration_config():
    """Open population, single T, track growth."""
    return SimConfig(
        N=300, K_prototypes=1, T_steps=3000, snapshot_interval=5,
        turnover_rate=0.01, seed=42
    )


def scarcity_config():
    """Check recognition < deficit."""
    return SimConfig(
        N=200, K_prototypes=5, T_steps=500, snapshot_interval=50, seed=42
    )


def collision_config():
    """Mixed strategies for collision harm measurement."""
    return SimConfig(
        N=200, K_prototypes=5, T_steps=500, snapshot_interval=50, seed=42
    )


def competing_attractors_config():
    """Two distinct T prototypes."""
    return SimConfig(
        N=50, K_prototypes=2, T_steps=1000, snapshot_interval=10, seed=42
    )


def trap_enclosure_config():
    """Trap attractor gamma sweep."""
    return SimConfig(
        N=50, K_prototypes=1, T_steps=1000, snapshot_interval=10, seed=42
    )


def preferential_convergence_config():
    """Multi-prototype convergence check."""
    return SimConfig(
        N=100, K_prototypes=2, T_steps=1500, snapshot_interval=10, seed=42
    )
