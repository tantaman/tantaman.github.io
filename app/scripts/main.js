require.config({
	paths: {
		jquery: "vendor/jquery",
		nms: "../node_modules"
	}
});

require(["compiled/app","jquery"],function(app,$) {
	log(app);
	return log($);
});
