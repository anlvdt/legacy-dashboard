const express = require('express');
const app = express();
const path = require('path');
const cors = require('cors');

app.use(cors());

// Phục vụ frontend (HTML/CSS/JS)
app.use(express.static(path.join(__dirname, 'public')));

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
        res.status(result.statusCode).send(result.body);
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

// Chạy server tại cổng 8080
app.listen(8080, () => {
    console.log('Dev server full-stack đang chạy mượt mà tại http://localhost:8080');
    console.log('Bạn VUI LÒNG Reload (Cmd+Shift+R) trang web để API EdgeTTS có thể phân phát Voice cao cấp.');
});
