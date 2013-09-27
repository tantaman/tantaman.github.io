(define ["./html"] (fn (h)
	"here we are"

	(def data {
		title: "'Allo, 'Allo!"
		msg: "You now have"
		components: [
			"HTML5 Boilerplate"
			"jQuery"
			"RequireJS"
			"Mocha-Script Runtime"
			"Mocha-Script Compiler"
			"Bacon.js"
		]
	})

	(.html ($ "#welcome")
		(h.collect
			(h.h1 data.title)
			(h.p data.msg)
			(h.ul (map h.li data.components))))
))