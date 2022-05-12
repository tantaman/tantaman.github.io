/*@jsxRuntime automatic @jsxImportSource https://esm.sh/react*/
import {Fragment as _Fragment, jsx as _jsx, jsxs as _jsxs} from "https://esm.sh/react/jsx-runtime";
import Mermaid from '/dist/components/Mermaid.js';
function MDXContent(props = {}) {
  const {wrapper: MDXLayout} = props.components || ({});
  return MDXLayout ? _jsx(MDXLayout, Object.assign({}, props, {
    children: _jsx(_createMdxContent, {})
  })) : _createMdxContent();
  function _createMdxContent() {
    const _components = Object.assign({
      nav: "nav",
      ol: "ol",
      li: "li",
      a: "a",
      p: "p",
      em: "em",
      code: "code",
      h2: "h2",
      span: "span",
      strong: "strong"
    }, props.components);
    return _jsxs(_Fragment, {
      children: [_jsx(_components.nav, {
        className: "toc",
        children: _jsx(_components.ol, {
          className: "toc-level toc-level-1",
          children: _jsx(_components.li, {
            className: "toc-item toc-item-h2",
            children: _jsx(_components.a, {
              className: "toc-link toc-link-h2",
              href: "#why",
              children: "Why?"
            })
          })
        })
      }), "\n", _jsxs(_components.p, {
        children: ["When creating a software package (or module or bundle, pick your term) for others to reuse, there's often a ", _jsx(_components.em, {
          children: "second"
        }), " package in the package that developers overlook."]
      }), "\n", _jsxs(_components.p, {
        children: ["The second package is the ", _jsx(_components.em, {
          children: "interface"
        }), " package. I.e., the interface that overlays the specific implementation that is your package."]
      }), "\n", _jsxs(_components.p, {
        children: ["As an example, I might provide a codegen package. ", _jsx(_components.code, {
          children: "CodegenFile"
        }), ", ", _jsx(_components.code, {
          children: "CodegenStep"
        }), ", ", _jsx(_components.code, {
          children: "CodegenPipeline"
        }), " and such classes comprise the interface of that package. All the other things are implementation details."]
      }), "\n", _jsx(_components.p, {
        children: "In many cases it would benefit the author of the package to pull the inetrface out into its own separate package."
      }), "\n", _jsxs(_components.h2, {
        id: "why",
        children: [_jsx(_components.a, {
          "aria-hidden": "true",
          tabIndex: "-1",
          href: "#why",
          children: _jsx(_components.span, {
            className: "icon icon-link"
          })
        }), "Why?"]
      }), "\n", _jsxs(_components.ol, {
        children: ["\n", _jsx(_components.li, {
          children: "Moving the interface out lets developers create alternative implementations of the interface."
        }), "\n", _jsx(_components.li, {
          children: "Moving the interface out lets other packages depend on types from the interface without having to depend on the entire implementation package, which could be large"
        }), "\n"]
      }), "\n", _jsx(_components.p, {
        children: "The second point is useful for cases where an extension consumes outputs of a package but doesn't need to actually run that package. Maybe the outputs come from somewhere else over the wire or are read from disk rather than being a direct invocation of the implementation."
      }), "\n", _jsxs(_components.p, {
        children: [_jsx(_components.strong, {
          children: "Note"
        }), " that the interface package ", _jsx(_components.em, {
          children: "does not"
        }), " depend on the implementation package. The implementation package dependson the interface package. This makes sense given that interfaces don't know about their implementations but implementations do know about the interfaces they implement."]
      }), "\n", _jsx("center", {
        children: _jsx(Mermaid, {
          id: "two",
          chart: `graph TD;
  Extension --> Interface;
  Package --> Interface;`
        })
      })]
    });
  }
}
export default MDXContent;
