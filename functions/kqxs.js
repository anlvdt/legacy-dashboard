const https = require('https');
const http = require('http');

const fetchHTML = (url, followRedirects = 3) => new Promise((resolve) => {
    const lib = url.startsWith('https') ? https : http;
    lib.get(url, { headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' } }, (res) => {
        if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location && followRedirects > 0) {
            return resolve(fetchHTML(res.headers.location, followRedirects - 1));
        }
        let data = '';
        res.on('data', (chunk) => data += chunk);
        res.on('end', () => resolve(data));
    }).on('error', () => resolve(''));
});

// Helper: Extract Prize
const extractTBody = (html, regexDB, regexG1, regionName) => {
    const matchDB = html.match(regexDB);
    const matchG1 = html.match(regexG1);

    // Tìm ngày
    let dateStr = "Hôm nay";
    const matchDate = html.match(/<h2[^>]*>.*?([0-9]{1,2}\/[0-9]{1,2}\/[0-9]{4}).*?<\/h2>/i);
    if (matchDate && matchDate[1]) dateStr = matchDate[1];

    if (!matchDB || !matchDB[1]) return null;

    return {
        province: regionName,
        date: dateStr,
        dacbiet: matchDB[1],
        giai1: matchG1 ? matchG1[1] : "---"
    };
};

exports.handler = async function (event, context) {
    const providers = [
        // 1. Primary: XSKT.com.vn HTML Scraper
        async () => {
            const [htmlMB, htmlMT, htmlMN] = await Promise.all([
                fetchHTML('https://xskt.com.vn/xsmb'),
                fetchHTML('https://xskt.com.vn/xsmt'),
                fetchHTML('https://xskt.com.vn/xsmn')
            ]);

            // XSKT uses <em> for MB but <b> for MT/MN special prizes
            const regexDB = /title="Giải ĐB"[^>]*>ĐB<\/td>\s*<td[^>]*>.*?<(?:em|b)>([0-9]+)<\/(?:em|b)>/i;
            const regexG1 = /title="Giải nhất"[^>]*>G1<\/td>\s*<td[^>]*>.*?<(?:p|b)>([0-9]+)<\/(?:p|b)>/i;

            // Miền Trung / Nam có nhiều tỉnh, ta chỉ lấy tỉnh đầu tiên hiện lên
            const regexDBD_MTMN = /title="Giải ĐB"[^>]*>ĐB<\/td>\s*<td[^>]*>.*?<(?:em|b)>([0-9]+)<\/(?:em|b)>/i;
            const regexG1_MTMN = /title="Giải nhất"[^>]*>G1<\/td>\s*<td[^>]*>.*?<(?:p|b)>([0-9]+)<\/(?:p|b)>/i;

            const mb = extractTBody(htmlMB, regexDB, regexG1, "Miền Bắc");
            const mt = extractTBody(htmlMT, regexDBD_MTMN, regexG1_MTMN, "Miền Trung (Tỉnh 1)");
            const mn = extractTBody(htmlMN, regexDBD_MTMN, regexG1_MTMN, "Miền Nam (Tỉnh 1)");

            if (!mb && !mt && !mn) {
                throw new Error("No valid data received from xskt HTML");
            }

            return { mb, mt, mn, timestamp: new Date().toISOString(), source: "xskt.com.vn" };
        },
        // 2. Fallback: Mocked fallback logic
        async () => {
            return {
                mb: { province: "Miền Bắc (Dự phòng)", date: "Hôm nay", dacbiet: "---", giai1: "---" },
                mt: null,
                mn: null,
                timestamp: new Date().toISOString(),
                source: "Fallback Node"
            };
        }
    ];

    let finalResponse = null;
    let fallbackError = null;

    for (const provider of providers) {
        try {
            const result = await provider();
            if (result && (result.mb || result.mt || result.mn)) {
                finalResponse = result;
                break; // Thành công, kết thúc vòng lặp
            }
        } catch (error) {
            fallbackError = error;
            console.log(`[Redundancy KQXS] Provider failed, moving to next... ${error.message}`);
            continue;
        }
    }

    if (finalResponse) {
        return {
            statusCode: 200,
            headers: {
                'Access-Control-Allow-Origin': '*',
                'Content-Type': 'application/json; charset=utf-8'
            },
            body: JSON.stringify(finalResponse)
        };
    } else {
        return {
            statusCode: 500,
            headers: { 'Access-Control-Allow-Origin': '*' },
            body: JSON.stringify({ error: "Lỗi kết nối toàn bộ API vé số: " + (fallbackError ? fallbackError.message : "Unknown") }),
        };
    }
};
