// @ts-ignore
import React, { useState } from 'https://esm.sh/react';
import { injectStyle } from '../shared/injectStyle.js';
import TieTbl from './TieTbl.js';
import { CSS } from './styles.js';
const initialState = {
    a: { node: 'a', id: 'x', content: 'z', contentFrom: null, time: '12:00:00', mergedWith: [] },
    b: { node: 'b', id: 'x', content: 'b', contentFrom: null, time: '12:00:00', mergedWith: [] },
    c: { node: 'c', id: 'x', content: 'a', contentFrom: null, time: '12:00:00', mergedWith: [] },
};
export default function TieBreakExample() {
    injectStyle('gentle-crdts', CSS);
    const [state, setState] = useState(initialState);
    const [tieBreaker, setTieBreaker] = useState('nodeId');
    function reset() {
        setState(initialState);
    }
    function hasMerged(target, source) {
        return state[target].mergedWith.includes(source);
    }
    function merge(target, source) {
        setState((state) => {
            const newState = structuredClone(state);
            const nodeState = newState[target];
            const otherNode = newState[source];
            switch (tieBreaker) {
                case 'value':
                    if (nodeState.content < otherNode.content) {
                        nodeState.content = otherNode.content;
                    }
                    break;
                case 'nodeId':
                    if ((nodeState.contentFrom || nodeState.node) < otherNode.node) {
                        nodeState.content = otherNode.content;
                        nodeState.contentFrom = otherNode.node;
                    }
                    break;
                case 'reject':
                    break;
                case 'take':
                    nodeState.content = otherNode.content;
                    break;
            }
            nodeState.mergedWith.push(source);
            return newState;
        });
    }
    return (React.createElement("div", { className: "gc-ex-tie" },
        React.createElement("fieldset", { className: "gc-fieldset", onChange: (e) => {
                setTieBreaker(e.target.value);
            } },
            React.createElement("legend", null, "Tie Breaker:"),
            React.createElement("label", { style: { color: 'green' } },
                React.createElement("input", { type: "radio", name: "tie-breaker", value: "value", checked: tieBreaker === 'value', readOnly: true }),
                "Value"),
            React.createElement("label", { style: { color: 'green' } },
                React.createElement("input", { type: "radio", name: "tie-breaker", value: "nodeId", checked: tieBreaker === 'nodeId', readOnly: true }),
                "Node ID"),
            React.createElement("label", { style: { color: 'red' } },
                React.createElement("input", { type: "radio", name: "tie-breaker", value: "reject", checked: tieBreaker === 'reject', readOnly: true }),
                "Always Reject"),
            React.createElement("label", { style: { color: 'red' } },
                React.createElement("input", { type: "radio", name: "tie-breaker", value: "take", checked: tieBreaker === 'take', readOnly: true }),
                "Always Take"),
            React.createElement("button", { onClick: reset, className: "gc-btn" }, "Reset Example")),
        React.createElement("strong", null, "Node A:"),
        React.createElement("div", { className: "gc-tie-contain" },
            React.createElement(TieTbl, { row: state.a }),
            React.createElement("button", { className: "gc-btn", disabled: hasMerged('a', 'b'), onClick: () => merge('a', 'b'), style: { marginRight: 4 } }, "Merge B Here"),
            React.createElement("button", { className: "gc-btn", disabled: hasMerged('a', 'c'), onClick: () => merge('a', 'c') }, "Merge C Here")),
        React.createElement("strong", null, "Node B:"),
        React.createElement("div", { className: "gc-tie-contain" },
            React.createElement(TieTbl, { row: state.b }),
            React.createElement("button", { className: "gc-btn", disabled: hasMerged('b', 'a'), onClick: () => merge('b', 'a'), style: { marginRight: 4 } }, "Merge A Here"),
            React.createElement("button", { className: "gc-btn", disabled: hasMerged('b', 'c'), onClick: () => merge('b', 'c') }, "Merge C Here")),
        React.createElement("strong", null, "Node C:"),
        React.createElement("div", { className: "gc-tie-contain" },
            React.createElement(TieTbl, { row: state.c }),
            React.createElement("button", { className: "gc-btn", disabled: hasMerged('c', 'a'), onClick: () => merge('c', 'a'), style: { marginRight: 4 } }, "Merge A Here"),
            React.createElement("button", { className: "gc-btn", disabled: hasMerged('c', 'b'), onClick: () => merge('c', 'b') }, "Merge B Here"))));
}
