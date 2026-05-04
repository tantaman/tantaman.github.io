// @ts-ignore
import React, { useEffect, useRef, useState } from 'https://esm.sh/react';
// @ts-ignore
import { ObjectView } from 'https://esm.sh/react-object-view';
// @ts-ignore
import { PacmanLoader } from 'https://esm.sh/react-spinners';
// @ts-ignore
import { FontAwesomeIcon } from 'https://esm.sh/@fortawesome/react-fontawesome';
// @ts-ignore
import { faPlay } from 'https://esm.sh/@fortawesome/free-solid-svg-icons';
import createEditor from './createEditor.js';
import { CodeNode } from './CodeNode.js';
import { injectStyle } from '../shared/injectStyle.js';
import { CSS } from './styles.js';
const palette = { base00: '#192830' };
export default function RunnableCode({ code }) {
    injectStyle('runnable-code', CSS);
    const editorEl = useRef(null);
    const editor = useRef(null);
    const codeNode = useRef(null);
    const [result, setResult] = useState(undefined);
    const [error, setError] = useState(undefined);
    const [waitingFor, setWaitingFor] = useState([]);
    if (codeNode.current == null) {
        codeNode.current = new CodeNode();
        codeNode.current.on = (r, e) => {
            setWaitingFor(null);
            if (e) {
                console.error(e);
                setError(e);
                setResult(undefined);
                return;
            }
            setError(undefined);
            setResult(r);
        };
    }
    const runCode = () => {
        var _a, _b;
        if (editor.current == null)
            return true;
        const code = editor.current.state.doc.toString();
        (_a = codeNode.current) === null || _a === void 0 ? void 0 : _a.eval(code);
        setWaitingFor(((_b = codeNode.current) === null || _b === void 0 ? void 0 : _b.waitingFor()) || null);
        return true;
    };
    useEffect(() => {
        if (editorEl.current == null)
            return;
        if (editor.current != null)
            return;
        editor.current = createEditor({
            parent: editorEl.current,
            doc: code,
            extraBinds: [{ key: 'Shift-Enter', run: runCode }],
        });
        runCode();
    }, [code]);
    return (React.createElement("div", { className: "rc-root" },
        React.createElement(FontAwesomeIcon, { icon: faPlay, className: "rc-run", onClick: runCode }),
        React.createElement("div", { ref: editorEl }),
        React.createElement(Result, { waitingFor: waitingFor, error: error, result: result })));
}
function Result({ waitingFor, error, result }) {
    if (waitingFor != null) {
        return (React.createElement("div", { className: "rc-loading" },
            waitingFor.length > 0 && (React.createElement("div", null,
                "Waiting for: ",
                waitingFor.join(', '))),
            React.createElement("div", { className: "rc-spinner-container" },
                React.createElement(PacmanLoader, { color: "#36d7b7" }))));
    }
    return (React.createElement("pre", { style: { display: result !== undefined ? 'block' : 'none' } },
        React.createElement("code", null, error !== undefined ? (error === null || error === void 0 ? void 0 : error.message) : (React.createElement(ObjectView, { data: { '': result }, palette: palette })))));
}
