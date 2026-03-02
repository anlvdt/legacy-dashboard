const https = require('https');

/**
 * Fetch HTML via CORS proxy (giacaphe.com blocks direct requests)
 */
const fetchViaProxy = (targetUrl, timeout) => new Promise((resolve) => {
    const proxies = [
        'https://api.allorigins.win/raw?url=' + encodeURIComponent(targetUrl),
        'https://corsproxy.io/?' + encodeURIComponent(targetUrl)
    ];

    let idx = 0;
    function tryNext() {
        if (idx >= proxies.length) return resolve(null);
        const url = proxies[idx];
        const req = https.get(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Accept': 'text/html'
            },
            timeout: timeout || 10000
        }, (res) => {
            if (res.statusCode !== 200) {
                idx++;
                return tryNext();
            }
            let data = '';
            res.on('data', (chunk) => data += chunk);
            res.on('end', () => {
                if (data.length < 100) { idx++; return tryNext(); }
                resolve(data);
            });
        });
        req.on('error', () => { idx++; tryNext(); });
        req.on('timeout', () => { req.destroy(); idx++; tryNext(); });
    }
    tryNext();
});

/**
 * Parse giá cà phê nội địa từ giacaphe.com
 * Trang có text: "trung bình XX,XXX" hoặc "XX.XXX đ/kg"
 */
const parseCoffeePrice = (html) => {
    if (!html) return null;
    // Pattern 1: "trung bình XX,XXX" or "trung bình ở mức XX,XXX"
    const match = html.match(/trung b[ìi]nh[^0-9]{0,30}?([0-9]+[.,][0-9]{3})/i);
    if (match && match[1]) {
        return parseInt(match[1].replace(/[.,]/g, ''), 10);
    }
    // Pattern 2: first "XX,XXX đ/kg" or "XX.XXX đ/kg"
    const match2 = html.match(/([0-9]{2,3}[.,][0-9]{3})\s*[đd]\/kg/);
    if (match2 && match2[1]) {
        return parseInt(match2[1].replace(/[.,]/g, ''), 10);
    }
    return null;
};

exports.handler = async function (event, context) {
    try {
        const html = await fetchViaProxy('https://giacaphe.com/gia-ca-phe-noi-dia/', 12000);
        const coffee = parseCoffeePrice(html);

        if (!coffee) {
            return {
                statusCode: 500,
                headers: { 'Access-Control-Allow-Origin': '*' },
                body: JSON.stringify({ error: 'Không thể tải giá cà phê' })
            };
        }

        return {
            statusCode: 200,
            headers: {
                'Access-Control-Allow-Origin': '*',
                'Content-Type': 'application/json; charset=utf-8'
            },
            body: JSON.stringify({
                data: { coffee: coffee, timestamp: new Date().toISOString() }
            })
        };
    } catch (e) {
        return {
            statusCode: 500,
            headers: { 'Access-Control-Allow-Origin': '*' },
            body: JSON.stringify({ error: 'Lỗi kết nối' })
        };
    }
};
