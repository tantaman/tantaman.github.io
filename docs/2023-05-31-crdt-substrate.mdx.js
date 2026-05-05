/*@jsxRuntime automatic @jsxImportSource https://esm.sh/react*/
import {Fragment as _Fragment, jsx as _jsx, jsxs as _jsxs} from "https://esm.sh/react/jsx-runtime";
import RunnableCode from '/dist/components/blog/runnable-code/RunnableCode.js';
import Nodes from '/dist/components/blog/crdt-substrate/Nodes.js';
import Callout from '/dist/components/blog/shared/Callout.js';
function _createMdxContent(props) {
  const _components = Object.assign({
    nav: "nav",
    ol: "ol",
    li: "li",
    a: "a",
    p: "p",
    img: "img",
    h2: "h2",
    span: "span",
    em: "em",
    code: "code",
    pre: "pre",
    blockquote: "blockquote",
    h3: "h3",
    strong: "strong",
    ul: "ul"
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
            href: "#diving-in",
            children: "Diving In"
          })
        }), _jsx(_components.li, {
          className: "toc-item toc-item-h2",
          children: _jsx(_components.a, {
            className: "toc-link toc-link-h2",
            href: "#intent",
            children: "Intent"
          })
        }), _jsx(_components.li, {
          className: "toc-item toc-item-h2",
          children: _jsx(_components.a, {
            className: "toc-link toc-link-h2",
            href: "#fixing-intent",
            children: "Fixing Intent"
          })
        }), _jsx(_components.li, {
          className: "toc-item toc-item-h2",
          children: _jsx(_components.a, {
            className: "toc-link toc-link-h2",
            href: "#intent-preserving-principles",
            children: "Intent Preserving Principles"
          })
        }), _jsx(_components.li, {
          className: "toc-item toc-item-h2",
          children: _jsx(_components.a, {
            className: "toc-link toc-link-h2",
            href: "#other-options-for-intent",
            children: "Other Options for Intent"
          })
        }), _jsx(_components.li, {
          className: "toc-item toc-item-h2",
          children: _jsx(_components.a, {
            className: "toc-link toc-link-h2",
            href: "#framework-implementation",
            children: "Framework Implementation"
          })
        }), _jsx(_components.li, {
          className: "toc-item toc-item-h2",
          children: _jsx(_components.a, {
            className: "toc-link toc-link-h2",
            href: "#acknowledgements",
            children: "Acknowledgements"
          })
        })]
      })
    }), "\n", _jsxs(_components.p, {
      children: ["What if I told you anyone can create a new ", _jsx(_components.a, {
        href: "https://en.wikipedia.org/wiki/Conflict-free_replicated_data_type",
        children: "CRDT"
      }), "? That with no special knowledge, you can write a set of mutations that can be applied to a data structure in a way that is guaranteed to converge? That you can do this without any locks, mutexes, coordination, or other concurrency primitives? That you can do this without any special knowledge of distributed systems?"]
    }), "\n", _jsx("br", {}), "\n", _jsx("center", {
      children: _jsx(_components.p, {
        children: _jsx(_components.img, {
          src: "/blog/crdt-substrate/told-you.jpg",
          alt: "meme"
        })
      })
    }), "\n", _jsx(_components.p, {
      children: "Nobody can be told this truth. They must see it for themselves."
    }), "\n", _jsxs(_components.h2, {
      id: "diving-in",
      children: [_jsx(_components.a, {
        "aria-hidden": "true",
        tabIndex: "-1",
        href: "#diving-in",
        children: _jsx(_components.span, {
          className: "icon icon-link"
        })
      }), "Diving In"]
    }), "\n", _jsx(_components.p, {
      children: "We'll start with an initial state --"
    }), "\n", _jsx(RunnableCode, {
      code: `const state = {
  counter: 0,
  items: []
};

provide state;`
    }), "\n", _jsxs(_components.p, {
      children: ["And then let you author ", _jsx(_components.em, {
        children: "any mutation you want"
      }), " to update that state. The only rules are:"]
    }), "\n", _jsxs(_components.ol, {
      children: ["\n", _jsx(_components.li, {
        children: "Your mutations must be deterministic.."
      }), "\n", _jsx(_components.li, {
        children: "If the mutation is a no-op it should return false."
      }), "\n", _jsxs(_components.li, {
        children: ["The first argument to the mutation is always ", _jsx(_components.code, {
          children: "state"
        })]
      }), "\n", _jsxs(_components.li, {
        children: ["Additional arguments for the mutation come after ", _jsx(_components.code, {
          children: "state"
        })]
      }), "\n"]
    }), "\n", _jsx(_components.p, {
      children: "Some example mutations have been provided for you."
    }), "\n", _jsx(RunnableCode, {
      code: `const mutations = {
  increment(state) {
    state.counter++;
  },
  addItem(state, item) {
    state.items.push(item);
  }
};

provide mutations;`
    }), "\n", _jsx(Callout, {
      type: "info",
      children: _jsxs(_components.p, {
        children: ["After making any changes to the code, press ", _jsx(_components.code, {
          children: "shift + enter"
        }), " or the ", _jsx(_components.code, {
          children: "play"
        }), " button (top right of the box) to re-run the code and update the example."]
      })
    }), "\n", _jsx(_components.p, {
      children: "Let's see this in action."
    }), "\n", _jsx(_components.p, {
      children: "Below are three independent UIs, representing nodes or processes, that are driven by three independent copies of state. On each one you can run your mutations, updating the state for that specific node. Whenever you desire, have the nodes merge their state together by pressing the \"sync nodes!\" button."
    }), "\n", _jsx("br", {}), "\n", _jsx(Nodes, {}), "\n", _jsx(_components.p, {
      children: "Pretty cool, right? All of the nodes converge to the same state on merge and you didn't have to write any special code to make this happen or use any special data structures. You just vanilla JavaScript and the framework took care of the rest."
    }), "\n", _jsx(_components.p, {
      children: "Before we get into how this works, let's talk about intent. While CRDTs and other structures may meet the mathematical definition of convergence it is likely that they will not meet the user's expectations of convergence."
    }), "\n", _jsx(_components.p, {
      children: "Depending on what examples you ended up writing for yourself, you may have already noticed the intent problem."
    }), "\n", _jsxs(_components.h2, {
      id: "intent",
      children: [_jsx(_components.a, {
        "aria-hidden": "true",
        tabIndex: "-1",
        href: "#intent",
        children: _jsx(_components.span, {
          className: "icon icon-link"
        })
      }), "Intent"]
    }), "\n", _jsx(_components.p, {
      children: "How do we preserve the user's intent and how does the mathematical definition of convergence deviate from practical expectations?"
    }), "\n", _jsx(_components.p, {
      children: "To understand this better, we'll look at a delete operation that is based on array index."
    }), "\n", _jsx(_components.pre, {
      children: _jsxs(_components.code, {
        className: "hljs language-js",
        children: [_jsx(_components.span, {
          className: "hljs-title function_",
          children: "deleteItem"
        }), "(", _jsx(_components.span, {
          className: "hljs-params",
          children: "state, index"
        }), ") {\n  ", _jsx(_components.span, {
          className: "hljs-keyword",
          children: "if"
        }), " (index < ", _jsx(_components.span, {
          className: "hljs-number",
          children: "0"
        }), " || index >= state.", _jsx(_components.span, {
          className: "hljs-property",
          children: "items"
        }), ".", _jsx(_components.span, {
          className: "hljs-property",
          children: "length"
        }), ") {\n    ", _jsx(_components.span, {
          className: "hljs-keyword",
          children: "return"
        }), " ", _jsx(_components.span, {
          className: "hljs-literal",
          children: "false"
        }), ";\n  }\n  state.", _jsx(_components.span, {
          className: "hljs-property",
          children: "items"
        }), ".", _jsx(_components.span, {
          className: "hljs-title function_",
          children: "splice"
        }), "(index, ", _jsx(_components.span, {
          className: "hljs-number",
          children: "1"
        }), ");\n}\n"]
      })
    }), "\n", _jsx(_components.p, {
      children: "This mutation is deterministic and it will converge but it doesn't preserve intent."
    }), "\n", _jsx(_components.p, {
      children: "A few ways it can fail to preserve intent:"
    }), "\n", _jsxs(_components.ol, {
      children: ["\n", _jsxs(_components.li, {
        children: ["Two users trying to delete the same item concurrently will result in ", _jsx(_components.em, {
          children: "two"
        }), " items being removed"]
      }), "\n", _jsx(_components.li, {
        children: "Trying to remove an element, by array index, could end up removing a completely unrelated element after merging states."
      }), "\n"]
    }), "\n", _jsx(_components.p, {
      children: "The above cases are illustrated below."
    }), "\n", _jsxs("video", {
      controls: true,
      autoPlay: true,
      muted: true,
      loop: true,
      style: {
        border: '1px solid red'
      },
      children: [_jsx("source", {
        src: "/blog/crdt-substrate/two-remove.webm",
        type: "video/webm"
      }), _jsx("source", {
        src: "/blog/crdt-substrate/two-remove.mp4",
        type: "video/mp4"
      })]
    }), "\n", _jsxs(_components.blockquote, {
      children: ["\n", _jsxs(_components.p, {
        children: ["Fig 1: Both users attempt to delete the letter ", _jsx(_components.code, {
          children: "b"
        }), " concurrently. Since the mutation uses array indices, ", _jsx(_components.code, {
          children: "b"
        }), " and ", _jsx(_components.code, {
          children: "c"
        }), " are both removed on merge rather than just ", _jsx(_components.code, {
          children: "b"
        }), "."]
      }), "\n"]
    }), "\n", _jsx("br", {}), "\n", _jsx("br", {}), "\n", _jsxs("video", {
      controls: true,
      autoPlay: true,
      muted: true,
      loop: true,
      style: {
        border: '1px solid red'
      },
      children: [_jsx("source", {
        src: "/blog/crdt-substrate/delete-item.webm",
        type: "video/webm"
      }), _jsx("source", {
        src: "/blog/crdt-substrate/delete-item.mp4",
        type: "video/mp4"
      })]
    }), "\n", _jsxs(_components.blockquote, {
      children: ["\n", _jsxs(_components.p, {
        children: ["Fig 2: Both users concurrently create a list of items. User 1 then removes ", _jsx(_components.code, {
          children: "c"
        }), " from their list (index 2). Post merge, ", _jsx(_components.code, {
          children: "b"
        }), " ends up being removed!"]
      }), "\n"]
    }), "\n", _jsx(_components.p, {
      children: "The problem with both examples is that we're using array index (or alias) to indirectly reference what we are actually talking about."
    }), "\n", _jsxs(_components.h2, {
      id: "fixing-intent",
      children: [_jsx(_components.a, {
        "aria-hidden": "true",
        tabIndex: "-1",
        href: "#fixing-intent",
        children: _jsx(_components.span, {
          className: "icon icon-link"
        })
      }), "Fixing Intent"]
    }), "\n", _jsxs(_components.p, {
      children: ["While yes, you can create a CRDT without any special knowledge you can't create a CRDT that preserves user intent without ", _jsx(_components.em, {
        children: "some"
      }), " knowledge."]
    }), "\n", _jsx(_components.p, {
      children: "Many types of intent (delete, move to, insert at) can be preserved by knowing a few principles and following them when writing mutations."
    }), "\n", _jsxs(_components.h2, {
      id: "intent-preserving-principles",
      children: [_jsx(_components.a, {
        "aria-hidden": "true",
        tabIndex: "-1",
        href: "#intent-preserving-principles",
        children: _jsx(_components.span, {
          className: "icon icon-link"
        })
      }), "Intent Preserving Principles"]
    }), "\n", _jsxs(_components.h3, {
      id: "refer-to-items-by-their-identity",
      children: [_jsx(_components.a, {
        "aria-hidden": "true",
        tabIndex: "-1",
        href: "#refer-to-items-by-their-identity",
        children: _jsx(_components.span, {
          className: "icon icon-link"
        })
      }), "Refer to items by their identity"]
    }), "\n", _jsxs(_components.blockquote, {
      children: ["\n", _jsxs(_components.p, {
        children: ["When you're operating on something, you need to refer to that thing ", _jsx(_components.em, {
          children: "exactly"
        }), " rather than using an indirect reference."]
      }), "\n"]
    }), "\n", _jsxs(_components.p, {
      children: ["This is most clearly illustrated in the mutations that used array indices to talk about what to remove. If, instead, each element had a unique ID and we passed ", _jsx(_components.em, {
        children: "that"
      }), " to mutations when deleting / moving / etc., the user's intent would be preserved."]
    }), "\n", _jsx(_components.p, {
      children: _jsx(_components.strong, {
        children: "Example"
      })
    }), "\n", _jsx(_components.pre, {
      children: _jsxs(_components.code, {
        className: "hljs language-js",
        children: [_jsx(_components.span, {
          className: "hljs-title function_",
          children: "addItem"
        }), "(", _jsx(_components.span, {
          className: "hljs-params",
          children: "state, id, item"
        }), ") {\n  ", _jsx(_components.span, {
          className: "hljs-keyword",
          children: "if"
        }), " (state.", _jsx(_components.span, {
          className: "hljs-property",
          children: "items"
        }), ".", _jsx(_components.span, {
          className: "hljs-title function_",
          children: "find"
        }), "(", _jsxs(_components.span, {
          className: "hljs-function",
          children: ["(", _jsx(_components.span, {
            className: "hljs-params",
            children: "i"
          }), ") =>"]
        }), " i.", _jsx(_components.span, {
          className: "hljs-property",
          children: "id"
        }), " === id)) {\n    ", _jsx(_components.span, {
          className: "hljs-keyword",
          children: "return"
        }), " ", _jsx(_components.span, {
          className: "hljs-literal",
          children: "false"
        }), ";\n  }\n  state.", _jsx(_components.span, {
          className: "hljs-property",
          children: "items"
        }), ".", _jsx(_components.span, {
          className: "hljs-title function_",
          children: "push"
        }), "({\n    id,\n    item,\n  });\n},\n\n", _jsx(_components.span, {
          className: "hljs-title function_",
          children: "deleteItem"
        }), "(", _jsx(_components.span, {
          className: "hljs-params",
          children: "state, id"
        }), ") {\n  ", _jsx(_components.span, {
          className: "hljs-keyword",
          children: "const"
        }), " index = state.", _jsx(_components.span, {
          className: "hljs-property",
          children: "items"
        }), ".", _jsx(_components.span, {
          className: "hljs-title function_",
          children: "findIndex"
        }), "(", _jsxs(_components.span, {
          className: "hljs-function",
          children: ["(", _jsx(_components.span, {
            className: "hljs-params",
            children: "e"
          }), ") =>"]
        }), " e.", _jsx(_components.span, {
          className: "hljs-property",
          children: "id"
        }), " === id);\n  ", _jsx(_components.span, {
          className: "hljs-keyword",
          children: "if"
        }), " (index == -", _jsx(_components.span, {
          className: "hljs-number",
          children: "1"
        }), ") {\n    ", _jsx(_components.span, {
          className: "hljs-keyword",
          children: "return"
        }), " ", _jsx(_components.span, {
          className: "hljs-literal",
          children: "false"
        }), ";\n  }\n  state.", _jsx(_components.span, {
          className: "hljs-property",
          children: "items"
        }), ".", _jsx(_components.span, {
          className: "hljs-title function_",
          children: "splice"
        }), "(index, ", _jsx(_components.span, {
          className: "hljs-number",
          children: "1"
        }), ");\n}\n"]
      })
    }), "\n", _jsxs(_components.blockquote, {
      children: ["\n", _jsxs(_components.p, {
        children: ["Fig 3: The updated mutations. Note that the item id must be ", _jsx(_components.em, {
          children: "passed in"
        }), " to the mutation. Generating a random uuid ", _jsx(_components.em, {
          children: "within the mutation"
        }), "\nwould make the mutation non-deterministic."]
      }), "\n"]
    }), "\n", _jsx(_components.p, {
      children: "Go ahead and try those mutations yourself or watch the example --"
    }), "\n", _jsxs("video", {
      controls: true,
      autoPlay: true,
      muted: true,
      loop: true,
      style: {
        border: '1px solid red'
      },
      children: [_jsx("source", {
        src: "/blog/crdt-substrate/fix-two-remove.webm",
        type: "video/webm"
      }), _jsx("source", {
        src: "/blog/crdt-substrate/fix-two-remove.mp4",
        type: "video/mp4"
      })]
    }), "\n", _jsxs(_components.blockquote, {
      children: ["\n", _jsxs(_components.p, {
        children: ["Fig 4: Both users concurrently remove ", _jsx(_components.code, {
          children: "A_2"
        }), " or item ", _jsx(_components.code, {
          children: "b"
        }), ". After merging, that is still what both users see in contrast to the array index based removal."]
      }), "\n"]
    }), "\n", _jsxs(_components.h3, {
      id: "position-is-relative",
      children: [_jsx(_components.a, {
        "aria-hidden": "true",
        tabIndex: "-1",
        href: "#position-is-relative",
        children: _jsx(_components.span, {
          className: "icon icon-link"
        })
      }), "Position is Relative"]
    }), "\n", _jsxs(_components.blockquote, {
      children: ["\n", _jsx(_components.p, {
        children: "If you need to prevent interleaving of sequences, use relative positions."
      }), "\n"]
    }), "\n", _jsxs(_components.p, {
      children: ["This is similar to the array index idea. Our ", _jsx(_components.code, {
        children: "addItem"
      }), " mutation is implicitly using array index as the sort order for items. This is fine for many use cases but for other use cases, such as text insertion, this is problem. The reason is that concurrent edits in the same location will end up interleaving characters."]
    }), "\n", _jsxs(_components.p, {
      children: ["E.g., if Node A writes \"girl\" and Node B concurrently writes \"boy\" the result post-merge will be \"", _jsx(_components.code, {
        children: "gbioryl"
      }), "\"."]
    }), "\n", _jsx(_components.p, {
      children: "We can fix this by making the notion of position relative. That is, the position an item was inserted at is identified by what is to the left or right of that item."
    }), "\n", _jsx(_components.pre, {
      children: _jsxs(_components.code, {
        className: "hljs language-js",
        children: [_jsx(_components.span, {
          className: "hljs-title function_",
          children: "addItem"
        }), "(", _jsx(_components.span, {
          className: "hljs-params",
          children: "state, id, rightOf, item"
        }), ") {\n  ", _jsx(_components.span, {
          className: "hljs-keyword",
          children: "if"
        }), " (state.", _jsx(_components.span, {
          className: "hljs-property",
          children: "items"
        }), ".", _jsx(_components.span, {
          className: "hljs-title function_",
          children: "find"
        }), "(", _jsxs(_components.span, {
          className: "hljs-function",
          children: ["(", _jsx(_components.span, {
            className: "hljs-params",
            children: "i"
          }), ") =>"]
        }), " i.", _jsx(_components.span, {
          className: "hljs-property",
          children: "id"
        }), " === id)) {\n    ", _jsx(_components.span, {
          className: "hljs-keyword",
          children: "return"
        }), " ", _jsx(_components.span, {
          className: "hljs-literal",
          children: "false"
        }), ";\n  }\n\n  ", _jsx(_components.span, {
          className: "hljs-keyword",
          children: "let"
        }), " index = state.", _jsx(_components.span, {
          className: "hljs-property",
          children: "items"
        }), ".", _jsx(_components.span, {
          className: "hljs-title function_",
          children: "findIndex"
        }), "(", _jsxs(_components.span, {
          className: "hljs-function",
          children: ["(", _jsx(_components.span, {
            className: "hljs-params",
            children: "e"
          }), ") =>"]
        }), " e.", _jsx(_components.span, {
          className: "hljs-property",
          children: "id"
        }), " === rightOf);\n  ", _jsx(_components.span, {
          className: "hljs-keyword",
          children: "if"
        }), " (index < ", _jsx(_components.span, {
          className: "hljs-number",
          children: "0"
        }), ") {\n    index = state.", _jsx(_components.span, {
          className: "hljs-property",
          children: "items"
        }), ".", _jsx(_components.span, {
          className: "hljs-property",
          children: "length"
        }), ";\n  }\n\n  state.", _jsx(_components.span, {
          className: "hljs-property",
          children: "items"
        }), ".", _jsx(_components.span, {
          className: "hljs-title function_",
          children: "splice"
        }), "(index + ", _jsx(_components.span, {
          className: "hljs-number",
          children: "1"
        }), ", ", _jsx(_components.span, {
          className: "hljs-number",
          children: "0"
        }), ", {\n    id,\n    item\n  });\n}\n"]
      })
    }), "\n", _jsx(_components.p, {
      children: "Give it a whirl in the live example or see the video below --"
    }), "\n", _jsxs("video", {
      controls: true,
      autoPlay: true,
      muted: true,
      loop: true,
      style: {
        border: '1px solid red'
      },
      children: [_jsx("source", {
        src: "/blog/crdt-substrate/girl-boy.webm",
        type: "video/webm"
      }), _jsx("source", {
        src: "/blog/crdt-substrate/girl-boy.mp4",
        type: "video/mp4"
      })]
    }), "\n", _jsxs(_components.blockquote, {
      children: ["\n", _jsx(_components.p, {
        children: "Fig 5: using \"right of\" to relatively position new insertions. No interleaving!"
      }), "\n"]
    }), "\n", _jsx(_components.p, {
      children: "There could still be a problem here, however. What if another user concurrently deleted something you were inserting next to?"
    }), "\n", _jsxs(_components.p, {
      children: ["Relative positioning would break down in this case. If you want to insert next to ", _jsx(_components.code, {
        children: "b1"
      }), " but ", _jsx(_components.code, {
        children: "b1"
      }), " no longer exists after a merge then your position no longer exists."]
    }), "\n", _jsx(_components.p, {
      children: "You could fix this with invariants (do not allow deletion of these sorts of things) or soft deletion & tombstoning. Tombstoning an item would drop its content but retain its id and position so position information always exists. In addition to the problems outlined for sequences, we can run into issues when moving structures around that have pointers to one another. E.g., moving folders inside a file tree. Concurrent edits of this tree can create cycles such as a folder that contains itself."
    }), "\n", _jsx(_components.p, {
      children: "While this framework idea is powerful (we got relatively far with 0 knowledge of CRDTs) certain cases can begin to explode in complexity."
    }), "\n", _jsxs(_components.h2, {
      id: "other-options-for-intent",
      children: [_jsx(_components.a, {
        "aria-hidden": "true",
        tabIndex: "-1",
        href: "#other-options-for-intent",
        children: _jsx(_components.span, {
          className: "icon icon-link"
        })
      }), "Other Options for Intent"]
    }), "\n", _jsxs(_components.p, {
      children: ["A different approach to preserving intent is to reach for an existing ", _jsx(_components.a, {
        href: "https://en.wikipedia.org/wiki/Conflict-free_replicated_data_type",
        children: "CRDT"
      }), " that has the intention preserving properties you'd like."]
    }), "\n", _jsx(_components.p, {
      children: "Even though there are drawbacks the framework seems pretty magical. For many cases you can just write normal business logic and the state you mutated will converge as expected. How does this work?"
    }), "\n", _jsxs(_components.h2, {
      id: "framework-implementation",
      children: [_jsx(_components.a, {
        "aria-hidden": "true",
        tabIndex: "-1",
        href: "#framework-implementation",
        children: _jsx(_components.span, {
          className: "icon icon-link"
        })
      }), "Framework Implementation"]
    }), "\n", _jsx(_components.p, {
      children: "The framework is split into two parts:"
    }), "\n", _jsxs(_components.ol, {
      children: ["\n", _jsx(_components.li, {
        children: "A log of mutations"
      }), "\n", _jsx(_components.li, {
        children: "Machinery to merge and apply the log to the application's state"
      }), "\n"]
    }), "\n", _jsxs(_components.h3, {
      id: "mutation-log",
      children: [_jsx(_components.a, {
        "aria-hidden": "true",
        tabIndex: "-1",
        href: "#mutation-log",
        children: _jsx(_components.span, {
          className: "icon icon-link"
        })
      }), "Mutation Log"]
    }), "\n", _jsx(_components.p, {
      children: "Every time one of the named mutations is run, we log it. The log looks like:"
    }), "\n", _jsx(_components.pre, {
      children: _jsxs(_components.code, {
        className: "hljs language-ts",
        children: [_jsx(_components.span, {
          className: "hljs-keyword",
          children: "type"
        }), " ", _jsx(_components.span, {
          className: "hljs-title class_",
          children: "MutationLog"
        }), " = [", _jsx(_components.span, {
          className: "hljs-title class_",
          children: "EventID"
        }), ", ", _jsx(_components.span, {
          className: "hljs-title class_",
          children: "ParentIDs"
        }), "[], ", _jsx(_components.span, {
          className: "hljs-title class_",
          children: "MutationName"
        }), ", ", _jsx(_components.span, {
          className: "hljs-title class_",
          children: "Args"
        }), "[]][];\n"]
      })
    }), "\n", _jsxs(_components.p, {
      children: ["In a system that isn't distributed the log would be linear. In our case, however, we need to account for concurrent edits happening in other processes. This is where ", _jsx(_components.code, {
        children: "ParentIDs"
      }), " comes in. ", _jsx(_components.code, {
        children: "ParentIDs"
      }), " refers to all the mutations that happened immediately before the current mutation."]
    }), "\n", _jsx(_components.p, {
      children: "Thus the log, rather than being linear, is a DAG. The relationships in the DAG express time."
    }), "\n", _jsxs(_components.ul, {
      children: ["\n", _jsx(_components.li, {
        children: "Branches represent concurrent modifications."
      }), "\n", _jsx(_components.li, {
        children: "Branches that converge into a node represent events that happened before the node being converged into."
      }), "\n", _jsx(_components.li, {
        children: "Linear runs represents events that happen one after the other"
      }), "\n", _jsx(_components.li, {
        children: "Linear runs in separate branches are concurrent sequences of events."
      }), "\n"]
    }), "\n", _jsx(_components.p, {
      children: _jsx(_components.img, {
        src: "/blog/crdt-substrate/dag.png",
        alt: "time is a dag"
      })
    }), "\n", _jsxs(_components.blockquote, {
      children: ["\n", _jsx(_components.p, {
        children: "Fig 7: 3 processes incrementing a distributed counter."
      }), "\n", _jsxs(_components.ul, {
        children: ["\n", _jsx(_components.li, {
          children: "(A) Two processes increment the counter twice (concurrent sequences of events) at the same time a third process increments it once (concurrent event)."
        }), "\n", _jsx(_components.li, {
          children: "(B) All processes sync their changes (arrows converging)"
        }), "\n", _jsx(_components.li, {
          children: "(C) A single process increments the counter twice more after all concurrent events."
        }), "\n"]
      }), "\n"]
    }), "\n", _jsxs(_components.p, {
      children: ["In this setup, each process can locally write to its log without coordinating with others. All it needs to do when writing is create a new event whose parents are the leaves of it's current copy of the log. In our interactive example, each mutation you define is decorated such that it calls ", _jsx(_components.code, {
        children: "addEvent"
      }), " when being invoked."]
    }), "\n", _jsx(_components.pre, {
      children: _jsxs(_components.code, {
        className: "hljs language-ts",
        children: [_jsx(_components.span, {
          className: "hljs-keyword",
          children: "export"
        }), " ", _jsx(_components.span, {
          className: "hljs-keyword",
          children: "type"
        }), " ", _jsx(_components.span, {
          className: "hljs-title class_",
          children: "Event"
        }), " = {\n  ", _jsx(_components.span, {
          className: "hljs-attr",
          children: "mutationName"
        }), ": ", _jsx(_components.span, {
          className: "hljs-built_in",
          children: "string"
        }), ";\n  ", _jsx(_components.span, {
          className: "hljs-attr",
          children: "mutationArgs"
        }), ": ", _jsx(_components.span, {
          className: "hljs-built_in",
          children: "any"
        }), "[];\n};\n\n", _jsx(_components.span, {
          className: "hljs-keyword",
          children: "class"
        }), " ", _jsx(_components.span, {
          className: "hljs-title class_",
          children: "DAG"
        }), " {\n  ", _jsx(_components.span, {
          className: "hljs-attr",
          children: "root"
        }), ": ", _jsx(_components.span, {
          className: "hljs-title class_",
          children: "DAGNode"
        }), ";\n  ", _jsx(_components.span, {
          className: "hljs-attr",
          children: "nodeRelation"
        }), ": ", _jsx(_components.span, {
          className: "hljs-title class_",
          children: "Map"
        }), "<", _jsx(_components.span, {
          className: "hljs-title class_",
          children: "NodeID"
        }), ", ", _jsx(_components.span, {
          className: "hljs-title class_",
          children: "DAGNode"
        }), "> = ", _jsx(_components.span, {
          className: "hljs-keyword",
          children: "new"
        }), " ", _jsx(_components.span, {
          className: "hljs-title class_",
          children: "Map"
        }), "();\n  ", _jsx(_components.span, {
          className: "hljs-attr",
          children: "seq"
        }), ": ", _jsx(_components.span, {
          className: "hljs-built_in",
          children: "number"
        }), " = ", _jsx(_components.span, {
          className: "hljs-number",
          children: "0"
        }), ";\n\n  ...\n\n  ", _jsx(_components.span, {
          className: "hljs-title function_",
          children: "addEvent"
        }), "(", _jsxs(_components.span, {
          className: "hljs-params",
          children: [_jsx(_components.span, {
            className: "hljs-attr",
            children: "event"
          }), ": ", _jsx(_components.span, {
            className: "hljs-title class_",
            children: "Event"
          })]
        }), ") {\n    ", _jsx(_components.span, {
          className: "hljs-keyword",
          children: "const"
        }), " ", _jsx(_components.span, {
          className: "hljs-attr",
          children: "node"
        }), ": ", _jsx(_components.span, {
          className: "hljs-title class_",
          children: "DAGNode"
        }), " = {\n      ", _jsx(_components.span, {
          className: "hljs-attr",
          children: "parents"
        }), ": ", _jsx(_components.span, {
          className: "hljs-variable language_",
          children: "this"
        }), ".", _jsx(_components.span, {
          className: "hljs-title function_",
          children: "findLeaves"
        }), "(),\n      ", _jsx(_components.span, {
          className: "hljs-attr",
          children: "id"
        }), ": ", _jsxs(_components.span, {
          className: "hljs-string",
          children: ["`", _jsxs(_components.span, {
            className: "hljs-subst",
            children: ["${", _jsx(_components.span, {
              className: "hljs-variable language_",
              children: "this"
            }), ".nodeName}"]
          }), "-", _jsxs(_components.span, {
            className: "hljs-subst",
            children: ["${", _jsx(_components.span, {
              className: "hljs-variable language_",
              children: "this"
            }), ".seq++}"]
          }), "`"]
        }), ",\n      event,\n    };\n    ", _jsx(_components.span, {
          className: "hljs-variable language_",
          children: "this"
        }), ".", _jsx(_components.span, {
          className: "hljs-property",
          children: "nodeRelation"
        }), ".", _jsx(_components.span, {
          className: "hljs-title function_",
          children: "set"
        }), "(node.", _jsx(_components.span, {
          className: "hljs-property",
          children: "id"
        }), ", node);\n\n    ", _jsx(_components.span, {
          className: "hljs-keyword",
          children: "return"
        }), " node;\n  }\n\n  ", _jsx(_components.span, {
          className: "hljs-title function_",
          children: "findLeaves"
        }), "(): ", _jsx(_components.span, {
          className: "hljs-title class_",
          children: "Set"
        }), "<", _jsx(_components.span, {
          className: "hljs-title class_",
          children: "NodeID"
        }), "> {\n    ", _jsx(_components.span, {
          className: "hljs-keyword",
          children: "const"
        }), " leaves = ", _jsx(_components.span, {
          className: "hljs-keyword",
          children: "new"
        }), " ", _jsx(_components.span, {
          className: "hljs-title class_",
          children: "Set"
        }), "<", _jsx(_components.span, {
          className: "hljs-title class_",
          children: "NodeID"
        }), ">([...", _jsx(_components.span, {
          className: "hljs-variable language_",
          children: "this"
        }), ".", _jsx(_components.span, {
          className: "hljs-property",
          children: "nodeRelation"
        }), ".", _jsx(_components.span, {
          className: "hljs-title function_",
          children: "keys"
        }), "()]);\n    ", _jsx(_components.span, {
          className: "hljs-keyword",
          children: "for"
        }), " (", _jsx(_components.span, {
          className: "hljs-keyword",
          children: "const"
        }), " n ", _jsx(_components.span, {
          className: "hljs-keyword",
          children: "of"
        }), " ", _jsx(_components.span, {
          className: "hljs-variable language_",
          children: "this"
        }), ".", _jsx(_components.span, {
          className: "hljs-property",
          children: "nodeRelation"
        }), ".", _jsx(_components.span, {
          className: "hljs-title function_",
          children: "values"
        }), "()) {\n      ", _jsx(_components.span, {
          className: "hljs-comment",
          children: "// if p is a parent then it is not a leaf. Remove it from the leaves set."
        }), "\n      ", _jsx(_components.span, {
          className: "hljs-keyword",
          children: "for"
        }), " (", _jsx(_components.span, {
          className: "hljs-keyword",
          children: "const"
        }), " p ", _jsx(_components.span, {
          className: "hljs-keyword",
          children: "of"
        }), " n.", _jsx(_components.span, {
          className: "hljs-property",
          children: "parents"
        }), ") {\n        leaves.", _jsx(_components.span, {
          className: "hljs-title function_",
          children: "delete"
        }), "(p);\n      }\n    }\n\n    ", _jsx(_components.span, {
          className: "hljs-keyword",
          children: "return"
        }), " leaves;\n  }\n}\n"]
      })
    }), "\n", _jsx(_components.p, {
      children: "Syncing state between processes is a matter of merging these logs together and merging these DAGs is trivial. Since each node in the DAG is completely unique and immutable, all we have to do is union the sets of nodes. This unioning can happen in any order and is idempotent meaning convergence does not rely on the order the DAGs are merged and duplicate syncs are not a problem."
    }), "\n", _jsx(_components.pre, {
      children: _jsxs(_components.code, {
        className: "hljs language-ts",
        children: [_jsx(_components.span, {
          className: "hljs-keyword",
          children: "class"
        }), " ", _jsx(_components.span, {
          className: "hljs-title class_",
          children: "DAG"
        }), " {\n\n  ...\n\n  ", _jsx(_components.span, {
          className: "hljs-title function_",
          children: "merge"
        }), "(", _jsx(_components.span, {
          className: "hljs-attr",
          children: "other"
        }), ": ", _jsx(_components.span, {
          className: "hljs-variable constant_",
          children: "DAG"
        }), "): ", _jsx(_components.span, {
          className: "hljs-variable constant_",
          children: "DAG"
        }), " {\n    ", _jsx(_components.span, {
          className: "hljs-keyword",
          children: "const"
        }), " ret = ", _jsx(_components.span, {
          className: "hljs-keyword",
          children: "new"
        }), " ", _jsx(_components.span, {
          className: "hljs-title function_",
          children: "DAG"
        }), "(", _jsx(_components.span, {
          className: "hljs-variable language_",
          children: "this"
        }), ".", _jsx(_components.span, {
          className: "hljs-property",
          children: "nodeName"
        }), ");\n    ret.", _jsx(_components.span, {
          className: "hljs-property",
          children: "nodeRelation"
        }), " = ", _jsx(_components.span, {
          className: "hljs-keyword",
          children: "new"
        }), " ", _jsx(_components.span, {
          className: "hljs-title class_",
          children: "Map"
        }), "([...", _jsx(_components.span, {
          className: "hljs-variable language_",
          children: "this"
        }), ".", _jsx(_components.span, {
          className: "hljs-property",
          children: "nodeRelation"
        }), ", ...other.", _jsx(_components.span, {
          className: "hljs-property",
          children: "nodeRelation"
        }), "]);\n    ret.", _jsx(_components.span, {
          className: "hljs-property",
          children: "seq"
        }), " = ", _jsx(_components.span, {
          className: "hljs-title class_",
          children: "Math"
        }), ".", _jsx(_components.span, {
          className: "hljs-title function_",
          children: "max"
        }), "(", _jsx(_components.span, {
          className: "hljs-variable language_",
          children: "this"
        }), ".", _jsx(_components.span, {
          className: "hljs-property",
          children: "seq"
        }), ", other.", _jsx(_components.span, {
          className: "hljs-property",
          children: "seq"
        }), ") + ", _jsx(_components.span, {
          className: "hljs-number",
          children: "1"
        }), ";\n    ", _jsx(_components.span, {
          className: "hljs-keyword",
          children: "return"
        }), " ret;\n  }\n}\n"]
      })
    }), "\n", _jsxs(_components.p, {
      children: ["Since all processes share a common ancestor for their DAG (the sentinel \"ROOT\" element), the DAG will always be ", _jsx(_components.a, {
        href: "https://mathworld.wolfram.com/ConnectedGraph.html",
        children: "connected"
      }), " after a merge. This ensures no events are ever lost by being orphaned."]
    }), "\n", _jsx(_components.p, {
      children: "Based on this, the DAG:"
    }), "\n", _jsxs(_components.ul, {
      children: ["\n", _jsx(_components.li, {
        children: "Only grows"
      }), "\n", _jsx(_components.li, {
        children: "Can be merged in any order (it is commutative and associative)"
      }), "\n", _jsx(_components.li, {
        children: "Merges are idempotent"
      }), "\n"]
    }), "\n", _jsx(_components.p, {
      children: "Meaning the DAG is a CRDT. Since we know that DAG will always converge across all peers we can use it to order and drive mutations against application state."
    }), "\n", _jsx(_components.p, {
      children: "Which brings us to the last trick -- updating the current application state based on the DAG."
    }), "\n", _jsxs(_components.h3, {
      id: "updating-state",
      children: [_jsx(_components.a, {
        "aria-hidden": "true",
        tabIndex: "-1",
        href: "#updating-state",
        children: _jsx(_components.span, {
          className: "icon icon-link"
        })
      }), "Updating State"]
    }), "\n", _jsx(_components.p, {
      children: "Updating application state after a merge is a matter of:"
    }), "\n", _jsxs(_components.ol, {
      children: ["\n", _jsx(_components.li, {
        children: "rewinding to a certain snapshot of application state (or all the way back to initial state)"
      }), "\n", _jsx(_components.li, {
        children: "Replaying the mutation log against that state"
      }), "\n"]
    }), "\n", _jsxs(_components.p, {
      children: ["But how do you replay a log that is not linear? You make it linear. Each process does a deterministic ", _jsx(_components.a, {
        href: "https://en.wikipedia.org/wiki/Breadth-first_search",
        children: "breadth first traversal"
      }), " of the DAG to create a single sequence of events. This interpretation of events is what is applied to the state snapshot."]
    }), "\n", _jsx(_components.p, {
      children: "The area where this gets tricky is when handling concurrent branches. Since there is no ordering between concurrent events we just have to pick one and stick with it. A common way to order concurrent events is to order them by process id or value."
    }), "\n", _jsx(_components.p, {
      children: "A non-optimized version of this based on our DAG structure:"
    }), "\n", _jsx(_components.pre, {
      children: _jsxs(_components.code, {
        className: "hljs language-ts",
        children: [_jsx(_components.span, {
          className: "hljs-keyword",
          children: "export"
        }), " ", _jsx(_components.span, {
          className: "hljs-keyword",
          children: "type"
        }), " ", _jsx(_components.span, {
          className: "hljs-title class_",
          children: "NodeID"
        }), " = ", _jsx(_components.span, {
          className: "hljs-string",
          children: "\"ROOT\""
        }), " | ", _jsxs(_components.span, {
          className: "hljs-string",
          children: ["`", _jsx(_components.span, {
            className: "hljs-subst",
            children: "${NodeName}"
          }), "-", _jsxs(_components.span, {
            className: "hljs-subst",
            children: ["${", _jsx(_components.span, {
              className: "hljs-built_in",
              children: "number"
            }), "}"]
          }), "`"]
        }), ";\n\n", _jsx(_components.span, {
          className: "hljs-keyword",
          children: "export"
        }), " ", _jsx(_components.span, {
          className: "hljs-keyword",
          children: "type"
        }), " ", _jsx(_components.span, {
          className: "hljs-title class_",
          children: "DAGNode"
        }), " = {\n  ", _jsx(_components.span, {
          className: "hljs-attr",
          children: "parents"
        }), ": ", _jsx(_components.span, {
          className: "hljs-title class_",
          children: "Set"
        }), "<", _jsx(_components.span, {
          className: "hljs-title class_",
          children: "NodeID"
        }), ">;\n  ", _jsx(_components.span, {
          className: "hljs-attr",
          children: "id"
        }), ": ", _jsx(_components.span, {
          className: "hljs-title class_",
          children: "NodeID"
        }), ";\n  ", _jsx(_components.span, {
          className: "hljs-attr",
          children: "event"
        }), ": ", _jsx(_components.span, {
          className: "hljs-title class_",
          children: "Event"
        }), ";\n};\n\n", _jsx(_components.span, {
          className: "hljs-keyword",
          children: "class"
        }), " ", _jsx(_components.span, {
          className: "hljs-title class_",
          children: "DAG"
        }), " {\n  ...\n\n  ", _jsx(_components.span, {
          className: "hljs-title function_",
          children: "getEventsInOrder"
        }), "(): ", _jsx(_components.span, {
          className: "hljs-title class_",
          children: "DAGNode"
        }), "[] {\n    ", _jsx(_components.span, {
          className: "hljs-keyword",
          children: "const"
        }), " graph = ", _jsx(_components.span, {
          className: "hljs-keyword",
          children: "new"
        }), " ", _jsx(_components.span, {
          className: "hljs-title class_",
          children: "Map"
        }), "<", _jsx(_components.span, {
          className: "hljs-title class_",
          children: "NodeID"
        }), ", ", _jsx(_components.span, {
          className: "hljs-title class_",
          children: "DAGNode"
        }), "[]>();\n    ", _jsx(_components.span, {
          className: "hljs-keyword",
          children: "for"
        }), " (", _jsx(_components.span, {
          className: "hljs-keyword",
          children: "const"
        }), " n ", _jsx(_components.span, {
          className: "hljs-keyword",
          children: "of"
        }), " ", _jsx(_components.span, {
          className: "hljs-variable language_",
          children: "this"
        }), ".", _jsx(_components.span, {
          className: "hljs-property",
          children: "nodeRelation"
        }), ".", _jsx(_components.span, {
          className: "hljs-title function_",
          children: "keys"
        }), "()) {\n      graph.", _jsx(_components.span, {
          className: "hljs-title function_",
          children: "set"
        }), "(n, []);\n    }\n\n    ", _jsx(_components.span, {
          className: "hljs-comment",
          children: "// Convert the graph so we have child pointers."
        }), "\n    ", _jsx(_components.span, {
          className: "hljs-keyword",
          children: "for"
        }), " (", _jsx(_components.span, {
          className: "hljs-keyword",
          children: "const"
        }), " n ", _jsx(_components.span, {
          className: "hljs-keyword",
          children: "of"
        }), " ", _jsx(_components.span, {
          className: "hljs-variable language_",
          children: "this"
        }), ".", _jsx(_components.span, {
          className: "hljs-property",
          children: "nodeRelation"
        }), ".", _jsx(_components.span, {
          className: "hljs-title function_",
          children: "values"
        }), "()) {\n      ", _jsx(_components.span, {
          className: "hljs-keyword",
          children: "for"
        }), " (", _jsx(_components.span, {
          className: "hljs-keyword",
          children: "const"
        }), " p ", _jsx(_components.span, {
          className: "hljs-keyword",
          children: "of"
        }), " n.", _jsx(_components.span, {
          className: "hljs-property",
          children: "parents"
        }), ") {\n        graph.", _jsx(_components.span, {
          className: "hljs-title function_",
          children: "get"
        }), "(p)!.", _jsx(_components.span, {
          className: "hljs-title function_",
          children: "push"
        }), "(n);\n      }\n    }\n\n    ", _jsx(_components.span, {
          className: "hljs-comment",
          children: "// Now sort the children of each node by their id. IDs never collide given node name is encoded into the id."
        }), "\n    ", _jsx(_components.span, {
          className: "hljs-keyword",
          children: "for"
        }), " (", _jsx(_components.span, {
          className: "hljs-keyword",
          children: "const"
        }), " children ", _jsx(_components.span, {
          className: "hljs-keyword",
          children: "of"
        }), " graph.", _jsx(_components.span, {
          className: "hljs-title function_",
          children: "values"
        }), "()) {\n      children.", _jsx(_components.span, {
          className: "hljs-title function_",
          children: "sort"
        }), "(", _jsxs(_components.span, {
          className: "hljs-function",
          children: ["(", _jsx(_components.span, {
            className: "hljs-params",
            children: "a, b"
          }), ") =>"]
        }), " {\n        ", _jsx(_components.span, {
          className: "hljs-keyword",
          children: "const"
        }), " [aNode, aRawSeq] = a.", _jsx(_components.span, {
          className: "hljs-property",
          children: "id"
        }), ".", _jsx(_components.span, {
          className: "hljs-title function_",
          children: "split"
        }), "(", _jsx(_components.span, {
          className: "hljs-string",
          children: "\"-\""
        }), ");\n        ", _jsx(_components.span, {
          className: "hljs-keyword",
          children: "const"
        }), " [bNode, bRawSeq] = b.", _jsx(_components.span, {
          className: "hljs-property",
          children: "id"
        }), ".", _jsx(_components.span, {
          className: "hljs-title function_",
          children: "split"
        }), "(", _jsx(_components.span, {
          className: "hljs-string",
          children: "\"-\""
        }), ");\n        ", _jsx(_components.span, {
          className: "hljs-keyword",
          children: "const"
        }), " aSeq = ", _jsx(_components.span, {
          className: "hljs-built_in",
          children: "parseInt"
        }), "(aRawSeq);\n        ", _jsx(_components.span, {
          className: "hljs-keyword",
          children: "const"
        }), " bSeq = ", _jsx(_components.span, {
          className: "hljs-built_in",
          children: "parseInt"
        }), "(bRawSeq);\n        ", _jsx(_components.span, {
          className: "hljs-keyword",
          children: "if"
        }), " (aSeq === bSeq) {\n          ", _jsx(_components.span, {
          className: "hljs-keyword",
          children: "return"
        }), " aNode < bNode ? -", _jsx(_components.span, {
          className: "hljs-number",
          children: "1"
        }), " : ", _jsx(_components.span, {
          className: "hljs-number",
          children: "1"
        }), ";\n        }\n        ", _jsx(_components.span, {
          className: "hljs-keyword",
          children: "return"
        }), " aSeq - bSeq;\n      });\n    }\n\n    ", _jsx(_components.span, {
          className: "hljs-keyword",
          children: "const"
        }), " ", _jsx(_components.span, {
          className: "hljs-attr",
          children: "events"
        }), ": ", _jsx(_components.span, {
          className: "hljs-title class_",
          children: "DAGNode"
        }), "[] = [];\n\n    ", _jsx(_components.span, {
          className: "hljs-comment",
          children: "// Finally do our breadth first traversal."
        }), "\n    ", _jsx(_components.span, {
          className: "hljs-keyword",
          children: "const"
        }), " visited = ", _jsx(_components.span, {
          className: "hljs-keyword",
          children: "new"
        }), " ", _jsx(_components.span, {
          className: "hljs-title class_",
          children: "Set"
        }), "<", _jsx(_components.span, {
          className: "hljs-title class_",
          children: "DAGNode"
        }), ">();\n    ", _jsx(_components.span, {
          className: "hljs-keyword",
          children: "const"
        }), " toVisit = [", _jsx(_components.span, {
          className: "hljs-variable language_",
          children: "this"
        }), ".", _jsx(_components.span, {
          className: "hljs-property",
          children: "root"
        }), "];\n    ", _jsx(_components.span, {
          className: "hljs-keyword",
          children: "for"
        }), " (", _jsx(_components.span, {
          className: "hljs-keyword",
          children: "const"
        }), " n ", _jsx(_components.span, {
          className: "hljs-keyword",
          children: "of"
        }), " toVisit) {\n      ", _jsx(_components.span, {
          className: "hljs-keyword",
          children: "if"
        }), " (visited.", _jsx(_components.span, {
          className: "hljs-title function_",
          children: "has"
        }), "(n)) {\n        ", _jsx(_components.span, {
          className: "hljs-keyword",
          children: "continue"
        }), ";\n      }\n      visited.", _jsx(_components.span, {
          className: "hljs-title function_",
          children: "add"
        }), "(n);\n      ", _jsx(_components.span, {
          className: "hljs-keyword",
          children: "if"
        }), " (n.", _jsx(_components.span, {
          className: "hljs-property",
          children: "id"
        }), " !== ", _jsx(_components.span, {
          className: "hljs-string",
          children: "\"ROOT\""
        }), ") {\n        events.", _jsx(_components.span, {
          className: "hljs-title function_",
          children: "push"
        }), "(n);\n      }\n      ", _jsx(_components.span, {
          className: "hljs-keyword",
          children: "for"
        }), " (", _jsx(_components.span, {
          className: "hljs-keyword",
          children: "const"
        }), " child ", _jsx(_components.span, {
          className: "hljs-keyword",
          children: "of"
        }), " graph.", _jsx(_components.span, {
          className: "hljs-title function_",
          children: "get"
        }), "(n.", _jsx(_components.span, {
          className: "hljs-property",
          children: "id"
        }), ")!) {\n        toVisit.", _jsx(_components.span, {
          className: "hljs-title function_",
          children: "push"
        }), "(child);\n      }\n    }\n\n    ", _jsx(_components.span, {
          className: "hljs-keyword",
          children: "return"
        }), " events;\n  }\n}\n"]
      })
    }), "\n", _jsx(_components.p, {
      children: "While toy versions of all ideas seem to be able to be implemented in 100 lines of JavaScript, a production grade version that:"
    }), "\n", _jsxs(_components.ul, {
      children: ["\n", _jsx(_components.li, {
        children: "Scales to hundreds or thousands of transactions per second (no matter how large the transaction logs become)"
      }), "\n", _jsx(_components.li, {
        children: "Shares structure and compresses well"
      }), "\n"]
    }), "\n", _jsx(_components.p, {
      children: "will take some doing. Although you could certainly scale the toy to specific use cases with some hacks. For the general case you'll need:"
    }), "\n", _jsxs(_components.ul, {
      children: ["\n", _jsxs(_components.li, {
        children: ["A data structure ", _jsx(_components.a, {
          href: "https://en.wikipedia.org/wiki/Persistent_data_structure",
          children: "that can rewind to arbitrary versions easily"
        })]
      }), "\n", _jsx(_components.li, {
        children: "A way to calculate the deltas between DAGs on different nodes so as not to require sending the entire dag on sync"
      }), "\n", _jsx(_components.li, {
        children: "Something to prevent mistakes such as mutations being non-deterministic"
      }), "\n", _jsx(_components.li, {
        children: "A way to compress the log while still supporting random access to it"
      }), "\n", _jsx(_components.li, {
        children: "A way to know when it is safe to prune events out of the log"
      }), "\n"]
    }), "\n", _jsxs(_components.h2, {
      id: "acknowledgements",
      children: [_jsx(_components.a, {
        "aria-hidden": "true",
        tabIndex: "-1",
        href: "#acknowledgements",
        children: _jsx(_components.span, {
          className: "icon icon-link"
        })
      }), "Acknowledgements"]
    }), "\n", _jsxs(_components.ul, {
      children: ["\n", _jsxs(_components.li, {
        children: [_jsx(_components.a, {
          href: "https://replicache.dev/",
          children: "Replicache"
        }), " and ", _jsx(_components.a, {
          href: "https://twitter.com/aboodman",
          children: "@aboodman"
        }), " for turning me on to the idea with his presentation @ lfw.dev which ", _jsx(_components.a, {
          href: "https://www.youtube.com/watch?v=7Bb0KRLL8FI&t=1892s",
          children: "you can view here"
        })]
      }), "\n", _jsxs(_components.li, {
        children: [_jsx(_components.a, {
          href: "https://localfirstweb.dev/",
          children: "lfw.dev"
        }), " and ", _jsx(_components.a, {
          href: "https://twitter.com/founderYonz",
          children: "@founderYonz"
        }), " for gathering a community together to share these ideas"]
      }), "\n", _jsxs(_components.li, {
        children: [_jsx(_components.a, {
          href: "https://braid.org/",
          children: "Braid.org"
        }), " for being open, welcoming and truly diving deep on CRDTs, exploring them in every possible way"]
      }), "\n"]
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
