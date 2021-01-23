const PersonStates = {
  DEFAULT: 'DEFAULT',
  FALSE_POSITIVE: 'false_positive',
  TRUE_POSITIVE: 'true_positive',
  FALSE_NEGATIVE: 'false_negative',
  TRUE_NEGATIVE: 'true_negative',
};

function person(state) {
  return (
    `<span class="person">
      <div class="head"></div>
      <div class="body"></div>
      <div class="left-arm-divider"></div>
      <div class="right-arm-divider"></div>
    </span>`
  );
}

function render_people(num) {
  return Array(num).fill(0).map(
    _ => person(),
  ).join('');
}

function calculate(
  population,
  fp_rate,
  prevalence,
  fn_rate,
) {
  const have_covid = Math.ceil(population * prevalence);
  const healthy = population - have_covid;

  const false_negatives = Math.ceil(have_covid * fn_rate);
  const true_positives = have_covid - false_negatives;

  const false_positives = Math.ceil(healthy * fp_rate);
  const true_negatives = healthy - false_positives;

  return {
    // have covid
    have_covid,
    false_negatives,
    true_positives,

    // healthy
    healthy,
    false_positives,
    true_negatives,
  };
}

const display = {
  pop_value: document.getElementById('pop-value'),
  pop_legend: document.getElementById('pop-legend'),

  prevalence_value: document.getElementById('prevalence-value'),
  prevalence_legend: document.getElementById('prevalence-legend'),

  fp_rate_legend: document.getElementById('fp-rate-legend'),

  infected_value: document.getElementById('infected-value'),
  healthy_value: document.getElementById('healthy-value'),

  // have
  false_neg_value: document.getElementById('false-neg-value'),
  true_pos_value: document.getElementById('true-pos-value'),

  // healthy
  false_pos_value: document.getElementById('false-pos-value'),
  true_neg_value: document.getElementById('true-neg-value'),
};

let state = {
  population: 1000,
  fp_rate: 0.5 / 100.0,
  prevalence: 1 / 100.0,
  fn_rate: 0,
};

set_state(state);

function render(state) {
  display.pop_legend.innerText =
    display.pop_value.innerText = state.population.toLocaleString();
  display.prevalence_legend.innerText =
    display.prevalence_value.innerText = Math.round(state.prevalence * 100);

  display.fp_rate_legend.innerText = (state.fp_rate * 100).toFixed(1).toLocaleString();

  display.infected_value.innerText = state.calculations.have_covid.toLocaleString();
  display.healthy_value.innerText = state.calculations.healthy.toLocaleString();

  display.false_neg_value.innerText = state.calculations.false_negatives.toLocaleString();
  display.true_pos_value.innerText = state.calculations.true_positives.toLocaleString();

  display.true_neg_value.innerText = state.calculations.true_negatives.toLocaleString();
  display.false_pos_value.innerText = state.calculations.false_positives.toLocaleString();
}

function bind() {
  document.getElementById('pop-ctrl').oninput = (e) =>
    set_state({
      population: parseInt(e.target.value),
    });
  document.getElementById('prevalence-ctrl').oninput = (e) =>
    set_state({
      prevalence: parseInt(e.target.value) / 100.0,
    });
  document.getElementById('fp-rate-ctrl').oninput = (e) =>
    set_state({
      fp_rate: parseFloat(e.target.value) / 100.0,
    });
}

function set_state(next_state) {
  state = {
    ...state,
    ...next_state,
  };

  state.calculations = calculate(
    state.population,
    state.fp_rate,
    state.prevalence,
    state.fn_rate,
  );

  render(state);
}

bind();

// const people_el = document.getElementById('people');
// people_el.innerHTML = render_people(100);
