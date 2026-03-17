import { useState, useRef, useEffect, useCallback } from 'react';

// ═══════════════════════════════════════════════════════════
// Constants
// ═══════════════════════════════════════════════════════════
const NUM_ANGLES = 72;
const TWO_PI = Math.PI * 2;
const ANGLE_STEP = TWO_PI / NUM_ANGLES;
const SIGMA = 0.45;
const EXTENSION = 0.55;
const NOISE_AMP = 0.05;
const ASPECT = 0.625;
const PLAY_SPEED = 6 / 30;
const BG = '#0e0e0e';

const HUES = {
  M: 340, D: 220, B: 45,
  F1: 150, F2: 270, F3: 180,
  N1: 25, N2: 195,
  W1: 250, W2: 10,
  L: 0,
  G: 48,
};

const LABELS = {
  M: 'M', D: 'D', B: 'B',
  F1: 'F\u2081', F2: 'F\u2082', F3: 'F\u2083',
  N1: 'N\u2081', N2: 'N\u2082',
  W1: 'W\u2081', W2: 'W\u2082',
  L: 'L',
  G: 'G',
};

// ═══════════════════════════════════════════════════════════
// Shared early stages (all scenarios)
// ═══════════════════════════════════════════════════════════
const BIRTH = {
  label: 'Birth', short: 'Birth', age: 0,
  note: 'A child arrives with a nature not yet known to anyone',
  persons: {
    M: { x: 0.42, y: 0.33, r: 0.095, att: { D: 0.7, B: 0.9 } },
    D: { x: 0.58, y: 0.33, r: 0.085, att: { M: 0.7, B: 0.85 } },
    B: { x: 0.50, y: 0.58, r: 0.035, att: { M: 0.6, D: 0.5 } },
  },
};

const EARLY = {
  label: 'Early Childhood', short: 'Early', age: 4,
  note: 'The world is the family; the family is the world',
  persons: {
    M: { x: 0.38, y: 0.30, r: 0.09, att: { D: 0.6, B: 0.85 } },
    D: { x: 0.62, y: 0.30, r: 0.085, att: { M: 0.6, B: 0.75 } },
    B: { x: 0.50, y: 0.53, r: 0.055, att: { M: 0.8, D: 0.7 } },
  },
};

// ═══════════════════════════════════════════════════════════
// Scenario: Drift (gradual separation)
// ═══════════════════════════════════════════════════════════
const DRIFT = [
  BIRTH, EARLY,
  {
    label: 'Elementary School', short: 'School', age: 8,
    note: 'New fields pull attention in new directions',
    persons: {
      M: { x: 0.25, y: 0.28, r: 0.08, att: { D: 0.5, B: 0.65 } },
      D: { x: 0.38, y: 0.24, r: 0.075, att: { M: 0.5, B: 0.55 } },
      B: { x: 0.45, y: 0.50, r: 0.065, att: { M: 0.5, D: 0.45, F1: 0.5, F2: 0.4 } },
      F1: { x: 0.65, y: 0.52, r: 0.055, att: { B: 0.5, F2: 0.3 } },
      F2: { x: 0.75, y: 0.42, r: 0.05, att: { B: 0.35, F1: 0.3 } },
    },
  },
  {
    label: 'Middle School', short: 'Middle', age: 12,
    note: 'The peer group becomes a second gravity',
    persons: {
      M: { x: 0.18, y: 0.25, r: 0.07, att: { D: 0.5, B: 0.5 } },
      D: { x: 0.28, y: 0.22, r: 0.065, att: { M: 0.5, B: 0.4 } },
      B: { x: 0.42, y: 0.50, r: 0.075, att: { M: 0.3, D: 0.25, F1: 0.65, F2: 0.6, F3: 0.5 } },
      F1: { x: 0.62, y: 0.45, r: 0.06, att: { B: 0.55, F2: 0.4, F3: 0.35 } },
      F2: { x: 0.72, y: 0.38, r: 0.055, att: { B: 0.5, F1: 0.4, F3: 0.3 } },
      F3: { x: 0.67, y: 0.58, r: 0.05, att: { B: 0.45, F1: 0.35, F2: 0.3 } },
    },
  },
  {
    label: 'High School', short: 'HS', age: 16,
    note: 'Not imitation \u2014 convergence on what the shared world makes glow',
    persons: {
      M: { x: 0.12, y: 0.25, r: 0.065, att: { D: 0.5, B: 0.4 } },
      D: { x: 0.22, y: 0.22, r: 0.06, att: { M: 0.5, B: 0.35 } },
      B: { x: 0.38, y: 0.50, r: 0.08, att: { M: 0.2, D: 0.15, F1: 0.7, F2: 0.65, F3: 0.55 } },
      F1: { x: 0.58, y: 0.42, r: 0.065, att: { B: 0.65, F2: 0.5, F3: 0.45 } },
      F2: { x: 0.68, y: 0.38, r: 0.06, att: { B: 0.55, F1: 0.5, F3: 0.4 } },
      F3: { x: 0.63, y: 0.55, r: 0.055, att: { B: 0.5, F1: 0.45, F2: 0.4 } },
    },
  },
  {
    label: 'College', short: 'College', age: 20,
    note: 'The prior begins to form \u2014 others learn how to read you',
    persons: {
      M: { x: 0.10, y: 0.22, r: 0.06, att: { D: 0.5, B: 0.35 } },
      D: { x: 0.20, y: 0.20, r: 0.055, att: { M: 0.5, B: 0.3 } },
      B: { x: 0.42, y: 0.48, r: 0.085, att: { M: 0.15, D: 0.12, N1: 0.65, N2: 0.55 } },
      N1: { x: 0.62, y: 0.45, r: 0.06, att: { B: 0.6, N2: 0.4 } },
      N2: { x: 0.72, y: 0.52, r: 0.055, att: { B: 0.5, N1: 0.4 } },
    },
  },
  {
    label: 'Early Career', short: 'Career', age: 26,
    note: 'Being understood becomes being trapped',
    persons: {
      M: { x: 0.10, y: 0.20, r: 0.055, att: { D: 0.5, B: 0.3 } },
      D: { x: 0.20, y: 0.18, r: 0.05, att: { M: 0.5, B: 0.25 } },
      B: { x: 0.40, y: 0.42, r: 0.085, att: { M: 0.12, D: 0.1, N1: 0.45, W1: 0.5, W2: 0.4 } },
      N1: { x: 0.60, y: 0.32, r: 0.055, att: { B: 0.4 } },
      W1: { x: 0.55, y: 0.65, r: 0.055, att: { B: 0.45, W2: 0.4 } },
      W2: { x: 0.68, y: 0.70, r: 0.05, att: { B: 0.35, W1: 0.4 } },
    },
  },
];

// ═══════════════════════════════════════════════════════════
// Scenario: Fracture (sharp break from parents)
// ═══════════════════════════════════════════════════════════
const FRACTURE = [
  BIRTH, EARLY,
  {
    label: 'Elementary School', short: 'School', age: 8,
    note: 'The first taste of a world parents cannot see',
    persons: {
      M: { x: 0.20, y: 0.25, r: 0.075, att: { D: 0.5, B: 0.55 } },
      D: { x: 0.32, y: 0.22, r: 0.07, att: { M: 0.5, B: 0.45 } },
      B: { x: 0.45, y: 0.50, r: 0.065, att: { M: 0.35, D: 0.3, F1: 0.6, F2: 0.5 } },
      F1: { x: 0.65, y: 0.50, r: 0.055, att: { B: 0.55, F2: 0.35 } },
      F2: { x: 0.75, y: 0.42, r: 0.05, att: { B: 0.45, F1: 0.35 } },
    },
  },
  {
    label: 'Middle School', short: 'Middle', age: 12,
    note: 'The break begins \u2014 not in anger, but in distance',
    persons: {
      M: { x: 0.10, y: 0.20, r: 0.06, att: { D: 0.5, B: 0.35 } },
      D: { x: 0.18, y: 0.18, r: 0.055, att: { M: 0.5, B: 0.25 } },
      B: { x: 0.42, y: 0.50, r: 0.08, att: { M: 0.1, D: 0.08, F1: 0.75, F2: 0.7, F3: 0.6 } },
      F1: { x: 0.60, y: 0.42, r: 0.065, att: { B: 0.65, F2: 0.45, F3: 0.4 } },
      F2: { x: 0.70, y: 0.36, r: 0.06, att: { B: 0.6, F1: 0.45, F3: 0.35 } },
      F3: { x: 0.65, y: 0.56, r: 0.055, att: { B: 0.55, F1: 0.4, F2: 0.35 } },
    },
  },
  {
    label: 'High School', short: 'HS', age: 16,
    note: 'What the family cannot hold, the group absorbs',
    persons: {
      M: { x: 0.07, y: 0.18, r: 0.05, att: { D: 0.5, B: 0.25 } },
      D: { x: 0.14, y: 0.15, r: 0.045, att: { M: 0.5, B: 0.2 } },
      B: { x: 0.40, y: 0.48, r: 0.09, att: { M: 0.04, D: 0.03, F1: 0.8, F2: 0.75, F3: 0.7 } },
      F1: { x: 0.58, y: 0.40, r: 0.07, att: { B: 0.75, F2: 0.55, F3: 0.5 } },
      F2: { x: 0.68, y: 0.36, r: 0.065, att: { B: 0.65, F1: 0.55, F3: 0.45 } },
      F3: { x: 0.62, y: 0.55, r: 0.06, att: { B: 0.6, F1: 0.5, F2: 0.45 } },
    },
  },
  {
    label: 'College', short: 'College', age: 20,
    note: 'Freedom from the prior \u2014 but into what?',
    persons: {
      M: { x: 0.06, y: 0.15, r: 0.04, att: { D: 0.5, B: 0.15 } },
      D: { x: 0.12, y: 0.13, r: 0.035, att: { M: 0.5, B: 0.1 } },
      B: { x: 0.42, y: 0.46, r: 0.09, att: { M: 0.03, D: 0.02, N1: 0.7, N2: 0.6 } },
      N1: { x: 0.62, y: 0.42, r: 0.065, att: { B: 0.65, N2: 0.45 } },
      N2: { x: 0.72, y: 0.52, r: 0.06, att: { B: 0.55, N1: 0.45 } },
    },
  },
  {
    label: 'Early Career', short: 'Career', age: 26,
    note: 'The remainder grows where connection was severed',
    persons: {
      M: { x: 0.06, y: 0.14, r: 0.035, att: { D: 0.5, B: 0.1 } },
      D: { x: 0.12, y: 0.12, r: 0.03, att: { M: 0.5, B: 0.08 } },
      B: { x: 0.40, y: 0.44, r: 0.095, att: { M: 0.02, D: 0.01, N1: 0.3, W1: 0.4, W2: 0.35 } },
      N1: { x: 0.62, y: 0.30, r: 0.045, att: { B: 0.25 } },
      W1: { x: 0.55, y: 0.68, r: 0.05, att: { B: 0.35, W2: 0.35 } },
      W2: { x: 0.68, y: 0.72, r: 0.045, att: { B: 0.3, W1: 0.35 } },
    },
  },
];

// ═══════════════════════════════════════════════════════════
// Scenario: Alignment (stays close to parents)
// ═══════════════════════════════════════════════════════════
const ALIGNMENT = [
  BIRTH, EARLY,
  {
    label: 'Elementary School', short: 'School', age: 8,
    note: 'Friends arrive, but the family grammar holds',
    persons: {
      M: { x: 0.32, y: 0.30, r: 0.085, att: { D: 0.5, B: 0.8 } },
      D: { x: 0.48, y: 0.26, r: 0.08, att: { M: 0.5, B: 0.7 } },
      B: { x: 0.42, y: 0.48, r: 0.065, att: { M: 0.75, D: 0.7, F1: 0.3, F2: 0.25 } },
      F1: { x: 0.65, y: 0.52, r: 0.045, att: { B: 0.3, F2: 0.2 } },
      F2: { x: 0.74, y: 0.44, r: 0.04, att: { B: 0.25, F1: 0.2 } },
    },
  },
  {
    label: 'Middle School', short: 'Middle', age: 12,
    note: 'The peer group orbits the same values',
    persons: {
      M: { x: 0.28, y: 0.28, r: 0.08, att: { D: 0.5, B: 0.75 } },
      D: { x: 0.42, y: 0.24, r: 0.075, att: { M: 0.5, B: 0.65 } },
      B: { x: 0.40, y: 0.46, r: 0.075, att: { M: 0.7, D: 0.65, F1: 0.35, F2: 0.3, F3: 0.25 } },
      F1: { x: 0.62, y: 0.46, r: 0.05, att: { B: 0.35, F2: 0.25, F3: 0.2 } },
      F2: { x: 0.70, y: 0.38, r: 0.045, att: { B: 0.3, F1: 0.25, F3: 0.2 } },
      F3: { x: 0.66, y: 0.56, r: 0.04, att: { B: 0.25, F1: 0.2, F2: 0.2 } },
    },
  },
  {
    label: 'High School', short: 'HS', age: 16,
    note: 'Tight alignment \u2014 recognition without remainder?',
    persons: {
      M: { x: 0.24, y: 0.26, r: 0.075, att: { D: 0.5, B: 0.7 } },
      D: { x: 0.38, y: 0.22, r: 0.07, att: { M: 0.5, B: 0.6 } },
      B: { x: 0.38, y: 0.44, r: 0.08, att: { M: 0.65, D: 0.6, F1: 0.4, F2: 0.35, F3: 0.3 } },
      F1: { x: 0.58, y: 0.42, r: 0.055, att: { B: 0.4, F2: 0.3, F3: 0.25 } },
      F2: { x: 0.66, y: 0.36, r: 0.05, att: { B: 0.35, F1: 0.3, F3: 0.25 } },
      F3: { x: 0.62, y: 0.54, r: 0.045, att: { B: 0.3, F1: 0.25, F2: 0.25 } },
    },
  },
  {
    label: 'College', short: 'College', age: 20,
    note: 'The prior hardens earliest where love is strongest',
    persons: {
      M: { x: 0.20, y: 0.24, r: 0.07, att: { D: 0.5, B: 0.6 } },
      D: { x: 0.32, y: 0.20, r: 0.065, att: { M: 0.5, B: 0.55 } },
      B: { x: 0.36, y: 0.44, r: 0.085, att: { M: 0.55, D: 0.5, N1: 0.4, N2: 0.35 } },
      N1: { x: 0.55, y: 0.40, r: 0.05, att: { B: 0.4, N2: 0.3 } },
      N2: { x: 0.64, y: 0.48, r: 0.045, att: { B: 0.35, N1: 0.3 } },
    },
  },
  {
    label: 'Early Career', short: 'Career', age: 26,
    note: 'To be fully known is to be fully managed',
    persons: {
      M: { x: 0.18, y: 0.22, r: 0.065, att: { D: 0.5, B: 0.55 } },
      D: { x: 0.30, y: 0.19, r: 0.06, att: { M: 0.5, B: 0.5 } },
      B: { x: 0.35, y: 0.42, r: 0.085, att: { M: 0.5, D: 0.45, N1: 0.3, W1: 0.4, W2: 0.35 } },
      N1: { x: 0.55, y: 0.32, r: 0.045, att: { B: 0.3 } },
      W1: { x: 0.48, y: 0.62, r: 0.05, att: { B: 0.35, W2: 0.3 } },
      W2: { x: 0.62, y: 0.66, r: 0.045, att: { B: 0.3, W1: 0.3 } },
    },
  },
];

// ═══════════════════════════════════════════════════════════
// Scenario: Rivalry (convergent desire, love triangle)
// ═══════════════════════════════════════════════════════════
const RIVALRY = [
  {
    label: 'The Circle', short: 'Circle', age: 22,
    note: 'A loose social field \u2014 everyone visible, no one yet claimed',
    persons: {
      B: { x: 0.30, y: 0.45, r: 0.07, att: { F1: 0.5, F2: 0.4, F3: 0.3 } },
      F1: { x: 0.45, y: 0.30, r: 0.065, att: { B: 0.45, F2: 0.35, F3: 0.3 } },
      F2: { x: 0.60, y: 0.50, r: 0.06, att: { B: 0.35, F1: 0.35, F3: 0.3 } },
      F3: { x: 0.42, y: 0.62, r: 0.055, att: { B: 0.3, F1: 0.25, F2: 0.3 } },
      L: { x: 0.75, y: 0.38, r: 0.06, att: { F2: 0.2 } },
    },
  },
  {
    label: 'L Arrives', short: 'Arrival', age: 22,
    note: 'A new presence enters and the field rearranges around it',
    persons: {
      B: { x: 0.28, y: 0.45, r: 0.07, att: { F1: 0.45, F2: 0.3, F3: 0.25, L: 0.4 } },
      F1: { x: 0.42, y: 0.30, r: 0.065, att: { B: 0.4, F2: 0.25, F3: 0.2, L: 0.45 } },
      F2: { x: 0.55, y: 0.55, r: 0.055, att: { B: 0.3, F1: 0.25, F3: 0.3 } },
      F3: { x: 0.38, y: 0.65, r: 0.05, att: { B: 0.25, F2: 0.3 } },
      L: { x: 0.65, y: 0.38, r: 0.065, att: { F1: 0.2, B: 0.15, F2: 0.15 } },
    },
  },
  {
    label: 'Convergence', short: 'Converge', age: 23,
    note: 'Two fields stretch toward the same glow \u2014 rivalry enters before malice',
    persons: {
      B: { x: 0.25, y: 0.45, r: 0.08, att: { F1: 0.2, F2: 0.15, L: 0.75 } },
      F1: { x: 0.40, y: 0.28, r: 0.075, att: { B: 0.15, L: 0.8 } },
      F2: { x: 0.50, y: 0.60, r: 0.05, att: { B: 0.2, F3: 0.3 } },
      F3: { x: 0.35, y: 0.68, r: 0.045, att: { F2: 0.3 } },
      L: { x: 0.62, y: 0.38, r: 0.07, att: { B: 0.3, F1: 0.35 } },
    },
  },
  {
    label: 'Curation', short: 'Curate', age: 23,
    note: 'The self reshapes to pass through the bottleneck of legibility',
    persons: {
      B: { x: 0.28, y: 0.42, r: 0.085, att: { L: 0.85, F1: 0.1, F2: 0.08 } },
      F1: { x: 0.42, y: 0.25, r: 0.08, att: { L: 0.85, B: 0.05 } },
      F2: { x: 0.48, y: 0.65, r: 0.04, att: { F3: 0.3 } },
      F3: { x: 0.35, y: 0.72, r: 0.035, att: { F2: 0.25 } },
      L: { x: 0.60, y: 0.36, r: 0.075, att: { F1: 0.5, B: 0.25 } },
    },
  },
  {
    label: 'Selection', short: 'Select', age: 24,
    note: 'L\u2019s field tilts \u2014 one is received, one is remainder',
    persons: {
      B: { x: 0.22, y: 0.42, r: 0.075, att: { L: 0.7, F1: 0.05 } },
      F1: { x: 0.48, y: 0.28, r: 0.075, att: { L: 0.7 } },
      L: { x: 0.60, y: 0.38, r: 0.08, att: { F1: 0.7, B: 0.1 } },
      F2: { x: 0.50, y: 0.68, r: 0.035, att: { F3: 0.25 } },
      F3: { x: 0.38, y: 0.74, r: 0.03, att: { F2: 0.2 } },
    },
  },
  {
    label: 'Withdrawal', short: 'Withdraw', age: 24,
    note: 'The form that failed to secure the return contracts inward',
    persons: {
      B: { x: 0.18, y: 0.48, r: 0.06, att: { L: 0.2, F2: 0.15 } },
      F1: { x: 0.52, y: 0.32, r: 0.07, att: { L: 0.75 } },
      L: { x: 0.62, y: 0.40, r: 0.075, att: { F1: 0.75 } },
      F2: { x: 0.35, y: 0.65, r: 0.04, att: { B: 0.2, F3: 0.2 } },
      F3: { x: 0.28, y: 0.72, r: 0.035, att: { F2: 0.2 } },
    },
  },
  {
    label: 'After', short: 'After', age: 25,
    note: 'The remainder remembers what the field once reached for',
    persons: {
      B: { x: 0.20, y: 0.48, r: 0.065, att: { F2: 0.3, N1: 0.25 } },
      F1: { x: 0.60, y: 0.35, r: 0.065, att: { L: 0.7 } },
      L: { x: 0.68, y: 0.42, r: 0.065, att: { F1: 0.7 } },
      F2: { x: 0.32, y: 0.62, r: 0.045, att: { B: 0.3, N1: 0.2 } },
      N1: { x: 0.38, y: 0.38, r: 0.05, att: { B: 0.25, F2: 0.2 } },
    },
  },
];

// ═══════════════════════════════════════════════════════════
// Scenario: Orientation (shared orientation toward God)
// ═══════════════════════════════════════════════════════════
const ORIENTATION = [
  {
    label: 'Family of God', short: 'Family', age: 0,
    note: 'All attention flows upward \u2014 and through that, toward each other',
    persons: {
      G: { x: 0.50, y: 0.10, r: 0.13, att: { M: 0.7, D: 0.7, B: 0.8 } },
      M: { x: 0.35, y: 0.42, r: 0.085, att: { D: 0.6, B: 0.8, G: 0.7 } },
      D: { x: 0.62, y: 0.40, r: 0.08, att: { M: 0.6, B: 0.75, G: 0.65 } },
      B: { x: 0.48, y: 0.62, r: 0.035, att: { M: 0.5, D: 0.4, G: 0.3 } },
    },
  },
  {
    label: 'Childhood', short: 'Child', age: 4,
    note: 'The child learns to look where the parents look',
    persons: {
      G: { x: 0.50, y: 0.10, r: 0.13, att: { M: 0.7, D: 0.7, B: 0.8 } },
      M: { x: 0.32, y: 0.40, r: 0.08, att: { D: 0.55, B: 0.8, G: 0.7 } },
      D: { x: 0.64, y: 0.38, r: 0.075, att: { M: 0.55, B: 0.7, G: 0.65 } },
      B: { x: 0.48, y: 0.58, r: 0.055, att: { M: 0.7, D: 0.6, G: 0.5 } },
    },
  },
  {
    label: 'School', short: 'School', age: 8,
    note: 'Church friends overlap before they even know each other well',
    persons: {
      G: { x: 0.50, y: 0.08, r: 0.13, att: { M: 0.6, D: 0.6, B: 0.8, F1: 0.6, F2: 0.6 } },
      M: { x: 0.22, y: 0.38, r: 0.07, att: { D: 0.5, B: 0.65, G: 0.65 } },
      D: { x: 0.38, y: 0.34, r: 0.065, att: { M: 0.5, B: 0.55, G: 0.6 } },
      B: { x: 0.45, y: 0.52, r: 0.065, att: { M: 0.45, D: 0.4, F1: 0.4, F2: 0.35, G: 0.55 } },
      F1: { x: 0.62, y: 0.48, r: 0.055, att: { B: 0.4, F2: 0.3, G: 0.5 } },
      F2: { x: 0.72, y: 0.42, r: 0.05, att: { B: 0.3, F1: 0.3, G: 0.45 } },
    },
  },
  {
    label: 'Adolescence', short: 'Teen', age: 13,
    note: 'A friend without the shared orientation drifts at the edge',
    persons: {
      G: { x: 0.50, y: 0.08, r: 0.13, att: { M: 0.6, D: 0.6, B: 0.8, F1: 0.6, F2: 0.6 } },
      M: { x: 0.18, y: 0.35, r: 0.065, att: { D: 0.5, B: 0.55, G: 0.6 } },
      D: { x: 0.32, y: 0.30, r: 0.06, att: { M: 0.5, B: 0.5, G: 0.55 } },
      B: { x: 0.44, y: 0.50, r: 0.075, att: { M: 0.3, D: 0.25, F1: 0.5, F2: 0.4, F3: 0.3, G: 0.5 } },
      F1: { x: 0.58, y: 0.42, r: 0.06, att: { B: 0.45, F2: 0.35, G: 0.5 } },
      F2: { x: 0.68, y: 0.38, r: 0.055, att: { B: 0.35, F1: 0.35, G: 0.4 } },
      F3: { x: 0.78, y: 0.62, r: 0.05, att: { B: 0.3, F1: 0.15 } },
    },
  },
  {
    label: 'High School', short: 'HS', age: 16,
    note: 'The oriented overlap even when they barely know each other',
    persons: {
      G: { x: 0.50, y: 0.08, r: 0.13, att: { M: 0.6, D: 0.6, B: 0.8, F1: 0.6, F2: 0.6 } },
      M: { x: 0.14, y: 0.32, r: 0.06, att: { D: 0.5, B: 0.45, G: 0.6 } },
      D: { x: 0.26, y: 0.28, r: 0.055, att: { M: 0.5, B: 0.4, G: 0.55 } },
      B: { x: 0.42, y: 0.48, r: 0.08, att: { M: 0.2, D: 0.15, F1: 0.55, F2: 0.45, G: 0.5 } },
      F1: { x: 0.56, y: 0.40, r: 0.065, att: { B: 0.5, F2: 0.4, G: 0.5 } },
      F2: { x: 0.68, y: 0.36, r: 0.06, att: { B: 0.4, F1: 0.4, G: 0.45 } },
      F3: { x: 0.82, y: 0.65, r: 0.045, att: { B: 0.15 } },
    },
  },
  {
    label: 'College', short: 'College', age: 20,
    note: 'A stranger who shares the orientation overlaps immediately',
    persons: {
      G: { x: 0.50, y: 0.08, r: 0.13, att: { M: 0.5, D: 0.5, B: 0.8, F1: 0.5, N1: 0.6, N2: 0.3 } },
      M: { x: 0.10, y: 0.30, r: 0.055, att: { D: 0.5, B: 0.35, G: 0.55 } },
      D: { x: 0.20, y: 0.27, r: 0.05, att: { M: 0.5, B: 0.3, G: 0.5 } },
      B: { x: 0.40, y: 0.48, r: 0.08, att: { M: 0.15, D: 0.12, F1: 0.25, N1: 0.5, N2: 0.25, G: 0.5 } },
      F1: { x: 0.62, y: 0.55, r: 0.05, att: { B: 0.3, G: 0.45 } },
      N1: { x: 0.58, y: 0.38, r: 0.06, att: { B: 0.45, N2: 0.2, G: 0.5 } },
      N2: { x: 0.75, y: 0.58, r: 0.05, att: { B: 0.2, N1: 0.15 } },
    },
  },
  {
    label: 'Career', short: 'Career', age: 26,
    note: 'Scattered across the world \u2014 still overlapping through what they share',
    persons: {
      G: { x: 0.50, y: 0.08, r: 0.13, att: { M: 0.5, D: 0.5, B: 0.8, F1: 0.5, N1: 0.6, W1: 0.4 } },
      M: { x: 0.08, y: 0.32, r: 0.05, att: { D: 0.5, B: 0.3, G: 0.55 } },
      D: { x: 0.16, y: 0.28, r: 0.045, att: { M: 0.5, B: 0.25, G: 0.5 } },
      B: { x: 0.38, y: 0.48, r: 0.08, att: { M: 0.12, D: 0.1, N1: 0.35, W1: 0.35, G: 0.5 } },
      F1: { x: 0.72, y: 0.52, r: 0.045, att: { B: 0.15, G: 0.45 } },
      N1: { x: 0.55, y: 0.38, r: 0.055, att: { B: 0.3, G: 0.45 } },
      W1: { x: 0.50, y: 0.65, r: 0.05, att: { B: 0.3, G: 0.4 } },
      W2: { x: 0.68, y: 0.70, r: 0.04, att: { W1: 0.25 } },
    },
  },
];

// ═══════════════════════════════════════════════════════════
// Scenarios registry
// ═══════════════════════════════════════════════════════════
const SCENARIOS = {
  drift: { label: 'Drift', desc: 'Gradual separation from parents', stages: DRIFT },
  fracture: { label: 'Fracture', desc: 'Sharp break from parents', stages: FRACTURE },
  alignment: { label: 'Alignment', desc: 'Stays close to parents', stages: ALIGNMENT },
  rivalry: { label: 'Rivalry', desc: 'Convergent desire, failed recognition', stages: RIVALRY },
  orientation: { label: 'Orientation', desc: 'Shared orientation toward God', stages: ORIENTATION },
};

const SCENARIO_KEYS = Object.keys(SCENARIOS);

// ═══════════════════════════════════════════════════════════
// Utilities
// ═══════════════════════════════════════════════════════════
function lerp(a, b, t) {
  return a + (b - a) * t;
}

function smoothstep(t) {
  return t * t * (3 - 2 * t);
}

function angleDist(a, b) {
  let d = Math.abs(a - b) % TWO_PI;
  return d > Math.PI ? TWO_PI - d : d;
}

function gaussian(x, sigma) {
  return Math.exp(-(x * x) / (2 * sigma * sigma));
}

function hsl(id, alpha) {
  if (id === 'G') return `rgba(255, 248, 220, ${alpha})`;
  const h = HUES[id] || 0;
  return `hsla(${h}, 50%, 52%, ${alpha})`;
}

// ═══════════════════════════════════════════════════════════
// Interpolation
// ═══════════════════════════════════════════════════════════
function lerpAtt(a, b, t) {
  const result = {};
  const keys = new Set([...Object.keys(a || {}), ...Object.keys(b || {})]);
  for (const k of keys) {
    const v = lerp((a && a[k]) || 0, (b && b[k]) || 0, t);
    if (v > 0.01) result[k] = v;
  }
  return result;
}

function lerpPerson(a, b, t) {
  return {
    x: lerp(a.x, b.x, t),
    y: lerp(a.y, b.y, t),
    r: lerp(a.r, b.r, t),
    op: lerp(a.op !== undefined ? a.op : 1, b.op !== undefined ? b.op : 1, t),
    att: lerpAtt(a.att, b.att, t),
  };
}

function interpolate(tVal, stages) {
  const maxT = stages.length - 1;
  const clamped = Math.max(0, Math.min(tVal, maxT));
  const idx = Math.min(Math.floor(clamped), maxT);
  const frac = smoothstep(clamped - idx);

  const sA = stages[idx];
  const sB = stages[Math.min(idx + 1, maxT)];

  const allIds = new Set([...Object.keys(sA.persons), ...Object.keys(sB.persons)]);
  const persons = {};

  for (const id of allIds) {
    const a = sA.persons[id];
    const b = sB.persons[id];
    if (a && b) {
      persons[id] = lerpPerson(a, b, frac);
    } else if (a) {
      persons[id] = lerpPerson(a, { ...a, op: 0, r: a.r * 0.3 }, frac);
    } else {
      persons[id] = lerpPerson({ ...b, op: 0, r: b.r * 0.3 }, b, frac);
    }
  }

  let note = '';
  let noteAlpha = 0;
  for (let i = 0; i <= maxT; i++) {
    const a = Math.max(0, 1 - Math.abs(clamped - i) * 1.2);
    if (a > noteAlpha) {
      noteAlpha = a;
      note = stages[i].note || '';
    }
  }

  return { persons, note, noteAlpha };
}

// ═══════════════════════════════════════════════════════════
// Blob geometry
// ═══════════════════════════════════════════════════════════
function blobPoints(person, id, all, W, H, time) {
  const px = person.x * W;
  const py = person.y * H;
  const baseR = person.r * W;
  const seed = (HUES[id] || 0) * 0.1;

  const pts = [];
  for (let i = 0; i < NUM_ANGLES; i++) {
    const theta = i * ANGLE_STEP;
    let r = baseR;

    const att = person.att || {};
    for (const [tid, weight] of Object.entries(att)) {
      const target = all[tid];
      if (!target || (target.op || 0) < 0.01) continue;

      const tx = target.x * W;
      const ty = target.y * H;
      const dx = tx - px;
      const dy = ty - py;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < 1) continue;

      const ang = Math.atan2(dy, dx);
      const ew = weight * (target.op !== undefined ? target.op : 1);
      r += ew * EXTENSION * dist * gaussian(angleDist(theta, ang), SIGMA);
    }

    let n = 0;
    for (let k = 1; k <= 4; k++) {
      n += Math.sin(k * theta + seed * k * 1.7 + time * 0.0004 * k) * NOISE_AMP / k;
    }
    r *= (1 + n);
    r = Math.max(r, baseR * 0.3);

    pts.push({ x: px + r * Math.cos(theta), y: py + r * Math.sin(theta) });
  }
  return pts;
}

// ═══════════════════════════════════════════════════════════
// Canvas rendering
// ═══════════════════════════════════════════════════════════
function smoothPath(ctx, pts) {
  const n = pts.length;
  if (n < 3) return;
  ctx.beginPath();
  const mx0 = (pts[n - 1].x + pts[0].x) / 2;
  const my0 = (pts[n - 1].y + pts[0].y) / 2;
  ctx.moveTo(mx0, my0);
  for (let i = 0; i < n; i++) {
    const next = (i + 1) % n;
    ctx.quadraticCurveTo(
      pts[i].x, pts[i].y,
      (pts[i].x + pts[next].x) / 2,
      (pts[i].y + pts[next].y) / 2
    );
  }
  ctx.closePath();
}

function draw(ctx, state, W, H, time) {
  ctx.fillStyle = BG;
  ctx.fillRect(0, 0, W, H);

  const { persons, note, noteAlpha } = state;

  const ids = Object.keys(persons).sort((a, b) => {
    if (a === 'B') return 1;
    if (b === 'B') return -1;
    return 0;
  });

  for (const id of ids) {
    const p = persons[id];
    if (p.op < 0.01) continue;

    const pts = blobPoints(p, id, persons, W, H, time);
    smoothPath(ctx, pts);
    ctx.fillStyle = hsl(id, 0.18 * p.op);
    ctx.fill();
    ctx.strokeStyle = hsl(id, 0.4 * p.op);
    ctx.lineWidth = 1.8;
    ctx.stroke();
  }

  for (const id of ids) {
    const p = persons[id];
    if (p.op < 0.01) continue;

    const cx = p.x * W;
    const cy = p.y * H;
    const nr = Math.max(10, p.r * W * 0.22);

    ctx.beginPath();
    ctx.arc(cx, cy, nr, 0, TWO_PI);
    ctx.fillStyle = hsl(id, 0.85 * p.op);
    ctx.fill();
    ctx.strokeStyle = `rgba(255,255,255,${0.5 * p.op})`;
    ctx.lineWidth = 1.5;
    ctx.stroke();

    ctx.fillStyle = `rgba(255,255,255,${0.9 * p.op})`;
    ctx.font = `bold ${Math.max(10, nr * 0.85)}px -apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(LABELS[id] || id, cx, cy + 1);
  }

  if (note && noteAlpha > 0.01) {
    const fs = Math.max(12, Math.min(14, W * 0.017));
    ctx.fillStyle = `hsla(45, 50%, 65%, ${noteAlpha * 0.85})`;
    ctx.font = `italic ${fs}px Georgia,serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'bottom';
    ctx.fillText(note, W / 2, H - 16);
  }
}

// ═══════════════════════════════════════════════════════════
// Component
// ═══════════════════════════════════════════════════════════
export default function AttentionFields() {
  const containerRef = useRef(null);
  const canvasRef = useRef(null);
  const ctxRef = useRef(null);
  const tRef = useRef(0);
  const playingRef = useRef(false);
  const lastFrameRef = useRef(null);
  const animRef = useRef(null);
  const dimsRef = useRef({ w: 800, h: 500 });
  const lastSyncRef = useRef(0);
  const scenarioRef = useRef('drift');

  const [sliderT, setSliderT] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [dims, setDims] = useState({ w: 800, h: 500 });
  const [scenario, setScenario] = useState('drift');

  const stages = SCENARIOS[scenario].stages;
  const maxT = stages.length - 1;

  useEffect(() => {
    const container = containerRef.current;
    const canvas = canvasRef.current;

    function resize(width) {
      const w = Math.round(width);
      const h = Math.round(w * ASPECT);
      dimsRef.current = { w, h };
      setDims({ w, h });

      const dpr = window.devicePixelRatio || 1;
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      canvas.style.width = w + 'px';
      canvas.style.height = h + 'px';

      const ctx = canvas.getContext('2d');
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctxRef.current = ctx;
    }

    const observer = new ResizeObserver(entries => {
      if (entries[0]) resize(entries[0].contentRect.width);
    });
    observer.observe(container);
    resize(container.offsetWidth);

    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    function frame(ts) {
      const ctx = ctxRef.current;
      const { w, h } = dimsRef.current;
      const sc = SCENARIOS[scenarioRef.current];
      const mt = sc.stages.length - 1;

      if (ctx) {
        if (playingRef.current && lastFrameRef.current != null) {
          const dt = ts - lastFrameRef.current;
          tRef.current = Math.min(tRef.current + dt * PLAY_SPEED / 1000, mt);

          if (tRef.current >= mt) {
            playingRef.current = false;
            setPlaying(false);
          }

          if (ts - lastSyncRef.current > 80) {
            setSliderT(tRef.current);
            lastSyncRef.current = ts;
          }
        }
        lastFrameRef.current = ts;

        draw(ctx, interpolate(tRef.current, sc.stages), w, h, ts);
      }

      animRef.current = requestAnimationFrame(frame);
    }

    animRef.current = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(animRef.current);
  }, []);

  const onSlider = useCallback((e) => {
    const v = parseFloat(e.target.value);
    tRef.current = v;
    setSliderT(v);
  }, []);

  const onPlay = useCallback(() => {
    const mt = SCENARIOS[scenarioRef.current].stages.length - 1;
    if (tRef.current >= mt) {
      tRef.current = 0;
      setSliderT(0);
    }
    const next = !playingRef.current;
    playingRef.current = next;
    lastFrameRef.current = null;
    setPlaying(next);
  }, []);

  const onScenario = useCallback((key) => {
    scenarioRef.current = key;
    setScenario(key);
    tRef.current = 0;
    setSliderT(0);
    playingRef.current = false;
    setPlaying(false);
    lastFrameRef.current = null;
  }, []);

  const nearest = stages[Math.min(Math.round(sliderT), maxT)];
  const labelText = `${nearest.label}  \u00b7  age ${nearest.age}`;

  return (
    <div ref={containerRef} style={S.wrap}>
      <style>{CSS}</style>
      <canvas ref={canvasRef} style={S.canvas} />
      <div style={S.scenarioRow}>
        {SCENARIO_KEYS.map(key => (
          <button
            key={key}
            onClick={() => onScenario(key)}
            style={{
              ...S.scenarioBtn,
              background: scenario === key ? '#2a2a2a' : 'transparent',
              color: scenario === key ? '#ccc' : '#666',
              borderColor: scenario === key ? '#555' : '#333',
            }}
          >
            {SCENARIOS[key].label}
          </button>
        ))}
      </div>
      <div style={S.controls}>
        <div style={S.label}>{labelText}</div>
        <div style={S.row}>
          <input
            type="range"
            className="af-range"
            min={0}
            max={maxT}
            step={0.005}
            value={sliderT}
            onChange={onSlider}
          />
          <button onClick={onPlay} style={S.btn}>
            {playing ? '\u23F8' : '\u25B6'}
          </button>
        </div>
        <div style={S.ticks}>
          {stages.map((s, i) => (
            <span
              key={i}
              style={{
                ...S.tick,
                opacity: Math.abs(sliderT - i) < 0.5 ? 1 : 0.4,
              }}
              onClick={() => { tRef.current = i; setSliderT(i); }}
            >
              {s.short}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// Styles
// ═══════════════════════════════════════════════════════════
const CSS = `
  html, body { margin: 0; padding: 0; background: ${BG}; }
  .af-range {
    -webkit-appearance: none;
    appearance: none;
    flex: 1;
    height: 3px;
    background: #333;
    border-radius: 2px;
    outline: none;
    cursor: pointer;
  }
  .af-range::-webkit-slider-thumb {
    -webkit-appearance: none;
    width: 14px;
    height: 14px;
    border-radius: 50%;
    background: #888;
    cursor: pointer;
    border: none;
  }
  .af-range::-moz-range-thumb {
    width: 14px;
    height: 14px;
    border-radius: 50%;
    background: #888;
    cursor: pointer;
    border: none;
  }
`;

const S = {
  wrap: {
    width: '100%',
    maxWidth: 900,
    margin: '0 auto',
    padding: '40px 20px 60px',
    fontFamily: '-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif',
    background: BG,
    minHeight: '100vh',
    boxSizing: 'border-box',
  },
  canvas: {
    display: 'block',
    width: '100%',
    borderRadius: 4,
  },
  scenarioRow: {
    display: 'flex',
    justifyContent: 'center',
    gap: 8,
    marginTop: 16,
  },
  scenarioBtn: {
    padding: '5px 14px',
    fontSize: 12,
    border: '1px solid #333',
    borderRadius: 14,
    cursor: 'pointer',
    letterSpacing: '0.03em',
    transition: 'all 0.2s',
    fontFamily: 'inherit',
  },
  controls: {
    marginTop: 16,
    padding: '0 4px',
  },
  label: {
    color: '#999',
    fontSize: 13,
    marginBottom: 10,
    textAlign: 'center',
    letterSpacing: '0.04em',
  },
  row: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
  },
  btn: {
    background: 'none',
    border: '1px solid #444',
    borderRadius: 4,
    color: '#999',
    fontSize: 14,
    width: 34,
    height: 28,
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 0,
    flexShrink: 0,
  },
  ticks: {
    display: 'flex',
    justifyContent: 'space-between',
    marginTop: 8,
    padding: '0 7px',
  },
  tick: {
    color: '#666',
    fontSize: 11,
    cursor: 'pointer',
    transition: 'opacity 0.3s',
    userSelect: 'none',
  },
};
