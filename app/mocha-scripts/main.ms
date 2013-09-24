(require.config {paths: {
	jquery: "../vendor/jquery"
}})

(require ["app" "jquery"] (fn (app $)
	(log app)
	(log $)
))