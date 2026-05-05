/*@jsxRuntime automatic @jsxImportSource https://esm.sh/react*/
import {Fragment as _Fragment, jsx as _jsx, jsxs as _jsxs} from "https://esm.sh/react/jsx-runtime";
function _createMdxContent(props) {
  const _components = Object.assign({
    nav: "nav",
    ol: "ol",
    li: "li",
    a: "a",
    h1: "h1",
    span: "span",
    p: "p"
  }, props.components);
  return _jsxs(_Fragment, {
    children: [_jsx(_components.nav, {
      className: "toc",
      children: _jsx(_components.ol, {
        className: "toc-level toc-level-1",
        children: _jsx(_components.li, {
          className: "toc-item toc-item-h1",
          children: _jsx(_components.a, {
            className: "toc-link toc-link-h1",
            href: "#how-cr-sqlite-transactions-work-tomorrow",
            children: "How CR-SQLite Transactions Work Tomorrow"
          })
        })
      })
    }), _jsxs(_components.h1, {
      id: "how-cr-sqlite-transactions-work-tomorrow",
      children: [_jsx(_components.a, {
        "aria-hidden": "true",
        tabIndex: "-1",
        href: "#how-cr-sqlite-transactions-work-tomorrow",
        children: _jsx(_components.span, {
          className: "icon icon-link"
        })
      }), "How CR-SQLite Transactions Work Tomorrow"]
    }), "\n", _jsxs(_components.p, {
      children: ["This is a follow on from ", _jsx(_components.a, {
        href: "/2023-03-30-how-crsqlite-transactions-work-today.html",
        children: "How CR-SQLite Transactions Work Today"
      }), ". The prior post described some potentially unexpected behavior when syncing transactions between two peers and the origins of that behavior. Namely that cr-sqlite only keeps the current state of the database around which can lead to \"holes\" in past transactions."]
    }), "\n", _jsxs(_components.p, {
      children: ["In future version of cr-sqlite, this will no longer be the case. cr-sqlite will give you the option to use an ", _jsx(_components.a, {
        href: "https://en.wikipedia.org/wiki/Persistent_data_structure",
        children: "immutable data structure with structural sharing"
      }), " to back your CRRs."]
    }), "\n", _jsx(_components.p, {
      children: "This means that cr-sqlite will be able to re-wind the state of the databases to any given version, allowing it to fully and faithfully sync transactions."
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
