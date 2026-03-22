var path = require("path");
var config = require("./config");

async function callFunc(name) {
    var fp = path.resolve(__dirname, "..", "functions", name + ".js");
    var fn = require(fp);
    var ev = { queryStringParameters: {} };
    var res = await fn.handler(ev, {});
    if (res.statusCode !== 200) throw new Error(name + ": " + res.statusCode);
    return JSON.parse(res.body);
}

async function fetchAllNews() {
    console.log("[fetch] Gọi trực tiếp function handler...");
    var r = await Promise.allSettled([callFunc("tech-news"), callFunc("news-summary")]);
    var items = [];
    if (r[0].status === "fulfilled") {
        var d = r[0].value;
        var arr = d.items || d || [];
        if (Array.isArray(arr)) {
            arr.slice(0, config.MAX_TECH_NEWS).forEach(function(it) {
                items.push({ title: it.title||"", summary: it.summary||it.desc||"", source: it.source||"Tech", type: "tech" });
            });
        }
    } else { console.log("[fetch] tech lỗi:", r[0].reason && r[0].reason.message); }
    if (r[1].status === "fulfilled") {
        var d2 = r[1].value;
        var arr2 = d2.items || d2 || [];
        if (Array.isArray(arr2)) {
            arr2.slice(0, config.MAX_GEN_NEWS).forEach(function(it) {
                items.push({ title: it.title||"", summary: it.summary||it.desc||"", source: it.source||"News", type: "general" });
            });
        }
    } else { console.log("[fetch] news lỗi:", r[1].reason && r[1].reason.message); }
    console.log("[fetch] Lấy được " + items.length + " tin");
    return items;
}

module.exports = fetchAllNews;
