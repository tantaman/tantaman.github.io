/*@jsxRuntime automatic @jsxImportSource https://esm.sh/react*/
import {Fragment as _Fragment, jsx as _jsx, jsxs as _jsxs} from "https://esm.sh/react/jsx-runtime";
import Lww from '/dist/components/blog/lww-vs-dag/Lww.js';
import Dag from '/dist/components/blog/lww-vs-dag/Dag.js';
import I from '/dist/components/blog/lww-vs-dag/Initialize.js';
function _createMdxContent(props) {
  const _components = Object.assign({
    nav: "nav",
    ol: "ol",
    li: "li",
    a: "a",
    p: "p",
    h2: "h2",
    span: "span",
    code: "code",
    strong: "strong",
    table: "table",
    thead: "thead",
    tr: "tr",
    th: "th",
    tbody: "tbody",
    td: "td",
    em: "em",
    blockquote: "blockquote",
    pre: "pre"
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
            href: "#lww-vs-event-logs",
            children: "LWW vs Event Logs"
          })
        }), _jsx(_components.li, {
          className: "toc-item toc-item-h2",
          children: _jsx(_components.a, {
            className: "toc-link toc-link-h2",
            href: "#interactive-examples",
            children: "Interactive Examples"
          })
        }), _jsx(_components.li, {
          className: "toc-item toc-item-h2",
          children: _jsx(_components.a, {
            className: "toc-link toc-link-h2",
            href: "#schema",
            children: "Schema"
          })
        })]
      })
    }), "\n", _jsx(_components.p, {
      children: "Event sourcing is a fairly common design pattern for deriving application state from a history of events. But is it possible to turn an event log into a CRDT? To allow nodes to append events to the log, without coordinating with other nodes? Can we merge all these copies of the log, proces them, and arrive at the same application state across all nodes?"
    }), "\n", _jsx(_components.p, {
      children: "This is possible. What's even better is that it is more powerful than other approaches, such as last write wins, to solving the problem of distributing application state. We'll do a brief review of how we can distribute state with last write wins registers, cover how that is a less powerful version of an event log and then build an distributed event log."
    }), "\n", _jsxs(_components.h2, {
      id: "lww-vs-event-logs",
      children: [_jsx(_components.a, {
        "aria-hidden": "true",
        tabIndex: "-1",
        href: "#lww-vs-event-logs",
        children: _jsx(_components.span, {
          className: "icon icon-link"
        })
      }), "LWW vs Event Logs"]
    }), "\n", _jsx(_components.p, {
      children: "A common approach to distributing application state is to use last write wins registers. Last write wins (LWW), however, is just one interpretation of the events in the system. This interpretation discards all the information that was used to derive it. A distributed event log on the other hand:"
    }), "\n", _jsxs(_components.ol, {
      children: ["\n", _jsx(_components.li, {
        children: "Retains all information about how we got to a certain state"
      }), "\n", _jsx(_components.li, {
        children: "Can be interpreted as LWW in addition to other ways"
      }), "\n"]
    }), "\n", _jsx(_components.p, {
      children: "Unpacking that a bit. Say I have an TODO list application. I can save just the current state of each todo or I can save all of the events that have transpired and build the state later."
    }), "\n", _jsxs(_components.p, {
      children: ["Saving just the current state is what ", _jsx(_components.code, {
        children: "LWW"
      }), " does and, for a todo app, this looks like:"]
    }), "\n", _jsx(_components.p, {
      children: _jsx(_components.strong, {
        children: "todos"
      })
    }), "\n", _jsxs(_components.table, {
      children: [_jsx(_components.thead, {
        children: _jsxs(_components.tr, {
          children: [_jsx(_components.th, {
            children: "id"
          }), _jsx(_components.th, {
            children: "content"
          }), _jsx(_components.th, {
            children: "list"
          }), _jsx(_components.th, {
            children: "complete"
          })]
        })
      }), _jsxs(_components.tbody, {
        children: [_jsxs(_components.tr, {
          children: [_jsx(_components.td, {
            children: "1"
          }), _jsx(_components.td, {
            children: "cook"
          }), _jsx(_components.td, {
            children: "home"
          }), _jsx(_components.td, {
            children: "false"
          })]
        }), _jsxs(_components.tr, {
          children: [_jsx(_components.td, {
            children: "2"
          }), _jsx(_components.td, {
            children: "clean"
          }), _jsx(_components.td, {
            children: "home"
          }), _jsx(_components.td, {
            children: "false"
          })]
        }), _jsxs(_components.tr, {
          children: [_jsx(_components.td, {
            children: "3"
          }), _jsx(_components.td, {
            children: "write"
          }), _jsx(_components.td, {
            children: "work"
          }), _jsx(_components.td, {
            children: "true"
          })]
        })]
      })]
    }), "\n", _jsx(_components.p, {
      children: "Saving all events that have transpired is what an event log does and, for a todo app, this looks like:"
    }), "\n", _jsx(_components.p, {
      children: _jsx(_components.strong, {
        children: "todo_events"
      })
    }), "\n", _jsxs(_components.table, {
      children: [_jsx(_components.thead, {
        children: _jsxs(_components.tr, {
          children: [_jsx(_components.th, {
            children: "id"
          }), _jsx(_components.th, {
            children: "todo_id"
          }), _jsx(_components.th, {
            children: "type"
          }), _jsx(_components.th, {
            children: "value"
          })]
        })
      }), _jsxs(_components.tbody, {
        children: [_jsxs(_components.tr, {
          children: [_jsx(_components.td, {
            children: "1"
          }), _jsx(_components.td, {
            children: _jsx(_components.strong, {
              children: "1"
            })
          }), _jsx(_components.td, {
            children: "create"
          }), _jsx(_components.td, {
            children: "NULL"
          })]
        }), _jsxs(_components.tr, {
          children: [_jsx(_components.td, {
            children: "2"
          }), _jsx(_components.td, {
            children: _jsx(_components.strong, {
              children: "1"
            })
          }), _jsx(_components.td, {
            children: "set_content"
          }), _jsx(_components.td, {
            children: "make pasta"
          })]
        }), _jsxs(_components.tr, {
          children: [_jsx(_components.td, {
            children: "3"
          }), _jsx(_components.td, {
            children: _jsx(_components.strong, {
              children: "1"
            })
          }), _jsx(_components.td, {
            children: "add_to_list"
          }), _jsx(_components.td, {
            children: "home"
          })]
        }), _jsxs(_components.tr, {
          children: [_jsx(_components.td, {
            children: "4"
          }), _jsx(_components.td, {
            children: _jsx(_components.strong, {
              children: "1"
            })
          }), _jsx(_components.td, {
            children: "complete"
          }), _jsx(_components.td, {
            children: "true"
          })]
        }), _jsxs(_components.tr, {
          children: [_jsx(_components.td, {
            children: "5"
          }), _jsx(_components.td, {
            children: _jsx(_components.strong, {
              children: "1"
            })
          }), _jsx(_components.td, {
            children: "set_content"
          }), _jsx(_components.td, {
            children: "cook"
          })]
        }), _jsxs(_components.tr, {
          children: [_jsx(_components.td, {
            children: "6"
          }), _jsx(_components.td, {
            children: _jsx(_components.strong, {
              children: "1"
            })
          }), _jsx(_components.td, {
            children: "complete"
          }), _jsx(_components.td, {
            children: "false"
          })]
        }), _jsxs(_components.tr, {
          children: [_jsx(_components.td, {
            children: "7"
          }), _jsx(_components.td, {
            children: _jsx(_components.em, {
              children: "2"
            })
          }), _jsx(_components.td, {
            children: "create"
          }), _jsx(_components.td, {
            children: "NULL"
          })]
        }), _jsxs(_components.tr, {
          children: [_jsx(_components.td, {
            children: "8"
          }), _jsx(_components.td, {
            children: _jsx(_components.em, {
              children: "2"
            })
          }), _jsx(_components.td, {
            children: "set_content"
          }), _jsx(_components.td, {
            children: "clean"
          })]
        }), _jsxs(_components.tr, {
          children: [_jsx(_components.td, {
            children: "9"
          }), _jsx(_components.td, {
            children: _jsx(_components.em, {
              children: "2"
            })
          }), _jsx(_components.td, {
            children: "add_to_list"
          }), _jsx(_components.td, {
            children: "home"
          })]
        }), _jsxs(_components.tr, {
          children: [_jsx(_components.td, {
            children: "10"
          }), _jsx(_components.td, {
            children: _jsx(_components.strong, {
              children: "3"
            })
          }), _jsx(_components.td, {
            children: "create"
          }), _jsx(_components.td, {
            children: "NULL"
          })]
        }), _jsxs(_components.tr, {
          children: [_jsx(_components.td, {
            children: "11"
          }), _jsx(_components.td, {
            children: _jsx(_components.strong, {
              children: "3"
            })
          }), _jsx(_components.td, {
            children: "set_content"
          }), _jsx(_components.td, {
            children: "write"
          })]
        }), _jsxs(_components.tr, {
          children: [_jsx(_components.td, {
            children: "12"
          }), _jsx(_components.td, {
            children: _jsx(_components.strong, {
              children: "3"
            })
          }), _jsx(_components.td, {
            children: "add_to_list"
          }), _jsx(_components.td, {
            children: "work"
          })]
        }), _jsxs(_components.tr, {
          children: [_jsx(_components.td, {
            children: "13"
          }), _jsx(_components.td, {
            children: _jsx(_components.strong, {
              children: "3"
            })
          }), _jsx(_components.td, {
            children: "complete"
          }), _jsx(_components.td, {
            children: "true"
          })]
        })]
      })]
    }), "\n", _jsx(_components.p, {
      children: "The event based approach gives you a set of facts about the system that never change."
    }), "\n", _jsx(_components.p, {
      children: "The \"list of facts\" approach gives us:"
    }), "\n", _jsxs(_components.ol, {
      children: ["\n", _jsx(_components.li, {
        children: "An audit trail"
      }), "\n", _jsx(_components.li, {
        children: "The ability to change our interpretation of facts/events as requirements change"
      }), "\n", _jsx(_components.li, {
        children: "Freedom to pick how to resolve conflicts"
      }), "\n"]
    }), "\n", _jsxs(_components.p, {
      children: ["On (1), note that in the ", _jsx(_components.code, {
        children: "todo_events"
      }), " we can see that ", _jsx(_components.code, {
        children: "todo id 1"
      }), " used to be ", _jsx(_components.code, {
        children: "make pasta"
      }), " and ", _jsx(_components.code, {
        children: "complete"
      }), " and was later changed to ", _jsx(_components.code, {
        children: "cook"
      }), " and no longer ", _jsx(_components.code, {
        children: "complete"
      }), ". This is lost in the ", _jsx(_components.code, {
        children: "lww"
      }), " approach."]
    }), "\n", _jsx(_components.p, {
      children: "On (2), we could add a feature in the future that un-completing a todo should create a \"task churn\" record for users to review. We can retroactively build this churn list for users given we have the history of all events."
    }), "\n", _jsx(_components.p, {
      children: "On (3), this is similar to (2). We can process the event log in a way where the last write to a field always wins or we can do something more sophisticated. More sophisticated options being something like preventing a TODO from being un-completed after being completed."
    }), "\n", _jsxs(_components.p, {
      children: ["We know that a grow only set of LWW registers is a CRDT from the ", _jsx(_components.a, {
        href: "/2023-04-01-intro-to-crdts.html",
        children: "last article"
      }), " but how do we turn an event log into a CRDT? And how do we process it consistently so every node arrives at the same state after processing the log?"]
    }), "\n", _jsxs(_components.h2, {
      id: "interactive-examples",
      children: [_jsx(_components.a, {
        "aria-hidden": "true",
        tabIndex: "-1",
        href: "#interactive-examples",
        children: _jsx(_components.span, {
          className: "icon icon-link"
        })
      }), "Interactive Examples"]
    }), "\n", _jsx(_components.p, {
      children: "To get an intuitive sense of how all this can work, we're going to set up two different examples. One for LWW and one for a P2P event log. Each example will have three todo lists that are running on different peers. You'll be able to add data to each list, merge those lists and view how the underlying state of each changes."
    }), "\n", _jsx(I, {
      Comp: Lww
    }), "\n", _jsx(_components.p, {
      children: "Go ahead an play with the example above. Add todos, modify the text of a todo (by double clicking it), toggle it's completion state. You can view the internal state of the node and it's LWW registers in the table under the todo list. Click \"sync nodes\" to merge all the nodes together."
    }), "\n", _jsx(_components.p, {
      children: "The LWW state is pretty straightforward."
    }), "\n", _jsxs(_components.ol, {
      children: ["\n", _jsx(_components.li, {
        children: "Every column has an associated version or clock"
      }), "\n", _jsx(_components.li, {
        children: "Modifications of a column move its clock forward by one"
      }), "\n", _jsx(_components.li, {
        children: "Upon merge, we compare clocks and take the latest one. On ties, we take the bigger value"
      }), "\n", _jsx(_components.li, {
        children: "If nodes are routinely syncing then their column clocks are always matching"
      }), "\n", _jsx(_components.li, {
        children: "When nodes disconnect for a prolonged period of time the clocks begin to diverge, coming back together again on the next sync"
      }), "\n"]
    }), "\n", _jsx(_components.p, {
      children: "While it is straightforward, a drawback is that we're locked into this specific way of resolving conflicts and we don't have a history of how we got into a given state. We'll try to remedy that in the next example."
    }), "\n", _jsxs(_components.blockquote, {
      children: ["\n", _jsxs(_components.p, {
        children: ["Note that the ", _jsx(_components.code, {
          children: "clock"
        }), " columns could be a variety of options. Here we've done an independent lamport timestamp per column."]
      }), "\n"]
    }), "\n", _jsx(I, {
      Comp: Dag
    }), "\n", _jsxs(_components.blockquote, {
      children: ["\n", _jsx(_components.p, {
        children: "the DAG example is notional and thoroughly un-optimized. We currently re-pull and re-apply the entire DAG on sync rather than doing incremental updates. We also sync the entire DAG between nodes rather than delta states. How to incrementally process the DAG is a separate topic."
      }), "\n"]
    }), "\n", _jsxs(_components.h2, {
      id: "schema",
      children: [_jsx(_components.a, {
        "aria-hidden": "true",
        tabIndex: "-1",
        href: "#schema",
        children: _jsx(_components.span, {
          className: "icon icon-link"
        })
      }), "Schema"]
    }), "\n", _jsx(_components.p, {
      children: "Event Schema:"
    }), "\n", _jsx(_components.pre, {
      children: _jsxs(_components.code, {
        className: "hljs language-sql",
        children: [_jsx(_components.span, {
          className: "hljs-keyword",
          children: "CREATE"
        }), " ", _jsx(_components.span, {
          className: "hljs-keyword",
          children: "TABLE"
        }), " event (id ", _jsx(_components.span, {
          className: "hljs-type",
          children: "INTEGER"
        }), " ", _jsx(_components.span, {
          className: "hljs-keyword",
          children: "PRIMARY"
        }), " KEY, item_id ", _jsx(_components.span, {
          className: "hljs-type",
          children: "INTEGER"
        }), ", type TEXT, ", _jsx(_components.span, {
          className: "hljs-keyword",
          children: "value"
        }), " ", _jsx(_components.span, {
          className: "hljs-keyword",
          children: "ANY"
        }), ");\n", _jsx(_components.span, {
          className: "hljs-keyword",
          children: "CREATE"
        }), " INDEX event_item ", _jsx(_components.span, {
          className: "hljs-keyword",
          children: "ON"
        }), " event (item_id);\n"]
      })
    }), "\n", _jsx(_components.p, {
      children: "DAG Schema:"
    }), "\n", _jsx(_components.pre, {
      children: _jsxs(_components.code, {
        className: "hljs language-sql",
        children: [_jsx(_components.span, {
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
        }), " KEY (parent_id, event_id)\n) STRICT;\n", _jsx(_components.span, {
          className: "hljs-keyword",
          children: "CREATE"
        }), " INDEX event_dag_event ", _jsx(_components.span, {
          className: "hljs-keyword",
          children: "ON"
        }), " event_dag (event_id);\n"]
      })
    }), "\n", _jsx(_components.p, {
      children: "Causal order traversal of a DAG:"
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
        }), " event.id, event.item_id, event.type, event.value\n  ", _jsx(_components.span, {
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
        }), " event.id;\n"]
      })
    }), "\n", _jsx(_components.p, {
      children: "DAG Leaves:"
    }), "\n", _jsx(_components.pre, {
      children: _jsxs(_components.code, {
        className: "hljs language-sql",
        children: [_jsx(_components.span, {
          className: "hljs-keyword",
          children: "SELECT"
        }), " l.event_id\n  ", _jsx(_components.span, {
          className: "hljs-keyword",
          children: "FROM"
        }), " event_dag ", _jsx(_components.span, {
          className: "hljs-keyword",
          children: "as"
        }), " l\n  ", _jsx(_components.span, {
          className: "hljs-keyword",
          children: "WHERE"
        }), " ", _jsx(_components.span, {
          className: "hljs-keyword",
          children: "NOT"
        }), " ", _jsx(_components.span, {
          className: "hljs-keyword",
          children: "EXISTS"
        }), " (", _jsx(_components.span, {
          className: "hljs-keyword",
          children: "SELECT"
        }), " ", _jsx(_components.span, {
          className: "hljs-keyword",
          children: "NULL"
        }), " ", _jsx(_components.span, {
          className: "hljs-keyword",
          children: "FROM"
        }), " event_dag ", _jsx(_components.span, {
          className: "hljs-keyword",
          children: "as"
        }), " r ", _jsx(_components.span, {
          className: "hljs-keyword",
          children: "WHERE"
        }), " r.parent_id ", _jsx(_components.span, {
          className: "hljs-operator",
          children: "="
        }), " l.event_id)\n"]
      })
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
