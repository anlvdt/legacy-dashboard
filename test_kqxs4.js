const https = require('https');
const http = require('http');

const fetchHTML = (url, followRedirects = 3) => new Promise((resolve, reject) => {
    const lib = url.startsWith('https') ? https : http;
    lib.get(url, { headers: { 'User-Agent': 'Mozilla/5.0' } }, (res) => {
        if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location && followRedirects > 0) {
           return resolve(fetchHTML(res.headers.location, followRedirects - 1));
        }
        let data = '';
        res.on('data', (chunk) => data += chunk);
        res.on('end', () => resolve(data));
    }).on('error', (err) => resolve(''));
});

async function testMB() {
    console.log("Testing xskt.com.vn HTML scrape...");
    const htmlMB = await fetchHTML('https://xskt.com.vn/xsmb');
    
    // Pattern xskt.com.vn:
    // <td class="truong-cot-1">ĐB</td><td><em>12345</em></td>
    const matchDB = htmlMB.match(/title="Giải ĐB"[^>]*>ĐB<\/td>\s*<td[^>]*>.*?<em>([0-9]+)<\/em>/i);
    const matchG1 = htmlMB.match(/title="Giải nhất"[^>]*>G1<\/td>\s*<td[^>]*>.*?<p[^>]*>([0-9]+)<\/p>/i);
    
    if (matchDB) {
        console.log("MB Đặc biệt:", matchDB[1]);
        console.log("MB Giải 1:", matchG1 ? matchG1[1] : '?');
    } else {
        console.log("Regex failed. Length:", htmlMB.length, htmlMB.substring(htmlMB.indexOf('ĐB') - 50, htmlMB.indexOf('ĐB') + 200));
    }
}
testMB();
