// @ts-ignore
import React, { useMemo, useState } from 'https://esm.sh/react';
import Mutation from './Mutation.js';
import NodeResult from './NodeResult.js';
export function Node({ mutations, name, state }) {
    const [priorState, setPriorState] = useState(state);
    const [theState, setTheState] = useState(state);
    function applyMutation(fn) {
        setTheState(fn(theState));
    }
    // reset from outer component
    if (state != priorState) {
        setPriorState(state);
        setTheState(state);
    }
    const maxArgs = useMemo(() => {
        return Object.entries(mutations).reduce((acc, [, fn]) => {
            return Math.max(acc, fn.numArgs);
        }, 0);
    }, [mutations]);
    return (React.createElement("div", { className: "cs-node-root" },
        React.createElement("h1", null,
            "N",
            name.substring(1, 4),
            " ",
            name.substring(4)),
        React.createElement("div", { className: "cs-node" },
            React.createElement("div", { className: "cs-node-table" },
                React.createElement("h2", null, "Mutations"),
                React.createElement("table", null,
                    React.createElement("thead", null,
                        React.createElement("tr", null,
                            React.createElement("th", null, "mutation"),
                            React.createElement("th", { colSpan: maxArgs + 1, style: { textAlign: 'left' } }, "args..."))),
                    React.createElement("tbody", null, Object.entries(mutations).map(([name, fn]) => (React.createElement(Mutation, { fn: fn, onClick: applyMutation, key: name, name: name })))))),
            React.createElement("div", { className: "cs-node-state" },
                React.createElement("h2", null, "State"),
                React.createElement(NodeResult, { state: theState })))));
}
export default Node;
