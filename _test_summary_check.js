var handler = require('./functions/tech-news.js').handler;
handler({ httpMethod: 'GET' }).then(function(res) {
    var data = JSON.parse(res.body);
    console.log('Total items:', data.total);
    console.log('AI enabled:', data.aiEnabled);
    console.log('---');
    var items = data.items || [];
    var cutOff = 0;
    for (var i = 0; i < items.length; i++) {
        var it = items[i];
        var sum = (it.summary || '').trim();
        var lastChar = sum.slice(-1);
        var endsWell = (lastChar === '.' || lastChar === '!' || lastChar === '?' || sum.slice(-3) === '...' || sum.slice(-1) === '\u2026');
        if (!endsWell) { cutOff++; }
        if (i < 15) {
            console.log('#' + (i+1) + ' [' + it.source + '] ' + (it.aiSummarized ? 'AI' : 'EXTRACT'));
            console.log('  Title: ' + (it.title || '').substring(0, 80));
            console.log('  Summary (' + sum.length + ' chars): ' + sum.substring(0, 150));
            console.log('  Last 30: ...' + sum.slice(-30));
            console.log('  Ends OK: ' + endsWell);
            console.log('');
        }
    }
    console.log('=== TOTAL: ' + items.length + ' items, ' + cutOff + ' cut off ===');
});
