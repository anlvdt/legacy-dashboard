var techHandler = require('./functions/tech-news.js').handler;
var newsHandler = require('./functions/news-summary.js').handler;

Promise.all([
    techHandler({ httpMethod: 'GET' }),
    newsHandler({ httpMethod: 'GET' })
]).then(function(results) {
    for (var k = 0; k < 2; k++) {
        var label = k === 0 ? 'TECH NEWS' : 'NEWS SUMMARY';
        var data = JSON.parse(results[k].body);
        console.log('=== ' + label + ' === (' + (data.total || 0) + ' items)');
        var items = data.items || [];
        for (var i = 0; i < Math.min(items.length, 10); i++) {
            var it = items[i];
            console.log('#' + (i+1) + ' [' + (it.source || '?') + '] ' + (it.title || '').substring(0, 80));
            console.log('   summary: ' + (it.summary || '').substring(0, 100));
        }
        if (items.length > 10) { console.log('   ... +' + (items.length - 10) + ' more'); }
        console.log('');
    }
});
