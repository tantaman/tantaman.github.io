export default function asTrackedMutations(mutations) {
  const ret = {};
  for (const [name, fn] of Object.entries(mutations)) {
    ret[name] = (state, args) => {
      const copy = structuredClone(state.state);
      const result = fn(copy, ...args);
      if (result === false) {
        return { state: copy, dag: state.dag };
      }
      state.dag.addEvent({ mutationName: name, mutationArgs: args });
      return { state: copy, dag: state.dag };
    };
    ret[name].numArgs = fn.length - 1;
  }
  return ret;
}
