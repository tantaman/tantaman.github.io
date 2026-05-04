// @ts-nocheck
import React, { useState, useCallback } from 'https://esm.sh/react';
import { useQuery } from 'https://esm.sh/@vlcn.io/react';
import { newIID as newId } from './id.js';
import { injectStyle } from '../shared/injectStyle.js';
import { CSS } from './styles.js';
function Header({ ctx, nodeName, eventHandler }) {
    const [newText, setNewText] = useState('');
    return (React.createElement("header", { className: "lwd-header" },
        React.createElement("h1", null,
            "todos - ",
            nodeName),
        React.createElement("input", { type: "text", className: "lwd-new-todo", placeholder: "What needs to be done?", value: newText, onChange: (e) => setNewText(e.target.value), onKeyUp: (e) => {
                const target = e.target;
                if (e.key === 'Enter' && target.value.trim() !== '') {
                    setNewText('');
                    return eventHandler(ctx, {
                        type: 'add',
                        itemId: newId(ctx.db.siteid.replaceAll('-', '')),
                        value: target.value,
                    });
                }
            } })));
}
function TodoView({ todo, editing, startEditing, saveTodo, ctx, eventHandler }) {
    const [text, setText] = useState(todo.text);
    const deleteTodo = () => eventHandler(ctx, { type: 'remove', itemId: todo.id });
    const toggleTodo = () => eventHandler(ctx, {
        type: 'complete',
        itemId: todo.id,
        value: todo.completed ? 0 : 1,
    });
    let body;
    if (editing) {
        body = (React.createElement("input", { type: "text", className: "lwd-edit", autoFocus: true, value: text, onBlur: () => saveTodo(todo, text), onKeyUp: (e) => e.key === 'Enter' && saveTodo(todo, text), onChange: (e) => setText(e.target.value) }));
    }
    else {
        body = (React.createElement("div", { className: "lwd-view" },
            React.createElement("input", { type: "checkbox", className: "lwd-toggle", checked: !!todo.completed, onChange: toggleTodo }),
            React.createElement("label", { onDoubleClick: () => {
                    setText(todo.text);
                    startEditing(todo);
                } }, todo.text),
            React.createElement("button", { className: "lwd-destroy", onClick: deleteTodo })));
    }
    return (React.createElement("li", { className: (todo.completed ? 'lwd-completed ' : '') + (editing ? 'lwd-editing' : '') }, body));
}
function Footer({ remaining, todos, clearCompleted, todoList, setFilter }) {
    let clearCompletedButton;
    if (remaining !== todos.length) {
        clearCompletedButton = (React.createElement("button", { className: "lwd-clear-completed", onClick: clearCompleted }, "Clear Done"));
    }
    return (React.createElement("footer", { className: "lwd-footer" },
        React.createElement("span", { className: "lwd-todo-count" },
            React.createElement("strong", null,
                " ",
                remaining,
                " "),
            remaining === 1 ? 'item' : 'items',
            " left"),
        React.createElement("ul", { className: "lwd-filters" },
            React.createElement("li", null,
                React.createElement("a", { className: todoList.filter === 'all' ? 'lwd-selected' : '', onClick: () => setFilter('all') },
                    ' ',
                    "All",
                    ' ')),
            React.createElement("li", null,
                React.createElement("a", { className: todoList.filter === 'active' ? 'lwd-selected' : '', onClick: () => setFilter('active') }, "Active")),
            React.createElement("li", null,
                React.createElement("a", { className: todoList.filter === 'completed' ? 'lwd-selected' : '', onClick: () => setFilter('completed') }, "Done"))),
        clearCompletedButton));
}
export default function TodoList({ ctx, nodeName, eventHandler, ex }) {
    injectStyle('lww-vs-dag', CSS);
    const [list, setList] = useState({ editing: null, filter: 'all' });
    const startEditing = useCallback((todo) => {
        setList((old) => (Object.assign(Object.assign({}, old), { editing: todo.id })));
    }, []);
    const saveTodo = useCallback((todo, text) => {
        setList((old) => (Object.assign(Object.assign({}, old), { editing: null })));
        return eventHandler(ctx, { type: 'rename', itemId: todo.id, value: text });
    }, [ctx, eventHandler]);
    const clearCompleted = () => eventHandler(ctx, { type: 'clearCompleted' });
    const allTodos = useQuery(ctx, 'SELECT * FROM todo ORDER BY id DESC').data;
    const completeTodos = allTodos.filter((t) => t.completed);
    const activeTodos = allTodos.filter((t) => !t.completed);
    const remaining = activeTodos.length;
    const toggleAll = () => {
        if (remaining === 0)
            return eventHandler(ctx, { type: 'uncompleteAll' });
        return eventHandler(ctx, { type: 'completeAll' });
    };
    const todos = list.filter === 'active'
        ? activeTodos
        : list.filter === 'completed'
            ? completeTodos
            : allTodos;
    let toggleAllCheck;
    if (allTodos.length) {
        toggleAllCheck = (React.createElement(React.Fragment, null,
            React.createElement("input", { id: 'toggle-all-' + nodeName + ex, type: "checkbox", className: "lwd-toggle-all", checked: remaining === 0, onChange: toggleAll }),
            React.createElement("label", { htmlFor: 'toggle-all-' + nodeName + ex }, "Mark all as complete")));
    }
    return (React.createElement(React.Fragment, null,
        React.createElement(Header, { ctx: ctx, nodeName: nodeName, eventHandler: eventHandler }),
        React.createElement("section", { className: "lwd-main", style: allTodos.length > 0 ? {} : { display: 'none' } },
            toggleAllCheck,
            React.createElement("ul", { className: "lwd-todo-list" }, todos.map((t) => (React.createElement(TodoView, { ctx: ctx, eventHandler: eventHandler, key: t.id.toString(), todo: t, editing: list.editing === t.id, startEditing: startEditing, saveTodo: saveTodo })))),
            React.createElement(Footer, { remaining: remaining, todos: allTodos, todoList: list, clearCompleted: clearCompleted, setFilter: (f) => setList((l) => (Object.assign(Object.assign({}, l), { filter: f }))) }))));
}
