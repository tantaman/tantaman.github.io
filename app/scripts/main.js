require.config({paths:{jquery:"vendor/jquery"}});

require(["compiled/app","jquery"],function(app,$) {
	log(app);
	return log($);
});
