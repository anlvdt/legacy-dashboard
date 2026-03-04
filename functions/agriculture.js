const https = require('https');

/**
 * Fetch HTML via CORS proxy (giacaphe.com blocks direct requests)
 * Tries multiple proxies with retry logic
 */
const fetchViaProxy = (targetUrl, timeout) => new Promise((resolve) => {
    const proxyTemplates = [
        'https://api.allorigins.win/raw?url=' + encodeURIComponent(targetUrl),
        'https://api.allorigins.win/get?url=' + encodeURIComponent(targetUrl),
        'https://corsproxy.io/?' + encodeURIComponent(targetUrl),
        'https://api.codetabs.com/v1/proxy?quest=' + encodeURIComponent(targetUrl)
    ];

    // Build list: try each proxy twice for reliability
    const proxies = [];
    for (let i = 0; i < proxyTemplates.length; i++) {
        proxies.push(proxyTemplates[i]);
    }
    for (let i = 0; i < 2; i++) {
        proxies.push(proxyTemplates[0]); // extra retries for allorigins (most reliable)
    }

    let idx = 0;
    const MIN_HTML_LEN = 500; // valid page must be >500 chars

    function tryNext() {
        if (idx >= proxies.length) return resolve(null);
        const url = proxies[idx];
        const req = https.get(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Accept': 'text/html,application/json'
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
                // For allorigins /get endpoint, extract contents from JSON
                if (url.indexOf('/get?url=') > -1) {
                    try {
                        const json = JSON.parse(data);
                        data = json.contents || '';
                    } catch (e) {
                        idx++;
                        return tryNext();
                    }
                }
                if (data.length < MIN_HTML_LEN) { idx++; return tryNext(); }
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

/**
 * Parse giá cà phê Robusta ICE London (USD/tấn)
 * Table in section#robusta-london with data-price attributes
 */
const parseCoffeeWorld = (html) => {
    if (!html) return null;
    // Find the robusta-london section and get first data-price
    var sectionMatch = html.match(/id=["']robusta-london["'][\s\S]{0,2000}?data-price=["'](\d+(?:\.\d+)?)["']/i);
    if (sectionMatch && sectionMatch[1]) {
        return parseInt(sectionMatch[1], 10);
    }
    // Fallback: look for "Robusta London" heading then data-price
    var fallback = html.match(/Robusta\s*London[\s\S]{0,1000}?data-price=["'](\d+(?:\.\d+)?)["']/i);
    if (fallback && fallback[1]) {
        return parseInt(fallback[1], 10);
    }
    // Fallback 2: text match "X,XXX USD/tấn"
    var match2 = html.match(/London[^0-9]{0,40}?(\d{1,2}[.,]\d{3})/);
    if (match2 && match2[1]) {
        return parseInt(match2[1].replace(/[.,]/g, ''), 10);
    }
    return null;
};

/**
 * Parse giá cà phê theo vùng
 * Tìm tên vùng + giá: "Đắk Lắk: XX,XXX" etc.
 */
const parseCoffeeRegions = (html) => {
    if (!html) return [];
    var regions = [];
    var regionNames = [
        { name: 'Đắk Lắk', aliases: ['Đắk Lắk', 'Đắk\\s*Lắk', 'Dak Lak'] },
        { name: 'Lâm Đồng', aliases: ['Lâm Đồng', 'Lâm\\s*Đồng', 'Lam Dong'] },
        { name: 'Gia Lai', aliases: ['Gia Lai', 'Gia\\s*Lai'] },
        { name: 'Đắk Nông', aliases: ['Đắk Nông', 'Đắk\\s*Nông', 'Dak Nong'] }
    ];

    // The domestic table uses CSS obfuscation (spans with random classes, no text).
    // Prices are in the page's structured text or occasionally in  text nodes.
    // Try multiple approaches.
    for (var i = 0; i < regionNames.length; i++) {
        var r = regionNames[i];
        var found = false;
        for (var j = 0; j < r.aliases.length && !found; j++) {
            try {
                // Approach 1: text near region name "94,800" or "94.800"
                var regex = new RegExp(r.aliases[j] + '[^0-9]{0,50}?([0-9]{2,3}[.,][0-9]{3})', 'i');
                var m = html.match(regex);
                if (m && m[1]) {
                    var price = parseInt(m[1].replace(/[.,]/g, ''), 10);
                    if (price > 10000 && price < 500000) { // reasonable coffee price range
                        var entry = { name: r.name, price: price };
                        // Try to find change value nearby
                        var changeRegex = new RegExp(r.aliases[j] + '[^0-9]{0,80}?[0-9]{2,3}[.,][0-9]{3}[^0-9]{0,30}?(-[0-9]+[.,]?[0-9]*)', 'i');
                        var cm = html.match(changeRegex);
                        if (cm && cm[1]) {
                            entry.change = parseInt(cm[1].replace(/[.,]/g, ''), 10);
                        }
                        regions.push(entry);
                        found = true;
                    }
                }
            } catch (e) {
                // skip
            }
        }
    }
    return regions;
};

/**
 * Parse thay đổi giá (tăng/giảm)
 * Tìm pattern "tăng/giảm XX đồng" hoặc "+/-XX"
 */
const parseCoffeeChange = (html) => {
    if (!html) return null;
    // Pattern: "tăng XX" hoặc "giảm XX"
    var matchUp = html.match(/tăng[^0-9]{0,20}?([0-9]+[.,]?[0-9]*)/i);
    var matchDown = html.match(/giảm[^0-9]{0,20}?([0-9]+[.,]?[0-9]*)/i);

    if (matchUp && matchUp[1]) {
        return parseInt(matchUp[1].replace(/[.,]/g, ''), 10);
    }
    if (matchDown && matchDown[1]) {
        return -parseInt(matchDown[1].replace(/[.,]/g, ''), 10);
    }
    return 0;
};

/**
 * Parse giá Arabica New York (USD cent/lb)
 * Table in section#arabica-newyork or similar with data-price attributes
 */
const parseArabicaPrice = (html) => {
    if (!html) return null;
    // Find arabica-newyork section and get first data-price
    var sectionMatch = html.match(/id=["']arabica-(?:newyork|new-york|ny)["'][\s\S]{0,2000}?data-price=["']([\d.]+)["']/i);
    if (sectionMatch && sectionMatch[1]) {
        return parseFloat(sectionMatch[1]);
    }
    // Fallback: "Arabica New York" heading then data-price  
    var fallback = html.match(/Arabica\s*(?:New\s*York|NY)[\s\S]{0,1000}?data-price=["']([\d.]+)["']/i);
    if (fallback && fallback[1]) {
        return parseFloat(fallback[1]);
    }
    // Fallback 2: Find second table with data-price (first is Robusta)
    // Find all data-price values in livequote tables
    var tables = html.match(/class=["'][^"']*livequote[^"']*["'][\s\S]*?<\/table>/gi);
    if (tables && tables.length >= 2) {
        var arabicaTable = tables[1]; // second livequote table
        var priceMatch = arabicaTable.match(/data-price=["']([\d.]+)["']/i);
        if (priceMatch && priceMatch[1]) {
            return parseFloat(priceMatch[1]);
        }
    }
    return null;
};

/**
 * Parse giá Hồ tiêu (VND/kg)
 * Domestic table uses CSS obfuscation - try data-price or text patterns
 */
const parsePepperPrice = (html) => {
    if (!html) return null;
    // Approach 1: find "Hồ tiêu" in table, look for data-price nearby
    var match = html.match(/[Hh]ồ\s*tiêu[\s\S]{0,300}?data-price=["']([\d,.]+)["']/i);
    if (match && match[1]) {
        return parseInt(match[1].replace(/[.,]/g, ''), 10);
    }
    // Approach 2: find structured data or JSON-LD with pepper price
    var jsonMatch = html.match(/["']pepper["']\s*:\s*([\d,]+)/i);
    if (jsonMatch && jsonMatch[1]) {
        return parseInt(jsonMatch[1].replace(/[.,]/g, ''), 10);
    }
    // Approach 3: "Hồ tiêu" ... "XXX,XXX" in text (not in obfuscated table)
    var textMatch = html.match(/[Hh]ồ\s*tiêu[^<]{0,50}?([0-9]{2,3}[.,][0-9]{3})/i);
    if (textMatch && textMatch[1]) {
        return parseInt(textMatch[1].replace(/[.,]/g, ''), 10);
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

        // Parse thêm dữ liệu mở rộng
        const coffeeWorld = parseCoffeeWorld(html);
        const coffeeRegions = parseCoffeeRegions(html);
        const coffeeChange = parseCoffeeChange(html);
        const arabica = parseArabicaPrice(html);
        const pepper = parsePepperPrice(html);

        return {
            statusCode: 200,
            headers: {
                'Access-Control-Allow-Origin': '*',
                'Content-Type': 'application/json; charset=utf-8'
            },
            body: JSON.stringify({
                data: {
                    coffee: coffee,
                    coffeeWorld: coffeeWorld,
                    coffeeRegions: coffeeRegions,
                    coffeeChange: coffeeChange,
                    arabica: arabica,
                    pepper: pepper,
                    timestamp: new Date().toISOString(),
                    _debug: {
                        htmlLen: html ? html.length : 0,
                        hasRobusta: html ? html.indexOf('Robusta') > -1 || html.indexOf('robusta') > -1 : false,
                        hasArabica: html ? html.indexOf('Arabica') > -1 || html.indexOf('arabica') > -1 : false,
                        hasTieu: html ? html.indexOf('tiêu') > -1 || html.indexOf('ti\u00eau') > -1 : false,
                        hasLondon: html ? html.indexOf('London') > -1 : false,
                        hasDakLak: html ? html.indexOf('Lắk') > -1 || html.indexOf('Lak') > -1 : false,
                        hasDataPrice: html ? html.indexOf('data-price') > -1 : false,
                        robustaCtx: html ? (function () { var i = html.indexOf('Robusta'); return i > -1 ? html.substring(i, i + 200) : 'NOT FOUND'; })() : null,
                        arabicaCtx: html ? (function () { var i = html.indexOf('Arabica'); return i > -1 ? html.substring(i, i + 200) : 'NOT FOUND'; })() : null,
                        pepperCtx: html ? (function () { var i = html.search(/[Hh][\u1ed3\u00f4]\s*ti[e\u00ea]u/); return i > -1 ? html.substring(i, i + 200) : 'NOT FOUND'; })() : null,
                        dakLakCtx: html ? (function () { var i = html.search(/[ĐD][aắ][kc]\s*L[aắ][kc]/i); return i > -1 ? html.substring(i, i + 200) : 'NOT FOUND'; })() : null
                    }
                }
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
