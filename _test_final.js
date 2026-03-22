var techHandler = require('./functions/tech-news.js').handler;
var newsHandler = require('./functions/news-summary.js').handler;
var start = Date.now();

Promise.all([
    techHandler({ httpMethod: 'GET' }),
    newsHandler({ httpMethod: 'GET' })
]).then(function(results) {
    var elapsed = Date.now() - start;
    console.log('Total time: ' + elapsed + 'ms\n');
    for (var k = 0; k < 2; k++) {
        var label = k === 0 ? 'TECH NEWS' : 'NEWS SUMMARY';
        var data = JSON.parse(results[k].body);
        if (data.error) { console.log(label + ': ERROR - ' + data.error); continue; }
        console.log('=== ' + label + ' === (' + data.total + ' items)');
        var items = data.items || [];
        // Count by source
        var bySource = {};
        for (var i = 0; i < items.length; i++) {
            var s = items[i].source || '?';
            bySource[s] = (bySource[s] || 0) + 1;
        }
        var sources = Object.keys(bySource);
        console.log('Sources: ' + sources.map(function(s) { return s + '(' + bySource[s] + ')'; }).join(', '));
        // Show first 5
        for (var j = 0; j < Math.min(5, items.length); j++) {
            var it = items[j];
            var sumLen = (it.summary || '').length;
            console.log('#' + (j+1) + ' [' + (it.source||'?') + '] ' + (it.title||'').substring(0, 70));
            console.log('   summary(' + sumLen + '): ' + (it.summary||'').substring(0, 80));
        }
        console.log('');
    }
});
