const express = require('express');
const app = express();
const path = require('path');
const cors = require('cors');

app.use(cors());
app.use(express.json());

// Phục vụ frontend (HTML/CSS/JS)
app.use(express.static(path.join(__dirname, 'public')));
// Phục vụ video output
app.use('/video-output', express.static(path.join(__dirname, 'video-gen/output')));

// Phục backend: giả lập Netlify Functions để chạy API Edge TTS
app.get('/.netlify/functions/tts-proxy', async (req, res) => {
    try {
        const ttsProxyNode = require('./functions/tts-proxy');
        // Lấy chính xác query từ URL gốc (do URL chứa string mã hóa dễ lỗi)
        const parsedUrl = new URL(req.url, `http://${req.headers.host}`);
        const qp = Object.fromEntries(parsedUrl.searchParams.entries());
        // Tạo lambda event nhái
        const event = { queryStringParameters: qp };

        // Chạy handler
        const result = await ttsProxyNode.handler(event, {});

        if (result.statusCode !== 200) {
            return res.status(result.statusCode).send(result.body);
        }

        // Áp dụng headers
        if (result.headers) {
            for (const [key, value] of Object.entries(result.headers)) {
                res.set(key, value);
            }
        }

        // Trả về file âm thanh nhị phân
        if (result.isBase64Encoded) {
            res.send(Buffer.from(result.body, 'base64'));
        } else {
            res.send(result.body);
        }
    } catch (e) {
        console.error("Lỗi nội bộ:", e);
        res.status(500).send(e.toString());
    }
});

// Helper chạy hàm Netlify chung
const runNetlifyFunction = async (req, res, handlerName) => {
    try {
        const func = require(`./functions/${handlerName}`);
        const parsedUrl = new URL(req.url, `http://${req.headers.host}`);
        const qp = Object.fromEntries(parsedUrl.searchParams.entries());
        const event = { queryStringParameters: qp };
        const result = await func.handler(event, {});

        if (result.headers) {
            for (const [key, value] of Object.entries(result.headers)) {
                res.set(key, value);
            }
        }
        if (result.isBase64Encoded) {
            res.status(result.statusCode).send(Buffer.from(result.body, 'base64'));
        } else {
            res.status(result.statusCode).send(result.body);
        }
    } catch (e) {
        console.error(`Lỗi API ${handlerName}:`, e);
        res.status(500).send(e.toString());
    }
};

app.get('/api/proxy', (req, res) => runNetlifyFunction(req, res, 'proxy'));
app.get('/api/fuel', (req, res) => runNetlifyFunction(req, res, 'fuel'));
app.get('/api/kqxs', (req, res) => runNetlifyFunction(req, res, 'kqxs'));
app.get('/api/weather', (req, res) => runNetlifyFunction(req, res, 'weather'));
app.get('/api/agriculture', (req, res) => runNetlifyFunction(req, res, 'agriculture'));
app.get('/api/youtube-search', (req, res) => runNetlifyFunction(req, res, 'youtube-search'));
app.get('/api/image-proxy', (req, res) => runNetlifyFunction(req, res, 'image-proxy'));

// === VIDEO GENERATE API (streaming progress) ===
app.post('/api/video-generate', async (req, res) => {
    res.setHeader('Content-Type', 'application/x-ndjson');
    res.setHeader('Transfer-Encoding', 'chunked');
    res.setHeader('Cache-Control', 'no-cache');

    const send = (obj) => { try { res.write(JSON.stringify(obj) + '\n'); } catch(e) {} };

    try {
        const fs = require('fs');
        const config = require('./video-gen/config');
        const fetchNews = require('./video-gen/fetch-news');
        const downloadAudio = require('./video-gen/tts-download');
        const downloadImages = require('./video-gen/image-download');
        const videoBuilder = require('./video-gen/video-builder');

        // Override config từ request
        const opts = req.body || {};
        if (opts.maxTech) config.MAX_TECH_NEWS = parseInt(opts.maxTech);
        if (opts.maxGen) config.MAX_GEN_NEWS = parseInt(opts.maxGen);

        // Ensure dirs
        if (!fs.existsSync(config.OUTPUT_DIR)) fs.mkdirSync(config.OUTPUT_DIR, { recursive: true });
        if (!fs.existsSync(config.TEMP_DIR)) fs.mkdirSync(config.TEMP_DIR, { recursive: true });

        send({ type: 'progress', pct: 5 });
        send({ type: 'log', msg: 'Đang lấy tin tức...', level: 'info' });

        const items = await fetchNews();
        if (items.length === 0) {
            send({ type: 'error', msg: 'Không có tin nào' });
            return res.end();
        }
        send({ type: 'log', msg: 'Lấy được ' + items.length + ' tin', level: 'ok' });
        send({ type: 'progress', pct: 15 });

        send({ type: 'log', msg: 'Đang tạo audio TTS...', level: 'info' });
        const audioFiles = await downloadAudio(items, config.TEMP_DIR);
        send({ type: 'progress', pct: 35 });
        send({ type: 'log', msg: 'Audio TTS xong', level: 'ok' });

        send({ type: 'log', msg: 'Đang tải ảnh nền...', level: 'info' });
        const imageFiles = await downloadImages(items.length, config.TEMP_DIR);
        send({ type: 'progress', pct: 45 });

        // Filter valid
        const validItems = [], validAudio = [], validImages = [];
        for (let i = 0; i < items.length; i++) {
            if (audioFiles[i] && imageFiles[i]) {
                validItems.push(items[i]);
                validAudio.push(audioFiles[i]);
                validImages.push(imageFiles[i]);
            }
        }
        send({ type: 'log', msg: validItems.length + '/' + items.length + ' tin hợp lệ', level: 'ok' });

        if (validItems.length === 0) {
            send({ type: 'error', msg: 'Không có tin hợp lệ' });
            return res.end();
        }

        send({ type: 'log', msg: 'Đang tạo video (Ken Burns + subtitle)...', level: 'info' });
        send({ type: 'progress', pct: 50 });

        const ts = new Date().toISOString().replace(/[-:T]/g, '').substring(0, 15);
        const videoPath = path.join(config.OUTPUT_DIR, 'news_' + ts + '.mp4');
        const srtPath = path.join(config.OUTPUT_DIR, 'news_' + ts + '.srt');

        await videoBuilder.buildVideo(validItems, validAudio, validImages, srtPath, videoPath, config.TEMP_DIR);

        send({ type: 'progress', pct: 95 });
        send({ type: 'log', msg: 'Dọn dẹp temp...', level: '' });

        // Cleanup temp
        if (fs.existsSync(config.TEMP_DIR)) {
            fs.readdirSync(config.TEMP_DIR).forEach(f => {
                try { fs.unlinkSync(path.join(config.TEMP_DIR, f)); } catch(e) {}
            });
        }

        const videoFilename = path.basename(videoPath);
        send({ type: 'progress', pct: 100 });
        send({ type: 'done', url: '/video-output/' + videoFilename, filename: videoFilename });

    } catch(err) {
        send({ type: 'error', msg: err.message });
    }
    res.end();
});

// Liệt kê video đã tạo
app.get('/api/video-list', (req, res) => {
    const fs = require('fs');
    const outputDir = path.join(__dirname, 'video-gen/output');
    if (!fs.existsSync(outputDir)) return res.json([]);
    const files = fs.readdirSync(outputDir)
        .filter(f => f.endsWith('.mp4'))
        .map(f => {
            const stat = fs.statSync(path.join(outputDir, f));
            return { name: f, size: stat.size, date: stat.mtime, url: '/video-output/' + f };
        })
        .sort((a, b) => new Date(b.date) - new Date(a.date));
    res.json(files);
});

// Chạy server tại cổng 8080
app.listen(8080, () => {
    console.log('Dev server full-stack đang chạy mượt mà tại http://localhost:8080');
    console.log('Bạn VUI LÒNG Reload (Cmd+Shift+R) trang web để API EdgeTTS có thể phân phát Voice cao cấp.');
});
