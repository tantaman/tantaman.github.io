/*@jsxRuntime automatic @jsxImportSource https://esm.sh/react*/
import {Fragment as _Fragment, jsx as _jsx, jsxs as _jsxs} from "https://esm.sh/react/jsx-runtime";
import Figure from '/dist/components/Figure.js';
function _createMdxContent(props) {
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
    h3: "h3",
    em: "em"
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
          }), _jsx(_components.ol, {
            className: "toc-level toc-level-2",
            children: _jsx(_components.li, {
              className: "toc-item toc-item-h3",
              children: _jsx(_components.a, {
                className: "toc-link toc-link-h3",
                href: "#strategy-1",
                children: "Strategy"
              })
            })
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
                href: "#why",
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
        }), _jsxs(_components.li, {
          className: "toc-item toc-item-h2",
          children: [_jsx(_components.a, {
            className: "toc-link toc-link-h2",
            href: "#vision-4",
            children: "Vision 4"
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
                href: "#strategy-3",
                children: "Strategy"
              })
            })]
          })]
        }), _jsx(_components.li, {
          className: "toc-item toc-item-h2",
          children: _jsx(_components.a, {
            className: "toc-link toc-link-h2",
            href: "#vision-5",
            children: "Vision 5"
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
    }), "\n", _jsxs(_components.blockquote, {
      children: ["\n", _jsx(_components.p, {
        children: "Creating assisted memory thru contextualized storage and retrieval"
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
      children: "To do this we need to assit in recall. Recall has a flipside though, which is the encoding of ideas as they are encountered. If the idea is not encoded well it will be difficult to recall."
    }), "\n", _jsx(_components.p, {
      children: "How might we enable rich encoding of ideas that people have to aid in recall of those ideas later."
    }), "\n", _jsx(_components.p, {
      children: "Recall is also often done within a frame of mind. E.g., I am looking to recall facts to support X or to contradict Y."
    }), "\n", _jsx(_components.p, {
      children: "How migh we capture the user's frame of mind when they're looking to recall information?"
    }), "\n", _jsxs(_components.p, {
      children: ["Frame of mind can create bias (e.g., confirmation bias) -- how might we recall information that ", _jsx(_components.em, {
        children: "might not be quite what the user wants"
      }), " but is what is relevant?"]
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
          children: "Docs as the application development platform"
        })
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
    }), "\n", _jsxs(_components.blockquote, {
      children: ["\n", _jsxs(_components.p, {
        children: ["It will be interesting, however, to see the days where we're developing entirely within documents and interlinking dozens or hundreds of docs via their exports. Where the prose is the first class citizen and the code the second. The confluence of ", _jsx(_components.a, {
          href: "https://www.notion.so/",
          children: "Notion"
        }), "/", _jsx(_components.a, {
          href: "https://observablehq.com/",
          children: "ObservableHQ"
        }), "/", _jsx(_components.a, {
          href: "https://jupyter.org/",
          children: "Jupyter"
        }), "/", _jsx(_components.a, {
          href: "https://quarto.org/",
          children: "Quarto"
        }), "/", _jsx(_components.a, {
          href: "https://mdxjs.com/",
          children: "MDX"
        }), "/", _jsx(_components.a, {
          href: "https://www.craft.do/",
          children: "CraftDocs"
        }), "/", _jsx(_components.a, {
          href: "https://coda.io/",
          children: "Coda"
        }), "/", _jsx(_components.a, {
          href: "https://obsidian.md/",
          children: "Obsidian"
        }), "/", _jsx(_components.a, {
          href: "https://www.airtable.com/",
          children: "Airtable"
        }), " like features being brought together into a single authoring and coding platform."]
      }), "\n", _jsxs("span", {
        children: ["-- ", _jsx(_components.a, {
          className: "internal new",
          href: "/2022-05-12-simple-mdx",
          children: "2022-05-12-simple-mdx"
        })]
      }), "\n"]
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
      id: "strategy-2",
      children: [_jsx(_components.a, {
        "aria-hidden": "true",
        tabIndex: "-1",
        href: "#strategy-2",
        children: _jsx(_components.span, {
          className: "icon icon-link"
        })
      }), "Strategy"]
    }), "\n", _jsxs(_components.p, {
      children: ["Develop ", _jsx(_components.a, {
        href: "https://github.com/tantaman/aphrodite",
        children: "Aphrodite"
      }), " with p2p, e2ee, p2p privacy (e.g., privacy respecting p2p replication of data), data consitency capabilities."]
    }), "\n", _jsxs(_components.p, {
      children: ["In lay terms, the relational model underpins the vast majority of application development. Enable the relational model to be leveraged in P2P development. A relevant paper: ", _jsx(_components.a, {
        href: "https://hal.inria.fr/hal-02983557/document",
        children: "https://hal.inria.fr/hal-02983557/document"
      })]
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
      id: "strategy-3",
      children: [_jsx(_components.a, {
        "aria-hidden": "true",
        tabIndex: "-1",
        href: "#strategy-3",
        children: _jsx(_components.span, {
          className: "icon icon-link"
        })
      }), "Strategy"]
    }), "\n", _jsx(_components.p, {
      children: "Lead by example. Acquire contracts and develop the solutions as open source software."
    }), "\n", _jsxs(_components.h2, {
      id: "vision-5",
      children: [_jsx(_components.a, {
        "aria-hidden": "true",
        tabIndex: "-1",
        href: "#vision-5",
        children: _jsx(_components.span, {
          className: "icon icon-link"
        })
      }), "Vision 5"]
    }), "\n", _jsxs(_components.blockquote, {
      children: ["\n", _jsx(_components.p, {
        children: _jsx(_components.strong, {
          children: "Buy an island and start my own nation."
        })
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
