var handler = require('./functions/tech-news.js').handler;
handler({ httpMethod: 'GET' }).then(function(res) {
    var data = JSON.parse(res.body);
    console.log('Total:', data.total, '| AI:', data.aiEnabled);
    console.log('');
    // Đếm theo nguồn
    var bySource = {};
    var items = data.items || [];
    for (var i = 0; i < items.length; i++) {
        var s = items[i].source;
        if (!bySource[s]) { bySource[s] = 0; }
        bySource[s]++;
    }
    var sources = Object.keys(bySource);
    sources.sort(function(a, b) { return bySource[b] - bySource[a]; });
    for (var j = 0; j < sources.length; j++) {
        console.log('  ' + sources[j] + ': ' + bySource[sources[j]] + ' tin');
    }
    console.log('');
    // Liệt kê tiêu đề
    for (var k = 0; k < items.length; k++) {
        var it = items[k];
        console.log('#' + (k+1) + ' [' + it.source + '] ' + (it.aiSummarized ? 'AI' : 'EX') + ' | ' + (it.title || '').substring(0, 90));
    }
});
