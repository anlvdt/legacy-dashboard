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

/**
 * Parse giá cà phê Robusta ICE London (USD/tấn)
 * Tìm pattern "Robusta London" hoặc "ICE" + số USD
 */
const parseCoffeeWorld = (html) => {
    if (!html) return null;
    // Pattern: "Robusta" ... "X,XXX" hoặc "X.XXX" USD/tấn
    const match = html.match(/[Rr]obusta[^0-9]{0,60}?(\d{1,2}[.,]\d{3})\s*(?:USD|usd|\$)/);
    if (match && match[1]) {
        return parseInt(match[1].replace(/[.,]/g, ''), 10);
    }
    // Pattern 2: "London" + giá
    const match2 = html.match(/London[^0-9]{0,40}?(\d{1,2}[.,]\d{3})/);
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
        { name: 'Đắk Lắk', aliases: ['[ĐD][aắ][kc]\\s*L[aắ][kc]', 'Dak\\s*Lak'] },
        { name: 'Lâm Đồng', aliases: ['L[aâ]m\\s*[ĐD][oồ]ng', 'Lam\\s*Dong'] },
        { name: 'Gia Lai', aliases: ['Gia\\s*Lai'] },
        { name: 'Đắk Nông', aliases: ['[ĐD][aắ][kc]\\s*N[oô]ng', 'Dak\\s*Nong'] }
    ];

    for (var i = 0; i < regionNames.length; i++) {
        var r = regionNames[i];
        for (var j = 0; j < r.aliases.length; j++) {
            try {
                // Match: region name ... price ... change (optional negative)
                var regex = new RegExp(r.aliases[j] + '[^0-9]{0,30}?([0-9]+[.,][0-9]{3})[^0-9]{0,20}?(-?[0-9]+[.,]?[0-9]*)', 'i');
                var m = html.match(regex);
                if (m && m[1]) {
                    var entry = {
                        name: r.name,
                        price: parseInt(m[1].replace(/[.,]/g, ''), 10)
                    };
                    if (m[2]) {
                        entry.change = parseInt(m[2].replace(/[.,]/g, ''), 10);
                    }
                    regions.push(entry);
                    break;
                }
            } catch (e) {
                // skip invalid regex
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
 * Tìm pattern "Arabica" ... giá hoặc data-price trong bảng Arabica
 */
const parseArabicaPrice = (html) => {
    if (!html) return null;
    // Pattern 1: data-price attribute in Arabica table
    var match = html.match(/Arabica[\s\S]{0,500}?data-price="([\d.]+)"/i);
    if (match && match[1]) {
        return parseFloat(match[1]);
    }
    // Pattern 2: "Arabica" ... "XXX.XX" cent/lb
    var match2 = html.match(/[Aa]rabica[^0-9]{0,60}?(\d{2,3}\.\d{1,2})/);
    if (match2 && match2[1]) {
        return parseFloat(match2[1]);
    }
    return null;
};

/**
 * Parse giá Hồ tiêu (VND/kg)
 * Tìm pattern "Hồ tiêu" hoặc "H. tiêu" + giá
 */
const parsePepperPrice = (html) => {
    if (!html) return null;
    // Pattern: "Hồ tiêu" ... "XXX,XXX" or "XXX.XXX"
    var match = html.match(/[Hh][ồô]\s*ti[eê]u[^0-9]{0,30}?([0-9]+[.,][0-9]{3})/i);
    if (match && match[1]) {
        return parseInt(match[1].replace(/[.,]/g, ''), 10);
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
