export const CSS = `
.lwd-todoapp {
  display: inline-block;
  margin: 10px 20px 40px;
  width: 425px;
  position: relative;
}

.lwd-todoapp input::-webkit-input-placeholder {
  font-style: italic;
  font-weight: 300;
  color: rgba(0, 0, 0, 0.4);
}

.lwd-todoapp input::-moz-placeholder {
  font-style: italic;
  font-weight: 300;
  color: rgba(0, 0, 0, 0.4);
}

.lwd-todoapp input::input-placeholder {
  font-style: italic;
  font-weight: 300;
  color: rgba(0, 0, 0, 0.4);
}

.lwd-header h1 {
  position: absolute;
  top: -60px;
  width: 100%;
  font-size: 30px;
  font-weight: 200;
  text-align: center;
  color: #b83f45;
}

.lwd-new-todo,
.lwd-edit {
  position: relative;
  margin: 0;
  width: 100%;
  font-size: 24px;
  font-family: inherit;
  font-weight: inherit;
  line-height: 1.4em;
  color: inherit;
  padding: 6px;
  border: 1px solid #999;
  box-shadow: inset 0 -1px 5px 0 rgba(0, 0, 0, 0.2);
  box-sizing: border-box;
}

.lwd-new-todo {
  padding: 16px 16px 16px 60px;
  border: none;
  background: rgba(0, 0, 0, 0.003);
  box-shadow: inset 0 -2px 1px rgba(0, 0, 0, 0.03);
}

.lwd-main {
  position: relative;
  z-index: 2;
  border-top: 1px solid #e6e6e6;
}

.lwd-toggle-all {
  width: 1px;
  height: 1px;
  border: none;
  opacity: 0;
  position: absolute;
  right: 100%;
  bottom: 100%;
}

.lwd-toggle-all + label {
  width: 60px;
  height: 34px;
  font-size: 0;
  position: absolute;
  top: -52px;
  left: -13px;
  transform: rotate(90deg);
}

.lwd-toggle-all + label:before {
  content: "❯";
  font-size: 22px;
  color: #e6e6e6;
  padding: 10px 27px 10px 27px;
}

.lwd-toggle-all:checked + label:before {
  color: #737373;
}

.lwd-todo-list {
  margin: 0;
  padding: 0;
  list-style: none;
}

.lwd-todo-list li {
  position: relative;
  font-size: 24px;
  border-bottom: 1px solid #ededed;
}

.lwd-todo-list li:last-child {
  border-bottom: none;
}

.lwd-todo-list li.lwd-editing {
  border-bottom: none;
  padding: 0;
}

.lwd-todo-list li.lwd-editing .lwd-edit {
  display: block;
  width: calc(100% - 43px);
  padding: 12px 16px;
  margin: 0 0 0 43px;
}

.lwd-todo-list li.lwd-editing .lwd-view {
  display: none;
}

.lwd-todo-list li .lwd-toggle {
  text-align: center;
  width: 40px;
  height: auto;
  position: absolute;
  top: 0;
  bottom: 0;
  margin: auto 0;
  border: none;
  -webkit-appearance: none;
  appearance: none;
  opacity: 0;
}

.lwd-todo-list li .lwd-toggle + label {
  background-image: url("data:image/svg+xml;utf8,%3Csvg%20xmlns%3D%22http%3A//www.w3.org/2000/svg%22%20width%3D%2240%22%20height%3D%2240%22%20viewBox%3D%22-10%20-18%20100%20135%22%3E%3Ccircle%20cx%3D%2250%22%20cy%3D%2250%22%20r%3D%2250%22%20fill%3D%22none%22%20stroke%3D%22%23ededed%22%20stroke-width%3D%223%22/%3E%3C/svg%3E");
  background-repeat: no-repeat;
  background-position: center left;
}

.lwd-todo-list li .lwd-toggle:checked + label {
  background-image: url("data:image/svg+xml;utf8,%3Csvg%20xmlns%3D%22http%3A//www.w3.org/2000/svg%22%20width%3D%2240%22%20height%3D%2240%22%20viewBox%3D%22-10%20-18%20100%20135%22%3E%3Ccircle%20cx%3D%2250%22%20cy%3D%2250%22%20r%3D%2250%22%20fill%3D%22none%22%20stroke%3D%22%23bddad5%22%20stroke-width%3D%223%22/%3E%3Cpath%20fill%3D%22%235dc2af%22%20d%3D%22M72%2025L42%2071%2027%2056l-4%204%2020%2020%2034-52z%22/%3E%3C/svg%3E");
}

.lwd-todo-list li label {
  word-break: break-all;
  padding: 15px 15px 15px 60px;
  display: block;
  line-height: 1.2;
  transition: color 0.4s;
  font-weight: 400;
  color: #4d4d4d;
}

.lwd-todo-list li.lwd-completed label {
  color: #cdcdcd;
  text-decoration: line-through;
}

.lwd-todo-list li .lwd-destroy {
  display: none;
  position: absolute;
  top: 0;
  right: 10px;
  bottom: 0;
  width: 40px;
  height: 40px;
  margin: auto 0;
  font-size: 30px;
  color: #cc9a9a;
  margin-bottom: 11px;
  transition: color 0.2s ease-out;
}

.lwd-todo-list li .lwd-destroy:hover {
  color: #af5b5e;
}

.lwd-todo-list li .lwd-destroy:after {
  content: "×";
}

.lwd-todo-list li:hover .lwd-destroy {
  display: block;
}

.lwd-todo-list li .lwd-edit {
  display: none;
}

.lwd-footer {
  padding: 10px 15px;
  height: 20px;
  text-align: center;
  font-size: 15px;
  border-top: 1px solid #e6e6e6;
}

.lwd-todo-count {
  float: left;
  text-align: left;
}

.lwd-todo-count strong {
  font-weight: 300;
}

.lwd-filters {
  margin: 0;
  padding: 0;
  list-style: none;
  position: absolute;
  right: 0;
  left: 0;
}

.lwd-filters li {
  display: inline;
}

.lwd-filters li a {
  color: inherit;
  margin: 3px;
  padding: 3px 7px;
  text-decoration: none;
  border: 1px solid transparent;
  border-radius: 3px;
  cursor: pointer;
}

.lwd-filters li a:hover {
  border-color: rgba(175, 47, 47, 0.1);
}

.lwd-filters li a.lwd-selected {
  border-color: rgba(175, 47, 47, 0.2);
}

.lwd-clear-completed {
  float: right;
  position: relative;
  line-height: 20px;
  text-decoration: none;
  cursor: pointer;
}

.lwd-clear-completed:hover {
  text-decoration: underline;
}

.lwd-stateTable {
  font-size: 0.8rem;
}

.lwd-btn {
  cursor: pointer;
  padding: 10px;
  background: #980000;
  color: white;
  font-weight: bold;
  border-radius: 10px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.2);
}

.lwd-btn.lwd-btn-secondary {
  background: #00981e;
  color: #333;
  margin-left: 10px;
}

.lwd-dag-label {
  font-size: 8px;
  font-weight: bold;
  color: white;
}

.lwd-id-readout {}
`;
