(function() {require.config({paths:{jquery:"../vendor/jquery"}});
return require(["app","jquery"],function(app,$) {
log(app);
return log($);
});
})();