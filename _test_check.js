var techHandler = require('./functions/tech-news.js').handler;
var newsHandler = require('./functions/news-summary.js').handler;
var start = Date.now();

Promise.all([
    techHandler({ httpMethod: 'GET' }),
    newsHandler({ httpMethod: 'GET' })
]).then(function(results) {
    var elapsed = Date.now() - start;
    console.log('Total time: ' + elapsed + 'ms\n');
    var labels = ['TECH NEWS', 'NEWS SUMMARY'];
    var totalCut = 0;
    for (var k = 0; k < 2; k++) {
        var data = JSON.parse(results[k].body);
        if (data.error) { console.log(labels[k] + ': ERROR - ' + data.error + '\n'); continue; }
        var items = data.items || [];
        var cutCount = 0;
        var bySource = {};
        for (var i = 0; i < items.length; i++) {
            var s = items[i].source || '?';
            bySource[s] = (bySource[s] || 0) + 1;
        }
        console.log('=== ' + labels[k] + ' === ' + items.length + ' tin');
        var sources = Object.keys(bySource);
        console.log('Nguồn: ' + sources.map(function(s) { return s + '(' + bySource[s] + ')'; }).join(', '));
        console.log('');
        for (var j = 0; j < items.length; j++) {
            var it = items[j];
            var sum = (it.summary || '').trim();
            var last = sum.slice(-1);
            var ok = (last === '.' || last === '!' || last === '?' || sum.slice(-3) === '...');
            if (!ok && sum.length > 0) { cutCount++; }
            console.log('#' + (j+1) + ' [' + (it.source||'?') + '] ' + (it.title||'').substring(0, 75));
            console.log('   sum(' + sum.length + ') ends="' + last + '" ok=' + ok);
            if (!ok && sum.length > 0) { console.log('   >>> BỊ CẮT: ...' + sum.slice(-40)); }
        }
        totalCut += cutCount;
        console.log('\n' + labels[k] + ': ' + items.length + ' tin, ' + cutCount + ' bị cắt\n');
    }
    console.log('=== TỔNG: ' + totalCut + ' tin bị cắt ===');
});
