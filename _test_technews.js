process.env.CF_ACCOUNT_ID = '44dd825850a343a88635373c2cdef698';
process.env.CF_AI_TOKEN   = 'cfut_pYU8uMS2Zf06yljFRJYNqhN2anyjw4D8TOuudxU8264a11c5';

// clear require cache để load lại file mới
delete require.cache[require.resolve('./functions/tech-news')];
const fn = require('./functions/tech-news');

console.log('Bắt đầu test (fetch article + AI)...');
const start = Date.now();

fn.handler({ httpMethod: 'GET' }).then(r => {
    const elapsed = ((Date.now() - start) / 1000).toFixed(1);
    const b = JSON.parse(r.body);
    console.log(`\nStatus: ${r.statusCode} (${elapsed}s)`);
    console.log('AI enabled:', b.aiEnabled);
    console.log('Total items:', b.total);
    if (b.error) { console.error('Error:', b.error); return; }
    b.items.slice(0, 3).forEach((it, i) => {
        console.log(`\n[${i+1}] ${it.source} | AI: ${it.aiSummarized}`);
        console.log('Title:', it.title);
        console.log('Summary:', it.summary);
    });
}).catch(e => console.error('Exception:', e.message));
