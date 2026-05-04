// @ts-ignore
import React, { useState } from 'https://esm.sh/react';
export default function Mutation({ name, fn, onClick }) {
    const [args, setArgs] = useState(Array.from({ length: fn.numArgs }));
    const applyMutation = (state) => {
        const ret = fn(state, args);
        setArgs(Array.from({ length: fn.numArgs }));
        return ret;
    };
    return (React.createElement("tr", { key: name },
        React.createElement("td", null,
            React.createElement("button", { onClick: () => onClick(applyMutation) }, name)),
        new Array(fn.numArgs).fill(null).map((_, i) => (React.createElement("td", { key: i },
            React.createElement("input", { type: "text", onChange: (e) => {
                    setArgs((args) => {
                        const newArgs = [...args];
                        newArgs[i] = e.target.value;
                        return newArgs;
                    });
                }, value: args[i] || '' }))))));
}
