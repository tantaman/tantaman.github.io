const lib = (el) => {
  function remove(a, x) {
    a.splice(a.indexOf(x), 1);
  }

  const temp_el = document.createElement('div');
  function sanitize(value) {
    if (value) {
      if (typeof value === 'object' && value.__html__) {
        return value.__html__;
      }
      if (Array.isArray(value)) {
        return value.map(sanitize).join('');
      }
    }
    temp_el.textContent = value;
    return temp_el.innerHTML;
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

  function render(
    content,
    atom,
  ) {
    if (typeof content === 'string') {
      // render and append to doc
      append(content);
    }
  }

  function append(rendered_content) {
    const p = document.createElement('p');
    p.innerHTML = rendered_content;
    el.append(p);
  }

  return {
    render,
    atom,
  };
};

/* css */`
.class {
  width: 10px;
}
`;

const publisher = lib(document.getElementById('doc'));

publisher.render('<b>Hello!</b>');
