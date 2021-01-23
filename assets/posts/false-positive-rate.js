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
  const have_covid = Math.max(population * prevalence);
  const healthy = population - have_covid;

  const false_negatives = Math.max(have_covid * fn_rate);
  const true_positives = have_covid - false_negatives;

  const false_positives = Math.max(healthy * fp_rate);
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

function bind() {
  const pop_value = document.getElementById('pop-value');
  const pop_legend = document.getElementById('pop-legend');
  document.getElementById('pop-ctrl').oninput = (e) => {
    pop_legend.innerText = pop_value.innerText = parseInt(e.target.value).toLocaleString();
    recalculate();
  };
  const prevalence_value = document.getElementById('prevalence-value');
  const prevalence_legend = document.getElementById('prevalence-legend');
  document.getElementById('prevalence-ctrl').oninput = (e) => {
    prevalence_legend.innerText = prevalence_value.innerText = e.target.value.toLocaleString();
    recalculate();
  };
  const fp_rate_legend = document.getElementById('fp-rate-legend');
  document.getElementById('fp-rate-ctrl').oninput = (e) => {
    fp_rate_legend.innerText = e.target.value.toLocaleString();
    recalculate();
  };
}

function set_state(next_state) {

}

bind();

// const people_el = document.getElementById('people');
// people_el.innerHTML = render_people(100);
