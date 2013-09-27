(define ["com.tantaman.util.overload"]
(fn (overload)
	(obj
		(div (overload ; create a macro for what will be these redundant overloads
			[Object [Array String]] (fn (attrs content))
			[Object] (fn (attrs)
				(.div this attrs null))
			[[Array String]] (fn (content))
				(.div this null content))
		)
	)
))