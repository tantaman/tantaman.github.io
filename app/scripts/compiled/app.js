(function() {return define(["./html"],function(h) {
"here we are";
var data = {title:"'Allo, 'Allo!",msg:"You now have",components:["HTML5 Boilerplate","jQuery","RequireJS","Mocha-Script Runtime","Mocha-Script Compiler","Bacon.js"]};
return ($("#welcome")).html(h.collect(h.h1(data.title),h.p(data.msg),h.ul(map(h.li,data.components))));
});
})();