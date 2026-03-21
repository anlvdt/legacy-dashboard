const https = require('https');

/**
 * agriculture.js — Giá nông sản: cà phê, hồ tiêu, gạo
 *
 * Chiến lược fetch 2 tầng:
 *   1. Direct HTTPS — server-side, không bị CORS, nhanh
 *   2. CORS proxy fallback — allorigins, corsproxy.io, codetabs
 *
 * Cloudflare Browser Rendering là optional: set CF_ACCOUNT_ID + CF_BR_API_TOKEN
 * nếu một site cụ thể bắt đầu block direct fetch.
 */

// Simple in-memory rate limiter: 20 req/min per IP
const _rl = {};
function rateLimit(ip) {
    var now = Date.now();
    var w = _rl[ip];
    if (!w || now - w.t > 60000) { _rl[ip] = { t: now, c: 1 }; return false; }
    if (w.c >= 20) { return true; }
    w.c++;
    return false;
}

// ─── Tầng 1: Direct HTTPS ────────────────────────────────────────────────────

/**
 * Fetch trực tiếp qua HTTPS. Netlify Functions chạy server-side nên không
 * bị CORS. Hầu hết site VN không block server IP của Netlify.
 * @param {string} url
 * @param {number} [timeout=10000]
 * @param {number} [redirectsLeft=3]
 * @returns {Promise<string|null>}
 */
const fetchDirect = (url, timeout, redirectsLeft) => new Promise((resolve) => {
    if (redirectsLeft === undefined) redirectsLeft = 3;
    const req = https.get(url, {
        headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
            'Accept-Language': 'vi-VN,vi;q=0.9,en;q=0.8',
            'Accept-Encoding': 'identity',
            'Cache-Control': 'no-cache'
        },
        timeout: timeout || 10000
    }, (res) => {
        if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location && redirectsLeft > 0) {
            return resolve(fetchDirect(res.headers.location, timeout, redirectsLeft - 1));
        }
        if (res.statusCode !== 200) return resolve(null);
        let data = '';
        res.on('data', (chunk) => data += chunk);
        res.on('end', () => resolve(data.length > 500 ? data : null));
    });
    req.on('error', () => resolve(null));
    req.on('timeout', () => { req.destroy(); resolve(null); });
});

// ─── Tầng 2: CORS Proxy fallback ─────────────────────────────────────────────

/**
 * Fetch qua chuỗi CORS proxy. Dùng khi direct fetch thất bại.
 * @param {string} targetUrl
 * @param {number} [timeout=10000]
 * @returns {Promise<string|null>}
 */
const fetchViaProxy = (targetUrl, timeout) => new Promise((resolve) => {
    const proxies = [
        'https://api.allorigins.win/raw?url=' + encodeURIComponent(targetUrl),
        'https://api.allorigins.win/get?url=' + encodeURIComponent(targetUrl),
        'https://corsproxy.io/?' + encodeURIComponent(targetUrl),
        'https://api.codetabs.com/v1/proxy?quest=' + encodeURIComponent(targetUrl),
        'https://api.allorigins.win/raw?url=' + encodeURIComponent(targetUrl) // extra retry
    ];
    let idx = 0;
    function tryNext() {
        if (idx >= proxies.length) return resolve(null);
        const url = proxies[idx];
        const req = https.get(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                'Accept': 'text/html,application/json'
            },
            timeout: timeout || 10000
        }, (res) => {
            if (res.statusCode !== 200) { idx++; return tryNext(); }
            let data = '';
            res.on('data', (chunk) => data += chunk);
            res.on('end', () => {
                if (url.indexOf('/get?url=') > -1) {
                    try { data = JSON.parse(data).contents || ''; } catch (e) { idx++; return tryNext(); }
                }
                if (data.length < 500) { idx++; return tryNext(); }
                resolve(data);
            });
        });
        req.on('error', () => { idx++; tryNext(); });
        req.on('timeout', () => { req.destroy(); idx++; tryNext(); });
    }
    tryNext();
});

// ─── Orchestrator ─────────────────────────────────────────────────────────────

/**
 * Fetch với fallback tự động: Direct → Proxy.
 * @param {string} url
 * @param {number} [timeout=10000]
 * @returns {Promise<string|null>}
 */
const fetchHTML = async (url, timeout) => {
    const direct = await fetchDirect(url, timeout);
    if (direct) return direct;
    return fetchViaProxy(url, timeout);
};

// ─── Parsers: Cà phê ─────────────────────────────────────────────────────────

/**
 * Parse giá cà phê nội địa trung bình từ giacaphe.com/
 * HTML: <span class="s-price" data-cur="92566.666666667">92,600</span>
 */
const parseCoffeePrice = (html) => {
    if (!html) return null;
    // Pattern 1: data-cur attribute (chính xác nhất, trang chủ giacaphe.com)
    var m = html.match(/data-cur="([0-9]+(?:\.[0-9]+)?)"/);
    if (m) return Math.round(parseFloat(m[1]));

    // Pattern 2: text trong span.s-price "92,600"
    m = html.match(/class="s-price"[^>]*>([0-9]{2,3},[0-9]{3})</);
    if (m) return parseInt(m[1].replace(/,/g, ''), 10);

    // Pattern 3: "Trung bình" gần số giá
    m = html.match(/[Tt]rung b[ìi]nh[^0-9]{0,50}?([0-9]{2,3}[.,][0-9]{3})/);
    if (m) return parseInt(m[1].replace(/[.,]/g, ''), 10);

    // Pattern 4: "XX,XXX đ/kg"
    m = html.match(/([0-9]{2,3}[.,][0-9]{3})\s*[đd]\/kg/);
    if (m) return parseInt(m[1].replace(/[.,]/g, ''), 10);

    return null;
};

const parseCoffeeChange = (html) => {
    if (!html) return null;
    var up = html.match(/tăng[^0-9]{0,20}?([0-9]+[.,]?[0-9]*)/i);
    var down = html.match(/giảm[^0-9]{0,20}?([0-9]+[.,]?[0-9]*)/i);
    if (up) return parseInt(up[1].replace(/[.,]/g, ''), 10);
    if (down) return -parseInt(down[1].replace(/[.,]/g, ''), 10);
    return 0;
};

/**
 * Parse giá cà phê theo vùng.
 * Lưu ý: giacaphe.com dùng CSS obfuscation cho giá vùng (inject bằng JS),
 * nên chỉ parse được khi có CF Browser Rendering. Trả về [] nếu không có.
 */
const parseCoffeeRegions = (html) => {
    if (!html) return [];
    var regions = [];
    var defs = [
        { name: 'Đắk Lắk',  aliases: ['Đắk Lắk', 'Đắk\\s*Lắk', 'Dak Lak'] },
        { name: 'Lâm Đồng', aliases: ['Lâm Đồng', 'Lâm\\s*Đồng', 'Lam Dong'] },
        { name: 'Gia Lai',  aliases: ['Gia Lai', 'Gia\\s*Lai'] },
        { name: 'Đắk Nông', aliases: ['Đắk Nông', 'Đắk\\s*Nông', 'Dak Nong'] }
    ];
    for (var i = 0; i < defs.length; i++) {
        var r = defs[i];
        var found = false;
        for (var j = 0; j < r.aliases.length && !found; j++) {
            try {
                // Tìm giá ngay sau tên vùng trong cùng row <tr>
                var rowRe = new RegExp('<td[^>]*>' + r.aliases[j] + '<\\/td>[\\s\\S]{0,300}?data-price=[\'"]([0-9,]+)[\'"]', 'i');
                var m = html.match(rowRe);
                if (!m) {
                    // Fallback: text gần tên vùng
                    m = html.match(new RegExp(r.aliases[j] + '[^0-9]{0,50}?([0-9]{2,3}[.,][0-9]{3})', 'i'));
                }
                if (m && m[1]) {
                    var price = parseInt(m[1].replace(/[.,]/g, ''), 10);
                    if (price > 10000 && price < 500000) {
                        var entry = { name: r.name, price: price };
                        var cm = html.match(new RegExp(r.aliases[j] + '[^0-9]{0,80}?[0-9]{2,3}[.,][0-9]{3}[^0-9]{0,30}?(-[0-9]+[.,]?[0-9]*)', 'i'));
                        if (cm && cm[1]) entry.change = parseInt(cm[1].replace(/[.,]/g, ''), 10);
                        regions.push(entry);
                        found = true;
                    }
                }
            } catch (e) { /* skip */ }
        }
    }
    return regions;
};

/**
 * Parse giá Robusta London (USD/tấn) từ giacaphe.com/
 * HTML: <td class='gnd-gia' data-price='3693'>3,693</td>  (row London/RC)
 */
const parseCoffeeWorld = (html) => {
    if (!html) return null;
    // Pattern 1: row London với data-thi-truong='RC'
    var m = html.match(/data-thi-truong='RC'[\s\S]{0,200}?data-price='([0-9]+(?:\.[0-9]+)?)'>/i);
    if (m) return parseInt(m[1], 10);

    // Pattern 2: data-price trong section#robusta (trang truc-tuyen)
    m = html.match(/id=["']robusta["'][\s\S]{0,3000}?data-price=["'](\d+(?:\.\d+)?)["']/i);
    if (m) return parseInt(m[1], 10);

    // Pattern 3: text fallback
    m = html.match(/[Rr]obusta[^0-9]{0,50}?([1-9][0-9]{3,4}(?:\.[0-9]+)?)\s*(?:USD|usd|\$)/);
    if (m) return parseInt(m[1], 10);

    return null;
};

const parseRobustaChange = (html) => {
    if (!html) return null;
    // Row London: data-price change ngay sau giá
    var m = html.match(/data-thi-truong='RC'[\s\S]{0,300}?price_change'[^>]*data-price='([-0-9.]+)'/i);
    if (m) return parseFloat(m[1]);

    var section = html.match(/id=["']robusta["'][\s\S]{0,15000}?<\/table>/i)
        || html.match(/id=["']robusta-london["'][\s\S]{0,5000}?<\/table>/i);
    if (!section) return null;
    var prices = section[0].match(/data-price=["']([\d.+-]+)["']/gi);
    if (prices && prices.length >= 2) {
        var mm = prices[1].match(/["']([\d.+-]+)["']/);
        if (mm) return parseFloat(mm[1]);
    }
    return null;
};

/**
 * Parse giá Arabica New York (USD cent/lb) từ giacaphe.com/
 * HTML: <td class='gnd-gia' data-price='292.9'>292.90</td>  (row New York/KC)
 */
const parseArabicaPrice = (html) => {
    if (!html) return null;
    // Pattern 1: row New York với data-thi-truong='KC'
    var m = html.match(/data-thi-truong='KC'[\s\S]{0,200}?data-price='([0-9]+(?:\.[0-9]+)?)'>/i);
    if (m) return parseFloat(m[1]);

    // Pattern 2: section#coffee_ice (trang truc-tuyen)
    var section = html.match(/id=["']coffee_ice["'][\s\S]{0,15000}?<\/table>/i);
    if (section) {
        m = section[0].match(/data-price=["']([\d.]+)["']/i);
        if (m) return parseFloat(m[1]);
    }

    // Pattern 3: 2nd livequote table
    var tables = html.match(/class=["'][^"']*livequote[^"']*["'][\s\S]*?<\/table>/gi);
    if (tables && tables.length >= 2) {
        m = tables[1].match(/data-price=["']([\d.]+)["']/i);
        if (m) return parseFloat(m[1]);
    }

    return null;
};

const parseArabicaChange = (html) => {
    if (!html) return null;
    // Row New York change
    var m = html.match(/data-thi-truong='KC'[\s\S]{0,300}?price_change'[^>]*data-price='([-0-9.]+)'/i);
    if (m) return parseFloat(m[1]);

    var section = html.match(/id=["']coffee_ice["'][\s\S]{0,15000}?<\/table>/i);
    if (!section) {
        var tables = html.match(/class=["'][^"']*livequote[^"']*["'][\s\S]*?<\/table>/gi);
        if (tables && tables.length >= 2) section = [tables[1]];
    }
    if (!section) return null;
    var prices = section[0].match(/data-price=["']([\d.+-]+)["']/gi);
    if (prices && prices.length >= 2) {
        var mm = prices[1].match(/["']([\d.+-]+)["']/);
        if (mm) return parseFloat(mm[1]);
    }
    return null;
};

// ─── Parsers: Hồ tiêu ────────────────────────────────────────────────────────

const parsePepperPrice = (html) => {
    if (!html) return null;
    var m;
    m = html.match(/trung b[ìi]nh[^0-9]{0,30}?([0-9]{2,3}[.,][0-9]{3})/i);
    if (m) return parseInt(m[1].replace(/[.,]/g, ''), 10);
    m = html.match(/[Gg]i[áa]\s*ti[êe]u[^0-9]{0,50}?([0-9]{2,3}[.,][0-9]{3})\s*VN/i);
    if (m) return parseInt(m[1].replace(/[.,]/g, ''), 10);
    m = html.match(/og:description[^>]*content=["'][^"']*?([0-9]{2,3}[.,][0-9]{3})\s*VN/i);
    if (m) return parseInt(m[1].replace(/[.,]/g, ''), 10);
    m = html.match(/"price"\s*:\s*"?([0-9]{2,3}[.,][0-9]{3})"?/i);
    if (m) { var p = parseInt(m[1].replace(/[.,]/g, ''), 10); if (p > 50000 && p < 500000) return p; }
    m = html.match(/([0-9]{2,3}[.,][0-9]{3})\s*(?:VNĐ|đồng)\/kg/i);
    if (m) return parseInt(m[1].replace(/[.,]/g, ''), 10);
    return null;
};

const parsePepperChange = (html) => {
    if (!html) return null;
    var down = html.match(/gi[ảa]m[^0-9]{0,10}?-?([0-9]+[.,]?[0-9]*)/i);
    if (down) return -Math.abs(parseInt(down[1].replace(/[.,]/g, ''), 10));
    var up = html.match(/t[ăa]ng[^0-9]{0,10}?\+?([0-9]+[.,]?[0-9]*)/i);
    if (up) return Math.abs(parseInt(up[1].replace(/[.,]/g, ''), 10));
    return 0;
};

// ─── Parsers: Gạo ────────────────────────────────────────────────────────────

const parseRicePrice = (html) => {
    if (!html || html.length < 500) return null;
    var varieties = [
        { name: 'IR 504',     pattern: /IR\s*504[^0-9]{0,50}?([0-9]{1,2}[.,][0-9]{3})/i },
        { name: 'Jasmine',    pattern: /Jasmine[^0-9]{0,50}?([0-9]{1,2}[.,][0-9]{3})/i },
        { name: 'ST25',       pattern: /ST\s*25[^0-9]{0,50}?([0-9]{1,2}[.,][0-9]{3})/i },
        { name: 'Đài Thơm 8', pattern: /Đài\s*Thơm[^0-9]{0,50}?([0-9]{1,2}[.,][0-9]{3})/i },
        { name: 'Gạo',        pattern: /g[aạ]o[^0-9]{0,30}?([0-9]{1,2}[.,][0-9]{3})\s*(?:đ|VNĐ|đồng)\/kg/i }
    ];
    for (var i = 0; i < varieties.length; i++) {
        var m = html.match(varieties[i].pattern);
        if (m && m[1]) {
            var price = parseInt(m[1].replace(/[.,]/g, ''), 10);
            if (price > 3000 && price < 30000) return { name: varieties[i].name, price: price };
        }
    }
    return null;
};

// ─── Handler ──────────────────────────────────────────────────────────────────

exports.handler = async function (event, context) {
    if (event.httpMethod === 'OPTIONS') {
        return { statusCode: 204, headers: { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'GET, OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type' }, body: '' };
    }

    const clientIp = (event.headers && (event.headers['x-forwarded-for'] || event.headers['client-ip'])) || 'unknown';
    if (rateLimit(clientIp)) {
        return { statusCode: 429, headers: { 'Access-Control-Allow-Origin': '*' }, body: JSON.stringify({ error: 'Too many requests' }) };
    }

    try {
        // giacaphe.com/gia-ca-phe-noi-dia/ và /gia-ca-phe-truc-tuyen/ đều trả 403
        // Trang chủ giacaphe.com/ trả 200 và chứa đủ: giá nội địa TB + giá thế giới RC/KC
        const [coffeeHtml, pepperHtml, riceHtml] = await Promise.all([
            fetchHTML('https://giacaphe.com/', 12000),
            fetchHTML('https://giatieu.com/gia-tieu-hom-nay/', 10000),
            fetchHTML('https://chogaomientay.com/bang-gia-gao-hom-nay/', 8000)
        ]);

        var coffee = null, coffeeChange = null, coffeeRegions = [];
        var coffeeWorld = null, arabica = null, robustaChange = null, arabicaChange = null;
        var pepper = null, pepperChange = null, rice = null;

        if (coffeeHtml) {
            coffee        = parseCoffeePrice(coffeeHtml);
            coffeeRegions = parseCoffeeRegions(coffeeHtml);  // returns [] — giá vùng dùng JS injection
            coffeeChange  = parseCoffeeChange(coffeeHtml);
            coffeeWorld   = parseCoffeeWorld(coffeeHtml);
            arabica       = parseArabicaPrice(coffeeHtml);
            robustaChange = parseRobustaChange(coffeeHtml);
            arabicaChange = parseArabicaChange(coffeeHtml);
        }
        if (pepperHtml) {
            pepper       = parsePepperPrice(pepperHtml);
            pepperChange = parsePepperChange(pepperHtml);
        }
        if (riceHtml) {
            rice = parseRicePrice(riceHtml);
        }

        if (!coffee && !coffeeWorld && !pepper && !rice) {
            return {
                statusCode: 500,
                headers: { 'Access-Control-Allow-Origin': '*' },
                body: JSON.stringify({ error: 'Không thể tải dữ liệu nông sản' })
            };
        }

        return {
            statusCode: 200,
            headers: { 'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json; charset=utf-8' },
            body: JSON.stringify({
                data: {
                    coffee, coffeeWorld, coffeeRegions, coffeeChange,
                    arabica, robustaChange, arabicaChange,
                    pepper, pepperChange, rice,
                    timestamp: new Date().toISOString()
                }
            })
        };
    } catch (e) {
        return {
            statusCode: 500,
            headers: { 'Access-Control-Allow-Origin': '*' },
            body: JSON.stringify({ error: 'Lỗi kết nối: ' + e.message })
        };
    }
};
