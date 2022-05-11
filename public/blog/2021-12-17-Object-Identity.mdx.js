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
      h1: "h1",
      span: "span",
      blockquote: "blockquote",
      ul: "ul",
      strong: "strong",
      pre: "pre",
      code: "code"
    }, props.components);
    return _jsxs(_Fragment, {
      children: [_jsx(_components.nav, {
        className: "toc",
        children: _jsxs(_components.ol, {
          className: "toc-level toc-level-1",
          children: [_jsx(_components.li, {
            className: "toc-item toc-item-h1",
            children: _jsx(_components.a, {
              className: "toc-link toc-link-h1",
              href: "#identity",
              children: "Identity"
            })
          }), _jsx(_components.li, {
            className: "toc-item toc-item-h1",
            children: _jsx(_components.a, {
              className: "toc-link toc-link-h1",
              href: "#multiple-forms-of-identity",
              children: "Multiple Forms of Identity"
            })
          }), _jsx(_components.li, {
            className: "toc-item toc-item-h1",
            children: _jsx(_components.a, {
              className: "toc-link toc-link-h1",
              href: "#reference-equality",
              children: "Reference Equality"
            })
          }), _jsx(_components.li, {
            className: "toc-item toc-item-h1",
            children: _jsx(_components.a, {
              className: "toc-link toc-link-h1",
              href: "#too-far",
              children: "Too Far?"
            })
          }), _jsx(_components.li, {
            className: "toc-item toc-item-h1",
            children: _jsx(_components.a, {
              className: "toc-link toc-link-h1",
              href: "#note",
              children: "Note"
            })
          }), _jsx(_components.li, {
            className: "toc-item toc-item-h1",
            children: _jsx(_components.a, {
              className: "toc-link toc-link-h1",
              href: "#what-do",
              children: "What Do?"
            })
          })]
        })
      }), "\n", _jsx(_components.p, {
        children: "In programming we're met with things that are completely new. Even though they're new, they're familiar enough to grasp with existing concepts. This converting the new to something familiar helps us to understand things at one level but if the familiar does not perfectly match the new then it causes us to fail to understand at another level."
      }), "\n", _jsx(_components.p, {
        children: "When the familiar doesn't match the new, we're blinded by a belief that we understand the nature of what we're working with. The familiar hides the new."
      }), "\n", _jsx(_components.p, {
        children: "Reference equality being equated with identity is one of these things."
      }), "\n", _jsx(_components.p, {
        children: "Reference equality appears to mean identity. If two objects are equal by reference, they're the same object."
      }), "\n", _jsx(_components.p, {
        children: "But first, what is identity?"
      }), "\n", _jsxs(_components.h1, {
        id: "identity",
        children: [_jsx(_components.a, {
          "aria-hidden": "true",
          tabIndex: "-1",
          href: "#identity",
          children: _jsx(_components.span, {
            className: "icon icon-link"
          })
        }), "Identity"]
      }), "\n", _jsx(Figure, {
        url: "/blog-assets/identity-software/shipoftheseus.jpg",
        description: "Ship of Theseus"
      }), "\n", _jsxs(_components.p, {
        children: ["The problem of identity has been with us since at least 500 B.C. where it was discussed in the thought experiement the ", _jsx(_components.a, {
          href: "https://en.wikipedia.org/wiki/Ship_of_Theseus",
          children: "Ship of Theseus"
        }), "."]
      }), "\n", _jsx(_components.p, {
        children: "It is argued that if, over time, a ship has every single component replaced then it is eventually no longer the same ship. Although we still call the ship by the same name."
      }), "\n", _jsx(_components.p, {
        children: "This same sentiment is echoed when people say you can't step into the same river twice. The river is always changing (banks eroding, new water added, old water dumped out) and thus not the \"same\" from one instant to the next."
      }), "\n", _jsxs(_components.blockquote, {
        children: ["\n", _jsx(_components.p, {
          children: "No man ever steps in the same river twice, for it's not the same river and he's not the same man. - Heraclitus"
        }), "\n"]
      }), "\n", _jsx(_components.p, {
        children: "The misunderstanding that leads to these paradoxes is an equivocation on the term \"identity.\""
      }), "\n", _jsxs(_components.h1, {
        id: "multiple-forms-of-identity",
        children: [_jsx(_components.a, {
          "aria-hidden": "true",
          tabIndex: "-1",
          href: "#multiple-forms-of-identity",
          children: _jsx(_components.span, {
            className: "icon icon-link"
          })
        }), "Multiple Forms of Identity"]
      }), "\n", _jsx(_components.p, {
        children: "In everyday life there are two forms of identity."
      }), "\n", _jsxs(_components.ul, {
        children: ["\n", _jsx(_components.li, {
          children: "Identity by name or \"nominal identity.\""
        }), "\n", _jsx(_components.li, {
          children: "Phyiscal identity."
        }), "\n"]
      }), "\n", _jsxs(_components.p, {
        children: [_jsx(_components.strong, {
          children: "Nomnial identity"
        }), " - the Amazon river has the same nominal identity over its lifetime. What I call the Amazon today you recognize as indicating the same Amazon that was referred to when you learned about it in school. What holds nominal identity together is a causal chain of events rather than physical makeup."]
      }), "\n", _jsxs(_components.p, {
        children: [_jsx(_components.strong, {
          children: "Physical identity"
        }), ", however, changes at every instant as it represents the exact physical composition of something."]
      }), "\n", _jsxs(_components.h1, {
        id: "reference-equality",
        children: [_jsx(_components.a, {
          "aria-hidden": "true",
          tabIndex: "-1",
          href: "#reference-equality",
          children: _jsx(_components.span, {
            className: "icon icon-link"
          })
        }), "Reference Equality"]
      }), "\n", _jsx(_components.p, {
        children: "So is reference quality nominal or physical identity or neither?"
      }), "\n", _jsx(_components.p, {
        children: "Reference equality looks a lot like nominal identity. A reference points to something as does a name. If the thing pointed to changes over time, the reference still holds just like nominal identity."
      }), "\n", _jsx(Figure, {
        url: "/blog-assets/identity-software/reference.png",
        description: "Reference Equality Providing Nominal Identity"
      }), "\n", _jsx(_components.p, {
        children: "Reference equality being the same as nominal identity breaks down as soon as you intorduce immutability. Once an object is immutable, there's no longer a way to capture the nominal identity of that object via a reference. This is the case since every time you change the object you must create a new one so the reference is always new. Immutable objects are thus left with only having a physical, and no nominal, identity."
      }), "\n", _jsx(Figure, {
        url: "/blog-assets/identity-software/immutable.png",
        description: "Reference Equality Losing Nominal Identity"
      }), "\n", _jsx(_components.p, {
        children: "A program with immutable objects can't express a stable concept over time, only discrete physical states."
      }), "\n", _jsxs(_components.h1, {
        id: "too-far",
        children: [_jsx(_components.a, {
          "aria-hidden": "true",
          tabIndex: "-1",
          href: "#too-far",
          children: _jsx(_components.span, {
            className: "icon icon-link"
          })
        }), "Too Far?"]
      }), "\n", _jsx(_components.p, {
        children: "You may be thinking that I'm going too far here. That nomnial identity can still be expressed through variable names.\nE.g.,"
      }), "\n", _jsx(_components.pre, {
        children: _jsxs(_components.code, {
          className: "hljs language-typescript",
          children: [_jsx(_components.span, {
            className: "hljs-keyword",
            children: "const"
          }), " ", _jsx(_components.span, {
            className: "hljs-title class_",
            children: "Amazon"
          }), " = ", _jsx(_components.span, {
            className: "hljs-keyword",
            children: "new"
          }), " ", _jsx(_components.span, {
            className: "hljs-title class_",
            children: "River"
          }), "({ ", _jsx(_components.span, {
            className: "hljs-attr",
            children: "length"
          }), ": x, ", _jsx(_components.span, {
            className: "hljs-attr",
            children: "avg_depth"
          }), ": y, ", _jsx(_components.span, {
            className: "hljs-attr",
            children: "age"
          }), ": z });\n"]
        })
      }), "\n", _jsx(_components.p, {
        children: "of course, you'd need a way to re-bind Amazon."
      }), "\n", _jsx(_components.p, {
        children: "So:"
      }), "\n", _jsx(_components.pre, {
        children: _jsxs(_components.code, {
          className: "hljs language-typescript",
          children: ["mutable ", _jsx(_components.span, {
            className: "hljs-title class_",
            children: "Amazon"
          }), " = ", _jsx(_components.span, {
            className: "hljs-keyword",
            children: "new"
          }), " ", _jsx(_components.span, {
            className: "hljs-title function_",
            children: "mutable"
          }), "();\n", _jsx(_components.span, {
            className: "hljs-title class_",
            children: "Amazon"
          }), ".", _jsx(_components.span, {
            className: "hljs-property",
            children: "current"
          }), " = ", _jsx(_components.span, {
            className: "hljs-keyword",
            children: "new"
          }), " ", _jsx(_components.span, {
            className: "hljs-title class_",
            children: "River"
          }), "({", _jsx(_components.span, {
            className: "hljs-attr",
            children: "length"
          }), ": x, ", _jsx(_components.span, {
            className: "hljs-attr",
            children: "avg_depth"
          }), ": y, ", _jsx(_components.span, {
            className: "hljs-attr",
            children: "age"
          }), ": z});\n", _jsx(_components.span, {
            className: "hljs-title class_",
            children: "Amazon"
          }), ".", _jsx(_components.span, {
            className: "hljs-property",
            children: "current"
          }), " = ", _jsx(_components.span, {
            className: "hljs-keyword",
            children: "new"
          }), " ", _jsx(_components.span, {
            className: "hljs-title class_",
            children: "River"
          }), "({", _jsx(_components.span, {
            className: "hljs-attr",
            children: "length"
          }), ": dx, ", _jsx(_components.span, {
            className: "hljs-attr",
            children: "avg_depth"
          }), ": dy, ", _jsx(_components.span, {
            className: "hljs-attr",
            children: "age"
          }), ": z+", _jsx(_components.span, {
            className: "hljs-number",
            children: "1"
          }), "});\n"]
        })
      }), "\n", _jsxs(_components.p, {
        children: ["and our nominal identity is encoded in ", _jsx(_components.code, {
          children: "mutable Amazon"
        }), " (essentially re-creating the concept of a reference in user space)."]
      }), "\n", _jsx(_components.p, {
        children: "A more likely case when dealing with immutable structures would be something like the following:"
      }), "\n", _jsx(_components.pre, {
        children: _jsxs(_components.code, {
          className: "hljs language-typescript",
          children: [_jsx(_components.span, {
            className: "hljs-keyword",
            children: "let"
          }), " appState = {\n  ", _jsx(_components.span, {
            className: "hljs-title class_",
            children: "Amazon"
          }), ": {\n    ", _jsx(_components.span, {
            className: "hljs-attr",
            children: "inhabitants"
          }), ": [\n      {\n        ", _jsx(_components.span, {
            className: "hljs-attr",
            children: "fish"
          }), ": [\n          {\n            ", _jsx(_components.span, {
            className: "hljs-attr",
            children: "type"
          }), ": ", _jsx(_components.span, {
            className: "hljs-string",
            children: "'piranha'"
          }), ",\n            ", _jsx(_components.span, {
            className: "hljs-attr",
            children: "content"
          }), ": ", _jsx(_components.span, {
            className: "hljs-string",
            children: "'🐟'"
          }), ",\n          },\n        ],\n      },\n    ],\n  },\n};\n"]
        })
      }), "\n", _jsxs(_components.p, {
        children: ["Where ", _jsx(_components.code, {
          children: "appState"
        }), " can be re-bound but everything inside it is immutable. In such a world (which is common in React apps) the \"nominal\" identity of ", _jsx(_components.code, {
          children: "Amazon"
        }), ", ", _jsx(_components.code, {
          children: "inhabitants"
        }), ", and ", _jsx(_components.code, {
          children: "fish"
        }), " cannot be ascertained. On every update, we have a new ", _jsx(_components.code, {
          children: "Amazon"
        }), ", new ", _jsx(_components.code, {
          children: "inhaibtants"
        }), ", new ", _jsx(_components.code, {
          children: "fish"
        }), " and so on. If a part of the program saved off a ", _jsx(_components.code, {
          children: "fish"
        }), ", that part has no way of knowing if the saved ", _jsx(_components.code, {
          children: "fish"
        }), " is nominally the same as the ", _jsx(_components.code, {
          children: "fish"
        }), " being received on the next update."]
      }), "\n", _jsxs(_components.h1, {
        id: "note",
        children: [_jsx(_components.a, {
          "aria-hidden": "true",
          tabIndex: "-1",
          href: "#note",
          children: _jsx(_components.span, {
            className: "icon icon-link"
          })
        }), "Note"]
      }), "\n", _jsx(_components.p, {
        children: "I'm not advocating abandoning immutable data types. I'd never do that. They're far too important and easy to reason about. Just pointing out where we've drawn a false analogy between reference equality and identity."
      }), "\n", _jsxs(_components.ol, {
        children: ["\n", _jsx(_components.li, {
          children: "That for mutable types, reference equality is nominal identity."
        }), "\n", _jsx(_components.li, {
          children: "That for immutable types, reference equality is a partial physical identity. I.e., if two immutable things are equal by reference they're guaranteed to be physically identical but two physically identitcal things are not guaranteed to be equal by reference."
        }), "\n"]
      }), "\n", _jsx(_components.p, {
        children: "That we do not have a concept of nominal identity in software that is always guaranteed to hold."
      }), "\n", _jsx(_components.p, {
        children: "Nor do we have a concept of physical identity in software that is always guaranteed to hold. More on this in a separate post."
      }), "\n", _jsxs(_components.h1, {
        id: "what-do",
        children: [_jsx(_components.a, {
          "aria-hidden": "true",
          tabIndex: "-1",
          href: "#what-do",
          children: _jsx(_components.span, {
            className: "icon icon-link"
          })
        }), "What Do?"]
      }), "\n", _jsx(_components.p, {
        children: "Intersetingly enough, we've solved this in the relational database world. IDs are our nomnial identities there. The thing behind the ID is almost always mutable with prior versions or records of it being stored separately. If the thing behind the ID always got a new ID on every update, well that'd make retrieving any information you've stored in the past exceedingly difficult for you in the future. That or require you to always pass a timestamp along with what you'd like to retrieve -- assuming time is the only variable that partitions the space of mutation."
      })]
    });
  }
}
export default MDXContent;
