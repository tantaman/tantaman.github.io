(define (fn ()
	(defn isContent (attrs)
		(or (= (typeof attrs) "string") (instanceof attrs Array)))
	(defn normalizeAttrs (content attrs)
		(if (= attrs undefined) {} attrs))
	(defn normalizeContent (content)
		(if (instanceof content Array) (.join content "") content))
	(defn attrString (attrs)
		(.join (map (fn (v k) (+ k "=\"" v "\"")) attrs) " "))

	(defn createElemFn (type)
		(fn (content attrs)
			(! attrs (normalizeAttrs content attrs))
			(! content (normalizeContent content))
			(+ "<" type (attrString attrs) ">" content "</" type ">")
	))

	(def api {
		collect: (fn () (.join (Array.prototype.slice.call arguments 0) ""))
	})

	(foreach ["div" "li" "ul" "ol" "p" "span" "article" "section" "i" "b" "strong"
				"a" "buton" "input" "textarea" "select" "option" "h1" "h2" "h3"
				"h4"]
		(fn (elem) (! api elem (createElemFn elem))))

	api
))