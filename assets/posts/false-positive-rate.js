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

function pop_readout(size) {
  return (
    `<center class="pop-readout">
      <span>
        <span class="pop-num">
        ${size.toLocaleString()}
        </span>
        ${person(PersonStates.DEFAULT)}
      </span>
    </center>`
  );
}
