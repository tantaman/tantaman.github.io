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
  M: 340,
  D: 220,
  B: 45,
  F1: 150,
  F2: 270,
  F3: 180,
  F4: 120,
  N1: 25,
  N2: 195,
  W1: 250,
  W2: 10,
  L: 0,
  G: 48,
  P1: 30,
  P2: 70,
  P3: 100,
  P4: 135,
  P5: 200,
  P6: 240,
  P7: 285,
  P8: 315,
};

const LABELS = {
  M: 'M',
  D: 'D',
  B: 'B',
  F1: 'F\u2081',
  F2: 'F\u2082',
  F3: 'F\u2083',
  F4: 'F\u2084',
  N1: 'N\u2081',
  N2: 'N\u2082',
  W1: 'W\u2081',
  W2: 'W\u2082',
  L: 'L',
  G: 'G',
  P1: 'P\u2081',
  P2: 'P\u2082',
  P3: 'P\u2083',
  P4: 'P\u2084',
  P5: 'P\u2085',
  P6: 'P\u2086',
  P7: 'P\u2087',
  P8: 'P\u2088',
};

// ═══════════════════════════════════════════════════════════
// Shared early stages (all scenarios)
// ═══════════════════════════════════════════════════════════
const BIRTH = {
  label: 'Birth',
  short: 'Birth',
  age: 0,
  note: 'A child arrives with a nature not yet known to anyone',
  persons: {
    M: { x: 0.42, y: 0.33, r: 0.095, att: { D: 0.7, B: 0.9 } },
    D: { x: 0.58, y: 0.33, r: 0.085, att: { M: 0.7, B: 0.85 } },
    B: { x: 0.5, y: 0.58, r: 0.035, att: { M: 0.6, D: 0.5 } },
  },
};

const EARLY = {
  label: 'Early Childhood',
  short: 'Early',
  age: 4,
  note: 'The world is the family; the family is the world',
  persons: {
    M: { x: 0.38, y: 0.3, r: 0.09, att: { D: 0.6, B: 0.85 } },
    D: { x: 0.62, y: 0.3, r: 0.085, att: { M: 0.6, B: 0.75 } },
    B: { x: 0.5, y: 0.53, r: 0.055, att: { M: 0.8, D: 0.7 } },
  },
};

// ═══════════════════════════════════════════════════════════
// Scenario: Drift (gradual separation)
// ═══════════════════════════════════════════════════════════
const DRIFT = [
  BIRTH,
  EARLY,
  {
    label: 'Elementary School',
    short: 'School',
    age: 8,
    note: 'New fields pull attention in new directions',
    persons: {
      M: { x: 0.25, y: 0.28, r: 0.08, att: { D: 0.5, B: 0.65 } },
      D: { x: 0.38, y: 0.24, r: 0.075, att: { M: 0.5, B: 0.55 } },
      B: {
        x: 0.45,
        y: 0.5,
        r: 0.065,
        att: { M: 0.5, D: 0.45, F1: 0.5, F2: 0.4 },
      },
      F1: { x: 0.65, y: 0.52, r: 0.055, att: { B: 0.5, F2: 0.3 } },
      F2: { x: 0.75, y: 0.42, r: 0.05, att: { B: 0.35, F1: 0.3 } },
    },
  },
  {
    label: 'Middle School',
    short: 'Middle',
    age: 12,
    note: 'The peer group becomes a second gravity',
    persons: {
      M: { x: 0.18, y: 0.25, r: 0.07, att: { D: 0.5, B: 0.5 } },
      D: { x: 0.28, y: 0.22, r: 0.065, att: { M: 0.5, B: 0.4 } },
      B: {
        x: 0.42,
        y: 0.5,
        r: 0.075,
        att: { M: 0.3, D: 0.25, F1: 0.65, F2: 0.6, F3: 0.5 },
      },
      F1: { x: 0.62, y: 0.45, r: 0.06, att: { B: 0.55, F2: 0.4, F3: 0.35 } },
      F2: { x: 0.72, y: 0.38, r: 0.055, att: { B: 0.5, F1: 0.4, F3: 0.3 } },
      F3: { x: 0.67, y: 0.58, r: 0.05, att: { B: 0.45, F1: 0.35, F2: 0.3 } },
    },
  },
  {
    label: 'High School',
    short: 'HS',
    age: 16,
    note: 'Not imitation \u2014 convergence on what the shared world makes glow',
    persons: {
      M: { x: 0.12, y: 0.25, r: 0.065, att: { D: 0.5, B: 0.4 } },
      D: { x: 0.22, y: 0.22, r: 0.06, att: { M: 0.5, B: 0.35 } },
      B: {
        x: 0.38,
        y: 0.5,
        r: 0.08,
        att: { M: 0.2, D: 0.15, F1: 0.7, F2: 0.65, F3: 0.55 },
      },
      F1: { x: 0.58, y: 0.42, r: 0.065, att: { B: 0.65, F2: 0.5, F3: 0.45 } },
      F2: { x: 0.68, y: 0.38, r: 0.06, att: { B: 0.55, F1: 0.5, F3: 0.4 } },
      F3: { x: 0.63, y: 0.55, r: 0.055, att: { B: 0.5, F1: 0.45, F2: 0.4 } },
    },
  },
  {
    label: 'College',
    short: 'College',
    age: 20,
    note: 'The prior begins to form \u2014 others learn how to read you',
    persons: {
      M: { x: 0.1, y: 0.22, r: 0.06, att: { D: 0.5, B: 0.35 } },
      D: { x: 0.2, y: 0.2, r: 0.055, att: { M: 0.5, B: 0.3 } },
      B: {
        x: 0.42,
        y: 0.48,
        r: 0.085,
        att: { M: 0.15, D: 0.12, N1: 0.65, N2: 0.55 },
      },
      N1: { x: 0.62, y: 0.45, r: 0.06, att: { B: 0.6, N2: 0.4 } },
      N2: { x: 0.72, y: 0.52, r: 0.055, att: { B: 0.5, N1: 0.4 } },
    },
  },
  {
    label: 'Early Career',
    short: 'Career',
    age: 26,
    note: 'Being understood becomes being trapped',
    persons: {
      M: { x: 0.1, y: 0.2, r: 0.055, att: { D: 0.5, B: 0.3 } },
      D: { x: 0.2, y: 0.18, r: 0.05, att: { M: 0.5, B: 0.25 } },
      B: {
        x: 0.4,
        y: 0.42,
        r: 0.085,
        att: { M: 0.12, D: 0.1, N1: 0.45, W1: 0.5, W2: 0.4 },
      },
      N1: { x: 0.6, y: 0.32, r: 0.055, att: { B: 0.4 } },
      W1: { x: 0.55, y: 0.65, r: 0.055, inst: true, att: { B: 0.45, W2: 0.4 } },
      W2: { x: 0.68, y: 0.7, r: 0.05, inst: true, att: { B: 0.35, W1: 0.4 } },
    },
  },
];

// ═══════════════════════════════════════════════════════════
// Scenario: Fracture (sharp break from parents)
// ═══════════════════════════════════════════════════════════
const FRACTURE = [
  BIRTH,
  EARLY,
  {
    label: 'Elementary School',
    short: 'School',
    age: 8,
    note: 'The first taste of a world parents cannot see',
    persons: {
      M: { x: 0.2, y: 0.25, r: 0.075, att: { D: 0.5, B: 0.55 } },
      D: { x: 0.32, y: 0.22, r: 0.07, att: { M: 0.5, B: 0.45 } },
      B: {
        x: 0.45,
        y: 0.5,
        r: 0.065,
        att: { M: 0.35, D: 0.3, F1: 0.6, F2: 0.5 },
      },
      F1: { x: 0.65, y: 0.5, r: 0.055, att: { B: 0.55, F2: 0.35 } },
      F2: { x: 0.75, y: 0.42, r: 0.05, att: { B: 0.45, F1: 0.35 } },
    },
  },
  {
    label: 'Middle School',
    short: 'Middle',
    age: 12,
    note: 'The break begins \u2014 not in anger, but in distance',
    persons: {
      M: { x: 0.1, y: 0.2, r: 0.06, att: { D: 0.5, B: 0.35 } },
      D: { x: 0.18, y: 0.18, r: 0.055, att: { M: 0.5, B: 0.25 } },
      B: {
        x: 0.42,
        y: 0.5,
        r: 0.08,
        att: { M: 0.1, D: 0.08, F1: 0.75, F2: 0.7, F3: 0.6 },
      },
      F1: { x: 0.6, y: 0.42, r: 0.065, att: { B: 0.65, F2: 0.45, F3: 0.4 } },
      F2: { x: 0.7, y: 0.36, r: 0.06, att: { B: 0.6, F1: 0.45, F3: 0.35 } },
      F3: { x: 0.65, y: 0.56, r: 0.055, att: { B: 0.55, F1: 0.4, F2: 0.35 } },
    },
  },
  {
    label: 'High School',
    short: 'HS',
    age: 16,
    note: 'What the family cannot hold, the group absorbs',
    persons: {
      M: { x: 0.07, y: 0.18, r: 0.05, att: { D: 0.5, B: 0.25 } },
      D: { x: 0.14, y: 0.15, r: 0.045, att: { M: 0.5, B: 0.2 } },
      B: {
        x: 0.4,
        y: 0.48,
        r: 0.09,
        att: { M: 0.04, D: 0.03, F1: 0.8, F2: 0.75, F3: 0.7 },
      },
      F1: { x: 0.58, y: 0.4, r: 0.07, att: { B: 0.75, F2: 0.55, F3: 0.5 } },
      F2: { x: 0.68, y: 0.36, r: 0.065, att: { B: 0.65, F1: 0.55, F3: 0.45 } },
      F3: { x: 0.62, y: 0.55, r: 0.06, att: { B: 0.6, F1: 0.5, F2: 0.45 } },
    },
  },
  {
    label: 'College',
    short: 'College',
    age: 20,
    note: 'Freedom from the prior \u2014 but into what?',
    persons: {
      M: { x: 0.06, y: 0.15, r: 0.04, att: { D: 0.5, B: 0.15 } },
      D: { x: 0.12, y: 0.13, r: 0.035, att: { M: 0.5, B: 0.1 } },
      B: {
        x: 0.42,
        y: 0.46,
        r: 0.09,
        att: { M: 0.03, D: 0.02, N1: 0.7, N2: 0.6 },
      },
      N1: { x: 0.62, y: 0.42, r: 0.065, att: { B: 0.65, N2: 0.45 } },
      N2: { x: 0.72, y: 0.52, r: 0.06, att: { B: 0.55, N1: 0.45 } },
    },
  },
  {
    label: 'Early Career',
    short: 'Career',
    age: 26,
    note: 'The remainder grows where connection was severed',
    persons: {
      M: { x: 0.06, y: 0.14, r: 0.035, att: { D: 0.5, B: 0.1 } },
      D: { x: 0.12, y: 0.12, r: 0.03, att: { M: 0.5, B: 0.08 } },
      B: {
        x: 0.4,
        y: 0.44,
        r: 0.095,
        att: { M: 0.02, D: 0.01, N1: 0.3, W1: 0.4, W2: 0.35 },
      },
      N1: { x: 0.62, y: 0.3, r: 0.045, att: { B: 0.25 } },
      W1: { x: 0.55, y: 0.68, r: 0.05, inst: true, att: { B: 0.35, W2: 0.35 } },
      W2: { x: 0.68, y: 0.72, r: 0.045, inst: true, att: { B: 0.3, W1: 0.35 } },
    },
  },
];

// ═══════════════════════════════════════════════════════════
// Scenario: Alignment (stays close to parents)
// ═══════════════════════════════════════════════════════════
const ALIGNMENT = [
  BIRTH,
  EARLY,
  {
    label: 'Elementary School',
    short: 'School',
    age: 8,
    note: 'Friends arrive, but the family grammar holds',
    persons: {
      M: { x: 0.32, y: 0.3, r: 0.085, att: { D: 0.5, B: 0.8 } },
      D: { x: 0.48, y: 0.26, r: 0.08, att: { M: 0.5, B: 0.7 } },
      B: {
        x: 0.42,
        y: 0.48,
        r: 0.065,
        att: { M: 0.75, D: 0.7, F1: 0.3, F2: 0.25 },
      },
      F1: { x: 0.65, y: 0.52, r: 0.045, att: { B: 0.3, F2: 0.2 } },
      F2: { x: 0.74, y: 0.44, r: 0.04, att: { B: 0.25, F1: 0.2 } },
    },
  },
  {
    label: 'Middle School',
    short: 'Middle',
    age: 12,
    note: 'The peer group orbits the same values',
    persons: {
      M: { x: 0.28, y: 0.28, r: 0.08, att: { D: 0.5, B: 0.75 } },
      D: { x: 0.42, y: 0.24, r: 0.075, att: { M: 0.5, B: 0.65 } },
      B: {
        x: 0.4,
        y: 0.46,
        r: 0.075,
        att: { M: 0.7, D: 0.65, F1: 0.35, F2: 0.3, F3: 0.25 },
      },
      F1: { x: 0.62, y: 0.46, r: 0.05, att: { B: 0.35, F2: 0.25, F3: 0.2 } },
      F2: { x: 0.7, y: 0.38, r: 0.045, att: { B: 0.3, F1: 0.25, F3: 0.2 } },
      F3: { x: 0.66, y: 0.56, r: 0.04, att: { B: 0.25, F1: 0.2, F2: 0.2 } },
    },
  },
  {
    label: 'High School',
    short: 'HS',
    age: 16,
    note: 'Tight alignment \u2014 recognition without remainder?',
    persons: {
      M: { x: 0.24, y: 0.26, r: 0.075, att: { D: 0.5, B: 0.7 } },
      D: { x: 0.38, y: 0.22, r: 0.07, att: { M: 0.5, B: 0.6 } },
      B: {
        x: 0.38,
        y: 0.44,
        r: 0.08,
        att: { M: 0.65, D: 0.6, F1: 0.4, F2: 0.35, F3: 0.3 },
      },
      F1: { x: 0.58, y: 0.42, r: 0.055, att: { B: 0.4, F2: 0.3, F3: 0.25 } },
      F2: { x: 0.66, y: 0.36, r: 0.05, att: { B: 0.35, F1: 0.3, F3: 0.25 } },
      F3: { x: 0.62, y: 0.54, r: 0.045, att: { B: 0.3, F1: 0.25, F2: 0.25 } },
    },
  },
  {
    label: 'College',
    short: 'College',
    age: 20,
    note: 'The prior hardens earliest where love is strongest',
    persons: {
      M: { x: 0.2, y: 0.24, r: 0.07, att: { D: 0.5, B: 0.6 } },
      D: { x: 0.32, y: 0.2, r: 0.065, att: { M: 0.5, B: 0.55 } },
      B: {
        x: 0.36,
        y: 0.44,
        r: 0.085,
        att: { M: 0.55, D: 0.5, N1: 0.4, N2: 0.35 },
      },
      N1: { x: 0.55, y: 0.4, r: 0.05, att: { B: 0.4, N2: 0.3 } },
      N2: { x: 0.64, y: 0.48, r: 0.045, att: { B: 0.35, N1: 0.3 } },
    },
  },
  {
    label: 'Early Career',
    short: 'Career',
    age: 26,
    note: 'To be fully known is to be fully managed',
    persons: {
      M: { x: 0.18, y: 0.22, r: 0.065, att: { D: 0.5, B: 0.55 } },
      D: { x: 0.3, y: 0.19, r: 0.06, att: { M: 0.5, B: 0.5 } },
      B: {
        x: 0.35,
        y: 0.42,
        r: 0.085,
        att: { M: 0.5, D: 0.45, N1: 0.3, W1: 0.4, W2: 0.35 },
      },
      N1: { x: 0.55, y: 0.32, r: 0.045, att: { B: 0.3 } },
      W1: { x: 0.48, y: 0.62, r: 0.05, inst: true, att: { B: 0.35, W2: 0.3 } },
      W2: { x: 0.62, y: 0.66, r: 0.045, inst: true, att: { B: 0.3, W1: 0.3 } },
    },
  },
];

// ═══════════════════════════════════════════════════════════
// Scenario: Rivalry (convergent desire, love triangle)
// ═══════════════════════════════════════════════════════════
const RIVALRY = [
  {
    label: 'The Circle',
    short: 'Circle',
    age: 22,
    note: 'A loose social field \u2014 everyone visible, no one yet claimed',
    persons: {
      B: { x: 0.3, y: 0.45, r: 0.07, att: { F1: 0.5, F2: 0.4, F3: 0.3 } },
      F1: { x: 0.45, y: 0.3, r: 0.065, att: { B: 0.45, F2: 0.35, F3: 0.3 } },
      F2: { x: 0.6, y: 0.5, r: 0.06, att: { B: 0.35, F1: 0.35, F3: 0.3 } },
      F3: { x: 0.42, y: 0.62, r: 0.055, att: { B: 0.3, F1: 0.25, F2: 0.3 } },
      L: { x: 0.75, y: 0.38, r: 0.06, att: { F2: 0.2 } },
    },
  },
  {
    label: 'L Arrives',
    short: 'Arrival',
    age: 22,
    note: 'A new presence enters and the field rearranges around it',
    persons: {
      B: {
        x: 0.28,
        y: 0.45,
        r: 0.07,
        att: { F1: 0.45, F2: 0.3, F3: 0.25, L: 0.4 },
      },
      F1: {
        x: 0.42,
        y: 0.3,
        r: 0.065,
        att: { B: 0.4, F2: 0.25, F3: 0.2, L: 0.45 },
      },
      F2: { x: 0.55, y: 0.55, r: 0.055, att: { B: 0.3, F1: 0.25, F3: 0.3 } },
      F3: { x: 0.38, y: 0.65, r: 0.05, att: { B: 0.25, F2: 0.3 } },
      L: { x: 0.65, y: 0.38, r: 0.065, att: { F1: 0.2, B: 0.15, F2: 0.15 } },
    },
  },
  {
    label: 'Convergence',
    short: 'Converge',
    age: 23,
    note: 'Two fields stretch toward the same glow \u2014 rivalry enters before malice',
    persons: {
      B: { x: 0.25, y: 0.45, r: 0.08, att: { F1: 0.2, F2: 0.15, L: 0.75 } },
      F1: { x: 0.4, y: 0.28, r: 0.075, att: { B: 0.15, L: 0.8 } },
      F2: { x: 0.5, y: 0.6, r: 0.05, att: { B: 0.2, F3: 0.3 } },
      F3: { x: 0.35, y: 0.68, r: 0.045, att: { F2: 0.3 } },
      L: { x: 0.62, y: 0.38, r: 0.07, att: { B: 0.3, F1: 0.35 } },
    },
  },
  {
    label: 'Curation',
    short: 'Curate',
    age: 23,
    note: 'The self reshapes to pass through the bottleneck of legibility',
    persons: {
      B: { x: 0.28, y: 0.42, r: 0.085, att: { L: 0.85, F1: 0.1, F2: 0.08 } },
      F1: { x: 0.42, y: 0.25, r: 0.08, att: { L: 0.85, B: 0.05 } },
      F2: { x: 0.48, y: 0.65, r: 0.04, att: { F3: 0.3 } },
      F3: { x: 0.35, y: 0.72, r: 0.035, att: { F2: 0.25 } },
      L: { x: 0.6, y: 0.36, r: 0.075, att: { F1: 0.5, B: 0.25 } },
    },
  },
  {
    label: 'Selection',
    short: 'Select',
    age: 24,
    note: 'L\u2019s field tilts \u2014 one is received, one is remainder',
    persons: {
      B: { x: 0.22, y: 0.42, r: 0.075, att: { L: 0.7, F1: 0.05 } },
      F1: { x: 0.48, y: 0.28, r: 0.075, att: { L: 0.7 } },
      L: { x: 0.6, y: 0.38, r: 0.08, att: { F1: 0.7, B: 0.1 } },
      F2: { x: 0.5, y: 0.68, r: 0.035, att: { F3: 0.25 } },
      F3: { x: 0.38, y: 0.74, r: 0.03, att: { F2: 0.2 } },
    },
  },
  {
    label: 'Withdrawal',
    short: 'Withdraw',
    age: 24,
    note: 'The form that failed to secure the return contracts inward',
    persons: {
      B: { x: 0.18, y: 0.48, r: 0.06, att: { L: 0.2, F2: 0.15 } },
      F1: { x: 0.52, y: 0.32, r: 0.07, att: { L: 0.75 } },
      L: { x: 0.62, y: 0.4, r: 0.075, att: { F1: 0.75 } },
      F2: { x: 0.35, y: 0.65, r: 0.04, att: { B: 0.2, F3: 0.2 } },
      F3: { x: 0.28, y: 0.72, r: 0.035, att: { F2: 0.2 } },
    },
  },
  {
    label: 'After',
    short: 'After',
    age: 25,
    note: 'The remainder remembers what the field once reached for',
    persons: {
      B: { x: 0.2, y: 0.48, r: 0.065, att: { F2: 0.3, N1: 0.25 } },
      F1: { x: 0.6, y: 0.35, r: 0.065, att: { L: 0.7 } },
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
    label: 'Family of God',
    short: 'Family',
    age: 0,
    note: 'All attention flows upward \u2014 and through that, toward each other',
    persons: {
      G: { x: 0.5, y: 0.1, r: 0.13, att: { M: 0.8, D: 0.8, B: 0.85 } },
      M: { x: 0.35, y: 0.42, r: 0.085, att: { D: 0.6, B: 0.8, G: 0.85 } },
      D: { x: 0.62, y: 0.4, r: 0.08, att: { M: 0.6, B: 0.75, G: 0.8 } },
      B: { x: 0.48, y: 0.62, r: 0.035, att: { M: 0.5, D: 0.4, G: 0.5 } },
    },
  },
  {
    label: 'Childhood',
    short: 'Child',
    age: 4,
    note: 'The child learns to look where the parents look',
    persons: {
      G: { x: 0.5, y: 0.1, r: 0.13, att: { M: 0.8, D: 0.8, B: 0.85 } },
      M: { x: 0.32, y: 0.4, r: 0.08, att: { D: 0.55, B: 0.8, G: 0.85 } },
      D: { x: 0.64, y: 0.38, r: 0.075, att: { M: 0.55, B: 0.7, G: 0.8 } },
      B: { x: 0.48, y: 0.58, r: 0.055, att: { M: 0.7, D: 0.6, G: 0.65 } },
    },
  },
  {
    label: 'School',
    short: 'School',
    age: 8,
    note: 'Church friends overlap before they even know each other well',
    persons: {
      G: {
        x: 0.5,
        y: 0.08,
        r: 0.13,
        att: { M: 0.7, D: 0.7, B: 0.85, F1: 0.7, F2: 0.7 },
      },
      M: { x: 0.22, y: 0.38, r: 0.07, att: { D: 0.5, B: 0.65, G: 0.8 } },
      D: { x: 0.38, y: 0.34, r: 0.065, att: { M: 0.5, B: 0.55, G: 0.75 } },
      B: {
        x: 0.45,
        y: 0.52,
        r: 0.065,
        att: { M: 0.45, D: 0.4, F1: 0.4, F2: 0.35, G: 0.7 },
      },
      F1: { x: 0.62, y: 0.48, r: 0.055, att: { B: 0.4, F2: 0.3, G: 0.65 } },
      F2: { x: 0.72, y: 0.42, r: 0.05, att: { B: 0.3, F1: 0.3, G: 0.6 } },
    },
  },
  {
    label: 'Adolescence',
    short: 'Teen',
    age: 13,
    note: 'A friend without the shared orientation drifts at the edge',
    persons: {
      G: {
        x: 0.5,
        y: 0.08,
        r: 0.13,
        att: { M: 0.65, D: 0.65, B: 0.85, F1: 0.65, F2: 0.65 },
      },
      M: { x: 0.18, y: 0.35, r: 0.065, att: { D: 0.5, B: 0.55, G: 0.75 } },
      D: { x: 0.32, y: 0.3, r: 0.06, att: { M: 0.5, B: 0.5, G: 0.7 } },
      B: {
        x: 0.44,
        y: 0.5,
        r: 0.075,
        att: { M: 0.3, D: 0.25, F1: 0.5, F2: 0.4, F3: 0.3, G: 0.65 },
      },
      F1: { x: 0.58, y: 0.42, r: 0.06, att: { B: 0.45, F2: 0.35, G: 0.65 } },
      F2: { x: 0.68, y: 0.38, r: 0.055, att: { B: 0.35, F1: 0.35, G: 0.55 } },
      F3: { x: 0.78, y: 0.62, r: 0.05, att: { B: 0.3, F1: 0.15 } },
    },
  },
  {
    label: 'High School',
    short: 'HS',
    age: 16,
    note: 'The oriented overlap even when they barely know each other',
    persons: {
      G: {
        x: 0.5,
        y: 0.08,
        r: 0.13,
        att: { M: 0.7, D: 0.7, B: 0.85, F1: 0.7, F2: 0.7 },
      },
      M: { x: 0.14, y: 0.32, r: 0.06, att: { D: 0.5, B: 0.45, G: 0.75 } },
      D: { x: 0.26, y: 0.28, r: 0.055, att: { M: 0.5, B: 0.4, G: 0.7 } },
      B: {
        x: 0.42,
        y: 0.48,
        r: 0.08,
        att: { M: 0.2, D: 0.15, F1: 0.55, F2: 0.45, G: 0.65 },
      },
      F1: { x: 0.56, y: 0.4, r: 0.065, att: { B: 0.5, F2: 0.4, G: 0.65 } },
      F2: { x: 0.68, y: 0.36, r: 0.06, att: { B: 0.4, F1: 0.4, G: 0.6 } },
      F3: { x: 0.82, y: 0.65, r: 0.045, att: { B: 0.15 } },
    },
  },
  {
    label: 'College',
    short: 'College',
    age: 20,
    note: 'A stranger who shares the orientation overlaps immediately',
    persons: {
      G: {
        x: 0.5,
        y: 0.08,
        r: 0.13,
        att: { M: 0.6, D: 0.6, B: 0.85, F1: 0.6, N1: 0.7, N2: 0.3 },
      },
      M: { x: 0.1, y: 0.3, r: 0.055, att: { D: 0.5, B: 0.35, G: 0.7 } },
      D: { x: 0.2, y: 0.27, r: 0.05, att: { M: 0.5, B: 0.3, G: 0.65 } },
      B: {
        x: 0.4,
        y: 0.48,
        r: 0.08,
        att: { M: 0.15, D: 0.12, F1: 0.25, N1: 0.5, N2: 0.25, G: 0.65 },
      },
      F1: { x: 0.62, y: 0.55, r: 0.05, att: { B: 0.3, G: 0.6 } },
      N1: { x: 0.58, y: 0.38, r: 0.06, att: { B: 0.45, N2: 0.2, G: 0.65 } },
      N2: { x: 0.75, y: 0.58, r: 0.05, att: { B: 0.2, N1: 0.15 } },
    },
  },
  {
    label: 'Career',
    short: 'Career',
    age: 26,
    note: 'Scattered across the world \u2014 still overlapping through what they share',
    persons: {
      G: {
        x: 0.5,
        y: 0.08,
        r: 0.13,
        att: { M: 0.6, D: 0.6, B: 0.85, F1: 0.6, N1: 0.65, W1: 0.5 },
      },
      M: { x: 0.08, y: 0.32, r: 0.05, att: { D: 0.5, B: 0.3, G: 0.7 } },
      D: { x: 0.16, y: 0.28, r: 0.045, att: { M: 0.5, B: 0.25, G: 0.65 } },
      B: {
        x: 0.38,
        y: 0.48,
        r: 0.08,
        att: { M: 0.12, D: 0.1, N1: 0.35, W1: 0.35, G: 0.65 },
      },
      F1: { x: 0.72, y: 0.52, r: 0.045, att: { B: 0.15, G: 0.6 } },
      N1: { x: 0.55, y: 0.38, r: 0.055, att: { B: 0.3, G: 0.6 } },
      W1: { x: 0.5, y: 0.65, r: 0.05, att: { B: 0.3, G: 0.55 } },
      W2: { x: 0.68, y: 0.7, r: 0.04, att: { W1: 0.25 } },
    },
  },
];

// ═══════════════════════════════════════════════════════════
// Scenario: Hub (being seen everywhere, known nowhere)
// ═══════════════════════════════════════════════════════════
const HUB = [
  {
    label: 'Small Circle',
    short: 'Small',
    note: 'A few people, balanced mutual attention — everyone is seen',
    persons: {
      B: { x: 0.5, y: 0.5, r: 0.075, att: { P1: 0.6, P2: 0.55, P3: 0.5 } },
      P1: { x: 0.3, y: 0.35, r: 0.06, att: { B: 0.6, P2: 0.3, P3: 0.25 } },
      P2: { x: 0.7, y: 0.35, r: 0.06, att: { B: 0.55, P1: 0.3, P3: 0.25 } },
      P3: { x: 0.5, y: 0.25, r: 0.055, att: { B: 0.5, P1: 0.25, P2: 0.25 } },
    },
  },
  {
    label: 'Growing',
    short: 'Growing',
    note: 'New people start attending to B — attention per person thins',
    persons: {
      B: {
        x: 0.5,
        y: 0.5,
        r: 0.075,
        att: { P1: 0.45, P2: 0.4, P3: 0.35, P4: 0.3, P5: 0.25 },
      },
      P1: { x: 0.28, y: 0.35, r: 0.055, att: { B: 0.6, P2: 0.2 } },
      P2: { x: 0.72, y: 0.35, r: 0.055, att: { B: 0.55, P1: 0.15 } },
      P3: { x: 0.5, y: 0.22, r: 0.05, att: { B: 0.5 } },
      P4: { x: 0.3, y: 0.65, r: 0.05, att: { B: 0.55 } },
      P5: { x: 0.7, y: 0.65, r: 0.05, att: { B: 0.5 } },
    },
  },
  {
    label: 'Popular',
    short: 'Popular',
    note: 'Everyone attends to B — B\u2019s field is pulled in every direction at once',
    persons: {
      B: {
        x: 0.5,
        y: 0.5,
        r: 0.07,
        att: {
          P1: 0.25,
          P2: 0.25,
          P3: 0.25,
          P4: 0.2,
          P5: 0.2,
          P6: 0.2,
          P7: 0.15,
        },
      },
      P1: { x: 0.22, y: 0.35, r: 0.05, att: { B: 0.65 } },
      P2: { x: 0.78, y: 0.35, r: 0.05, att: { B: 0.6 } },
      P3: { x: 0.5, y: 0.15, r: 0.045, att: { B: 0.6 } },
      P4: { x: 0.25, y: 0.68, r: 0.045, att: { B: 0.6 } },
      P5: { x: 0.75, y: 0.68, r: 0.045, att: { B: 0.55 } },
      P6: { x: 0.15, y: 0.52, r: 0.045, att: { B: 0.55 } },
      P7: { x: 0.85, y: 0.52, r: 0.04, att: { B: 0.5 } },
    },
  },
  {
    label: 'Platform',
    short: 'Platform',
    note: 'B\u2019s blob is a perfect shallow circle \u2014 reaching for everyone, holding no one',
    persons: {
      B: {
        x: 0.5,
        y: 0.5,
        r: 0.065,
        att: {
          P1: 0.12,
          P2: 0.12,
          P3: 0.12,
          P4: 0.1,
          P5: 0.1,
          P6: 0.1,
          P7: 0.1,
          P8: 0.1,
        },
      },
      P1: { x: 0.2, y: 0.3, r: 0.045, att: { B: 0.7 } },
      P2: { x: 0.8, y: 0.3, r: 0.045, att: { B: 0.7 } },
      P3: { x: 0.5, y: 0.12, r: 0.04, att: { B: 0.65 } },
      P4: { x: 0.22, y: 0.7, r: 0.04, att: { B: 0.65 } },
      P5: { x: 0.78, y: 0.7, r: 0.04, att: { B: 0.65 } },
      P6: { x: 0.12, y: 0.5, r: 0.04, att: { B: 0.6 } },
      P7: { x: 0.88, y: 0.5, r: 0.04, att: { B: 0.6 } },
      P8: { x: 0.5, y: 0.85, r: 0.04, att: { B: 0.6 } },
    },
  },
  {
    label: 'Flattened',
    short: 'Flat',
    note: 'B tries to shift but every node holds the old image \u2014 the prior is everyone\u2019s',
    persons: {
      B: {
        x: 0.52,
        y: 0.48,
        r: 0.06,
        att: {
          P1: 0.15,
          P2: 0.08,
          P3: 0.08,
          P4: 0.08,
          P5: 0.08,
          P6: 0.08,
          P7: 0.08,
          P8: 0.08,
        },
      },
      P1: { x: 0.2, y: 0.3, r: 0.045, att: { B: 0.7 } },
      P2: { x: 0.8, y: 0.3, r: 0.045, att: { B: 0.7 } },
      P3: { x: 0.5, y: 0.12, r: 0.04, att: { B: 0.65 } },
      P4: { x: 0.22, y: 0.7, r: 0.04, att: { B: 0.65 } },
      P5: { x: 0.78, y: 0.7, r: 0.04, att: { B: 0.65 } },
      P6: { x: 0.12, y: 0.5, r: 0.04, att: { B: 0.6 } },
      P7: { x: 0.88, y: 0.5, r: 0.04, att: { B: 0.6 } },
      P8: { x: 0.5, y: 0.85, r: 0.04, att: { B: 0.6 } },
    },
  },
  {
    label: 'Managed',
    short: 'Managed',
    note: 'Being seen everywhere = being known nowhere \u2014 B\u2019s field shrinks inward',
    persons: {
      B: {
        x: 0.5,
        y: 0.5,
        r: 0.04,
        att: {
          P1: 0.05,
          P2: 0.05,
          P3: 0.05,
          P4: 0.05,
          P5: 0.05,
          P6: 0.05,
          P7: 0.05,
          P8: 0.05,
        },
      },
      P1: { x: 0.2, y: 0.3, r: 0.045, att: { B: 0.7 } },
      P2: { x: 0.8, y: 0.3, r: 0.045, att: { B: 0.7 } },
      P3: { x: 0.5, y: 0.12, r: 0.04, att: { B: 0.65 } },
      P4: { x: 0.22, y: 0.7, r: 0.04, att: { B: 0.65 } },
      P5: { x: 0.78, y: 0.7, r: 0.04, att: { B: 0.6 } },
      P6: { x: 0.12, y: 0.5, r: 0.04, att: { B: 0.6 } },
      P7: { x: 0.88, y: 0.5, r: 0.04, att: { B: 0.55 } },
      P8: { x: 0.5, y: 0.85, r: 0.04, att: { B: 0.55 } },
    },
  },
  {
    label: 'Exit',
    short: 'Exit',
    note: 'B withdraws \u2014 the crowd\u2019s fields still reach for where B was',
    persons: {
      B: { x: 0.5, y: 0.5, r: 0.025, op: 0.3, att: {} },
      P1: { x: 0.2, y: 0.3, r: 0.045, att: { B: 0.6 } },
      P2: { x: 0.8, y: 0.3, r: 0.045, att: { B: 0.6 } },
      P3: { x: 0.5, y: 0.12, r: 0.04, att: { B: 0.55 } },
      P4: { x: 0.22, y: 0.7, r: 0.04, att: { B: 0.55 } },
      P5: { x: 0.78, y: 0.7, r: 0.04, att: { B: 0.5 } },
      P6: { x: 0.12, y: 0.5, r: 0.04, att: { B: 0.5 } },
      P7: { x: 0.88, y: 0.5, r: 0.04, att: { B: 0.45 } },
      P8: { x: 0.5, y: 0.85, r: 0.04, att: { B: 0.45 } },
    },
  },
];

// ═══════════════════════════════════════════════════════════
// Scenario: Ossification (total recognition becomes control)
// ═══════════════════════════════════════════════════════════
const OSSIFICATION = [
  {
    label: 'Formation',
    short: 'Form',
    note: 'Four people meet \u2014 light mutual attention',
    persons: {
      B: { x: 0.38, y: 0.55, r: 0.065, att: { F1: 0.35, F2: 0.3, F3: 0.3 } },
      F1: { x: 0.62, y: 0.55, r: 0.06, att: { B: 0.35, F2: 0.25, F3: 0.25 } },
      F2: { x: 0.55, y: 0.32, r: 0.055, att: { B: 0.3, F1: 0.25, F3: 0.2 } },
      F3: { x: 0.42, y: 0.32, r: 0.055, att: { B: 0.3, F1: 0.2, F2: 0.2 } },
    },
  },
  {
    label: 'Bonding',
    short: 'Bond',
    note: 'Attention weights increase \u2014 fields overlap more',
    persons: {
      B: { x: 0.4, y: 0.55, r: 0.07, att: { F1: 0.55, F2: 0.5, F3: 0.5 } },
      F1: { x: 0.6, y: 0.55, r: 0.065, att: { B: 0.55, F2: 0.45, F3: 0.4 } },
      F2: { x: 0.55, y: 0.35, r: 0.06, att: { B: 0.5, F1: 0.45, F3: 0.4 } },
      F3: { x: 0.42, y: 0.35, r: 0.06, att: { B: 0.5, F1: 0.4, F2: 0.4 } },
    },
  },
  {
    label: 'Tight Circle',
    short: 'Tight',
    note: 'Near-total overlap \u2014 everyone strongly attends to everyone',
    persons: {
      B: { x: 0.42, y: 0.54, r: 0.075, att: { F1: 0.75, F2: 0.7, F3: 0.7 } },
      F1: { x: 0.58, y: 0.54, r: 0.07, att: { B: 0.75, F2: 0.65, F3: 0.6 } },
      F2: { x: 0.54, y: 0.38, r: 0.065, att: { B: 0.7, F1: 0.65, F3: 0.6 } },
      F3: { x: 0.44, y: 0.38, r: 0.065, att: { B: 0.7, F1: 0.6, F2: 0.6 } },
    },
  },
  {
    label: 'Comfort',
    short: 'Comfort',
    note: 'Stable \u2014 the prior is locked, all fields rigid, perfectly interlocking',
    persons: {
      B: { x: 0.44, y: 0.54, r: 0.08, att: { F1: 0.85, F2: 0.8, F3: 0.8 } },
      F1: { x: 0.56, y: 0.54, r: 0.075, att: { B: 0.85, F2: 0.75, F3: 0.7 } },
      F2: { x: 0.54, y: 0.4, r: 0.07, att: { B: 0.8, F1: 0.75, F3: 0.7 } },
      F3: { x: 0.44, y: 0.4, r: 0.07, att: { B: 0.8, F1: 0.7, F2: 0.7 } },
    },
  },
  {
    label: 'Attempt',
    short: 'Attempt',
    note: 'B starts shifting \u2014 attention tilts toward a new interest at the edge',
    persons: {
      B: {
        x: 0.38,
        y: 0.58,
        r: 0.075,
        att: { F1: 0.5, F2: 0.45, F3: 0.45, N1: 0.4 },
      },
      F1: { x: 0.56, y: 0.54, r: 0.075, att: { B: 0.85, F2: 0.75, F3: 0.7 } },
      F2: { x: 0.54, y: 0.4, r: 0.07, att: { B: 0.8, F1: 0.75, F3: 0.7 } },
      F3: { x: 0.44, y: 0.4, r: 0.07, att: { B: 0.8, F1: 0.7, F2: 0.7 } },
      N1: { x: 0.18, y: 0.7, r: 0.05, att: { B: 0.35 } },
    },
  },
  {
    label: 'Resistance',
    short: 'Resist',
    note: 'The group\u2019s fields still reach for B\u2019s old position \u2014 B is stretched between old and new',
    persons: {
      B: {
        x: 0.32,
        y: 0.62,
        r: 0.07,
        att: { F1: 0.35, F2: 0.3, F3: 0.3, N1: 0.55 },
      },
      F1: { x: 0.56, y: 0.54, r: 0.075, att: { B: 0.8, F2: 0.75, F3: 0.7 } },
      F2: { x: 0.54, y: 0.4, r: 0.07, att: { B: 0.75, F1: 0.75, F3: 0.7 } },
      F3: { x: 0.44, y: 0.4, r: 0.07, att: { B: 0.75, F1: 0.7, F2: 0.7 } },
      N1: { x: 0.15, y: 0.72, r: 0.055, att: { B: 0.45 } },
    },
  },
  {
    label: 'Snap Back',
    short: 'Snap',
    note: 'The prior is patient \u2014 it can wait out your attempted change',
    persons: {
      B: { x: 0.44, y: 0.54, r: 0.08, att: { F1: 0.8, F2: 0.75, F3: 0.75 } },
      F1: { x: 0.56, y: 0.54, r: 0.075, att: { B: 0.85, F2: 0.75, F3: 0.7 } },
      F2: { x: 0.54, y: 0.4, r: 0.07, att: { B: 0.8, F1: 0.75, F3: 0.7 } },
      F3: { x: 0.44, y: 0.4, r: 0.07, att: { B: 0.8, F1: 0.7, F2: 0.7 } },
    },
  },
];

// ═══════════════════════════════════════════════════════════
// Scenario: Cascade (one attractor destabilizes the field)
// ═══════════════════════════════════════════════════════════
const CASCADE = [
  {
    label: 'Equilibrium',
    short: 'Equal',
    note: 'Five people in balanced mutual attention \u2014 roughly equal fields',
    persons: {
      B: {
        x: 0.35,
        y: 0.5,
        r: 0.065,
        att: { F1: 0.45, F2: 0.4, F3: 0.4, F4: 0.35 },
      },
      F1: {
        x: 0.55,
        y: 0.32,
        r: 0.06,
        att: { B: 0.45, F2: 0.35, F3: 0.3, F4: 0.25 },
      },
      F2: {
        x: 0.65,
        y: 0.5,
        r: 0.06,
        att: { B: 0.4, F1: 0.35, F3: 0.35, F4: 0.3 },
      },
      F3: {
        x: 0.55,
        y: 0.68,
        r: 0.055,
        att: { B: 0.4, F1: 0.3, F2: 0.35, F4: 0.3 },
      },
      F4: {
        x: 0.35,
        y: 0.68,
        r: 0.055,
        att: { B: 0.35, F1: 0.25, F2: 0.3, F3: 0.3 },
      },
    },
  },
  {
    label: 'Arrival',
    short: 'Arrival',
    note: 'L appears at the edge \u2014 a few people glance toward L',
    persons: {
      B: {
        x: 0.35,
        y: 0.5,
        r: 0.065,
        att: { F1: 0.4, F2: 0.35, F3: 0.35, F4: 0.3, L: 0.2 },
      },
      F1: {
        x: 0.55,
        y: 0.32,
        r: 0.06,
        att: { B: 0.4, F2: 0.3, F3: 0.25, F4: 0.2, L: 0.25 },
      },
      F2: {
        x: 0.65,
        y: 0.5,
        r: 0.06,
        att: { B: 0.35, F1: 0.3, F3: 0.3, F4: 0.25 },
      },
      F3: {
        x: 0.55,
        y: 0.68,
        r: 0.055,
        att: { B: 0.35, F1: 0.25, F2: 0.3, F4: 0.25 },
      },
      F4: {
        x: 0.35,
        y: 0.68,
        r: 0.055,
        att: { B: 0.3, F1: 0.2, F2: 0.25, F3: 0.25 },
      },
      L: { x: 0.85, y: 0.3, r: 0.06, att: { F1: 0.15, B: 0.1 } },
    },
  },
  {
    label: 'Tilt',
    short: 'Tilt',
    note: 'Attention shifts to L \u2014 F3 and F4\u2019s incoming attention drops',
    persons: {
      B: {
        x: 0.38,
        y: 0.5,
        r: 0.065,
        att: { F1: 0.2, F2: 0.15, F3: 0.15, F4: 0.1, L: 0.55 },
      },
      F1: { x: 0.55, y: 0.35, r: 0.06, att: { B: 0.15, F2: 0.1, L: 0.6 } },
      F2: {
        x: 0.62,
        y: 0.5,
        r: 0.055,
        att: { B: 0.2, F1: 0.15, F3: 0.15, L: 0.4 },
      },
      F3: { x: 0.52, y: 0.68, r: 0.05, att: { B: 0.25, F2: 0.2, F4: 0.2 } },
      F4: { x: 0.35, y: 0.68, r: 0.05, att: { B: 0.2, F3: 0.2 } },
      L: { x: 0.8, y: 0.32, r: 0.07, att: { B: 0.2, F1: 0.25 } },
    },
  },
  {
    label: 'Drain',
    short: 'Drain',
    note: 'L is the center of gravity \u2014 the bonds that held the group thin out',
    persons: {
      B: { x: 0.42, y: 0.48, r: 0.06, att: { F3: 0.08, F4: 0.05, L: 0.7 } },
      F1: { x: 0.58, y: 0.36, r: 0.055, att: { L: 0.75 } },
      F2: { x: 0.6, y: 0.52, r: 0.045, att: { B: 0.1, L: 0.6 } },
      F3: { x: 0.48, y: 0.68, r: 0.04, att: { B: 0.15, F4: 0.15 } },
      F4: { x: 0.32, y: 0.7, r: 0.035, att: { B: 0.1, F3: 0.1 } },
      L: { x: 0.75, y: 0.35, r: 0.075, att: { B: 0.15, F1: 0.2 } },
    },
  },
  {
    label: 'Starvation',
    short: 'Starve',
    note: 'F4 fades, F3 barely visible \u2014 the network has collapsed into a star',
    persons: {
      B: { x: 0.45, y: 0.48, r: 0.055, att: { L: 0.75 } },
      F1: { x: 0.6, y: 0.38, r: 0.05, att: { L: 0.8 } },
      F2: { x: 0.58, y: 0.55, r: 0.04, att: { L: 0.65 } },
      F3: { x: 0.42, y: 0.68, r: 0.03, op: 0.5, att: { B: 0.1 } },
      F4: { x: 0.3, y: 0.72, r: 0.025, op: 0.2, att: {} },
      L: { x: 0.72, y: 0.38, r: 0.08, att: { F1: 0.15, B: 0.1 } },
    },
  },
  {
    label: 'L Moves On',
    short: 'Gone',
    note: 'L leaves \u2014 the network is broken, the bonds are gone',
    persons: {
      B: { x: 0.42, y: 0.48, r: 0.05, att: { F2: 0.1, F3: 0.08 } },
      F1: { x: 0.58, y: 0.38, r: 0.045, att: { B: 0.1 } },
      F2: { x: 0.55, y: 0.55, r: 0.035, att: { B: 0.1 } },
      F3: { x: 0.4, y: 0.65, r: 0.025, op: 0.4, att: {} },
      F4: { x: 0.3, y: 0.72, r: 0.02, op: 0.1, att: {} },
      L: { x: 0.9, y: 0.25, r: 0.06, op: 0.3, att: {} },
    },
  },
  {
    label: 'Aftermath',
    short: 'After',
    note: 'Attention is not just scarce \u2014 it is load-bearing',
    persons: {
      B: { x: 0.38, y: 0.48, r: 0.045, att: { F1: 0.1, F2: 0.08 } },
      F1: { x: 0.55, y: 0.4, r: 0.04, att: { B: 0.1 } },
      F2: { x: 0.52, y: 0.58, r: 0.035, att: { B: 0.08 } },
      F3: { x: 0.38, y: 0.68, r: 0.025, op: 0.25, att: {} },
      F4: { x: 0.28, y: 0.72, r: 0.02, op: 0.05, att: {} },
    },
  },
];

// ═══════════════════════════════════════════════════════════
// Scenario: Concealment (the gap between performed and true self)
// ═══════════════════════════════════════════════════════════
const CONCEALMENT = [
  {
    label: 'Open',
    short: 'Open',
    note: 'Before the mask \u2014 attention is what it appears to be',
    persons: {
      B: { x: 0.45, y: 0.45, r: 0.08, att: { F1: 0.6, F2: 0.55, F3: 0.5 } },
      F1: { x: 0.25, y: 0.35, r: 0.065, att: { B: 0.55, F2: 0.4, F3: 0.3 } },
      F2: { x: 0.65, y: 0.32, r: 0.06, att: { B: 0.5, F1: 0.4, F3: 0.35 } },
      F3: { x: 0.55, y: 0.65, r: 0.055, att: { B: 0.5, F1: 0.3, F2: 0.35 } },
      N1: { x: 0.82, y: 0.7, r: 0.045, op: 0.3, att: {} },
    },
  },
  {
    label: 'Doubt',
    short: 'Doubt',
    note: 'Something stirs that doesn\u2019t fit the form',
    persons: {
      B: {
        x: 0.45,
        y: 0.45,
        r: 0.08,
        att: { F1: 0.6, F2: 0.55, F3: 0.5 },
        innerAtt: { F1: 0.4, F2: 0.35, F3: 0.3, N1: 0.45 },
      },
      F1: { x: 0.25, y: 0.35, r: 0.065, att: { B: 0.55, F2: 0.4, F3: 0.3 } },
      F2: { x: 0.65, y: 0.32, r: 0.06, att: { B: 0.5, F1: 0.4, F3: 0.35 } },
      F3: { x: 0.55, y: 0.65, r: 0.055, att: { B: 0.5, F1: 0.3, F2: 0.35 } },
      N1: { x: 0.82, y: 0.68, r: 0.05, op: 0.6, att: { B: 0.2 } },
    },
  },
  {
    label: 'Mask',
    short: 'Mask',
    note: 'The performed self replaces the real one',
    persons: {
      B: {
        x: 0.44,
        y: 0.44,
        r: 0.08,
        att: { F1: 0.65, F2: 0.6, F3: 0.55 },
        innerAtt: { F1: 0.2, F2: 0.15, F3: 0.15, N1: 0.7 },
      },
      F1: { x: 0.24, y: 0.34, r: 0.065, att: { B: 0.55, F2: 0.4, F3: 0.3 } },
      F2: { x: 0.64, y: 0.3, r: 0.06, att: { B: 0.5, F1: 0.4, F3: 0.35 } },
      F3: { x: 0.54, y: 0.64, r: 0.055, att: { B: 0.5, F1: 0.3, F2: 0.35 } },
      N1: { x: 0.8, y: 0.65, r: 0.055, att: { B: 0.35 } },
    },
  },
  {
    label: 'Cost',
    short: 'Cost',
    note: 'Connection without presence \u2014 the mask holds but the person doesn\u2019t',
    persons: {
      B: {
        x: 0.44,
        y: 0.44,
        r: 0.07,
        att: { F1: 0.65, F2: 0.6, F3: 0.55 },
        innerAtt: { F1: 0.1, F2: 0.1, F3: 0.1, N1: 0.8 },
      },
      F1: { x: 0.23, y: 0.33, r: 0.065, att: { B: 0.55, F2: 0.4, F3: 0.3 } },
      F2: { x: 0.63, y: 0.29, r: 0.06, att: { B: 0.5, F1: 0.4, F3: 0.35 } },
      F3: { x: 0.53, y: 0.63, r: 0.055, att: { B: 0.5, F1: 0.3, F2: 0.35 } },
      N1: { x: 0.78, y: 0.6, r: 0.055, att: { B: 0.4 } },
    },
  },
  {
    label: 'Crack',
    short: 'Crack',
    note: 'What is hidden shapes what is seen \u2014 attention leaks',
    persons: {
      B: {
        x: 0.46,
        y: 0.44,
        r: 0.07,
        att: { F1: 0.5, F2: 0.45, F3: 0.4, N1: 0.3 },
        innerAtt: { F1: 0.15, F2: 0.1, F3: 0.1, N1: 0.75 },
      },
      F1: { x: 0.23, y: 0.33, r: 0.065, att: { B: 0.45, F2: 0.4, F3: 0.3 } },
      F2: { x: 0.63, y: 0.29, r: 0.06, att: { B: 0.4, F1: 0.4, F3: 0.35 } },
      F3: { x: 0.53, y: 0.63, r: 0.055, att: { B: 0.4, F1: 0.3, F2: 0.35 } },
      N1: { x: 0.76, y: 0.55, r: 0.06, att: { B: 0.5 } },
    },
  },
  {
    label: 'Reveal',
    short: 'Reveal',
    note: 'The true field becomes visible',
    persons: {
      B: {
        x: 0.5,
        y: 0.45,
        r: 0.075,
        att: { F1: 0.25, F2: 0.2, F3: 0.2, N1: 0.7 },
      },
      F1: { x: 0.22, y: 0.32, r: 0.065, att: { B: 0.3, F2: 0.45, F3: 0.35 } },
      F2: { x: 0.62, y: 0.28, r: 0.06, att: { B: 0.25, F1: 0.4, F3: 0.4 } },
      F3: { x: 0.52, y: 0.63, r: 0.055, att: { B: 0.3, F1: 0.35, F2: 0.4 } },
      N1: { x: 0.72, y: 0.5, r: 0.065, att: { B: 0.6 } },
    },
  },
  {
    label: 'After',
    short: 'After',
    note: 'The group re-forms around what was always there',
    persons: {
      B: {
        x: 0.52,
        y: 0.45,
        r: 0.075,
        att: { F1: 0.3, F3: 0.25, N1: 0.65 },
      },
      F1: { x: 0.2, y: 0.32, r: 0.06, att: { B: 0.25, F2: 0.35, F3: 0.4 } },
      F2: { x: 0.3, y: 0.28, r: 0.05, op: 0.4, att: { F1: 0.4, F3: 0.3 } },
      F3: { x: 0.42, y: 0.65, r: 0.055, att: { B: 0.3, F1: 0.35 } },
      N1: { x: 0.68, y: 0.45, r: 0.065, att: { B: 0.6 } },
    },
  },
];

// ═══════════════════════════════════════════════════════════
// Scenario: Asymmetry (reaching without return)
// ═══════════════════════════════════════════════════════════
const ASYMMETRY = [
  {
    label: 'Meeting',
    short: 'Meet',
    note: 'Two fields touch for the first time',
    persons: {
      B: { x: 0.35, y: 0.5, r: 0.065, att: { L: 0.3, F1: 0.4, F2: 0.35 } },
      L: { x: 0.55, y: 0.38, r: 0.065, att: { B: 0.25, F1: 0.35, F2: 0.3 } },
      F1: { x: 0.7, y: 0.55, r: 0.055, att: { B: 0.3, L: 0.3, F2: 0.25 } },
      F2: { x: 0.25, y: 0.32, r: 0.05, att: { B: 0.25, L: 0.2, F1: 0.2 } },
    },
  },
  {
    label: 'Tilt',
    short: 'Tilt',
    note: 'One field begins to reach further than the other',
    persons: {
      B: { x: 0.33, y: 0.5, r: 0.07, att: { L: 0.55, F1: 0.3, F2: 0.25 } },
      L: { x: 0.56, y: 0.37, r: 0.065, att: { B: 0.3, F1: 0.4, F2: 0.25 } },
      F1: { x: 0.72, y: 0.55, r: 0.055, att: { B: 0.2, L: 0.35, F2: 0.2 } },
      F2: { x: 0.24, y: 0.3, r: 0.05, att: { B: 0.2, L: 0.15, F1: 0.2 } },
    },
  },
  {
    label: 'Longing',
    short: 'Long',
    note: 'The shape of wanting what doesn\u2019t want you back',
    persons: {
      B: { x: 0.32, y: 0.5, r: 0.075, att: { L: 0.8, F1: 0.15, F2: 0.1 } },
      L: { x: 0.58, y: 0.36, r: 0.065, att: { B: 0.15, F1: 0.5, F2: 0.2 } },
      F1: { x: 0.74, y: 0.52, r: 0.055, att: { L: 0.45, F2: 0.15 } },
      F2: { x: 0.22, y: 0.28, r: 0.05, att: { B: 0.1, F1: 0.15 } },
    },
  },
  {
    label: 'Stable',
    short: 'Stable',
    note: 'Asymmetry doesn\u2019t always collapse \u2014 sometimes it just persists',
    persons: {
      B: { x: 0.32, y: 0.5, r: 0.075, att: { L: 0.8, F1: 0.12, F2: 0.1 } },
      L: { x: 0.6, y: 0.35, r: 0.065, att: { B: 0.12, F1: 0.5, F2: 0.15 } },
      F1: { x: 0.76, y: 0.5, r: 0.055, att: { L: 0.45, F2: 0.1 } },
      F2: { x: 0.2, y: 0.28, r: 0.05, att: { B: 0.1, F1: 0.1 } },
    },
  },
  {
    label: 'Withdrawal',
    short: 'Pull',
    note: 'The one who reaches decides to stop',
    persons: {
      B: { x: 0.3, y: 0.5, r: 0.06, att: { L: 0.15, F1: 0.25, F2: 0.2 } },
      L: { x: 0.6, y: 0.35, r: 0.065, att: { B: 0.1, F1: 0.5, F2: 0.15 } },
      F1: { x: 0.76, y: 0.5, r: 0.055, att: { L: 0.45, F2: 0.1 } },
      F2: { x: 0.2, y: 0.3, r: 0.05, att: { B: 0.2, F1: 0.15 } },
    },
  },
  {
    label: 'After',
    short: 'After',
    note: 'The field remembers the shape it held',
    persons: {
      B: { x: 0.3, y: 0.5, r: 0.055, att: { F1: 0.35, F2: 0.3 } },
      L: { x: 0.62, y: 0.34, r: 0.065, att: { F1: 0.5, F2: 0.1 } },
      F1: { x: 0.76, y: 0.52, r: 0.055, att: { B: 0.2, L: 0.4, F2: 0.15 } },
      F2: { x: 0.22, y: 0.32, r: 0.05, att: { B: 0.3, F1: 0.2 } },
    },
  },
];

// ═══════════════════════════════════════════════════════════
// Scenario: Grief (the field that reaches into nothing)
// ═══════════════════════════════════════════════════════════
const GRIEF = [
  {
    label: 'Together',
    short: 'Together',
    note: 'The field is shaped by what it loves',
    persons: {
      B: { x: 0.4, y: 0.5, r: 0.075, att: { M: 0.8, F1: 0.3 } },
      M: { x: 0.55, y: 0.4, r: 0.07, att: { B: 0.75, F1: 0.25 } },
      F1: { x: 0.7, y: 0.6, r: 0.055, att: { B: 0.35, M: 0.3 } },
    },
  },
  {
    label: 'Present',
    short: 'Present',
    note: 'Every field assumes tomorrow',
    persons: {
      B: { x: 0.4, y: 0.5, r: 0.075, att: { M: 0.8, F1: 0.3 } },
      M: { x: 0.55, y: 0.4, r: 0.07, att: { B: 0.75, F1: 0.25 } },
      F1: { x: 0.7, y: 0.6, r: 0.055, att: { B: 0.35, M: 0.3 } },
    },
  },
  {
    label: 'Gone',
    short: 'Gone',
    note: 'The attention doesn\u2019t know yet',
    persons: {
      B: { x: 0.4, y: 0.5, r: 0.075, att: { M: 0.8, F1: 0.15 } },
      M: { x: 0.55, y: 0.4, r: 0.06, op: 0, att: {} },
      F1: { x: 0.68, y: 0.58, r: 0.055, att: { B: 0.45 } },
    },
  },
  {
    label: 'Reaching',
    short: 'Reach',
    note: 'The field extends toward what is no longer there',
    persons: {
      B: { x: 0.42, y: 0.5, r: 0.075, att: { M: 0.65, F1: 0.1 } },
      M: { x: 0.55, y: 0.4, r: 0.05, op: 0, att: {} },
      F1: { x: 0.65, y: 0.58, r: 0.055, att: { B: 0.55 } },
    },
  },
  {
    label: 'Contracting',
    short: 'Shrink',
    note: 'Slowly, the field pulls back \u2014 not because it forgets',
    persons: {
      B: { x: 0.44, y: 0.48, r: 0.065, att: { M: 0.25, F1: 0.25 } },
      M: { x: 0.55, y: 0.4, r: 0.04, op: 0, att: {} },
      F1: { x: 0.62, y: 0.56, r: 0.055, att: { B: 0.5 } },
    },
  },
  {
    label: 'Residue',
    short: 'Residue',
    note: 'The shape of the absence remains in the shape of what\u2019s left',
    persons: {
      B: { x: 0.47, y: 0.47, r: 0.06, att: { F1: 0.4 } },
      M: { x: 0.55, y: 0.4, r: 0.03, op: 0, att: {} },
      F1: { x: 0.6, y: 0.55, r: 0.06, att: { B: 0.5 } },
    },
  },
];

// ═══════════════════════════════════════════════════════════
// Scenario: Projection (attending to where they were, not where they are)
// ═══════════════════════════════════════════════════════════
const PROJECTION = [
  {
    label: 'Known',
    short: 'Known',
    note: 'You attend to what you recognize',
    persons: {
      B: { x: 0.35, y: 0.5, r: 0.07, att: { F1: 0.7, F2: 0.3 } },
      F1: { x: 0.6, y: 0.45, r: 0.065, att: { B: 0.65, F2: 0.25 } },
      F2: { x: 0.5, y: 0.28, r: 0.05, att: { B: 0.25, F1: 0.2 } },
    },
  },
  {
    label: 'Fixed',
    short: 'Fixed',
    note: 'The model sets \u2014 you know who they are',
    persons: {
      B: { x: 0.35, y: 0.5, r: 0.07, att: { F1: 0.75, F2: 0.25 } },
      F1: { x: 0.62, y: 0.48, r: 0.065, att: { B: 0.6, F2: 0.2 } },
      F2: { x: 0.48, y: 0.26, r: 0.05, att: { B: 0.2, F1: 0.2 } },
    },
  },
  {
    label: 'Drift',
    short: 'Drift',
    note: 'They move \u2014 your attention doesn\u2019t',
    persons: {
      B: { x: 0.35, y: 0.5, r: 0.07, att: { F1: 0.75, F2: 0.2 } },
      F1: { x: 0.7, y: 0.58, r: 0.06, att: { B: 0.45, F2: 0.15 } },
      F2: { x: 0.45, y: 0.24, r: 0.05, att: { B: 0.15, F1: 0.15 } },
    },
  },
  {
    label: 'Mismatch',
    short: 'Miss',
    note: 'The person and the image diverge',
    persons: {
      B: { x: 0.35, y: 0.5, r: 0.07, att: { F1: 0.75, F2: 0.15 } },
      F1: { x: 0.78, y: 0.68, r: 0.055, att: { B: 0.25, F2: 0.1 } },
      F2: { x: 0.42, y: 0.22, r: 0.05, att: { F1: 0.1 } },
    },
  },
  {
    label: 'Confrontation',
    short: 'Break',
    note: 'When the image meets the person, something has to give',
    persons: {
      B: { x: 0.35, y: 0.5, r: 0.065, att: { F1: 0.7, F2: 0.1 } },
      F1: { x: 0.8, y: 0.72, r: 0.05, att: { B: 0.1 } },
      F2: { x: 0.4, y: 0.2, r: 0.045, att: {} },
    },
  },
  {
    label: 'Revision',
    short: 'Revise',
    note: 'Letting the image die so the person can live',
    persons: {
      B: { x: 0.4, y: 0.55, r: 0.065, att: { F1: 0.5, F2: 0.15 } },
      F1: { x: 0.75, y: 0.68, r: 0.06, att: { B: 0.45 } },
      F2: { x: 0.38, y: 0.22, r: 0.045, att: { B: 0.1 } },
    },
  },
];

// ═══════════════════════════════════════════════════════════
// Scenario: Mediation (connected only through a third)
// ═══════════════════════════════════════════════════════════
const MEDIATION = [
  {
    label: 'Separate',
    short: 'Apart',
    note: 'Two fields with nothing in common',
    persons: {
      F1: { x: 0.2, y: 0.5, r: 0.065, att: {} },
      F2: { x: 0.8, y: 0.5, r: 0.065, att: {} },
    },
  },
  {
    label: 'Bridge',
    short: 'Bridge',
    note: 'A third field touches both',
    persons: {
      B: { x: 0.5, y: 0.45, r: 0.07, att: { F1: 0.55, F2: 0.55 } },
      F1: { x: 0.2, y: 0.5, r: 0.065, att: { B: 0.5 } },
      F2: { x: 0.8, y: 0.5, r: 0.065, att: { B: 0.5 } },
    },
  },
  {
    label: 'Flow',
    short: 'Flow',
    note: 'Attention flows through the mediator \u2014 the others overlap in someone else\u2019s space',
    persons: {
      B: { x: 0.5, y: 0.45, r: 0.075, att: { F1: 0.7, F2: 0.7 } },
      F1: { x: 0.22, y: 0.5, r: 0.065, att: { B: 0.65 } },
      F2: { x: 0.78, y: 0.5, r: 0.065, att: { B: 0.65 } },
    },
  },
  {
    label: 'Dependent',
    short: 'Depend',
    note: 'The connection is real but borrowed',
    persons: {
      B: { x: 0.5, y: 0.45, r: 0.075, att: { F1: 0.7, F2: 0.7, F3: 0.45 } },
      F1: { x: 0.22, y: 0.5, r: 0.065, att: { B: 0.65 } },
      F2: { x: 0.78, y: 0.5, r: 0.065, att: { B: 0.65 } },
      F3: { x: 0.5, y: 0.72, r: 0.05, att: { B: 0.5 } },
    },
  },
  {
    label: 'Withdrawal',
    short: 'Fade',
    note: 'The bridge begins to thin',
    persons: {
      B: {
        x: 0.5,
        y: 0.45,
        r: 0.065,
        op: 0.6,
        att: { F1: 0.35, F2: 0.35, F3: 0.2 },
      },
      F1: { x: 0.24, y: 0.5, r: 0.065, att: { B: 0.5 } },
      F2: { x: 0.76, y: 0.5, r: 0.065, att: { B: 0.5 } },
      F3: { x: 0.5, y: 0.74, r: 0.05, att: { B: 0.35 } },
    },
  },
  {
    label: 'Collapse',
    short: 'Gone',
    note: 'Remove the mediator and the connection was never yours',
    persons: {
      B: { x: 0.5, y: 0.45, r: 0.04, op: 0.15, att: {} },
      F1: { x: 0.28, y: 0.5, r: 0.06, att: {} },
      F2: { x: 0.72, y: 0.5, r: 0.06, att: {} },
      F3: { x: 0.5, y: 0.76, r: 0.045, att: {} },
    },
  },
];

// ═══════════════════════════════════════════════════════════
// Scenario: Capital (attention harvested, capital returned)
// ═══════════════════════════════════════════════════════════
const CAPITAL = [
  {
    label: 'Friends',
    short: 'Friends',
    note: 'A rich field — attention flows freely between people',
    persons: {
      B: { x: 0.4, y: 0.45, r: 0.075, att: { F1: 0.6, F2: 0.55, F3: 0.5 } },
      F1: { x: 0.6, y: 0.32, r: 0.065, att: { B: 0.55, F2: 0.4, F3: 0.3 } },
      F2: { x: 0.65, y: 0.55, r: 0.06, att: { B: 0.5, F1: 0.4, F3: 0.35 } },
      F3: { x: 0.45, y: 0.68, r: 0.055, att: { B: 0.5, F1: 0.3, F2: 0.35 } },
    },
  },
  {
    label: 'First Job',
    short: 'Hired',
    note: 'A new kind of node appears — it wants attention but returns something else',
    persons: {
      B: {
        x: 0.38,
        y: 0.42,
        r: 0.075,
        att: { F1: 0.5, F2: 0.45, F3: 0.4, W1: 0.35 },
      },
      F1: { x: 0.58, y: 0.28, r: 0.06, att: { B: 0.5, F2: 0.35, F3: 0.25 } },
      F2: { x: 0.62, y: 0.52, r: 0.055, att: { B: 0.45, F1: 0.35, F3: 0.3 } },
      F3: { x: 0.42, y: 0.65, r: 0.05, att: { B: 0.45, F1: 0.25, F2: 0.3 } },
      W1: { x: 0.2, y: 0.6, r: 0.055, inst: true, att: { B: 0.4 } },
    },
  },
  {
    label: 'Investment',
    short: 'Invest',
    note: 'The institution rewards attention with legibility — the field tilts',
    persons: {
      B: {
        x: 0.4,
        y: 0.4,
        r: 0.075,
        att: { F1: 0.35, F2: 0.3, F3: 0.25, W1: 0.55, W2: 0.4 },
      },
      F1: { x: 0.62, y: 0.28, r: 0.055, att: { B: 0.4, F2: 0.3, F3: 0.2 } },
      F2: { x: 0.65, y: 0.52, r: 0.05, att: { B: 0.35, F1: 0.3, F3: 0.25 } },
      F3: { x: 0.45, y: 0.68, r: 0.045, att: { B: 0.3, F2: 0.25 } },
      W1: { x: 0.2, y: 0.55, r: 0.06, inst: true, att: { B: 0.5, W2: 0.3 } },
      W2: { x: 0.18, y: 0.72, r: 0.05, inst: true, att: { B: 0.35, W1: 0.3 } },
    },
  },
  {
    label: 'Promotion',
    short: 'Promote',
    note: 'More attention demanded, more capital returned — the exchange deepens',
    persons: {
      B: {
        x: 0.42,
        y: 0.38,
        r: 0.07,
        att: { F1: 0.2, F2: 0.15, F3: 0.1, W1: 0.7, W2: 0.55 },
      },
      F1: { x: 0.65, y: 0.28, r: 0.05, att: { B: 0.3, F2: 0.25 } },
      F2: { x: 0.68, y: 0.5, r: 0.045, att: { B: 0.2, F1: 0.25, F3: 0.2 } },
      F3: { x: 0.5, y: 0.68, r: 0.04, att: { B: 0.15, F2: 0.2 } },
      W1: { x: 0.22, y: 0.5, r: 0.065, inst: true, att: { B: 0.6, W2: 0.35 } },
      W2: { x: 0.2, y: 0.7, r: 0.055, inst: true, att: { B: 0.45, W1: 0.35 } },
    },
  },
  {
    label: 'Capture',
    short: 'Capture',
    note: 'The institution holds nearly all of B\u2019s attention — friends become silhouettes',
    persons: {
      B: {
        x: 0.45,
        y: 0.38,
        r: 0.065,
        att: { F1: 0.08, F2: 0.05, W1: 0.8, W2: 0.65 },
      },
      F1: { x: 0.72, y: 0.3, r: 0.04, att: { B: 0.15 } },
      F2: { x: 0.75, y: 0.52, r: 0.035, op: 0.5, att: { B: 0.1, F1: 0.15 } },
      F3: { x: 0.58, y: 0.72, r: 0.03, op: 0.25, att: {} },
      W1: { x: 0.24, y: 0.45, r: 0.07, inst: true, att: { B: 0.7, W2: 0.4 } },
      W2: { x: 0.22, y: 0.68, r: 0.06, inst: true, att: { B: 0.55, W1: 0.4 } },
    },
  },
  {
    label: 'Accumulation',
    short: 'Accum',
    note: 'Capital accumulates — but what returns from work is not what was sent',
    persons: {
      B: {
        x: 0.48,
        y: 0.4,
        r: 0.06,
        att: { F1: 0.05, W1: 0.8, W2: 0.7 },
      },
      F1: { x: 0.75, y: 0.35, r: 0.035, op: 0.35, att: { B: 0.1 } },
      F2: { x: 0.78, y: 0.55, r: 0.03, op: 0.15, att: {} },
      W1: { x: 0.25, y: 0.42, r: 0.075, inst: true, att: { B: 0.75, W2: 0.4 } },
      W2: { x: 0.22, y: 0.65, r: 0.065, inst: true, att: { B: 0.6, W1: 0.4 } },
    },
  },
  {
    label: 'Hollowed',
    short: 'Hollow',
    note: 'Legible, credited, known by title — but the field that once held people is empty',
    persons: {
      B: {
        x: 0.5,
        y: 0.42,
        r: 0.05,
        att: { W1: 0.6, W2: 0.5 },
      },
      F1: { x: 0.78, y: 0.4, r: 0.03, op: 0.1, att: {} },
      W1: { x: 0.28, y: 0.4, r: 0.075, inst: true, att: { B: 0.7, W2: 0.4 } },
      W2: { x: 0.25, y: 0.65, r: 0.065, inst: true, att: { B: 0.55, W1: 0.4 } },
    },
  },
];

// ═══════════════════════════════════════════════════════════
// Scenarios registry
// ═══════════════════════════════════════════════════════════
const SCENARIOS = {
  // drift: { label: 'Drift', desc: 'Gradual separation from parents', stages: DRIFT },
  // fracture: { label: 'Fracture', desc: 'Sharp break from parents', stages: FRACTURE },
  // alignment: { label: 'Alignment', desc: 'Stays close to parents', stages: ALIGNMENT },
  // rivalry: { label: 'Rivalry', desc: 'Convergent desire, failed recognition', stages: RIVALRY },
  cascade: {
    label: 'Cascade',
    desc: 'One attractor destabilizes the field',
    stages: CASCADE,
  },
  ossification: {
    label: 'Ossification',
    desc: 'Total recognition becomes total control',
    stages: OSSIFICATION,
  },
  hub: {
    label: 'Hub',
    desc: 'Being seen everywhere, known nowhere',
    stages: HUB,
  },
  orientation: {
    label: 'Orientation',
    desc: 'Shared orientation toward God',
    stages: ORIENTATION,
  },
  concealment: {
    label: 'Concealment',
    desc: 'The gap between the performed self and the true one',
    stages: CONCEALMENT,
  },
  // asymmetry: {
  //   label: 'Asymmetry',
  //   desc: 'Reaching without return',
  //   stages: ASYMMETRY,
  // },
  // grief: {
  //   label: 'Grief',
  //   desc: 'The field that reaches into nothing',
  //   stages: GRIEF,
  // },
  // projection: {
  //   label: 'Projection',
  //   desc: 'Attending to where they were, not where they are',
  //   stages: PROJECTION,
  // },
  mediation: {
    label: 'Mediation',
    desc: 'Connected only through a third',
    stages: MEDIATION,
  },
  capital: {
    label: 'Capital',
    desc: 'Attention harvested, capital returned',
    stages: CAPITAL,
  },
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

function hsl(id, alpha, inst) {
  if (id === 'G') return `rgba(255, 248, 220, ${alpha})`;
  if (inst) return `rgba(218, 185, 107, ${alpha})`;
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
  const result = {
    x: lerp(a.x, b.x, t),
    y: lerp(a.y, b.y, t),
    r: lerp(a.r, b.r, t),
    op: lerp(a.op !== undefined ? a.op : 1, b.op !== undefined ? b.op : 1, t),
    att: lerpAtt(a.att, b.att, t),
  };
  if (a.inst || b.inst) result.inst = true;
  if (a.innerAtt || b.innerAtt) {
    result.innerAtt = lerpAtt(a.innerAtt || null, b.innerAtt || null, t);
  }
  return result;
}

function interpolate(tVal, stages) {
  const maxT = stages.length - 1;
  const clamped = Math.max(0, Math.min(tVal, maxT));
  const idx = Math.min(Math.floor(clamped), maxT);
  const frac = smoothstep(clamped - idx);

  const sA = stages[idx];
  const sB = stages[Math.min(idx + 1, maxT)];

  const allIds = new Set([
    ...Object.keys(sA.persons),
    ...Object.keys(sB.persons),
  ]);
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
function blobPoints(person, id, all, W, H, time, attOverride) {
  const px = person.x * W;
  const py = person.y * H;
  const baseR = person.r * W;
  const seed = (HUES[id] || 0) * 0.1;

  const pts = [];
  for (let i = 0; i < NUM_ANGLES; i++) {
    const theta = i * ANGLE_STEP;
    let r = baseR;

    const att = attOverride || person.att || {};
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
      n +=
        (Math.sin(k * theta + seed * k * 1.7 + time * 0.0004 * k) * NOISE_AMP) /
        k;
    }
    r *= 1 + n;
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
      pts[i].x,
      pts[i].y,
      (pts[i].x + pts[next].x) / 2,
      (pts[i].y + pts[next].y) / 2,
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

    // Ghost blob (true self) — rendered behind the performed blob
    if (p.innerAtt && Object.keys(p.innerAtt).length > 0) {
      const ghostPts = blobPoints(p, id, persons, W, H, time, p.innerAtt);
      smoothPath(ctx, ghostPts);
      ctx.fillStyle = hsl(id, 0.1 * p.op, p.inst);
      ctx.fill();
      ctx.setLineDash([6, 4]);
      ctx.strokeStyle = hsl(id, 0.3 * p.op, p.inst);
      ctx.lineWidth = 1.5;
      ctx.stroke();
      ctx.setLineDash([]);
    }

    const pts = blobPoints(p, id, persons, W, H, time);
    smoothPath(ctx, pts);
    ctx.fillStyle = hsl(id, 0.18 * p.op, p.inst);
    ctx.fill();
    ctx.strokeStyle = hsl(id, 0.4 * p.op, p.inst);
    ctx.lineWidth = 1.8;
    ctx.stroke();
  }

  // Capital return-flow: dashed gold lines from institutional nodes to their targets
  for (const id of ids) {
    const p = persons[id];
    if (!p.inst || p.op < 0.01) continue;
    const px = p.x * W;
    const py = p.y * H;
    for (const [tid, weight] of Object.entries(p.att || {})) {
      const target = persons[tid];
      if (!target || (target.op !== undefined ? target.op : 1) < 0.01) continue;
      // Only draw return-flow to non-institutional nodes
      if (target.inst) continue;
      const tx = target.x * W;
      const ty = target.y * H;
      ctx.beginPath();
      ctx.moveTo(px, py);
      ctx.lineTo(tx, ty);
      ctx.setLineDash([8, 6]);
      ctx.strokeStyle = `rgba(218, 185, 107, ${0.35 * weight * p.op})`;
      ctx.lineWidth = Math.max(1.5, weight * 4);
      ctx.stroke();
      ctx.setLineDash([]);
    }
  }

  for (const id of ids) {
    const p = persons[id];
    if (p.op < 0.01) continue;

    const cx = p.x * W;
    const cy = p.y * H;
    const nr = Math.max(10, p.r * W * 0.22);

    if (p.inst) {
      // Institutional nodes: diamond shape
      ctx.beginPath();
      ctx.moveTo(cx, cy - nr);
      ctx.lineTo(cx + nr, cy);
      ctx.lineTo(cx, cy + nr);
      ctx.lineTo(cx - nr, cy);
      ctx.closePath();
      ctx.fillStyle = hsl(id, 0.85 * p.op, true);
      ctx.fill();
      ctx.strokeStyle = `rgba(218, 185, 107, ${0.6 * p.op})`;
      ctx.lineWidth = 1.5;
      ctx.stroke();
    } else {
      ctx.beginPath();
      ctx.arc(cx, cy, nr, 0, TWO_PI);
      ctx.fillStyle = hsl(id, 0.85 * p.op);
      ctx.fill();
      ctx.strokeStyle = `rgba(255,255,255,${0.5 * p.op})`;
      ctx.lineWidth = 1.5;
      ctx.stroke();
    }

    ctx.fillStyle = `rgba(255,255,255,${0.9 * p.op})`;
    ctx.font = `bold ${Math.max(10, nr * 0.85)}px -apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(LABELS[id] || id, cx, cy + 1);
  }

  if (note && noteAlpha > 0.01) {
    const fs = Math.max(14, Math.min(18, W * 0.022));
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
  const scenarioRef = useRef('cascade');

  const [sliderT, setSliderT] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [dims, setDims] = useState({ w: 800, h: 500 });
  const [scenario, setScenario] = useState('cascade');

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

    const observer = new ResizeObserver((entries) => {
      if (entries[0]) resize(entries[0].contentRect.width);
    });
    observer.observe(container);
    resize(container.offsetWidth);

    let autoplayed = false;
    const intersect = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !autoplayed && !playingRef.current) {
          autoplayed = true;
          playingRef.current = true;
          lastFrameRef.current = null;
          setPlaying(true);
        }
      },
      { threshold: 0.5 },
    );
    intersect.observe(container);

    return () => {
      observer.disconnect();
      intersect.disconnect();
    };
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
          tRef.current = Math.min(tRef.current + (dt * PLAY_SPEED) / 1000, mt);

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
  const labelText =
    nearest.age != null
      ? `${nearest.label}  \u00b7  age ${nearest.age}`
      : nearest.label;

  return (
    <div ref={containerRef} style={S.wrap}>
      <style>{CSS}</style>
      <canvas ref={canvasRef} style={S.canvas} />
      <div style={S.scenarioRow}>
        {SCENARIO_KEYS.map((key) => (
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
              onClick={() => {
                tRef.current = i;
                setSliderT(i);
              }}
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
    padding: '20px 0',
    fontFamily: '-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif',
    background: BG,
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
    flexWrap: 'wrap',
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
    fontSize: 13,
    cursor: 'pointer',
    transition: 'opacity 0.3s',
    userSelect: 'none',
  },
};
