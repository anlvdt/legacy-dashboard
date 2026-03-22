var techHandler = require('./functions/tech-news.js').handler;
var newsHandler = require('./functions/news-summary.js').handler;

Promise.all([
    techHandler({ httpMethod: 'GET' }),
    newsHandler({ httpMethod: 'GET' })
]).then(function(results) {
    for (var k = 0; k < results.length; k++) {
        var label = k === 0 ? 'TECH NEWS' : 'NEWS SUMMARY';
        var data = JSON.parse(results[k].body);
        console.log('=== ' + label + ' ===');
        if (data.error) { console.log('ERROR:', data.error); continue; }
        console.log('Total: ' + data.total + ' | AI: ' + data.aiEnabled);
        var items = data.items || [];
        for (var i = 0; i < Math.min(items.length, 10); i++) {
            var it = items[i];
            var sum = (it.summary || '').trim();
            var ok = sum.slice(-1) === '.' || sum.slice(-1) === '!' || sum.slice(-1) === '?';
            console.log('#' + (i+1) + ' [' + (it.source || '?') + '] ' + (it.title || '').substring(0, 70));
            console.log('   sum(' + sum.length + '): ' + sum.substring(0, 100) + (sum.length > 100 ? '...' : ''));
            console.log('   ends OK: ' + ok);
        }
        console.log('');
    }
});
