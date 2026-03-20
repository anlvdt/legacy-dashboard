const https = require('https');

/**
 * agriculture.js — Giá nông sản: cà phê, hồ tiêu, gạo
 *
 * Chiến lược fetch 3 tầng (theo thứ tự ưu tiên):
 *   1. Cloudflare Browser Rendering /content — render JS đầy đủ, bypass bot protection
 *   2. Direct HTTPS fetch — nhanh, không cần API key
 *   3. CORS proxy fallback — allorigins, corsproxy.io, codetabs
 *
 * Biến môi trường cần thiết cho tầng 1:
 *   CF_ACCOUNT_ID   — Cloudflare Account ID
 *   CF_BR_API_TOKEN — API Token với quyền "Browser Rendering - Edit"
 */

const CF_BR_BASE = 'https://api.cloudflare.com/client/v4/accounts';

// ─── Tầng 1: Cloudflare Browser Rendering ────────────────────────────────────

/**
 * Fetch trang web qua Cloudflare Browser Rendering /content endpoint.
 * Trả về HTML đã render đầy đủ (sau khi JS chạy xong).
 * @param {string} targetUrl
 * @param {object} [opts] - gotoOptions, waitForSelector, rejectResourceTypes, v.v.
 * @returns {Promise<string|null>}
 */
const fetchViaCFBR = (targetUrl, opts) => new Promise((resolve) => {
    const accountId = process.env.CF_ACCOUNT_ID;
    const apiToken = process.env.CF_BR_API_TOKEN;
    if (!accountId || !apiToken) return resolve(null);

    const body = JSON.stringify(Object.assign({
        url: targetUrl,
        // Bỏ image/font/stylesheet để tăng tốc, chỉ cần HTML text
        rejectResourceTypes: ['image', 'media', 'font', 'stylesheet'],
        gotoOptions: { waitUntil: 'networkidle2', timeout: 20000 }
    }, opts || {}));

    const options = {
        hostname: 'api.cloudflare.com',
        path: '/client/v4/accounts/' + accountId + '/browser-rendering/content',
        method: 'POST',
        headers: {
            'Authorization': 'Bearer ' + apiToken,
            'Content-Type': 'application/json',
            'Content-Length': Buffer.byteLength(body)
        },
        timeout: 25000
    };

    const req = https.request(options, (res) => {
        let data = '';
        res.on('data', (chunk) => data += chunk);
        res.on('end', () => {
            if (res.statusCode !== 200) {
                console.warn('[CF-BR] HTTP ' + res.statusCode + ' for ' + targetUrl);
                return resolve(null);
            }
            // /content trả về HTML trực tiếp (không phải JSON)
            resolve(data && data.length > 500 ? data : null);
        });
    });
    req.on('error', (e) => { console.warn('[CF-BR] error:', e.message); resolve(null); });
    req.on('timeout', () => { req.destroy(); resolve(null); });
    req.write(body);
    req.end();
});

// ─── Tầng 2: Direct HTTPS fetch ──────────────────────────────────────────────

/**
 * Fetch trực tiếp qua HTTPS với User-Agent giả lập browser.
 * Nhiều site cho phép direct fetch từ server-side (không có CORS restriction).
 * @param {string} targetUrl
 * @param {number} [timeout]
 * @returns {Promise<string|null>}
 */
const fetchDirect = (targetUrl, timeout) => new Promise((resolve) => {
    const req = https.get(targetUrl, {
        headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
            'Accept-Language': 'vi-VN,vi;q=0.9,en;q=0.8',
            'Accept-Encoding': 'identity',
            'Cache-Control': 'no-cache'
        },
        timeout: timeout || 10000
    }, (res) => {
        // Follow redirect một lần
        if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
            return resolve(fetchDirect(res.headers.location, timeout));
        }
        if (res.statusCode !== 200) return resolve(null);
        let data = '';
        res.on('data', (chunk) => data += chunk);
        res.on('end', () => resolve(data.length > 500 ? data : null));
    });
    req.on('error', () => resolve(null));
    req.on('timeout', () => { req.destroy(); resolve(null); });
});

// ─── Tầng 3: CORS Proxy fallback ─────────────────────────────────────────────

/**
 * Fetch qua chuỗi CORS proxy với retry logic.
 * Dùng khi cả CF-BR lẫn direct fetch đều thất bại.
 * @param {string} targetUrl
 * @param {number} [timeout]
 * @returns {Promise<string|null>}
 */
const fetchViaProxy = (targetUrl, timeout) => new Promise((resolve) => {
    const proxies = [
        'https://api.allorigins.win/raw?url=' + encodeURIComponent(targetUrl),
        'https://api.allorigins.win/get?url=' + encodeURIComponent(targetUrl),
        'https://corsproxy.io/?' + encodeURIComponent(targetUrl),
        'https://api.codetabs.com/v1/proxy?quest=' + encodeURIComponent(targetUrl),
        // Extra retry allorigins
        'https://api.allorigins.win/raw?url=' + encodeURIComponent(targetUrl)
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

// ─── Fetch với fallback tự động ───────────────────────────────────────────────

/**
 * Thử fetch theo thứ tự: CF-BR → Direct → Proxy.
 * Trả về HTML đầu tiên có độ dài hợp lệ.
 * @param {string} targetUrl
 * @param {number} [timeout]
 * @param {object} [cfbrOpts] - tuỳ chọn thêm cho CF-BR (vd: waitForSelector)
 * @returns {Promise<{html: string|null, source: string}>}
 */
const fetchWithFallback = async (targetUrl, timeout, cfbrOpts) => {
    // Tầng 1: Cloudflare Browser Rendering
    const cfHtml = await fetchViaCFBR(targetUrl, cfbrOpts);
    if (cfHtml) return { html: cfHtml, source: 'cf-br' };

    // Tầng 2: Direct fetch
    const directHtml = await fetchDirect(targetUrl, timeout);
    if (directHtml) return { html: directHtml, source: 'direct' };

    // Tầng 3: CORS proxy
    const proxyHtml = await fetchViaProxy(targetUrl, timeout);
    return { html: proxyHtml, source: proxyHtml ? 'proxy' : 'none' };
};

// ─── Parsers ──────────────────────────────────────────────────────────────────

/**
 * Parse giá cà phê nội địa từ giacaphe.com/gia-ca-phe-noi-dia/
 * Hỗ trợ nhiều pattern: text "trung bình", structured data, og:description
 */
const parseCoffeePrice = (html) => {
    if (!html) return null;

    // Pattern 1: "trung bình XX,XXX" hoặc "trung bình ở mức XX,XXX"
    var m = html.match(/trung b[ìi]nh[^0-9]{0,30}?([0-9]+[.,][0-9]{3})/i);
    if (m) return parseInt(m[1].replace(/[.,]/g, ''), 10);

    // Pattern 2: "XX,XXX đ/kg" hoặc "XX.XXX đ/kg"
    var m2 = html.match(/([0-9]{2,3}[.,][0-9]{3})\s*[đd]\/kg/);
    if (m2) return parseInt(m2[1].replace(/[.,]/g, ''), 10);

    // Pattern 3: og:description hoặc meta description chứa giá
    var m3 = html.match(/(?:og:description|name=["']description["'])[^>]*content=["'][^"']*?([0-9]{2,3}[.,][0-9]{3})[^"']*?[đd]\/kg/i);
    if (m3) return parseInt(m3[1].replace(/[.,]/g, ''), 10);

    // Pattern 4: JSON-LD structured data
    var m4 = html.match(/"price"\s*:\s*"?([0-9]{2,3}[.,][0-9]{3})"?/i);
    if (m4) return parseInt(m4[1].replace(/[.,]/g, ''), 10);

    return null;
};

/**
 * Parse giá cà phê Robusta ICE London (USD/tấn) từ giacaphe.com/gia-ca-phe-truc-tuyen/
 */
const parseCoffeeWorld = (html) => {
    if (!html) return null;

    // Pattern 1: data-price attribute trong section#robusta
    var m = html.match(/id=["']robusta["'][\s\S]{0,3000}?data-price=["'](\d+(?:\.\d+)?)["']/i);
    if (m) return parseInt(m[1], 10);

    // Pattern 2: id="robusta-london"
    var m2 = html.match(/id=["']robusta-london["'][\s\S]{0,2000}?data-price=["'](\d+(?:\.\d+)?)["']/i);
    if (m2) return parseInt(m2[1], 10);

    // Pattern 3: text "Robusta" gần số USD lớn (1000-5000)
    var m3 = html.match(/[Rr]obusta[^0-9]{0,50}?([1-9][0-9]{3,4}(?:\.[0-9]+)?)\s*(?:USD|usd|\$)/);
    if (m3) return parseInt(m3[1], 10);

    return null;
};

/**
 * Parse thay đổi Robusta London
 */
const parseRobustaChange = (html) => {
    if (!html) return null;
    var section = html.match(/id=["']robusta["'][\s\S]{0,15000}?<\/table>/i)
        || html.match(/id=["']robusta-london["'][\s\S]{0,5000}?<\/table>/i);
    if (!section) return null;
    var prices = section[0].match(/data-price=["']([\d.+-]+)["']/gi);
    if (prices && prices.length >= 2) {
        var m = prices[1].match(/["']([\d.+-]+)["']/);
        if (m) return parseFloat(m[1]);
    }
    return null;
};

/**
 * Parse giá Arabica New York (USD cent/lb)
 */
const parseArabicaPrice = (html) => {
    if (!html) return null;

    // Pattern 1: section#coffee_ice
    var section = html.match(/id=["']coffee_ice["'][\s\S]{0,15000}?<\/table>/i);
    if (section) {
        var m = section[0].match(/data-price=["']([\d.]+)["']/i);
        if (m) return parseFloat(m[1]);
    }

    // Pattern 2: 2nd livequote table
    var tables = html.match(/class=["'][^"']*livequote[^"']*["'][\s\S]*?<\/table>/gi);
    if (tables && tables.length >= 2) {
        var m2 = tables[1].match(/data-price=["']([\d.]+)["']/i);
        if (m2) return parseFloat(m2[1]);
    }

    // Pattern 3: text "Arabica" gần số cent (100-400)
    var m3 = html.match(/[Aa]rabica[^0-9]{0,50}?([1-3][0-9]{2}(?:\.[0-9]+)?)\s*(?:cent|¢|USD)/);
    if (m3) return parseFloat(m3[1]);

    return null;
};

/**
 * Parse thay đổi Arabica
 */
const parseArabicaChange = (html) => {
    if (!html) return null;
    var section = html.match(/id=["']coffee_ice["'][\s\S]{0,15000}?<\/table>/i);
    if (!section) {
        var tables = html.match(/class=["'][^"']*livequote[^"']*["'][\s\S]*?<\/table>/gi);
        if (tables && tables.length >= 2) section = [tables[1]];
    }
    if (!section) return null;
    var prices = section[0].match(/data-price=["']([\d.+-]+)["']/gi);
    if (prices && prices.length >= 2) {
        var m = prices[1].match(/["']([\d.+-]+)["']/);
        if (m) return parseFloat(m[1]);
    }
    return null;
};

/**
 * Parse giá cà phê theo vùng (Đắk Lắk, Lâm Đồng, Gia Lai, Đắk Nông)
 */
const parseCoffeeRegions = (html) => {
    if (!html) return [];
    var regions = [];
    var regionDefs = [
        { name: 'Đắk Lắk',  aliases: ['Đắk Lắk', 'Đắk\\s*Lắk', 'Dak Lak', 'ĐắkLắk'] },
        { name: 'Lâm Đồng', aliases: ['Lâm Đồng', 'Lâm\\s*Đồng', 'Lam Dong'] },
        { name: 'Gia Lai',  aliases: ['Gia Lai', 'Gia\\s*Lai'] },
        { name: 'Đắk Nông', aliases: ['Đắk Nông', 'Đắk\\s*Nông', 'Dak Nong'] }
    ];

    for (var i = 0; i < regionDefs.length; i++) {
        var r = regionDefs[i];
        var found = false;
        for (var j = 0; j < r.aliases.length && !found; j++) {
            try {
                var regex = new RegExp(r.aliases[j] + '[^0-9]{0,50}?([0-9]{2,3}[.,][0-9]{3})', 'i');
                var m = html.match(regex);
                if (m && m[1]) {
                    var price = parseInt(m[1].replace(/[.,]/g, ''), 10);
                    if (price > 10000 && price < 500000) {
                        var entry = { name: r.name, price: price };
                        // Tìm thay đổi giá gần đó
                        var changeRx = new RegExp(r.aliases[j] + '[^0-9]{0,80}?[0-9]{2,3}[.,][0-9]{3}[^0-9]{0,30}?(-[0-9]+[.,]?[0-9]*)', 'i');
                        var cm = html.match(changeRx);
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
 * Parse thay đổi giá cà phê nội địa
 */
const parseCoffeeChange = (html) => {
    if (!html) return null;
    var up = html.match(/tăng[^0-9]{0,20}?([0-9]+[.,]?[0-9]*)/i);
    var down = html.match(/giảm[^0-9]{0,20}?([0-9]+[.,]?[0-9]*)/i);
    if (up) return parseInt(up[1].replace(/[.,]/g, ''), 10);
    if (down) return -parseInt(down[1].replace(/[.,]/g, ''), 10);
    return 0;
};

/**
 * Parse giá Hồ tiêu từ giatieu.com
 * Hỗ trợ: text "trung bình", title, og:description, JSON-LD
 */
const parsePepperPrice = (html) => {
    if (!html) return null;

    // Pattern 1: "trung bình ở mức XXX,XXX"
    var m = html.match(/trung b[ìi]nh[^0-9]{0,30}?([0-9]{2,3}[.,][0-9]{3})/i);
    if (m) return parseInt(m[1].replace(/[.,]/g, ''), 10);

    // Pattern 2: title "Giá tiêu hôm nay XXX,XXX VNĐ/kg"
    var m2 = html.match(/[Gg]i[áa]\s*ti[êe]u[^0-9]{0,50}?([0-9]{2,3}[.,][0-9]{3})\s*VN/i);
    if (m2) return parseInt(m2[1].replace(/[.,]/g, ''), 10);

    // Pattern 3: og:description
    var m3 = html.match(/og:description[^>]*content=["'][^"']*?([0-9]{2,3}[.,][0-9]{3})\s*VN/i);
    if (m3) return parseInt(m3[1].replace(/[.,]/g, ''), 10);

    // Pattern 4: JSON-LD "price"
    var m4 = html.match(/"price"\s*:\s*"?([0-9]{2,3}[.,][0-9]{3})"?/i);
    if (m4) {
        var p = parseInt(m4[1].replace(/[.,]/g, ''), 10);
        if (p > 50000 && p < 500000) return p; // range hợp lệ cho tiêu
    }

    // Pattern 5: số lớn gần "VNĐ/kg" hoặc "đồng/kg"
    var m5 = html.match(/([0-9]{2,3}[.,][0-9]{3})\s*(?:VNĐ|đồng)\/kg/i);
    if (m5) return parseInt(m5[1].replace(/[.,]/g, ''), 10);

    return null;
};

/**
 * Parse thay đổi giá Hồ tiêu
 */
const parsePepperChange = (html) => {
    if (!html) return null;
    var down = html.match(/gi[ảa]m[^0-9]{0,10}?-?([0-9]+[.,]?[0-9]*)/i);
    if (down) return -Math.abs(parseInt(down[1].replace(/[.,]/g, ''), 10));
    var up = html.match(/t[ăa]ng[^0-9]{0,10}?\+?([0-9]+[.,]?[0-9]*)/i);
    if (up) return Math.abs(parseInt(up[1].replace(/[.,]/g, ''), 10));
    return 0;
};

/**
 * Parse giá gạo từ chogaomientay.com
 * Ưu tiên IR 504, fallback các giống phổ biến khác
 */
const parseRicePrice = (html) => {
    if (!html || html.length < 500) return null;
    var varieties = [
        { name: 'IR 504',    pattern: /IR\s*504[^0-9]{0,50}?([0-9]{1,2}[.,][0-9]{3})/i },
        { name: 'Jasmine',   pattern: /Jasmine[^0-9]{0,50}?([0-9]{1,2}[.,][0-9]{3})/i },
        { name: 'ST25',      pattern: /ST\s*25[^0-9]{0,50}?([0-9]{1,2}[.,][0-9]{3})/i },
        { name: 'Đài Thơm 8',pattern: /Đài\s*Thơm[^0-9]{0,50}?([0-9]{1,2}[.,][0-9]{3})/i },
        // Fallback: bất kỳ giá gạo nào trong range hợp lệ
        { name: 'Gạo',       pattern: /g[aạ]o[^0-9]{0,30}?([0-9]{1,2}[.,][0-9]{3})\s*(?:đ|VNĐ|đồng)\/kg/i }
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

    try {
        // Fetch 4 trang song song, mỗi trang dùng chiến lược 3 tầng
        const [noiDiaResult, trucTuyenResult, pepperResult, riceResult] = await Promise.all([
            fetchWithFallback('https://giacaphe.com/gia-ca-phe-noi-dia/', 12000, {
                // Đợi bảng giá load xong
                waitForSelector: { selector: 'table, .price, [class*="price"]', timeout: 8000 }
            }),
            fetchWithFallback('https://giacaphe.com/gia-ca-phe-truc-tuyen/', 12000, {
                waitForSelector: { selector: '[data-price], table.livequote', timeout: 8000 }
            }),
            fetchWithFallback('https://giatieu.com/gia-tieu-hom-nay/', 10000),
            fetchWithFallback('https://chogaomientay.com/bang-gia-gao-hom-nay/', 8000)
        ]);

        const noiDiaHtml    = noiDiaResult.html;
        const trucTuyenHtml = trucTuyenResult.html;
        const pepperHtml    = pepperResult.html;
        const riceHtml      = riceResult.html;

        // Log nguồn fetch để debug
        console.log('[agri] sources:', {
            noiDia:    noiDiaResult.source,
            trucTuyen: trucTuyenResult.source,
            pepper:    pepperResult.source,
            rice:      riceResult.source
        });

        // Parse
        var coffee = null, coffeeChange = null, coffeeRegions = [];
        var coffeeWorld = null, arabica = null, robustaChange = null, arabicaChange = null;
        var pepper = null, pepperChange = null, rice = null;

        if (noiDiaHtml) {
            coffee        = parseCoffeePrice(noiDiaHtml);
            coffeeRegions = parseCoffeeRegions(noiDiaHtml);
            coffeeChange  = parseCoffeeChange(noiDiaHtml);
        }
        if (trucTuyenHtml) {
            coffeeWorld   = parseCoffeeWorld(trucTuyenHtml);
            arabica       = parseArabicaPrice(trucTuyenHtml);
            robustaChange = parseRobustaChange(trucTuyenHtml);
            arabicaChange = parseArabicaChange(trucTuyenHtml);
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
            headers: {
                'Access-Control-Allow-Origin': '*',
                'Content-Type': 'application/json; charset=utf-8'
            },
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
