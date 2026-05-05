// @ts-nocheck
import React, { useState, useCallback } from 'https://esm.sh/react';
import { useQuery } from 'https://esm.sh/@vlcn.io/react?deps=react,react-dom';
import { newIID as newId } from './id.js';
import { injectStyle } from '../shared/injectStyle.js';
import { CSS } from './styles.js';

function Header({ ctx, nodeName, eventHandler }) {
  const [newText, setNewText] = useState('');
  return (
    <header className="lwd-header">
      <h1>todos - {nodeName}</h1>
      <input
        type="text"
        className="lwd-new-todo"
        placeholder="What needs to be done?"
        value={newText}
        onChange={(e) => setNewText(e.target.value)}
        onKeyUp={(e) => {
          const target = e.target;
          if (e.key === 'Enter' && target.value.trim() !== '') {
            setNewText('');
            return eventHandler(ctx, {
              type: 'add',
              itemId: newId(ctx.db.siteid.replaceAll('-', '')),
              value: target.value,
            });
          }
        }}
      />
    </header>
  );
}

function TodoView({ todo, editing, startEditing, saveTodo, ctx, eventHandler }) {
  const [text, setText] = useState(todo.text);
  const deleteTodo = () => eventHandler(ctx, { type: 'remove', itemId: todo.id });
  const toggleTodo = () =>
    eventHandler(ctx, {
      type: 'complete',
      itemId: todo.id,
      value: todo.completed ? 0 : 1,
    });

  let body;
  if (editing) {
    body = (
      <input
        type="text"
        className="lwd-edit"
        autoFocus
        value={text}
        onBlur={() => saveTodo(todo, text)}
        onKeyUp={(e) => e.key === 'Enter' && saveTodo(todo, text)}
        onChange={(e) => setText(e.target.value)}
      />
    );
  } else {
    body = (
      <div className="lwd-view">
        <input
          type="checkbox"
          className="lwd-toggle"
          checked={!!todo.completed}
          onChange={toggleTodo}
        />
        <label
          onDoubleClick={() => {
            setText(todo.text);
            startEditing(todo);
          }}
        >
          {todo.text}
        </label>
        <button className="lwd-destroy" onClick={deleteTodo} />
      </div>
    );
  }

  return (
    <li
      className={
        (todo.completed ? 'lwd-completed ' : '') + (editing ? 'lwd-editing' : '')
      }
    >
      {body}
    </li>
  );
}

function Footer({ remaining, todos, clearCompleted, todoList, setFilter }) {
  let clearCompletedButton;
  if (remaining !== todos.length) {
    clearCompletedButton = (
      <button className="lwd-clear-completed" onClick={clearCompleted}>
        Clear Done
      </button>
    );
  }

  return (
    <footer className="lwd-footer">
      <span className="lwd-todo-count">
        <strong> {remaining} </strong>
        {remaining === 1 ? 'item' : 'items'} left
      </span>
      <ul className="lwd-filters">
        <li>
          <a
            className={todoList.filter === 'all' ? 'lwd-selected' : ''}
            onClick={() => setFilter('all')}
          >
            {' '}
            All{' '}
          </a>
        </li>
        <li>
          <a
            className={todoList.filter === 'active' ? 'lwd-selected' : ''}
            onClick={() => setFilter('active')}
          >
            Active
          </a>
        </li>
        <li>
          <a
            className={todoList.filter === 'completed' ? 'lwd-selected' : ''}
            onClick={() => setFilter('completed')}
          >
            Done
          </a>
        </li>
      </ul>
      {clearCompletedButton}
    </footer>
  );
}

export default function TodoList({ ctx, nodeName, eventHandler, ex }) {
  injectStyle('lww-vs-dag', CSS);
  const [list, setList] = useState({ editing: null, filter: 'all' });
  const startEditing = useCallback((todo) => {
    setList((old) => ({ ...old, editing: todo.id }));
  }, []);
  const saveTodo = useCallback(
    (todo, text) => {
      setList((old) => ({ ...old, editing: null }));
      return eventHandler(ctx, { type: 'rename', itemId: todo.id, value: text });
    },
    [ctx, eventHandler],
  );

  const clearCompleted = () => eventHandler(ctx, { type: 'clearCompleted' });

  const allTodos = useQuery(ctx, 'SELECT * FROM todo ORDER BY id DESC').data;
  const completeTodos = allTodos.filter((t) => t.completed);
  const activeTodos = allTodos.filter((t) => !t.completed);
  const remaining = activeTodos.length;

  const toggleAll = () => {
    if (remaining === 0) return eventHandler(ctx, { type: 'uncompleteAll' });
    return eventHandler(ctx, { type: 'completeAll' });
  };

  const todos =
    list.filter === 'active'
      ? activeTodos
      : list.filter === 'completed'
      ? completeTodos
      : allTodos;

  let toggleAllCheck;
  if (allTodos.length) {
    toggleAllCheck = (
      <>
        <input
          id={'toggle-all-' + nodeName + ex}
          type="checkbox"
          className="lwd-toggle-all"
          checked={remaining === 0}
          onChange={toggleAll}
        />
        <label htmlFor={'toggle-all-' + nodeName + ex}>Mark all as complete</label>
      </>
    );
  }

  return (
    <>
      <Header ctx={ctx} nodeName={nodeName} eventHandler={eventHandler} />
      <section
        className="lwd-main"
        style={allTodos.length > 0 ? {} : { display: 'none' }}
      >
        {toggleAllCheck}
        <ul className="lwd-todo-list">
          {todos.map((t) => (
            <TodoView
              ctx={ctx}
              eventHandler={eventHandler}
              key={t.id.toString()}
              todo={t}
              editing={list.editing === t.id}
              startEditing={startEditing}
              saveTodo={saveTodo}
            />
          ))}
        </ul>
        <Footer
          remaining={remaining}
          todos={allTodos}
          todoList={list}
          clearCompleted={clearCompleted}
          setFilter={(f) => setList((l) => ({ ...l, filter: f }))}
        />
      </section>
    </>
  );
}
