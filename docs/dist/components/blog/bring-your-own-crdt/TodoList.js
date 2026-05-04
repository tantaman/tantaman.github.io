// @ts-nocheck
import React, { useState, useCallback } from 'https://esm.sh/react';
import { useQuery } from 'https://esm.sh/@vlcn.io/react';
import { firstPick } from 'https://esm.sh/@vlcn.io/xplat-api';
import { newIID as newId } from './id.js';
import { injectStyle } from '../shared/injectStyle.js';
import { CSS } from './styles.js';
function Header({ ctx, nodeName, eventHandler }) {
    const [newText, setNewText] = useState('');
    return (React.createElement("header", { className: "byo-header" },
        React.createElement("h1", null,
            "todos - ",
            nodeName),
        React.createElement("input", { type: "text", className: "byo-new-todo", placeholder: "What needs to be done?", value: newText, onChange: (e) => setNewText(e.target.value), onKeyUp: (e) => {
                const target = e.target;
                if (e.key === 'Enter' && target.value.trim() !== '') {
                    setNewText('');
                    return eventHandler(ctx, {
                        name: 'add',
                        args: [newId(ctx.db.siteid.replaceAll('-', '')), target.value],
                    });
                }
            } })));
}
function TodoView({ todo, editing, startEditing, saveTodo, ctx, eventHandler }) {
    const [text, setText] = useState(todo.content);
    const deleteTodo = () => eventHandler(ctx, { name: 'remove', args: [todo.id] });
    const toggleTodo = () => eventHandler(ctx, {
        name: 'complete',
        args: [todo.id, todo.completed ? 0 : 1],
    });
    let body;
    if (editing) {
        body = (React.createElement("input", { type: "text", className: "byo-edit", autoFocus: true, value: text, onBlur: () => saveTodo(todo, text), onKeyUp: (e) => e.key === 'Enter' && saveTodo(todo, text), onChange: (e) => setText(e.target.value) }));
    }
    else {
        body = (React.createElement("div", { className: "byo-view" },
            React.createElement("input", { type: "checkbox", className: "byo-toggle", checked: !!todo.completed, onChange: toggleTodo }),
            React.createElement("label", { onDoubleClick: () => {
                    setText(todo.content);
                    startEditing(todo);
                } }, todo.content),
            React.createElement("button", { className: "byo-destroy", onClick: deleteTodo })));
    }
    return (React.createElement("li", { className: (todo.completed ? 'byo-completed ' : '') + (editing ? 'byo-editing' : '') }, body));
}
function Footer({ remaining, todos, clearCompleted, todoList, setFilter }) {
    let clearCompletedButton;
    if (remaining !== todos.length) {
        clearCompletedButton = (React.createElement("button", { className: "byo-clear-completed", onClick: clearCompleted }, "Clear Done"));
    }
    return (React.createElement("footer", { className: "byo-footer" },
        React.createElement("span", { className: "byo-todo-count" },
            React.createElement("strong", null,
                " ",
                remaining,
                " "),
            remaining === 1 ? 'item' : 'items',
            " left"),
        React.createElement("ul", { className: "byo-filters" },
            React.createElement("li", null,
                React.createElement("a", { className: todoList.filter === 'all' ? 'byo-selected' : '', onClick: () => setFilter('all') },
                    ' ',
                    "All",
                    ' ')),
            React.createElement("li", null,
                React.createElement("a", { className: todoList.filter === 'active' ? 'byo-selected' : '', onClick: () => setFilter('active') }, "Active")),
            React.createElement("li", null,
                React.createElement("a", { className: todoList.filter === 'completed' ? 'byo-selected' : '', onClick: () => setFilter('completed') }, "Done"))),
        clearCompletedButton));
}
export default function TodoList({ ctx, nodeName, eventHandler, ex }) {
    injectStyle('bring-your-own-crdt', CSS);
    const [list, setList] = useState({ editing: null, filter: 'all' });
    const startEditing = useCallback((todo) => {
        setList((old) => (Object.assign(Object.assign({}, old), { editing: todo.id })));
    }, []);
    const saveTodo = useCallback((todo, text) => {
        setList((old) => (Object.assign(Object.assign({}, old), { editing: null })));
        return eventHandler(ctx, { name: 'rename', args: [todo.id, text] });
    }, [ctx, eventHandler]);
    const clearCompleted = () => eventHandler(ctx, { name: 'clearCompleted', args: [] });
    const allTodos = useQuery(ctx, 'SELECT * FROM todo ORDER BY id DESC').data;
    const counter = useQuery(ctx, 'SELECT count FROM counter', undefined, firstPick).data || 0;
    const completeTodos = allTodos.filter((t) => t.completed);
    const activeTodos = allTodos.filter((t) => !t.completed);
    const remaining = activeTodos.length;
    const toggleAll = () => {
        if (remaining === 0)
            return eventHandler(ctx, { name: 'uncompleteAll', args: [] });
        return eventHandler(ctx, { name: 'completeAll', args: [] });
    };
    const todos = list.filter === 'active'
        ? activeTodos
        : list.filter === 'completed'
            ? completeTodos
            : allTodos;
    let toggleAllCheck;
    if (allTodos.length) {
        toggleAllCheck = (React.createElement(React.Fragment, null,
            React.createElement("input", { id: 'toggle-all-' + nodeName + ex, type: "checkbox", className: "byo-toggle-all", checked: remaining === 0, onChange: toggleAll }),
            React.createElement("label", { htmlFor: 'toggle-all-' + nodeName + ex }, "Mark all as complete")));
    }
    return (React.createElement(React.Fragment, null,
        React.createElement(Header, { ctx: ctx, nodeName: nodeName, eventHandler: eventHandler }),
        React.createElement("section", { className: "byo-main", style: allTodos.length > 0 ? {} : { display: 'none' } },
            toggleAllCheck,
            React.createElement("ul", { className: "byo-todo-list" }, todos.map((t) => (React.createElement(TodoView, { ctx: ctx, eventHandler: eventHandler, key: t.id.toString(), todo: t, editing: list.editing === t.id, startEditing: startEditing, saveTodo: saveTodo })))),
            React.createElement(Footer, { remaining: remaining, todos: allTodos, todoList: list, clearCompleted: clearCompleted, setFilter: (f) => setList((l) => (Object.assign(Object.assign({}, l), { filter: f }))) })),
        React.createElement("div", { style: {
                padding: '10px',
                paddingTop: '40px',
                width: '100%',
                background: '#fffff8',
                fontSize: '20px',
                textAlign: 'center',
            } },
            React.createElement("button", { style: {
                    cursor: 'pointer',
                    border: '1px solid black',
                    borderRadius: '5px',
                    padding: '5px',
                    background: '#fff888',
                }, onClick: () => eventHandler(ctx, { name: 'increment', args: [] }) },
                "I'm a distributed counter! ",
                counter))));
}
