// @ts-nocheck
import React, { useState, useCallback } from 'https://esm.sh/react';
import { useQuery } from 'https://esm.sh/@vlcn.io/react';
import { firstPick } from 'https://esm.sh/@vlcn.io/xplat-api';
import { newIID as newId } from './id.js';
import { injectStyle } from '../shared/injectStyle.js';
import { CSS } from './styles.js';

function Header({ ctx, nodeName, eventHandler }) {
  const [newText, setNewText] = useState('');
  return (
    <header className="byo-header">
      <h1>todos - {nodeName}</h1>
      <input
        type="text"
        className="byo-new-todo"
        placeholder="What needs to be done?"
        value={newText}
        onChange={(e) => setNewText(e.target.value)}
        onKeyUp={(e) => {
          const target = e.target;
          if (e.key === 'Enter' && target.value.trim() !== '') {
            setNewText('');
            return eventHandler(ctx, {
              name: 'add',
              args: [newId(ctx.db.siteid.replaceAll('-', '')), target.value],
            });
          }
        }}
      />
    </header>
  );
}

function TodoView({ todo, editing, startEditing, saveTodo, ctx, eventHandler }) {
  const [text, setText] = useState(todo.content);
  const deleteTodo = () => eventHandler(ctx, { name: 'remove', args: [todo.id] });
  const toggleTodo = () =>
    eventHandler(ctx, {
      name: 'complete',
      args: [todo.id, todo.completed ? 0 : 1],
    });

  let body;
  if (editing) {
    body = (
      <input
        type="text"
        className="byo-edit"
        autoFocus
        value={text}
        onBlur={() => saveTodo(todo, text)}
        onKeyUp={(e) => e.key === 'Enter' && saveTodo(todo, text)}
        onChange={(e) => setText(e.target.value)}
      />
    );
  } else {
    body = (
      <div className="byo-view">
        <input
          type="checkbox"
          className="byo-toggle"
          checked={!!todo.completed}
          onChange={toggleTodo}
        />
        <label
          onDoubleClick={() => {
            setText(todo.content);
            startEditing(todo);
          }}
        >
          {todo.content}
        </label>
        <button className="byo-destroy" onClick={deleteTodo} />
      </div>
    );
  }

  return (
    <li
      className={
        (todo.completed ? 'byo-completed ' : '') + (editing ? 'byo-editing' : '')
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
      <button className="byo-clear-completed" onClick={clearCompleted}>
        Clear Done
      </button>
    );
  }

  return (
    <footer className="byo-footer">
      <span className="byo-todo-count">
        <strong> {remaining} </strong>
        {remaining === 1 ? 'item' : 'items'} left
      </span>
      <ul className="byo-filters">
        <li>
          <a
            className={todoList.filter === 'all' ? 'byo-selected' : ''}
            onClick={() => setFilter('all')}
          >
            {' '}
            All{' '}
          </a>
        </li>
        <li>
          <a
            className={todoList.filter === 'active' ? 'byo-selected' : ''}
            onClick={() => setFilter('active')}
          >
            Active
          </a>
        </li>
        <li>
          <a
            className={todoList.filter === 'completed' ? 'byo-selected' : ''}
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
  injectStyle('bring-your-own-crdt', CSS);
  const [list, setList] = useState({ editing: null, filter: 'all' });
  const startEditing = useCallback((todo) => {
    setList((old) => ({ ...old, editing: todo.id }));
  }, []);
  const saveTodo = useCallback(
    (todo, text) => {
      setList((old) => ({ ...old, editing: null }));
      return eventHandler(ctx, { name: 'rename', args: [todo.id, text] });
    },
    [ctx, eventHandler],
  );

  const clearCompleted = () =>
    eventHandler(ctx, { name: 'clearCompleted', args: [] });

  const allTodos = useQuery(ctx, 'SELECT * FROM todo ORDER BY id DESC').data;
  const counter =
    useQuery(ctx, 'SELECT count FROM counter', undefined, firstPick).data || 0;
  const completeTodos = allTodos.filter((t) => t.completed);
  const activeTodos = allTodos.filter((t) => !t.completed);
  const remaining = activeTodos.length;

  const toggleAll = () => {
    if (remaining === 0)
      return eventHandler(ctx, { name: 'uncompleteAll', args: [] });
    return eventHandler(ctx, { name: 'completeAll', args: [] });
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
          className="byo-toggle-all"
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
        className="byo-main"
        style={allTodos.length > 0 ? {} : { display: 'none' }}
      >
        {toggleAllCheck}
        <ul className="byo-todo-list">
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
      <div
        style={{
          padding: '10px',
          paddingTop: '40px',
          width: '100%',
          background: '#fffff8',
          fontSize: '20px',
          textAlign: 'center',
        }}
      >
        <button
          style={{
            cursor: 'pointer',
            border: '1px solid black',
            borderRadius: '5px',
            padding: '5px',
            background: '#fff888',
          }}
          onClick={() => eventHandler(ctx, { name: 'increment', args: [] })}
        >
          I'm a distributed counter! {counter}
        </button>
      </div>
    </>
  );
}
