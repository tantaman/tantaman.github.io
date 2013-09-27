(function() {return define(function() {
var isContent = function(attrs) {
return or(((typeof attrs)==="string"),(attrs instanceof Array));
};
var normalizeAttrs = function(content,attrs) {
return ((attrs===undefined) ? {} : attrs)
;
};
var normalizeContent = function(content) {
return ((content instanceof Array) ? (content).join("") : content)
;
};
var attrString = function(attrs) {
return (map(function(v,k) {
return plus.call(null, k,"=\"",v,"\"");
},attrs)).join(" ");
};
var createElemFn = function(type) {
return function(content,attrs) {
(attrs = normalizeAttrs(content,attrs));
(content = normalizeContent(content));
return plus.call(null, "<",type,attrString(attrs),">",content,"</",type,">");
};
};
var api = {collect:function() {
return (Array.prototype.slice.call(arguments,0)).join("");
}};
foreach(["div","li","ul","ol","p","span","article","section","i","b","strong","a","buton","input","textarea","select","option","h1","h2","h3","h4"],function(elem) {
return ((api)[elem] = createElemFn(elem));
});
return api;
});
})();