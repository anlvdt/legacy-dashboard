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
    // Table #robusta has data-price attributes: first one is the price
    var sectionMatch = html.match(/id=["']robusta["'][\s\S]{0,3000}?data-price=["'](\d+(?:\.\d+)?)["']/i);
    if (sectionMatch && sectionMatch[1]) {
        return parseInt(sectionMatch[1], 10);
    }
    // Fallback: id="robusta-london"
    var fallback = html.match(/id=["']robusta-london["'][\s\S]{0,2000}?data-price=["'](\d+(?:\.\d+)?)["']/i);
    if (fallback && fallback[1]) {
        return parseInt(fallback[1], 10);
    }
    return null;
};

/**
 * Parse thay đổi Robusta London
 * In the table: data-price cell is followed by change cell
 */
const parseRobustaChange = (html) => {
    if (!html) return null;
    // Table #robusta: data-price values alternate price/change per row
    // 1st data-price = giá khớp, 2nd data-price = thay đổi
    var section = html.match(/id=["']robusta["'][\s\S]{0,15000}?<\/table>/i);
    if (!section) {
        section = html.match(/id=["']robusta-london["'][\s\S]{0,5000}?<\/table>/i);
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
 * Parse thay đổi Arabica New York  
 */
const parseArabicaChange = (html) => {
    if (!html) return null;
    // Table #coffee_ice: Arabica ICE futures
    var section = html.match(/id=["']coffee_ice["'][\s\S]{0,15000}?<\/table>/i);
    if (!section) {
        // Fallback to 2nd livequote table
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
    // Table #coffee_ice: Arabica ICE futures
    var section = html.match(/id=["']coffee_ice["'][\s\S]{0,15000}?<\/table>/i);
    if (section) {
        var priceMatch = section[0].match(/data-price=["']([\d.]+)["']/i);
        if (priceMatch && priceMatch[1]) {
            return parseFloat(priceMatch[1]);
        }
    }
    // Fallback: 2nd livequote table
    var tables = html.match(/class=["'][^"']*livequote[^"']*["'][\s\S]*?<\/table>/gi);
    if (tables && tables.length >= 2) {
        var priceM = tables[1].match(/data-price=["']([\d.]+)["']/i);
        if (priceM && priceM[1]) {
            return parseFloat(priceM[1]);
        }
    }
    return null;
};

/**
 * Parse giá Hồ tiêu từ giatieu.com/gia-tieu-hom-nay/
 * Text format: "trung bình ở mức 143,800 VNĐ/kg giảm mạnh -1,900₫"
 */
const parsePepperPrice = (html) => {
    if (!html) return null;
    // Pattern 1: "trung bình" ... "XXX,XXX" VNĐ/kg
    var match = html.match(/trung b[\u00ec\u0300i]nh[^0-9]{0,30}?([0-9]{2,3}[.,][0-9]{3})/i);
    if (match && match[1]) {
        return parseInt(match[1].replace(/[.,]/g, ''), 10);
    }
    // Pattern 2: title tag "Giá tiêu hôm nay ... XXX,XXX VNĐ/kg"
    var titleMatch = html.match(/[Gg]i[\u00e1a]\s*ti[\u00eau]u[^0-9]{0,50}?([0-9]{2,3}[.,][0-9]{3})\s*VN/i);
    if (titleMatch && titleMatch[1]) {
        return parseInt(titleMatch[1].replace(/[.,]/g, ''), 10);
    }
    // Pattern 3: og:description
    var ogMatch = html.match(/og:description[^>]*content=["'][^"']*?([0-9]{2,3}[.,][0-9]{3})\s*VN/i);
    if (ogMatch && ogMatch[1]) {
        return parseInt(ogMatch[1].replace(/[.,]/g, ''), 10);
    }
    return null;
};

/**
 * Parse thay đổi giá Hồ tiêu từ giatieu.com
 * Pattern: "giảm -1,900" hoặc "tăng +X,XXX"
 */
const parsePepperChange = (html) => {
    if (!html) return null;
    // Pattern: "-X,XXX" or "+X,XXX" near "giảm/tăng" or after price
    var downMatch = html.match(/gi[\u1ea3a]m[^0-9]{0,10}?-?([0-9]+[.,]?[0-9]*)/i);
    if (downMatch && downMatch[1]) {
        return -Math.abs(parseInt(downMatch[1].replace(/[.,]/g, ''), 10));
    }
    var upMatch = html.match(/t[\u0103a]ng[^0-9]{0,10}?\+?([0-9]+[.,]?[0-9]*)/i);
    if (upMatch && upMatch[1]) {
        return Math.abs(parseInt(upMatch[1].replace(/[.,]/g, ''), 10));
    }
    return 0;
};

/**
 * Parse giá gạo từ chogaomientay.com
 * Returns object { name, price } for the most common variety (IR 504)
 */
const parseRicePrice = (html) => {
    if (!html || html.length < 500) return null;
    // Try to find IR 504 price (most traded)
    var varieties = [
        { name: 'IR 504', pattern: /IR\s*504[^0-9]{0,50}?([0-9]{1,2}[.,][0-9]{3})/i },
        { name: 'Jasmine', pattern: /Jasmine[^0-9]{0,50}?([0-9]{1,2}[.,][0-9]{3})/i },
        { name: 'ST25', pattern: /ST\s*25[^0-9]{0,50}?([0-9]{1,2}[.,][0-9]{3})/i },
        { name: 'Đài Thơm 8', pattern: /Đài\s*Thơm[^0-9]{0,50}?([0-9]{1,2}[.,][0-9]{3})/i }
    ];
    for (var i = 0; i < varieties.length; i++) {
        var m = html.match(varieties[i].pattern);
        if (m && m[1]) {
            var price = parseInt(m[1].replace(/[.,]/g, ''), 10);
            if (price > 3000 && price < 30000) { // valid rice price range đ/kg
                return { name: varieties[i].name, price: price };
            }
        }
    }
    return null;
};

exports.handler = async function (event, context) {
    if (event.httpMethod === 'OPTIONS') {
        return { statusCode: 204, headers: { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'GET, OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type' }, body: '' };
    }
    try {
        // Fetch multiple pages in parallel:
        // - noi-dia: domestic coffee price ("trung bình XX,XXX")
        // - truc-tuyen: live world prices (data-price attributes in livequote tables)
        // - pepper: giatieu.com
        // - rice: chogaomientay.com
        const results = await Promise.all([
            fetchViaProxy('https://giacaphe.com/gia-ca-phe-noi-dia/', 12000),
            fetchViaProxy('https://giacaphe.com/gia-ca-phe-truc-tuyen/', 12000),
            fetchViaProxy('https://giatieu.com/gia-tieu-hom-nay/', 10000),
            fetchViaProxy('https://chogaomientay.com/bang-gia-gao-hom-nay/', 8000)
        ]);

        const noiDiaHtml = results[0];
        const trucTuyenHtml = results[1];
        const pepperHtml = results[2];
        const riceHtml = results[3];

        // Parse from each source — gracefully handle null HTML
        var coffee = null, coffeeChange = null, coffeeRegions = [];
        var coffeeWorld = null, arabica = null, robustaChange = null, arabicaChange = null;
        var pepper = null, pepperChange = null;
        var rice = null;

        // Domestic coffee from noi-dia page
        if (noiDiaHtml) {
            coffee = parseCoffeePrice(noiDiaHtml);
            coffeeRegions = parseCoffeeRegions(noiDiaHtml);
            coffeeChange = parseCoffeeChange(noiDiaHtml);
        }

        // World prices from truc-tuyen page
        if (trucTuyenHtml) {
            coffeeWorld = parseCoffeeWorld(trucTuyenHtml);
            arabica = parseArabicaPrice(trucTuyenHtml);
            robustaChange = parseRobustaChange(trucTuyenHtml);
            arabicaChange = parseArabicaChange(trucTuyenHtml);
        }

        // Pepper from giatieu.com
        if (pepperHtml) {
            pepper = parsePepperPrice(pepperHtml);
            pepperChange = parsePepperChange(pepperHtml);
        }

        // Rice from chogaomientay.com
        if (riceHtml) {
            rice = parseRicePrice(riceHtml);
        }

        // Return whatever data we managed to get (at least one field should have data)
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
                    coffee: coffee,
                    coffeeWorld: coffeeWorld,
                    coffeeRegions: coffeeRegions,
                    coffeeChange: coffeeChange,
                    arabica: arabica,
                    robustaChange: robustaChange,
                    arabicaChange: arabicaChange,
                    pepper: pepper,
                    pepperChange: pepperChange,
                    rice: rice,
                    timestamp: new Date().toISOString()
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
