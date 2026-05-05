/*@jsxRuntime automatic @jsxImportSource https://esm.sh/react*/
import {Fragment as _Fragment, jsx as _jsx, jsxs as _jsxs} from "https://esm.sh/react/jsx-runtime";
import RunnableCode from '/dist/components/blog/runnable-code/RunnableCode.js';
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
    h3: "h3",
    code: "code",
    ul: "ul",
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
            href: "#how-it-works",
            children: "How It Works"
          })
        }), _jsx(_components.li, {
          className: "toc-item toc-item-h2",
          children: _jsx(_components.a, {
            className: "toc-link toc-link-h2",
            href: "#fractional-indexing---gotchas",
            children: "Fractional Indexing - Gotchas"
          })
        }), _jsx(_components.li, {
          className: "toc-item toc-item-h2",
          children: _jsx(_components.a, {
            className: "toc-link toc-link-h2",
            href: "#fixing-the-gotchas",
            children: "Fixing the Gotchas"
          })
        })]
      })
    }), "\n", _jsx(_components.p, {
      children: "To enable user provided ordering of rows, most people reach for a fractional index. They're great given they let you change the position of one row without modifying any other rows. Fractional indices have a number of gotchas, however."
    }), "\n", _jsxs(_components.h2, {
      id: "how-it-works",
      children: [_jsx(_components.a, {
        "aria-hidden": "true",
        tabIndex: "-1",
        href: "#how-it-works",
        children: _jsx(_components.span, {
          className: "icon icon-link"
        })
      }), "How It Works"]
    }), "\n", _jsx(_components.p, {
      children: "Take the following array where each item records its order"
    }), "\n", _jsx(RunnableCode, {
      code: `const rows = [
  { id: 'a', order: 1 },
  { id: 'b', order: 2 },
  { id: 'c', order: 3 },
  { id: 'd', order: 4 },
  { id: 'e', order: 5 },
  { id: 'f', order: 6 },
];
provide rows;`
    }), "\n", _jsx(_components.p, {
      children: "If you want to insert something between 1 & 2, you'll have to re-number 2 and everything after it. This isn't great -- especially in a setting where you could have millions of rows."
    }), "\n", _jsx(_components.p, {
      children: "Enter fractional indices."
    }), "\n", _jsx(_components.p, {
      children: "Fractional indices let us insert between existing items by inserting at the midpoint between them."
    }), "\n", _jsx(RunnableCode, {
      code: `use rows;
return (rows[0].order + rows[1].order) / 2`
    }), "\n", _jsx(_components.p, {
      children: "obviously this is great for a database table that stores rows with some user defined order. You can change the order of a row without ever having to touch other rows."
    }), "\n", _jsx(_components.p, {
      children: "Sounds like heaven, right? Almost..."
    }), "\n", _jsxs(_components.h2, {
      id: "fractional-indexing---gotchas",
      children: [_jsx(_components.a, {
        "aria-hidden": "true",
        tabIndex: "-1",
        href: "#fractional-indexing---gotchas",
        children: _jsx(_components.span, {
          className: "icon icon-link"
        })
      }), "Fractional Indexing - Gotchas"]
    }), "\n", _jsx(_components.p, {
      children: "Fractional indices have some gotchas that aren't apparent at first."
    }), "\n", _jsxs(_components.h3, {
      id: "precision",
      children: [_jsx(_components.a, {
        "aria-hidden": "true",
        tabIndex: "-1",
        href: "#precision",
        children: _jsx(_components.span, {
          className: "icon icon-link"
        })
      }), "Precision"]
    }), "\n", _jsx(_components.p, {
      children: "You might think 52 bits of precision (for JS floats) would be plenty to continuously insert between two items. Since inserts divide the space by 2, you will actually run out of precision after 53 insertions in the wrong spot. Demonstrated below"
    }), "\n", _jsx(RunnableCode, {
      code: `let lower = 1;
let upper = 2;
let midpoint = null;

for (let i = 0; i < 52; ++i) {
  midpoint = (upper + lower) / 2;
  upper = midpoint;
}

const afterFiftyTwo = upper;

midpoint = (upper + lower) / 2;
upper = midpoint;

const afterFiftyThree = upper;

return [afterFiftyTwo, afterFiftyThree];`
    }), "\n", _jsxs(_components.p, {
      children: ["As you can see, our value collapses back to ", _jsx(_components.code, {
        children: "1"
      }), " after picking the insert to always be between a specific item and the last insertion after that item."]
    }), "\n", _jsx(_components.p, {
      children: "This is worked around by using arbitrary precision floats. You can, however, run into cases where your index length becomes incredibly large in order to maintain precision."
    }), "\n", _jsxs(_components.h3, {
      id: "collisions",
      children: [_jsx(_components.a, {
        "aria-hidden": "true",
        tabIndex: "-1",
        href: "#collisions",
        children: _jsx(_components.span, {
          className: "icon icon-link"
        })
      }), "Collisions"]
    }), "\n", _jsx(_components.p, {
      children: "In a distributed setting, fractional indices have problems when it comes to nodes assigning items the same orders."
    }), "\n", _jsx(_components.p, {
      children: "Say peer A inserts item X and peer B inserts item Y and both of them give X & Y position 1.5. When the peers merge, nobody will ever be able to insert between X & Y since X & Y were assigned the same order."
    }), "\n", _jsxs(_components.h3, {
      id: "interleaving",
      children: [_jsx(_components.a, {
        "aria-hidden": "true",
        tabIndex: "-1",
        href: "#interleaving",
        children: _jsx(_components.span, {
          className: "icon icon-link"
        })
      }), "Interleaving"]
    }), "\n", _jsx(_components.p, {
      children: "Since each node is assigning orders to items independently, this can cause unwanted interleaving of data. Say I have a document that I'm sharing with myself which says \"hi\"."
    }), "\n", _jsx(_components.p, {
      children: "I have a copy of this doc on my phone and desktop. I add to it on both devices such that -"
    }), "\n", _jsxs(_components.ul, {
      children: ["\n", _jsx(_components.li, {
        children: "My phone has: \"hi there\""
      }), "\n", _jsx(_components.li, {
        children: "My desktop has: \"hi dude\""
      }), "\n"]
    }), "\n", _jsxs(_components.p, {
      children: ["When merging these two docs via fractional indexing, I'll end up interleaving ", _jsx(_components.code, {
        children: " there"
      }), " and ", _jsx(_components.code, {
        children: " dude"
      }), ". Example below."]
    }), "\n", _jsx(RunnableCode, {
      code: `const jitter = () => Math.random() * 0.0001; // not a _real_ productiom impl of jitter
const doc = [
  { c: "h", order: 0 },
  { c: "i", order: 1 }
];

const phoneDoc = doc.concat([
  { c: " ", order: 2 + jitter() },
  { c: "t", order: 3 + jitter() },
  { c: "h", order: 4 + jitter() },
  { c: "e", order: 5 + jitter() },
  { c: "r", order: 6 + jitter() },
  { c: "e", order: 7 + jitter() }
]);
const desktopDoc = doc.concat([
  { c: " ", order: 2 + jitter() },
  { c: "d", order: 3 + jitter() },
  { c: "u", order: 4 + jitter() },
  { c: "d", order: 5 + jitter() },
  { c: "e", order: 6 + jitter() }
]);

const mergedDoc = Object.values(
  doc
    .concat(phoneDoc)
    .concat(desktopDoc)
    .reduce((l, r) => {
      l[r.order] = r;
      return l;
    }, {})
)
  .sort((l, r) => l.order - r.order)
  .map((o) => o.c)
  .join("");
return mergedDoc;`
    }), "\n", _jsxs(_components.h2, {
      id: "fixing-the-gotchas",
      children: [_jsx(_components.a, {
        "aria-hidden": "true",
        tabIndex: "-1",
        href: "#fixing-the-gotchas",
        children: _jsx(_components.span, {
          className: "icon icon-link"
        })
      }), "Fixing the Gotchas"]
    }), "\n", _jsxs(_components.h3, {
      id: "precision--exponential-index",
      children: [_jsx(_components.a, {
        "aria-hidden": "true",
        tabIndex: "-1",
        href: "#precision--exponential-index",
        children: _jsx(_components.span, {
          className: "icon icon-link"
        })
      }), "Precision & Exponential Index"]
    }), "\n", _jsx(_components.p, {
      children: "To prevent exponential growth of your fractional index, insertions at the end should be whole increments and insertions at the beginning should be whole decrements."
    }), "\n", _jsx(_components.p, {
      children: "I.e.,"
    }), "\n", _jsx(_components.pre, {
      children: _jsx(_components.code, {
        className: "hljs language-text",
        children: "-2 <-- start of list\n-1\n0\n1\n2 <-- end of list\n"
      })
    }), "\n", _jsxs(_components.p, {
      children: ["You can also use a variable length encoding for your fractional index to compress away repeating numbers. See ", _jsx(_components.a, {
        href: "https://observablehq.com/@dgreensp/implementing-fractional-indexing",
        children: "https://observablehq.com/@dgreensp/implementing-fractional-indexing"
      })]
    }), "\n", _jsxs(_components.h3, {
      id: "collisions-1",
      children: [_jsx(_components.a, {
        "aria-hidden": "true",
        tabIndex: "-1",
        href: "#collisions-1",
        children: _jsx(_components.span, {
          className: "icon icon-link"
        })
      }), "Collisions"]
    }), "\n", _jsx(_components.p, {
      children: "A proposed workaround for collisions is to add random jitter to your index. Jitter, unfortunately, can still lead to a collision and will increase the space of your index."
    }), "\n", _jsx(_components.p, {
      children: "The other workaround is to allow collisions! 😮"
    }), "\n", _jsxs(_components.p, {
      children: ["To see how this works, imagine two peers (", _jsx(_components.code, {
        children: "P"
      }), " and ", _jsx(_components.code, {
        children: "Q"
      }), ") creating two sets of data:"]
    }), "\n", _jsx(_components.pre, {
      children: _jsx(_components.code, {
        className: "hljs language-text",
        children: "Peer P:\nA [1, P]\nB [2, P]\nC [3, P]\n"
      })
    }), "\n", _jsx(_components.pre, {
      children: _jsx(_components.code, {
        className: "hljs language-text",
        children: "Peer Q:\nX [1, Q]\nY [2, Q]\nZ [3, Q]\n"
      })
    }), "\n", _jsx(_components.p, {
      children: "When we merge, everything collides. A and X have the same order, B & Y have the same order and C & Z have that same order. That's ok though. We'll do two things to handle collisions:"
    }), "\n", _jsxs(_components.ol, {
      children: ["\n", _jsx(_components.li, {
        children: "Put the items from lesser peer (P) first when they collide"
      }), "\n"]
    }), "\n", _jsx(_components.pre, {
      children: _jsx(_components.code, {
        className: "hljs language-text",
        children: "A [1, P]\nX [1, Q]\nB [2, P]\nY [2, Q]\nC [3, P]\nZ [3, Q]\n"
      })
    }), "\n", _jsxs(_components.ol, {
      start: "2",
      children: ["\n", _jsx(_components.li, {
        children: "When inserting between items that have collided, we'll open up space. I.e., move the collided items up or down by some fraction to make room between them."
      }), "\n"]
    }), "\n", _jsx(_components.pre, {
      children: _jsx(_components.code, {
        className: "hljs language-text",
        children: "A [1, P]\nNEW_1 [1.5, P]\nX [1.75, Q]\nB [2, P]\nY [2, Q]\nC [3, P]\nNEW_2 [3.5, P]\nZ [4, Q]\n"
      })
    }), "\n", _jsx(_components.p, {
      children: "This keeps all the LWW semantics (order field is treated as a LWW register) and doesn't introduce anything new."
    }), "\n", _jsxs(_components.h3, {
      id: "interleaving-1",
      children: [_jsx(_components.a, {
        "aria-hidden": "true",
        tabIndex: "-1",
        href: "#interleaving-1",
        children: _jsx(_components.span, {
          className: "icon icon-link"
        })
      }), "Interleaving"]
    }), "\n", _jsx(_components.p, {
      children: "To fix interleaving we will part ways with fractional indexing and instead sort based on recursive relationships between rows."
    }), "\n", _jsx(Callout, {
      type: "info",
      children: _jsxs(_components.p, {
        children: ["Note that there are approaches to fix interleaving in a fractional index as\nseen ", _jsx(_components.a, {
          href: "https://mattweidner.com/2022/10/21/basic-list-crdt.html#intro-string-implementation",
          children: "here"
        }), ".\nThis approach is based on the recursive relationship idea but encoded into a\nfractional index."]
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
