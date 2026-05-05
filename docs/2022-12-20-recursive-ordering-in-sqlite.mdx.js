/*@jsxRuntime automatic @jsxImportSource https://esm.sh/react*/
import {Fragment as _Fragment, jsx as _jsx, jsxs as _jsxs} from "https://esm.sh/react/jsx-runtime";
import RunnableCode from '/dist/components/blog/runnable-code/RunnableCode.js';
function _createMdxContent(props) {
  const _components = Object.assign({
    nav: "nav",
    ol: "ol",
    li: "li",
    a: "a",
    p: "p",
    pre: "pre",
    code: "code",
    span: "span",
    h2: "h2",
    strong: "strong",
    ul: "ul",
    hr: "hr"
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
            href: "#benchmarking",
            children: "Benchmarking"
          })
        }), _jsx(_components.li, {
          className: "toc-item toc-item-h2",
          children: _jsx(_components.a, {
            className: "toc-link toc-link-h2",
            href: "#pros",
            children: "Pros"
          })
        }), _jsx(_components.li, {
          className: "toc-item toc-item-h2",
          children: _jsx(_components.a, {
            className: "toc-link toc-link-h2",
            href: "#drawbacks",
            children: "Drawbacks"
          })
        })]
      })
    }), "\n", _jsx(_components.p, {
      children: "Lets say we've implemented a linked list in our table and want to retrieve items in the order that they are linked together."
    }), "\n", _jsx(_components.p, {
      children: "The schema would look like:"
    }), "\n", _jsx(_components.pre, {
      children: _jsxs(_components.code, {
        className: "hljs language-sql",
        children: [_jsx(_components.span, {
          className: "hljs-keyword",
          children: "CREATE"
        }), " ", _jsx(_components.span, {
          className: "hljs-keyword",
          children: "TABLE"
        }), " node (\n  id ", _jsx(_components.span, {
          className: "hljs-keyword",
          children: "primary"
        }), " key ", _jsx(_components.span, {
          className: "hljs-keyword",
          children: "NOT"
        }), " ", _jsx(_components.span, {
          className: "hljs-keyword",
          children: "NULL"
        }), ",\n  parent_id,\n  content,\n);\n", _jsx(_components.span, {
          className: "hljs-keyword",
          children: "CREATE"
        }), " INDEX node_parent_id ", _jsx(_components.span, {
          className: "hljs-keyword",
          children: "ON"
        }), " node (parent_id);\n"]
      })
    }), "\n", _jsx(_components.p, {
      children: "But how do we fetch nodes in order? We can't order by any of the fields nor will joins or subselects help us out here."
    }), "\n", _jsx(_components.pre, {
      children: _jsxs(_components.code, {
        className: "hljs language-sql",
        children: [_jsx(_components.span, {
          className: "hljs-keyword",
          children: "SELECT"
        }), " content ", _jsx(_components.span, {
          className: "hljs-keyword",
          children: "FROM"
        }), " node ", _jsx(_components.span, {
          className: "hljs-keyword",
          children: "ORDER"
        }), " ", _jsx(_components.span, {
          className: "hljs-keyword",
          children: "BY"
        }), " ?????\n"]
      })
    }), "\n", _jsx(_components.p, {
      children: "We can, however, create a recursive common table expression."
    }), "\n", _jsx(_components.pre, {
      children: _jsxs(_components.code, {
        className: "hljs language-sql",
        children: [_jsx(_components.span, {
          className: "hljs-keyword",
          children: "WITH"
        }), " ", _jsx(_components.span, {
          className: "hljs-keyword",
          children: "RECURSIVE"
        }), "\nafter_node(content,level,id) ", _jsx(_components.span, {
          className: "hljs-keyword",
          children: "AS"
        }), " (\n  ", _jsx(_components.span, {
          className: "hljs-keyword",
          children: "VALUES"
        }), "(", _jsx(_components.span, {
          className: "hljs-string",
          children: "'Root'"
        }), ",", _jsx(_components.span, {
          className: "hljs-number",
          children: "0"
        }), ",?)\n  ", _jsx(_components.span, {
          className: "hljs-keyword",
          children: "UNION"
        }), " ", _jsx(_components.span, {
          className: "hljs-keyword",
          children: "ALL"
        }), "\n  ", _jsx(_components.span, {
          className: "hljs-keyword",
          children: "SELECT"
        }), " node.content, after_node.level", _jsx(_components.span, {
          className: "hljs-operator",
          children: "+"
        }), _jsx(_components.span, {
          className: "hljs-number",
          children: "1"
        }), ", node.id\n    ", _jsx(_components.span, {
          className: "hljs-keyword",
          children: "FROM"
        }), " node ", _jsx(_components.span, {
          className: "hljs-keyword",
          children: "JOIN"
        }), " after_node ", _jsx(_components.span, {
          className: "hljs-keyword",
          children: "ON"
        }), " node.parent_id", _jsx(_components.span, {
          className: "hljs-operator",
          children: "="
        }), "after_node.id\n   ", _jsx(_components.span, {
          className: "hljs-keyword",
          children: "ORDER"
        }), " ", _jsx(_components.span, {
          className: "hljs-keyword",
          children: "BY"
        }), " ", _jsx(_components.span, {
          className: "hljs-number",
          children: "2"
        }), " ", _jsx(_components.span, {
          className: "hljs-keyword",
          children: "DESC"
        }), "\n)\n", _jsx(_components.span, {
          className: "hljs-keyword",
          children: "SELECT"
        }), " content ", _jsx(_components.span, {
          className: "hljs-keyword",
          children: "FROM"
        }), " after_node LIMIT ?;\n"]
      })
    }), "\n", _jsxs(_components.p, {
      children: ["What is happening above is that we're creating the ordered representation of the table by recursively following ", _jsx(_components.code, {
        children: "parent_id"
      }), " down to the provided root."]
    }), "\n", _jsx(_components.p, {
      children: "To get items after a given root, provide a different root id."
    }), "\n", _jsx(_components.p, {
      children: "Using this query would look something like:"
    }), "\n", _jsx(_components.pre, {
      children: _jsxs(_components.code, {
        className: "hljs language-ts",
        children: [_jsx(_components.span, {
          className: "hljs-keyword",
          children: "const"
        }), " stmt = sqlite.", _jsx(_components.span, {
          className: "hljs-title function_",
          children: "prepare"
        }), "(sql", _jsx(_components.span, {
          className: "hljs-string",
          children: "`\nWITH RECURSIVE\nafter_node(content,level,id) AS (\n  VALUES('Root',0,?)\n  UNION ALL\n  SELECT node.content, after_node.level+1, node.id\n    FROM node JOIN after_node ON node.parent_id IS after_node.id\n   ORDER BY 2 DESC\n)\nSELECT content FROM after_node LIMIT ?;\n`"
        }), ");\n\n", _jsx(_components.span, {
          className: "hljs-comment",
          children: "// get the first 1k items in desc order"
        }), "\nstmt.", _jsx(_components.span, {
          className: "hljs-title function_",
          children: "all"
        }), "(\n  ", _jsx(_components.span, {
          className: "hljs-literal",
          children: "null"
        }), ", ", _jsx(_components.span, {
          className: "hljs-comment",
          children: "// the \"root\" id."
        }), "\n  ", _jsx(_components.span, {
          className: "hljs-number",
          children: "1000"
        }), ", ", _jsx(_components.span, {
          className: "hljs-comment",
          children: "// first 1k items"
        }), "\n);\n\n", _jsx(_components.span, {
          className: "hljs-comment",
          children: "// get the first 1k items after `some_id` in desc order"
        }), "\nstmt.", _jsx(_components.span, {
          className: "hljs-title function_",
          children: "all"
        }), "(some_id, ", _jsx(_components.span, {
          className: "hljs-number",
          children: "1000"
        }), ");\n"]
      })
    }), "\n", _jsx(_components.p, {
      children: "But how well does it perform?"
    }), "\n", _jsxs(_components.h2, {
      id: "benchmarking",
      children: [_jsx(_components.a, {
        "aria-hidden": "true",
        tabIndex: "-1",
        href: "#benchmarking",
        children: _jsx(_components.span, {
          className: "icon icon-link"
        })
      }), "Benchmarking"]
    }), "\n", _jsxs(_components.p, {
      children: ["Given we can ", _jsx(_components.a, {
        href: "https://sqlite.org/wasm/doc/trunk/index.md",
        children: "run SQLite in the browser these days"
      }), ", lets fire it up and try it out."]
    }), "\n", _jsx(RunnableCode, {
      code: `const sqlite3Import = await import("https://esm.sh/@sqlite.org/sqlite-wasm@3.41.2");
sqlite3InitModule = sqlite3Import.default;

const sqlite3 = await sqlite3InitModule();
const db = new sqlite3.oo1.DB();
db.exec([
  \`CREATE TABLE node (id NOT NULL, parent_id, content, primary key (id));\`,
  \`CREATE INDEX node_parent_id ON node (parent_id);\`
]);
provide db;`
    }), "\n", _jsx(_components.p, {
      children: "Now lets populate 100k rows as our test set of data where each new row points to the previous row."
    }), "\n", _jsx(RunnableCode, {
      code: `use db;
function fill(db) {
  let lastId = null;
  for (let i = 0; i < 100000; ++i) {
    const id = i;
    db.exec(\`INSERT INTO node (id, parent_id, content) VALUES (?, ?, ?)\`, { bind: [
      id,
      lastId,
      "str" + i,
    ]});
    lastId = id;
  }
}
db.transaction(() => fill(db));`
    }), "\n", _jsx(_components.p, {
      children: "Then prepare different statements to benchmarking recursive ordering vs normal ordering."
    }), "\n", _jsx(RunnableCode, {
      code: `use db;
const recursiveQuery = \`WITH RECURSIVE
  after_node(content,level,id) AS (
    VALUES('Root',0,?)
    UNION ALL
    SELECT node.content, after_node.level+1, node.id
      FROM node JOIN after_node ON node.parent_id IS after_node.id
    ORDER BY 2 DESC
  )
  SELECT content FROM after_node LIMIT ?;\`;

const recursiveStmt = db.prepare(recursiveQuery);
const regularQuery = \`SELECT content FROM node WHERE id > ? ORDER BY id DESC LIMIT ?\`;
const regularStmt = db.prepare(regularQuery);
const controlQuery = \`SELECT content FROM node WHERE content > ? ORDER BY content DESC LIMIT ?\`;
const controlStmt = db.prepare(controlQuery);

provide recursiveStmt;
provide regularStmt;
provide controlStmt;`
    }), "\n", _jsx(_components.p, {
      children: "And finally, run the benchmarks."
    }), "\n", _jsx(RunnableCode, {
      code: `use recursiveStmt;
use regularStmt;
use controlStmt;

function fetchAll(stmt, bindings) {
  let numRows = 0;
  stmt.bind(bindings);
  // computing numRows just as a check that we're getting rows back as expected from
  // each query
  while (stmt.step()) {
    ++numRows;
  }
  stmt.reset(true);
  return numRows;
}

function time(fn) {
  const start = performance.now();
  const ret = fn();
  const end = performance.now();
  return [ret, (end - start).toPrecision(4) + "ms"];
}

return {
    "a - control sort first 10k": time(() => fetchAll(controlStmt, ["str0", 10000])),
    "a - regular sort first 10k": time(() => fetchAll(regularStmt, [0, 10000])),
    "a - recursive sort first 10k": time(() => fetchAll(recursiveStmt, [null, 10000])),
    "b - control sort mid 10k": time(() => fetchAll(controlStmt, ["str50000", 10000])),
    "b - regular sort mid 10k": time(() => fetchAll(regularStmt, [50000, 10000])),
    "b - recursive sort mid 10k": time(() => fetchAll(recursiveStmt, [50000, 10000])),
    "c - control sort last 10k": time(() => fetchAll(controlStmt, ["str90000", 10000])),
    "c - regular sort last 10k": time(() => fetchAll(regularStmt, [90000, 10000])),
    "c - recursive sort last 10k": time(() => fetchAll(recursiveStmt, [90000, 10000])),

    "d - control sort first 5k": time(() => fetchAll(controlStmt, ["str0", 5000])),
    "d - regular sort first 5k": time(() => fetchAll(regularStmt, [0, 5000])),
    "d - recursive sort first 5k": time(() => fetchAll(recursiveStmt, [null, 5000])),
    "e - control sort mid 5k": time(() => fetchAll(controlStmt, ["str50000", 5000])),
    "e - regular sort mid 5k": time(() => fetchAll(regularStmt, [50000, 5000])),
    "e - recursive sort mid 5k": time(() => fetchAll(recursiveStmt, [50000, 5000])),
    "f - control sort last 5k": time(() => fetchAll(controlStmt, ["str90000", 5000])),
    "f - regular sort last 5k": time(() => fetchAll(regularStmt, [90000, 5000])),
    "f - recursive sort last 5k": time(() => fetchAll(recursiveStmt, [90000, 5000])),
};`
    }), "\n", _jsx(_components.p, {
      children: "On a macbook m1, recursive sort is about 2x slower than regular sort in all cases and between 8-12x faster than the control."
    }), "\n", _jsxs(_components.p, {
      children: ["The \"2x slower ", _jsx(_components.strong, {
        children: "in all cases"
      }), "\" is also a good sign -- it means that the perf of a recursive sort tracks that of a run of the mill sort on an indexed column by a constant factor."]
    }), "\n", _jsx(_components.p, {
      children: "Each recursive case also took the same amount of time meaning it doesn't matter from where we start fetching a range from within a large table."
    }), "\n", _jsx(_components.p, {
      children: "While it is a 2x hit, it is still incredibly quick. On my m1 -- 10ms to return 10k rows in order from a set of 100k."
    }), "\n", _jsxs(_components.h2, {
      id: "pros",
      children: [_jsx(_components.a, {
        "aria-hidden": "true",
        tabIndex: "-1",
        href: "#pros",
        children: _jsx(_components.span, {
          className: "icon icon-link"
        })
      }), "Pros"]
    }), "\n", _jsxs(_components.ul, {
      children: ["\n", _jsx(_components.li, {
        children: "While slower than a fractional index, it is still very fast / is only a constant factor slower than a regular index."
      }), "\n", _jsxs(_components.li, {
        children: ["Does not lose precision as a fractional index does. See ", _jsx(_components.a, {
          href: "/2023-01-26-fractional-indexing.html",
          children: "fractional-indexing"
        })]
      }), "\n", _jsx(_components.li, {
        children: "Does not blow up in storage space as a fractional index can."
      }), "\n", _jsx(_components.li, {
        children: "Inserting or moving a row only requires updating at most 3 rows."
      }), "\n"]
    }), "\n", _jsxs(_components.h2, {
      id: "drawbacks",
      children: [_jsx(_components.a, {
        "aria-hidden": "true",
        tabIndex: "-1",
        href: "#drawbacks",
        children: _jsx(_components.span, {
          className: "icon icon-link"
        })
      }), "Drawbacks"]
    }), "\n", _jsxs(_components.ul, {
      children: ["\n", _jsx(_components.li, {
        children: "The implementation shown here cannot be used in a distributed setting where nodes write without coordination."
      }), "\n"]
    }), "\n", _jsx(_components.hr, {}), "\n", _jsx(_components.p, {
      children: _jsx(_components.a, {
        href: "https://www.sqlite.org/lang_with.html#outlandish_recursive_query_examples",
        children: "https://www.sqlite.org/lang_with.html#outlandish_recursive_query_examples"
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
