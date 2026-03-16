"""Math primitives: subjects, grammars, distortion, projection, recognition signal."""

import numpy as np


def make_subjects(N, D, rng):
    """Create N unit-normalized subject vectors in R^D."""
    S = rng.standard_normal((N, D))
    norms = np.linalg.norm(S, axis=1, keepdims=True)
    S /= norms
    return S


def make_grammar(D, n, rng):
    """Create orthonormal basis V_B (D x n) for a grammar subspace.

    Returns V_B such that V_B.T @ V_B = I_n.
    """
    A = rng.standard_normal((D, n))
    V_B, _ = np.linalg.qr(A)
    return V_B[:, :n]


def make_distortion(n, fix_dim, rng):
    """Create distortion operator T_B (n x n) with prescribed Fix(T) dimension.

    Fix(T) has dimension fix_dim (eigenvalue-1 eigenvectors).
    Remaining eigenvectors get eigenvalues from Uniform(0.3, 0.9).
    T = Q @ diag(lambda) @ Q.T where Q is orthogonal.
    """
    # Random orthogonal matrix
    A = rng.standard_normal((n, n))
    Q, _ = np.linalg.qr(A)

    # Eigenvalues: fix_dim ones are 1.0, rest drawn from U(0.3, 0.9)
    eigenvalues = np.empty(n)
    eigenvalues[:fix_dim] = 1.0
    eigenvalues[fix_dim:] = rng.uniform(0.3, 0.9, n - fix_dim)

    T = Q @ np.diag(eigenvalues) @ Q.T
    return T, Q, eigenvalues


def project_to_ambient(coeffs, V_B):
    """Convert n-dim grammar coefficients to D-dim ambient vector: V_B @ coeffs."""
    return V_B @ coeffs


def project_to_subspace(s, V_B):
    """Project ambient vector s onto grammar subspace, return n-dim coefficients: V_B.T @ s."""
    return V_B.T @ s


def project_to_ambient_full(s, V_B):
    """Full projection F_B(s) = V_B @ V_B.T @ s, returns D-dim vector."""
    return V_B @ (V_B.T @ s)


def remainder_norm(s, V_B):
    """Compute ||r_i|| = ||s_i - F_B(s_i)||."""
    proj = project_to_ambient_full(s, V_B)
    return np.linalg.norm(s - proj)


def recognition_signal(f, T, epsilon):
    """Compute sigma = exp(-||Tf - f||^2 / (2 epsilon^2)).

    f is n-dimensional (in grammar coordinates).
    T is n x n distortion operator.
    """
    diff = T @ f - f
    return np.exp(-np.dot(diff, diff) / (2.0 * epsilon ** 2))


def recognition_signal_batch(F, T, epsilon):
    """Compute recognition signals for multiple forms against one T.

    F: (M, n) array of forms
    T: (n, n) distortion operator
    Returns: (M,) array of signals
    """
    diff = F @ T.T - F  # (M, n) — each row is T@f - f
    sq_norms = np.sum(diff ** 2, axis=1)
    return np.exp(-sq_norms / (2.0 * epsilon ** 2))


def fix_projection(T, Q, eigenvalues, fix_dim):
    """Return projection matrix onto Fix(T) in grammar coordinates.

    P_fix = Q[:, :fix_dim] @ Q[:, :fix_dim].T (n x n)
    """
    Q_fix = Q[:, :fix_dim]
    return Q_fix @ Q_fix.T
