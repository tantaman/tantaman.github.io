/*@jsxRuntime automatic @jsxImportSource https://esm.sh/react*/
import {Fragment as _Fragment, jsx as _jsx, jsxs as _jsxs} from "https://esm.sh/react/jsx-runtime";
import Figure from '/dist/components/Figure.js';
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
      h2: "h2",
      span: "span",
      blockquote: "blockquote",
      strong: "strong",
      h3: "h3"
    }, props.components);
    return _jsxs(_Fragment, {
      children: [_jsx(_components.nav, {
        className: "toc",
        children: _jsxs(_components.ol, {
          className: "toc-level toc-level-1",
          children: [_jsxs(_components.li, {
            className: "toc-item toc-item-h2",
            children: [_jsx(_components.a, {
              className: "toc-link toc-link-h2",
              href: "#vision-1",
              children: "Vision 1"
            }), _jsxs(_components.ol, {
              className: "toc-level toc-level-2",
              children: [_jsx(_components.li, {
                className: "toc-item toc-item-h3",
                children: _jsx(_components.a, {
                  className: "toc-link toc-link-h3",
                  href: "#strategy",
                  children: "Strategy"
                })
              }), _jsx(_components.li, {
                className: "toc-item toc-item-h3",
                children: _jsx(_components.a, {
                  className: "toc-link toc-link-h3",
                  href: "#why-two-prongs",
                  children: "Why two prongs?"
                })
              })]
            })]
          }), _jsxs(_components.li, {
            className: "toc-item toc-item-h2",
            children: [_jsx(_components.a, {
              className: "toc-link toc-link-h2",
              href: "#vision-2",
              children: "Vision 2"
            }), _jsxs(_components.ol, {
              className: "toc-level toc-level-2",
              children: [_jsx(_components.li, {
                className: "toc-item toc-item-h3",
                children: _jsx(_components.a, {
                  className: "toc-link toc-link-h3",
                  href: "#why",
                  children: "Why?"
                })
              }), _jsx(_components.li, {
                className: "toc-item toc-item-h3",
                children: _jsx(_components.a, {
                  className: "toc-link toc-link-h3",
                  href: "#strategy-1",
                  children: "Strategy"
                })
              })]
            })]
          }), _jsxs(_components.li, {
            className: "toc-item toc-item-h2",
            children: [_jsx(_components.a, {
              className: "toc-link toc-link-h2",
              href: "#vision-3",
              children: "Vision 3"
            }), _jsxs(_components.ol, {
              className: "toc-level toc-level-2",
              children: [_jsx(_components.li, {
                className: "toc-item toc-item-h3",
                children: _jsx(_components.a, {
                  className: "toc-link toc-link-h3",
                  href: "#why-1",
                  children: "Why?"
                })
              }), _jsx(_components.li, {
                className: "toc-item toc-item-h3",
                children: _jsx(_components.a, {
                  className: "toc-link toc-link-h3",
                  href: "#strategy-2",
                  children: "Strategy"
                })
              })]
            })]
          }), _jsx(_components.li, {
            className: "toc-item toc-item-h2",
            children: _jsx(_components.a, {
              className: "toc-link toc-link-h2",
              href: "#vision-4",
              children: "Vision 4"
            })
          })]
        })
      }), "\n", _jsx(_components.p, {
        children: "After ~8 years working at Meta and ~15 years professionally programming post college, I'm departing the workforce to puruse my own ideas full time."
      }), "\n", _jsxs(_components.h2, {
        id: "vision-1",
        children: [_jsx(_components.a, {
          "aria-hidden": "true",
          tabIndex: "-1",
          href: "#vision-1",
          children: _jsx(_components.span, {
            className: "icon icon-link"
          })
        }), "Vision 1"]
      }), "\n", _jsxs(_components.blockquote, {
        children: ["\n", _jsx(_components.p, {
          children: _jsx(_components.strong, {
            children: "Create software to help people think more deeply."
          })
        }), "\n"]
      }), "\n", _jsxs(_components.h3, {
        id: "strategy",
        children: [_jsx(_components.a, {
          "aria-hidden": "true",
          tabIndex: "-1",
          href: "#strategy",
          children: _jsx(_components.span, {
            className: "icon icon-link"
          })
        }), "Strategy"]
      }), "\n", _jsx(_components.p, {
        children: "Two prongs:"
      }), "\n", _jsxs(_components.ol, {
        children: ["\n", _jsx(_components.li, {
          children: "Develop note taking applications to allow individuals to capture, structure and develop their thoughts. Notes are not strictly text."
        }), "\n", _jsx(_components.li, {
          children: "Uplevel programming languages by extricating them from incidental details."
        }), "\n"]
      }), "\n", _jsxs(_components.h3, {
        id: "why-two-prongs",
        children: [_jsx(_components.a, {
          "aria-hidden": "true",
          tabIndex: "-1",
          href: "#why-two-prongs",
          children: _jsx(_components.span, {
            className: "icon icon-link"
          })
        }), "Why two prongs?"]
      }), "\n", _jsx(_components.p, {
        children: "To converge organic knowledge capture with formal methods of encoding throught processes."
      }), "\n", _jsx(Figure, {
        url: "/blog-assets/vision/converge.png"
      }), "\n", _jsxs(_components.h2, {
        id: "vision-2",
        children: [_jsx(_components.a, {
          "aria-hidden": "true",
          tabIndex: "-1",
          href: "#vision-2",
          children: _jsx(_components.span, {
            className: "icon icon-link"
          })
        }), "Vision 2"]
      }), "\n", _jsxs(_components.blockquote, {
        children: ["\n", _jsx(_components.p, {
          children: _jsx(_components.strong, {
            children: "Make p2p & e2ee software as simple to develop as traditional client/server software."
          })
        }), "\n"]
      }), "\n", _jsxs(_components.h3, {
        id: "why",
        children: [_jsx(_components.a, {
          "aria-hidden": "true",
          tabIndex: "-1",
          href: "#why",
          children: _jsx(_components.span, {
            className: "icon icon-link"
          })
        }), "Why?"]
      }), "\n", _jsx(_components.p, {
        children: "Dissolve central power and control to:"
      }), "\n", _jsxs(_components.ol, {
        children: ["\n", _jsx(_components.li, {
          children: "Make the web censorship proof"
        }), "\n", _jsx(_components.li, {
          children: "Destroy winner take all markets"
        }), "\n", _jsx(_components.li, {
          children: "Elevate pay by increasing competition in every digital market"
        }), "\n", _jsx(_components.li, {
          children: "Eliminate central gate-keepers"
        }), "\n"]
      }), "\n", _jsxs(_components.h3, {
        id: "strategy-1",
        children: [_jsx(_components.a, {
          "aria-hidden": "true",
          tabIndex: "-1",
          href: "#strategy-1",
          children: _jsx(_components.span, {
            className: "icon icon-link"
          })
        }), "Strategy"]
      }), "\n", _jsxs(_components.p, {
        children: ["Develop ", _jsx(_components.a, {
          href: "https://github.com/tantaman/aphrodite",
          children: "Aphrodite"
        }), " with p2p, e2ee, p2p privacy (e.g., privacy respecting p2p replication of data), data consitency capabilities."]
      }), "\n", _jsxs(_components.h2, {
        id: "vision-3",
        children: [_jsx(_components.a, {
          "aria-hidden": "true",
          tabIndex: "-1",
          href: "#vision-3",
          children: _jsx(_components.span, {
            className: "icon icon-link"
          })
        }), "Vision 3"]
      }), "\n", _jsxs(_components.blockquote, {
        children: ["\n", _jsx(_components.p, {
          children: _jsx(_components.strong, {
            children: "Software developed for the Government (by or for) is public software and thus should be open source."
          })
        }), "\n"]
      }), "\n", _jsxs(_components.h3, {
        id: "why-1",
        children: [_jsx(_components.a, {
          "aria-hidden": "true",
          tabIndex: "-1",
          href: "#why-1",
          children: _jsx(_components.span, {
            className: "icon icon-link"
          })
        }), "Why?"]
      }), "\n", _jsx(_components.p, {
        children: "Cost reduction. Maintenance. More transparent governance."
      }), "\n", _jsxs(_components.h3, {
        id: "strategy-2",
        children: [_jsx(_components.a, {
          "aria-hidden": "true",
          tabIndex: "-1",
          href: "#strategy-2",
          children: _jsx(_components.span, {
            className: "icon icon-link"
          })
        }), "Strategy"]
      }), "\n", _jsx(_components.p, {
        children: "Lead by example. Acquire contracts and develop the solutions as open source software."
      }), "\n", _jsxs(_components.h2, {
        id: "vision-4",
        children: [_jsx(_components.a, {
          "aria-hidden": "true",
          tabIndex: "-1",
          href: "#vision-4",
          children: _jsx(_components.span, {
            className: "icon icon-link"
          })
        }), "Vision 4"]
      }), "\n", _jsxs(_components.blockquote, {
        children: ["\n", _jsx(_components.p, {
          children: _jsx(_components.strong, {
            children: "Buy an island and start my own nation."
          })
        }), "\n"]
      })]
    });
  }
}
export default MDXContent;
