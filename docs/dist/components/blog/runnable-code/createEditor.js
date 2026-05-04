// @ts-ignore
import { basicSetup } from 'https://esm.sh/codemirror';
// @ts-ignore
import { EditorView, keymap } from 'https://esm.sh/@codemirror/view';
// @ts-ignore
import { javascript } from 'https://esm.sh/@codemirror/lang-javascript';
// @ts-ignore
import { indentWithTab } from 'https://esm.sh/@codemirror/commands';
export default function createEditor(props) {
    const extraBinds = props.extraBinds || [];
    return new EditorView(Object.assign({ extensions: [
            basicSetup,
            javascript(),
            keymap.of([indentWithTab, ...extraBinds]),
        ] }, props));
}
