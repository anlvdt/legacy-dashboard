const https = require('https');

const fetchHTML = (url) => new Promise((resolve) => {
    https.get(url, (res) => {
        let data = '';
        res.on('data', (chunk) => data += chunk);
        res.on('end', () => resolve(data));
    }).on('error', () => resolve(''));
});

async function testMinhNgoc() {
    console.log("Testing Minh Ngoc HTML scrape...");
    
    const htmlMB = await fetchHTML('https://www.minhngoc.net.vn/ket-qua-xo-so/mien-bac.html');
    
    // Scrape MB
    const matchDB = htmlMB.match(/class="giaidb"[^>]*>.*?<span[^>]*>([0-9A-Z]+)<\/span>/i);
    const matchG1 = htmlMB.match(/class="giai1"[^>]*>.*?<span[^>]*>([0-9A-Z]+)<\/span>/i);
    const matchDate = htmlMB.match(/ngay_xoso">([^<]+)<\/span>/i);
    
    if (matchDB && matchDB[1]) {
        console.log("MB Đặc biệt:", matchDB[1]);
        console.log("MB Giải 1:", matchG1 ? G1[1] : '?');
        console.log("MB Ngày:", matchDate ? matchDate[1] : '?');
    } else {
        console.log("Regex failed on MB", htmlMB.substring(0, 100));
    }
}
testMinhNgoc();
