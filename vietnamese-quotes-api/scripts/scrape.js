#!/usr/bin/env node
/**
 * scrape.js — Scrape ca dao, tục ngữ từ nhiều nguồn web
 * 
 * Nguồn:
 * 1. GitHub Gist "Tổng hợp ca dao tục ngữ" (tuyenld)
 * 2. loigiaihay.com — 2000 tục ngữ + 2000 ca dao
 * 3. thivien.net — Kho tàng ca dao
 *
 * Chạy: node scripts/scrape.js
 * Kết quả: scraped-quotes.json
 */
const https = require('https');
const http = require('http');
const fs = require('fs');
const path = require('path');

const OUTPUT = path.join(__dirname, '..', 'scraped-quotes.json');
const ALL_QUOTES = [];
let nextId = 200; // Start after manual quotes

function fetch(url) {
    return new Promise((resolve, reject) => {
        const mod = url.startsWith('https') ? https : http;
        const req = mod.get(url, {
            headers: { 'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36' },
            timeout: 15000
        }, (res) => {
            if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
                return fetch(res.headers.location).then(resolve).catch(reject);
            }
            if (res.statusCode !== 200) return reject(new Error('HTTP ' + res.statusCode));
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => resolve(data));
        });
        req.on('error', reject);
        req.on('timeout', () => { req.destroy(); reject(new Error('Timeout')); });
    });
}

// ------- SOURCE 1: GitHub Gist (tuyenld) -------
async function scrapeGist() {
    console.log('📥 Fetching GitHub Gist...');
    const urls = [
        'https://gist.githubusercontent.com/tuyenld/5765375f26e804189b470c5910440e10/raw/cadao-tuc-ngu.txt',
    ];

    for (const url of urls) {
        try {
            const text = await fetch(url);
            const entries = text.split('**').map(e => e.trim()).filter(e => e.length > 5 && e.length < 300);
            console.log('  Found ' + entries.length + ' entries from Gist');

            entries.forEach(entry => {
                // Clean up
                const clean = entry.replace(/^\d+\.\s*/, '').trim();
                if (clean.length < 5 || clean.length > 300) return;

                ALL_QUOTES.push({
                    id: nextId++,
                    text: clean,
                    author: clean.includes(',') && clean.split(',').length <= 3 ? 'Ca dao' : 'Tục ngữ',
                    category: categorize(clean),
                    source: 'GitHub Gist "Tổng hợp ca dao tục ngữ Việt Nam" (tuyenld) — Truyền khẩu dân gian'
                });
            });
        } catch (e) {
            console.log('  ⚠️ Gist failed:', e.message);
        }
    }
}

// ------- SOURCE 2: thivien.net -------
async function scrapeThiVien() {
    console.log('📥 Fetching thivien.net...');
    const pages = [
        'https://www.thivien.net/tuc-ngu-viet-nam/T%E1%BB%A5c-ng%E1%BB%AF-Vi%E1%BB%87t-Nam-ch%E1%BB%A7-%C4%91%E1%BB%81-v%E1%BB%81-gia-%C4%91%C3%ACnh/group-VWl4VHlB0e7xh4wN8L7BjQ',
    ];

    for (const url of pages) {
        try {
            const html = await fetch(url);
            // Extract poem lines from thivien.net structure
            const regex = /<div class="poem-content">([^<]+)<\/div>/g;
            let match;
            let count = 0;
            while ((match = regex.exec(html)) !== null) {
                const text = match[1].replace(/&[a-z]+;/g, ' ').trim();
                if (text.length > 5 && text.length < 300) {
                    ALL_QUOTES.push({
                        id: nextId++,
                        text: text,
                        author: 'Ca dao',
                        category: categorize(text),
                        source: 'thivien.net — Kho tàng ca dao Việt Nam, truyền khẩu dân gian'
                    });
                    count++;
                }
            }
            console.log('  Found ' + count + ' entries from thivien.net');
        } catch (e) {
            console.log('  ⚠️ thivien.net failed:', e.message);
        }
    }
}

// ------- AUTO CATEGORIZE -------
function categorize(text) {
    const t = text.toLowerCase();

    if (/cha|mẹ|con|anh em|chị|vợ|chồng|gia đình|phụ|mẫu|thân/.test(t)) return 'gia-dinh';
    if (/học|thầy|trò|sách|chữ|biết|dốt|khôn|hay/.test(t)) return 'hoc-tap';
    if (/yêu|thương|nhớ|duyên|tình|lòng|cưới|hôn|em ơi/.test(t)) return 'tinh-yeu';
    if (/mưa|nắng|lúa|trồng|cấy|gặt|ruộng|vụ|mùa|kiến|chuồn/.test(t)) return 'mua-vu';
    if (/đức|thiện|ác|nhân|nghĩa|tốt|xấu|sạch|thơm|hiền|lành/.test(t)) return 'dao-duc';
    if (/nước|sử|vua|tướng|giặc|đánh|quân|độc lập|tổ quốc/.test(t)) return 'lich-su';

    return 'cuoc-song'; // Default
}

// ------- DEDUPLICATE -------
function deduplicate(quotes) {
    const seen = new Set();
    return quotes.filter(q => {
        const key = q.text.toLowerCase().replace(/[^a-zàáạảãăắằẳẵặâấầẩẫậèéẹẻẽêếềểễệìíịỉĩòóọỏõôốồổỗộơớờởỡợùúụủũưứừửữựỳýỵỷỹđ]/g, '').substring(0, 50);
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
    });
}

// ------- MAIN -------
async function main() {
    console.log('🔍 Scraping Vietnamese quotes from web sources...\n');

    await scrapeGist();
    await scrapeThiVien();

    // Deduplicate
    const unique = deduplicate(ALL_QUOTES);
    console.log('\n📊 Total scraped: ' + ALL_QUOTES.length);
    console.log('📊 After dedup: ' + unique.length);

    // Re-assign IDs
    unique.forEach((q, i) => { q.id = 200 + i; });

    // Write output
    fs.writeFileSync(OUTPUT, JSON.stringify(unique, null, 2), 'utf-8');
    console.log('✅ Saved to: ' + OUTPUT);
    console.log('\nTo merge with existing quotes, run: node scripts/merge.js');
}

main().catch(e => {
    console.error('Fatal error:', e);
    process.exit(1);
});
