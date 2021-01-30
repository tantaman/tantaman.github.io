const lib = (el) => {
  function remove(a, x) {
    a.splice(a.indexOf(x), 1);
  }

  function atom(initial) {
    let state = initial;
    let listeners = [];

    return {
      merge(next) {
        state = {
          ...initial,
          ...next,
        };
      },

      set(next) {
        state = next;
      },

      on(cb) {
        listeners.push(cb);
      },

      off(cb) {
        remove(listeners, cb);
      },

      dispose() {
        listeners = state = null;
      },
    };
  }

  function md(
    content,
    atom,
  ) {
    if (typeof content === 'string') {
      // render and append to doc
    }
  }

  function append(rendered_content) {
    el.append(rendered_content);
  }

  return {
    md,
    atom,
  };
};

/* css */`
.class {
  width: 10px;
}
`;

console.log(lib(document.getElementById('doc')));
