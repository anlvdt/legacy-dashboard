const https = require('https');
const url = 'https://legacyframe.netlify.app/.netlify/functions/tech-news';
const start = Date.now();
console.log('Calling live Netlify function...');
https.get(url, r => {
    let d = '';
    r.on('data', c => d += c);
    r.on('end', () => {
        const elapsed = ((Date.now() - start) / 1000).toFixed(1);
        try {
            const b = JSON.parse(d);
            console.log(`Status: ${r.statusCode} (${elapsed}s)`);
            console.log('AI enabled:', b.aiEnabled);
            console.log('Total items:', b.total);
            if (b.error) { console.error('Error:', b.error); return; }
            b.items.slice(0, 3).forEach((it, i) => {
                console.log(`\n[${i+1}] ${it.source} | AI: ${it.aiSummarized}`);
                console.log('Title:', it.title);
                console.log('Summary:', it.summary);
            });
        } catch(e) {
            console.error('Parse error:', e.message);
            console.log('Raw:', d.substring(0, 300));
        }
    });
}).on('error', e => console.error('Error:', e.message));
