/*@jsxRuntime automatic @jsxImportSource https://esm.sh/react*/
import {Fragment as _Fragment, jsx as _jsx, jsxs as _jsxs} from "https://esm.sh/react/jsx-runtime";
import Dag from '/dist/components/blog/bring-your-own-crdt/Dag.js';
import I from '/dist/components/blog/bring-your-own-crdt/Initialize.js';
import Callout from '/dist/components/blog/shared/Callout.js';
function _createMdxContent(props) {
  const _components = Object.assign({
    nav: "nav",
    ol: "ol",
    li: "li",
    a: "a",
    p: "p",
    h2: "h2",
    span: "span",
    pre: "pre",
    code: "code",
    ul: "ul",
    em: "em"
  }, props.components);
  return _jsxs(_Fragment, {
    children: [_jsx(_components.nav, {
      className: "toc",
      children: _jsxs(_components.ol, {
        className: "toc-level toc-level-1",
        children: [_jsx(_components.li, {
          className: "toc-item toc-item-h2",
          children: _jsx(_components.a, {
            className: "toc-link toc-link-h2",
            href: "#background",
            children: "Background"
          })
        }), _jsx(_components.li, {
          className: "toc-item toc-item-h2",
          children: _jsx(_components.a, {
            className: "toc-link toc-link-h2",
            href: "#bring-your-own-crdt",
            children: "Bring your own CRDT"
          })
        }), _jsx(_components.li, {
          className: "toc-item toc-item-h2",
          children: _jsx(_components.a, {
            className: "toc-link toc-link-h2",
            href: "#building-the-event-log",
            children: "Building the Event Log"
          })
        }), _jsx(_components.li, {
          className: "toc-item toc-item-h2",
          children: _jsx(_components.a, {
            className: "toc-link toc-link-h2",
            href: "#declaring-mutations",
            children: "Declaring Mutations"
          })
        }), _jsx(_components.li, {
          className: "toc-item toc-item-h2",
          children: _jsx(_components.a, {
            className: "toc-link toc-link-h2",
            href: "#generating-events",
            children: "Generating Events"
          })
        }), _jsx(_components.li, {
          className: "toc-item toc-item-h2",
          children: _jsx(_components.a, {
            className: "toc-link toc-link-h2",
            href: "#traversing-the-dag",
            children: "Traversing the DAG"
          })
        }), _jsx(_components.li, {
          className: "toc-item toc-item-h2",
          children: _jsx(_components.a, {
            className: "toc-link toc-link-h2",
            href: "#putting-it-all-together",
            children: "Putting it all Together"
          })
        })]
      })
    }), "\n", _jsxs(_components.p, {
      children: ["I recently watched ", _jsx(_components.a, {
        href: "https://twitter.com/aboodman",
        children: "@aboodman"
      }), " give a talk about ", _jsx(_components.a, {
        href: "https://replicache.dev/",
        children: "Replicache"
      }), ". I loved seeing the Replicache model and the talk gave me a bit of envy. Envious of how simply new multiplayer semantics can be built out without having any understanding of distributed systems and CRDTs."]
    }), "\n", _jsx(_components.p, {
      children: "So I was wondering, can we bring the same developer experience to CRDTs?"
    }), "\n", _jsxs(_components.h2, {
      id: "background",
      children: [_jsx(_components.a, {
        "aria-hidden": "true",
        tabIndex: "-1",
        href: "#background",
        children: _jsx(_components.span, {
          className: "icon icon-link"
        })
      }), "Background"]
    }), "\n", _jsx(_components.p, {
      children: "Replicache has a model where developers create named mutations."
    }), "\n", _jsx(_components.p, {
      children: "E.g.,"
    }), "\n", _jsx(_components.pre, {
      children: _jsxs(_components.code, {
        className: "hljs language-js",
        children: [_jsx(_components.span, {
          className: "hljs-keyword",
          children: "export"
        }), " ", _jsx(_components.span, {
          className: "hljs-keyword",
          children: "const"
        }), " mutations {\n  ", _jsx(_components.span, {
          className: "hljs-title function_",
          children: "increment"
        }), "(", _jsx(_components.span, {
          className: "hljs-params",
          children: "tx, amount"
        }), ") {\n    ", _jsx(_components.span, {
          className: "hljs-keyword",
          children: "const"
        }), " current = tx.", _jsx(_components.span, {
          className: "hljs-title function_",
          children: "get"
        }), "(", _jsx(_components.span, {
          className: "hljs-string",
          children: "'count'"
        }), ");\n    ", _jsx(_components.span, {
          className: "hljs-keyword",
          children: "const"
        }), " next = current + amount;\n    tx.", _jsx(_components.span, {
          className: "hljs-title function_",
          children: "put"
        }), "(", _jsx(_components.span, {
          className: "hljs-string",
          children: "'count'"
        }), ", next);\n  }\n}\n"]
      })
    }), "\n", _jsxs(_components.p, {
      children: ["These named mutations exist both on the client and server. The client can optimistically apply mutations to its local state as often as it likes. In the background, these mutations are shipped off to the server as a tuple of ", _jsx(_components.code, {
        children: "[mutation_name, ...args]"
      }), ". The server then merges changes from all clients by coming up with a total ordering of mutations and applying them. There are a few more details but that's the gist of the Replicache model."]
    }), "\n", _jsx(_components.p, {
      children: "This model is great. Developers can write arbitrary logic in their mutations and still end up with convergent state. This lets devs work with what they're familiar with (normal code) rather than having to reach for and learn about the correct CRDT to use to model their data."
    }), "\n", _jsx(_components.p, {
      children: "One trade-off of the Replicache approach, however, is that all changes must go through a central server. It can't work in a P2P setting."
    }), "\n", _jsx(_components.p, {
      children: "But it got me thinking, can we bring the Replicache model to CRDTs? Can we give developers a way to write arbitrary logic and still guarantee convergence of their state in both client-server and P2P settings?"
    }), "\n", _jsxs(_components.h2, {
      id: "bring-your-own-crdt",
      children: [_jsx(_components.a, {
        "aria-hidden": "true",
        tabIndex: "-1",
        href: "#bring-your-own-crdt",
        children: _jsx(_components.span, {
          className: "icon icon-link"
        })
      }), "Bring your own CRDT"]
    }), "\n", _jsxs(_components.p, {
      children: ["Yes we can! For lack of a better term, I'm calling it \"CRDT substrate\". It is a re-think on my earlier work (", _jsx(_components.a, {
        href: "/2023-04-20-lww-vs-dag.html",
        children: "LWW vs DAG"
      }), ") to incoroprate named mutations, inspired by Replicache."]
    }), "\n", _jsxs(_components.h2, {
      id: "building-the-event-log",
      children: [_jsx(_components.a, {
        "aria-hidden": "true",
        tabIndex: "-1",
        href: "#building-the-event-log",
        children: _jsx(_components.span, {
          className: "icon icon-link"
        })
      }), "Building the Event Log"]
    }), "\n", _jsxs(_components.p, {
      children: ["The basis of the model is an event log. Just like Replicache, we'll model the event log as ", _jsx(_components.code, {
        children: "[mutation_name, ...args]"
      }), " tuples. One thing we'll add to each event, however, is a pointer back to the event which preceeded it. This pointer will allow us to build a tree of events where forks represent concurrent edits. A traversal of this tree will create a total ordering of events and allow us to converge on a single state."]
    }), "\n", _jsx(_components.p, {
      children: "The tree is a CRDT given:"
    }), "\n", _jsxs(_components.ul, {
      children: ["\n", _jsx(_components.li, {
        children: "The tree is inflationary with a partial ordering, forming a semi-lattice"
      }), "\n", _jsx(_components.li, {
        children: "Merging trees is idempotent (we toss out duplicate events)"
      }), "\n", _jsx(_components.li, {
        children: "Merging trees is commutative and associative (we just bring events over as-is, no reparenting happens on merge)"
      }), "\n"]
    }), "\n", _jsx(_components.p, {
      children: "We'll implement this concept in SQL."
    }), "\n", _jsx(_components.p, {
      children: "To do so, we'll need some tables to represent out event log."
    }), "\n", _jsx(_components.pre, {
      children: _jsxs(_components.code, {
        className: "hljs language-sql",
        children: [_jsx(_components.span, {
          className: "hljs-keyword",
          children: "CREATE"
        }), " ", _jsx(_components.span, {
          className: "hljs-keyword",
          children: "TABLE"
        }), " event (\n  id ", _jsx(_components.span, {
          className: "hljs-type",
          children: "INTEGER"
        }), " ", _jsx(_components.span, {
          className: "hljs-keyword",
          children: "PRIMARY"
        }), " KEY ", _jsx(_components.span, {
          className: "hljs-keyword",
          children: "NOT"
        }), " ", _jsx(_components.span, {
          className: "hljs-keyword",
          children: "NULL"
        }), ",\n  mutation_name TEXT,\n  args ", _jsx(_components.span, {
          className: "hljs-keyword",
          children: "ANY"
        }), "\n) STRICT;\n\n", _jsx(_components.span, {
          className: "hljs-keyword",
          children: "CREATE"
        }), " ", _jsx(_components.span, {
          className: "hljs-keyword",
          children: "TABLE"
        }), " event_dag (\n  parent_id ", _jsx(_components.span, {
          className: "hljs-keyword",
          children: "ANY"
        }), " ", _jsx(_components.span, {
          className: "hljs-keyword",
          children: "NOT"
        }), " ", _jsx(_components.span, {
          className: "hljs-keyword",
          children: "NULL"
        }), ", ", _jsx(_components.span, {
          className: "hljs-comment",
          children: "-- the event that came before this one"
        }), "\n  event_id ", _jsx(_components.span, {
          className: "hljs-type",
          children: "INTEGER"
        }), " ", _jsx(_components.span, {
          className: "hljs-keyword",
          children: "NOT"
        }), " ", _jsx(_components.span, {
          className: "hljs-keyword",
          children: "NULL"
        }), ", ", _jsx(_components.span, {
          className: "hljs-comment",
          children: "-- the id of the event"
        }), "\n  ", _jsx(_components.span, {
          className: "hljs-keyword",
          children: "PRIMARY"
        }), " KEY (parent_id, event_id)\n) STRICT;\n\n", _jsx(_components.span, {
          className: "hljs-keyword",
          children: "CREATE"
        }), " INDEX event_dag_event ", _jsx(_components.span, {
          className: "hljs-keyword",
          children: "ON"
        }), " event_dag (event_id);\n"]
      })
    }), "\n", _jsx(_components.p, {
      children: "And then table(s) to represent the application which, for this example, is a basic todo app."
    }), "\n", _jsx(_components.pre, {
      children: _jsxs(_components.code, {
        className: "hljs language-sql",
        children: [_jsx(_components.span, {
          className: "hljs-keyword",
          children: "CREATE"
        }), " ", _jsx(_components.span, {
          className: "hljs-keyword",
          children: "TABLE"
        }), " todo (id ", _jsx(_components.span, {
          className: "hljs-type",
          children: "INTEGER"
        }), " ", _jsx(_components.span, {
          className: "hljs-keyword",
          children: "PRIMARY"
        }), " KEY ", _jsx(_components.span, {
          className: "hljs-keyword",
          children: "NOT"
        }), " ", _jsx(_components.span, {
          className: "hljs-keyword",
          children: "NULL"
        }), ", content TEXT, completed ", _jsx(_components.span, {
          className: "hljs-type",
          children: "BOOLEAN"
        }), ");\n", _jsx(_components.span, {
          className: "hljs-comment",
          children: "-- and a counter just for a bit of fun"
        }), "\n", _jsx(_components.span, {
          className: "hljs-keyword",
          children: "CREATE"
        }), " ", _jsx(_components.span, {
          className: "hljs-keyword",
          children: "TABLE"
        }), " counter (id ", _jsx(_components.span, {
          className: "hljs-type",
          children: "INTEGER"
        }), " ", _jsx(_components.span, {
          className: "hljs-keyword",
          children: "PRIMARY"
        }), " KEY ", _jsx(_components.span, {
          className: "hljs-keyword",
          children: "NOT"
        }), " ", _jsx(_components.span, {
          className: "hljs-keyword",
          children: "NULL"
        }), " ", _jsx(_components.span, {
          className: "hljs-keyword",
          children: "CHECK"
        }), " (id ", _jsx(_components.span, {
          className: "hljs-operator",
          children: "="
        }), " ", _jsx(_components.span, {
          className: "hljs-number",
          children: "0"
        }), "), count ", _jsx(_components.span, {
          className: "hljs-type",
          children: "INTEGER"
        }), " ", _jsx(_components.span, {
          className: "hljs-keyword",
          children: "DEFAULT"
        }), " ", _jsx(_components.span, {
          className: "hljs-number",
          children: "0"
        }), ");\n"]
      })
    }), "\n", _jsxs(_components.h2, {
      id: "declaring-mutations",
      children: [_jsx(_components.a, {
        "aria-hidden": "true",
        tabIndex: "-1",
        href: "#declaring-mutations",
        children: _jsx(_components.span, {
          className: "icon icon-link"
        })
      }), "Declaring Mutations"]
    }), "\n", _jsx(_components.p, {
      children: "Next, we need to declare the mutations used by our application. These mutations must exist on all peers. Mutations must be deterministic but they need not be idempotent as we will guarantee that the effects of a mutation on local state will only be observed once."
    }), "\n", _jsx(Callout, {
      type: "info",
      children: _jsxs(_components.p, {
        children: ["Can't the user shoot themselves in the foot if their mutation changes some globals? Yes but I think this is an acceptable risk. If it is not, we define mutations in ", _jsx(_components.a, {
          href: "https://www.assemblyscript.org/",
          children: "AssemblyScript"
        }), ". This allows us to completely sandbox the mutation code and ", _jsx(_components.em, {
          children: "only"
        }), " give it access to what is safe to read and write. ", _jsx(_components.code, {
          children: "AssemblyScript"
        }), " is another super power given we can compile it to WASM and run this WASM code in the database itself rather than requiring the user to spin up a separate backend."]
      })
    }), "\n", _jsx(_components.pre, {
      children: _jsxs(_components.code, {
        className: "hljs language-js",
        children: [_jsx(_components.span, {
          className: "hljs-keyword",
          children: "const"
        }), " bareMutations = {\n  ", _jsx(_components.span, {
          className: "hljs-keyword",
          children: "async"
        }), " ", _jsx(_components.span, {
          className: "hljs-title function_",
          children: "addTodo"
        }), "(", _jsx(_components.span, {
          className: "hljs-params",
          children: "tx, todoId, value"
        }), ") {\n    ", _jsx(_components.span, {
          className: "hljs-keyword",
          children: "await"
        }), " tx.", _jsx(_components.span, {
          className: "hljs-title function_",
          children: "exec"
        }), "(\n      ", _jsx(_components.span, {
          className: "hljs-comment",
          children: "/*sql*/"
        }), " ", _jsx(_components.span, {
          className: "hljs-string",
          children: "`INSERT INTO todo (id, content, completed) VALUES (?, ?, ?)`"
        }), ",\n      [todoId, value, ", _jsx(_components.span, {
          className: "hljs-number",
          children: "0"
        }), "],\n    );\n  },\n  ", _jsx(_components.span, {
          className: "hljs-keyword",
          children: "async"
        }), " ", _jsx(_components.span, {
          className: "hljs-title function_",
          children: "removeTodo"
        }), "(", _jsx(_components.span, {
          className: "hljs-params",
          children: "tx, todoId"
        }), ") {\n    ", _jsx(_components.span, {
          className: "hljs-keyword",
          children: "await"
        }), " tx.", _jsx(_components.span, {
          className: "hljs-title function_",
          children: "exec"
        }), "(", _jsx(_components.span, {
          className: "hljs-string",
          children: "`DELETE FROM todo WHERE id = ?`"
        }), ", [todoId]);\n  },\n  ", _jsx(_components.span, {
          className: "hljs-keyword",
          children: "async"
        }), " ", _jsx(_components.span, {
          className: "hljs-title function_",
          children: "completeTodo"
        }), "(", _jsx(_components.span, {
          className: "hljs-params",
          children: "tx, todoId, complete"
        }), ") {\n    ", _jsx(_components.span, {
          className: "hljs-keyword",
          children: "await"
        }), " tx.", _jsx(_components.span, {
          className: "hljs-title function_",
          children: "exec"
        }), "(", _jsx(_components.span, {
          className: "hljs-string",
          children: "`UPDATE todo SET completed = ? WHERE id = ?`"
        }), ", [\n      complete,\n      todoId,\n    ]);\n  },\n  ", _jsx(_components.span, {
          className: "hljs-keyword",
          children: "async"
        }), " ", _jsx(_components.span, {
          className: "hljs-title function_",
          children: "renameTodo"
        }), "(", _jsx(_components.span, {
          className: "hljs-params",
          children: "tx, todoId, content"
        }), ") {\n    ", _jsx(_components.span, {
          className: "hljs-keyword",
          children: "await"
        }), " tx.", _jsx(_components.span, {
          className: "hljs-title function_",
          children: "exec"
        }), "(", _jsx(_components.span, {
          className: "hljs-string",
          children: "`UPDATE todo SET content = ? WHERE id = ?`"
        }), ", [\n      content,\n      todoId,\n    ]);\n  },\n  ", _jsx(_components.span, {
          className: "hljs-keyword",
          children: "async"
        }), " ", _jsx(_components.span, {
          className: "hljs-title function_",
          children: "completeAllTodos"
        }), "(", _jsx(_components.span, {
          className: "hljs-params",
          children: "tx"
        }), ") {\n    ", _jsx(_components.span, {
          className: "hljs-keyword",
          children: "await"
        }), " tx.", _jsx(_components.span, {
          className: "hljs-title function_",
          children: "exec"
        }), "(", _jsx(_components.span, {
          className: "hljs-string",
          children: "`UPDATE todo SET completed = 1 WHERE completed = 0`"
        }), ");\n  },\n  ", _jsx(_components.span, {
          className: "hljs-keyword",
          children: "async"
        }), " ", _jsx(_components.span, {
          className: "hljs-title function_",
          children: "uncompleteAllTodos"
        }), "(", _jsx(_components.span, {
          className: "hljs-params",
          children: "tx"
        }), ") {\n    ", _jsx(_components.span, {
          className: "hljs-keyword",
          children: "await"
        }), " tx.", _jsx(_components.span, {
          className: "hljs-title function_",
          children: "exec"
        }), "(", _jsx(_components.span, {
          className: "hljs-string",
          children: "`UPDATE todo SET completed = 0 WHERE completed = 1`"
        }), ");\n  },\n  ", _jsx(_components.span, {
          className: "hljs-keyword",
          children: "async"
        }), " ", _jsx(_components.span, {
          className: "hljs-title function_",
          children: "clearCompletedTodos"
        }), "(", _jsx(_components.span, {
          className: "hljs-params",
          children: "tx"
        }), ") {\n    ", _jsx(_components.span, {
          className: "hljs-keyword",
          children: "await"
        }), " tx.", _jsx(_components.span, {
          className: "hljs-title function_",
          children: "exec"
        }), "(", _jsx(_components.span, {
          className: "hljs-string",
          children: "`DELETE FROM todo WHERE completed = 1`"
        }), ");\n  },\n  ", _jsx(_components.span, {
          className: "hljs-comment",
          children: "// and lets do a counter just to show that we can"
        }), "\n  ", _jsx(_components.span, {
          className: "hljs-keyword",
          children: "async"
        }), " ", _jsx(_components.span, {
          className: "hljs-title function_",
          children: "increment"
        }), "(", _jsx(_components.span, {
          className: "hljs-params",
          children: "tx"
        }), ") {\n    ", _jsx(_components.span, {
          className: "hljs-keyword",
          children: "const"
        }), " current = (", _jsx(_components.span, {
          className: "hljs-keyword",
          children: "await"
        }), " tx.", _jsx(_components.span, {
          className: "hljs-title function_",
          children: "execA"
        }), "(", _jsx(_components.span, {
          className: "hljs-string",
          children: "`SELECT count FROM counter`"
        }), "))[", _jsx(_components.span, {
          className: "hljs-number",
          children: "0"
        }), "] || ", _jsx(_components.span, {
          className: "hljs-number",
          children: "0"
        }), ";\n    ", _jsx(_components.span, {
          className: "hljs-keyword",
          children: "await"
        }), " tx.", _jsx(_components.span, {
          className: "hljs-title function_",
          children: "exec"
        }), "(", _jsx(_components.span, {
          className: "hljs-string",
          children: "`UPDATE counter SET count = ?`"
        }), ", [current + ", _jsx(_components.span, {
          className: "hljs-number",
          children: "1"
        }), "]);\n  },\n};\n"]
      })
    }), "\n", _jsxs(_components.h2, {
      id: "generating-events",
      children: [_jsx(_components.a, {
        "aria-hidden": "true",
        tabIndex: "-1",
        href: "#generating-events",
        children: _jsx(_components.span, {
          className: "icon icon-link"
        })
      }), "Generating Events"]
    }), "\n", _jsxs(_components.p, {
      children: ["Next, we need to generate an event log entry whenever someone invokes a mutation. We do this by wrapping the declared mutations (", _jsx(_components.code, {
        children: "bareMutations"
      }), ") in something that does all the bookkeeping for us."]
    }), "\n", _jsx(_components.pre, {
      children: _jsxs(_components.code, {
        className: "hljs language-js",
        children: [_jsx(_components.span, {
          className: "hljs-keyword",
          children: "const"
        }), " trackedMutations = ", _jsx(_components.span, {
          className: "hljs-title function_",
          children: "asTrackedMutations"
        }), "(bareMutations);\n\n", _jsx(_components.span, {
          className: "hljs-keyword",
          children: "function"
        }), " ", _jsx(_components.span, {
          className: "hljs-title function_",
          children: "asTrackedMutations"
        }), "(", _jsx(_components.span, {
          className: "hljs-params",
          children: "mutations"
        }), ") {\n  ", _jsx(_components.span, {
          className: "hljs-keyword",
          children: "const"
        }), " result = {};\n  ", _jsx(_components.span, {
          className: "hljs-keyword",
          children: "for"
        }), " (", _jsx(_components.span, {
          className: "hljs-keyword",
          children: "const"
        }), " [name, fn] ", _jsx(_components.span, {
          className: "hljs-keyword",
          children: "of"
        }), " ", _jsx(_components.span, {
          className: "hljs-title class_",
          children: "Object"
        }), ".", _jsx(_components.span, {
          className: "hljs-title function_",
          children: "entries"
        }), "(mutations)) {\n    result[name] = ", _jsx(_components.span, {
          className: "hljs-keyword",
          children: "async"
        }), " ", _jsx(_components.span, {
          className: "hljs-keyword",
          children: "function"
        }), " (", _jsx(_components.span, {
          className: "hljs-params",
          children: "tx, ...args"
        }), ") {\n      ", _jsx(_components.span, {
          className: "hljs-comment",
          children: "// get the leave(s) that will be parents of new event"
        }), "\n      ", _jsxs(_components.span, {
          className: "hljs-comment",
          children: ["// ", _jsx(_components.span, {
            className: "hljs-doctag",
            children: "TODO:"
          }), " this is an index scan."]
        }), "\n      ", _jsx(_components.span, {
          className: "hljs-comment",
          children: "// We should optimize."
        }), "\n      ", _jsx(_components.span, {
          className: "hljs-keyword",
          children: "let"
        }), " parents = ", _jsx(_components.span, {
          className: "hljs-keyword",
          children: "await"
        }), " tx.", _jsx(_components.span, {
          className: "hljs-title function_",
          children: "execA"
        }), "(\n        ", _jsx(_components.span, {
          className: "hljs-string",
          children: "`SELECT l.event_id FROM event_dag as l WHERE NOT EXISTS (SELECT NULL FROM event_dag as r WHERE r.parent_id = l.event_id)`"
        }), ",\n      );\n      ", _jsx(_components.span, {
          className: "hljs-keyword",
          children: "if"
        }), " (parents.", _jsx(_components.span, {
          className: "hljs-property",
          children: "length"
        }), " == ", _jsx(_components.span, {
          className: "hljs-number",
          children: "0"
        }), ") {\n        parents = [[", _jsx(_components.span, {
          className: "hljs-string",
          children: "'ROOT'"
        }), "]];\n      }\n\n      ", _jsx(_components.span, {
          className: "hljs-comment",
          children: "// process the event"
        }), "\n      ", _jsx(_components.span, {
          className: "hljs-keyword",
          children: "await"
        }), " ", _jsx(_components.span, {
          className: "hljs-title function_",
          children: "fn"
        }), "(tx, ...args);\n\n      ", _jsx(_components.span, {
          className: "hljs-comment",
          children: "// compute an id for the event"
        }), "\n      ", _jsx(_components.span, {
          className: "hljs-keyword",
          children: "const"
        }), " eventId = ", _jsx(_components.span, {
          className: "hljs-title function_",
          children: "newIID"
        }), "(tx.", _jsx(_components.span, {
          className: "hljs-property",
          children: "siteid"
        }), ");\n\n      ", _jsx(_components.span, {
          className: "hljs-comment",
          children: "// write the event"
        }), "\n      ", _jsx(_components.span, {
          className: "hljs-keyword",
          children: "await"
        }), " tx.", _jsx(_components.span, {
          className: "hljs-title function_",
          children: "exec"
        }), "(\n        ", _jsx(_components.span, {
          className: "hljs-string",
          children: "`INSERT INTO event (id, mutation_name, args) VALUES (?, ?, ?)`"
        }), ",\n        [event.", _jsx(_components.span, {
          className: "hljs-property",
          children: "id"
        }), ", name, ", _jsx(_components.span, {
          className: "hljs-title class_",
          children: "JSON"
        }), ".", _jsx(_components.span, {
          className: "hljs-title function_",
          children: "stringify"
        }), "(args)],\n      );\n\n      ", _jsx(_components.span, {
          className: "hljs-comment",
          children: "// link the event into the DAG"
        }), "\n      ", _jsx(_components.span, {
          className: "hljs-keyword",
          children: "for"
        }), " (", _jsx(_components.span, {
          className: "hljs-keyword",
          children: "const"
        }), " parent ", _jsx(_components.span, {
          className: "hljs-keyword",
          children: "of"
        }), " parents) {\n        ", _jsx(_components.span, {
          className: "hljs-keyword",
          children: "await"
        }), " tx.", _jsx(_components.span, {
          className: "hljs-title function_",
          children: "execA"
        }), "(", _jsx(_components.span, {
          className: "hljs-string",
          children: "`INSERT OR IGNORE INTO event_dag VALUES (?, ?)`"
        }), ", [\n          parent[", _jsx(_components.span, {
          className: "hljs-number",
          children: "0"
        }), "],\n          eventId,\n        ]);\n      }\n    };\n  }\n  ", _jsx(_components.span, {
          className: "hljs-keyword",
          children: "return"
        }), " result;\n}\n"]
      })
    }), "\n", _jsxs(_components.h2, {
      id: "traversing-the-dag",
      children: [_jsx(_components.a, {
        "aria-hidden": "true",
        tabIndex: "-1",
        href: "#traversing-the-dag",
        children: _jsx(_components.span, {
          className: "icon icon-link"
        })
      }), "Traversing the DAG"]
    }), "\n", _jsx(_components.p, {
      children: "When events get merged between peers, we need to traverse the DAG to apply all of these events to the application state in-order. This can be done via a recursive common table expression that does a breadth-first traversal of the DAG. Don't worry, we will visualize this later."
    }), "\n", _jsx(_components.pre, {
      children: _jsxs(_components.code, {
        className: "hljs language-sql",
        children: [_jsx(_components.span, {
          className: "hljs-keyword",
          children: "WITH"
        }), " ", _jsx(_components.span, {
          className: "hljs-keyword",
          children: "RECURSIVE"
        }), "\nafter_node(event_id,level) ", _jsx(_components.span, {
          className: "hljs-keyword",
          children: "AS"
        }), " (\n  ", _jsx(_components.span, {
          className: "hljs-keyword",
          children: "VALUES"
        }), "(", _jsx(_components.span, {
          className: "hljs-string",
          children: "'ROOT'"
        }), ",", _jsx(_components.span, {
          className: "hljs-number",
          children: "0"
        }), ")\n  ", _jsx(_components.span, {
          className: "hljs-keyword",
          children: "UNION"
        }), " ", _jsx(_components.span, {
          className: "hljs-keyword",
          children: "ALL"
        }), "\n  ", _jsx(_components.span, {
          className: "hljs-keyword",
          children: "SELECT"
        }), " event_dag.event_id, after_node.level", _jsx(_components.span, {
          className: "hljs-operator",
          children: "+"
        }), _jsx(_components.span, {
          className: "hljs-number",
          children: "1"
        }), "\n    ", _jsx(_components.span, {
          className: "hljs-keyword",
          children: "FROM"
        }), " event_dag ", _jsx(_components.span, {
          className: "hljs-keyword",
          children: "JOIN"
        }), " after_node ", _jsx(_components.span, {
          className: "hljs-keyword",
          children: "ON"
        }), " event_dag.parent_id", _jsx(_components.span, {
          className: "hljs-operator",
          children: "="
        }), "after_node.event_id\n   ", _jsx(_components.span, {
          className: "hljs-keyword",
          children: "ORDER"
        }), " ", _jsx(_components.span, {
          className: "hljs-keyword",
          children: "BY"
        }), " ", _jsx(_components.span, {
          className: "hljs-number",
          children: "2"
        }), ",", _jsx(_components.span, {
          className: "hljs-number",
          children: "1"
        }), " ", _jsx(_components.span, {
          className: "hljs-keyword",
          children: "DESC"
        }), "\n)\n\n", _jsx(_components.span, {
          className: "hljs-keyword",
          children: "SELECT"
        }), " ", _jsx(_components.span, {
          className: "hljs-keyword",
          children: "DISTINCT"
        }), " event.id, event.mutation_name, event.args\n  ", _jsx(_components.span, {
          className: "hljs-keyword",
          children: "FROM"
        }), " after_node ", _jsx(_components.span, {
          className: "hljs-keyword",
          children: "JOIN"
        }), " event\n  ", _jsx(_components.span, {
          className: "hljs-keyword",
          children: "ON"
        }), " after_node.event_id ", _jsx(_components.span, {
          className: "hljs-operator",
          children: "="
        }), " event.id;\n\n", _jsx(_components.span, {
          className: "hljs-comment",
          children: "-- Notes to self:"
        }), "\n", _jsx(_components.span, {
          className: "hljs-comment",
          children: "-- We're recomputing the full dag every time but we can do an incremental process:"
        }), "\n", _jsx(_components.span, {
          className: "hljs-comment",
          children: "-- We can:"
        }), "\n", _jsx(_components.span, {
          className: "hljs-comment",
          children: "-- 1. go thru each received event in a merge or local write"
        }), "\n", _jsx(_components.span, {
          className: "hljs-comment",
          children: "-- 2. grab parent ids and add to [seen set], [have parent set]"
        }), "\n", _jsx(_components.span, {
          className: "hljs-comment",
          children: "-- 3. when adding in step (2), if parent id already in seen set, remove from [have parent set]"
        }), "\n", _jsx(_components.span, {
          className: "hljs-comment",
          children: "-- 4. find LCP of [have parent set]"
        }), "\n", _jsx(_components.span, {
          className: "hljs-comment",
          children: "-- 5. traverse DAG from that point forward"
        }), "\n"]
      })
    }), "\n", _jsxs(_components.h2, {
      id: "putting-it-all-together",
      children: [_jsx(_components.a, {
        "aria-hidden": "true",
        tabIndex: "-1",
        href: "#putting-it-all-together",
        children: _jsx(_components.span, {
          className: "icon icon-link"
        })
      }), "Putting it all Together"]
    }), "\n", _jsx(_components.p, {
      children: "Now that we have all the pieces, let's put it all together into a running application that syncs!"
    }), "\n", _jsx(I, {
      Comp: Dag
    })]
  });
}
function MDXContent(props = {}) {
  const {wrapper: MDXLayout} = props.components || ({});
  return MDXLayout ? _jsx(MDXLayout, Object.assign({}, props, {
    children: _jsx(_createMdxContent, props)
  })) : _createMdxContent(props);
}
export default MDXContent;
