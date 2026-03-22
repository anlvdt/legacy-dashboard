/**
 * tts.js — Module Text-to-Speech cho Legacy Frame
 * Tất cả cú pháp ES5 (var, function) — không dùng let/const/arrow/template literals
 *
 * Engine duy nhất: Edge TTS qua /.netlify/functions/tts-proxy
 * Nếu Edge TTS thất bại → chỉ cuộn tin, không đọc
 *
 * Khi đọc: tạm dừng cuộn tự động, cuộn đồng bộ tới bài đang đọc
 */

var LF = LF || {};

LF.tts = {};

/** Trạng thái */
LF.tts._isReading = false;
LF.tts._currentIndex = 0;
LF.tts._items = [];
LF.tts._readingTechNews = false;
LF.tts._scheduleTimer = null;
LF.tts._audio = null;
LF.tts._prefetchedAudio = null;
LF.tts._prefetchIndex = -1;
LF.tts.TTS_PROXY = '/.netlify/functions/tts-proxy';

/**
 * Kiểm tra hỗ trợ Audio element
 */
LF.tts.isAudioSupported = function () {
    try { return typeof Audio !== 'undefined'; } catch (e) { return false; }
};

/**
 * Backward compat — luôn trả false vì đã loại bỏ Web Speech
 */
LF.tts.isSpeechSupported = function () {
    return false;
};

/**
 * Chuẩn hóa văn bản trước khi đọc
 */
LF.tts._normalizeText = function (text) {
    if (!text) return '';
    var str = text;

    // ── Thứ tự quan trọng: dài/cụ thể trước, ngắn/chung sau ──────────────────

    var dict = [
        // Địa danh & tổ chức nhà nước
        ['TP.HCM',   'Thành phố Hồ Chí Minh'],
        ['TPHCM',    'Thành phố Hồ Chí Minh'],
        ['TP HCM',   'Thành phố Hồ Chí Minh'],
        ['UBND',     'Ủy ban nhân dân'],
        ['HĐND',     'Hội đồng nhân dân'],
        ['TTXVN',    'Thông tấn xã Việt Nam'],
        ['TANDTC',   'Tòa án nhân dân tối cao'],
        ['TAND',     'Tòa án nhân dân'],
        ['VKSND',    'Viện kiểm sát nhân dân'],
        ['CSĐT',     'Cảnh sát điều tra'],
        ['CSGT',     'Cảnh sát giao thông'],
        ['GD&ĐT',    'Giáo dục và Đào tạo'],
        ['GD-ĐT',    'Giáo dục và Đào tạo'],
        ['KH&CN',    'Khoa học và Công nghệ'],
        ['GTVT',     'Giao thông vận tải'],
        ['BHXH',     'Bảo hiểm xã hội'],
        ['BHYT',     'Bảo hiểm y tế'],
        ['NXB',      'Nhà xuất bản'],
        ['BCH',      'Ban chấp hành'],
        ['BQP',      'Bộ Quốc phòng'],
        ['BCA',      'Bộ Công an'],
        ['BTC',      'Bộ Tài chính'],
        ['BCT',      'Bộ Công thương'],
        ['BĐS',      'Bất động sản'],
        ['ĐBQH',     'Đại biểu Quốc hội'],
        ['ĐBSCL',    'Đồng bằng sông Cửu Long'],
        ['NHNN',     'Ngân hàng Nhà nước'],
        ['EVN',      'Tập đoàn Điện lực'],
        ['PVN',      'Tập đoàn Dầu khí'],
        ['TW',       'Trung ương'],
        ['HN',       'Hà Nội'],

        // ── Tổ chức quốc tế ──────────────────────────────────────────────────
        ['ASEAN',    'a xê an'],
        ['NATO',     'na tô'],
        ['UNESCO',   'diu nét cô'],
        ['UNICEF',   'diu ni xép'],
        ['WHO',      'đáp liu hát ô'],
        ['WTO',      'đáp liu ti ô'],
        ['IMF',      'ai em ép'],
        ['WB',       'đáp liu bi'],
        ['EU',       'i diu'],
        ['UN',       'diu en'],
        ['BRICS',    'bríc'],
        ['OPEC',     'ô péc'],
        ['G7',       'gờ bảy'],
        ['G20',      'gờ hai mươi'],

        // ── Thương hiệu & tên sản phẩm công nghệ ─────────────────────────────
        // Apple
        ['iPhone',   'ai phôn'],
        ['iPad',     'ai pét'],
        ['MacBook',  'mác buk'],
        ['iMac',     'ai mác'],
        ['AirPods',  'e pót'],
        ['AirTag',   'e tắc'],
        ['Apple Watch', 'áp pồ uốt'],
        ['Apple TV', 'áp pồ ti vi'],
        ['Apple Intelligence', 'áp pồ in tê li gần'],
        ['App Store', 'áp sto'],
        ['iOS',      'ai ô ét'],
        ['iPadOS',   'ai pét ô ét'],
        ['macOS',    'mác ô ét'],
        ['watchOS',  'uốt ô ét'],
        ['tvOS',     'ti vi ô ét'],
        ['visionOS', 'vi dần ô ét'],
        ['Apple',    'áp pồ'],

        // Google
        ['Google Pixel', 'gú gồ pích xồ'],
        ['Google Maps',  'gú gồ mép'],
        ['Google Drive', 'gú gồ đrai'],
        ['Google Meet',  'gú gồ mít'],
        ['Google Docs',  'gú gồ đóc'],
        ['Google',   'gú gồ'],
        ['Gmail',    'gờ meo'],
        ['YouTube',  'diu túp'],
        ['Android',  'an đờ roi'],
        ['Chrome',   'crôm'],
        ['Gemini',   'gê mi ni'],
        ['Bard',     'bát'],

        // Elon Musk ecosystem
        ['SpaceX',   'xờ pây éc'],
        ['Starlink', 'xờ ta linh'],
        ['Neuralink', 'niu ra linh'],
        ['Tesla',    'tét la'],
        ['xAI',      'éc ây ai'],

        // Microsoft
        ['Microsoft', 'mai cờ rô sốp'],
        ['Windows',  'uyn đô'],
        ['Xbox',     'éc bóc'],
        ['OneDrive', 'oan đrai'],
        ['Outlook',  'ao lúc'],
        ['Teams',    'tím'],
        ['Copilot',  'cô pai lốt'],
        ['Azure',    'a dua'],
        ['Bing',     'binh'],

        // Samsung & Android OEM
        ['Samsung',  'sam sung'],
        ['Galaxy',   'ga lắc xi'],
        ['Xiaomi',   'si ao mi'],
        ['OPPO',     'ô pô'],
        ['Vivo',     'vi vô'],
        ['Realme',   'ri ồ mi'],
        ['OnePlus',  'oan pờ lớt'],
        ['Huawei',   'hua uây'],
        ['Honor',    'ô nơ'],
        ['Motorola', 'mô tô rô la'],
        ['Nokia',    'nô kia'],
        ['Sony',     'sô ni'],
        ['LG',       'eo gờ'],
        ['Asus',     'a xút'],
        ['Lenovo',   'lê nô vô'],
        ['Dell',     'đeo'],
        ['HP',       'hát pê'],
        ['Acer',     'ây xơ'],
        ['MSI',      'em ét ai'],
        ['Razer',    'rây dơ'],

        // Xe điện & năng lượng
        ['BYD',      'bi uai đi'],
        ['CATL',     'xê ây ti eo'],
        ['Rivian',   'ri vi ần'],
        ['Lucid',    'lu xít'],
        ['NIO',      'ni ô'],
        ['Hyundai',  'hiên đê'],

        // Chip & phần cứng
        ['Snapdragon', 'snép đờ ra gần'],
        ['Dimensity',  'đi men xi ti'],
        ['Exynos',     'éc xi nốt'],
        ['Kirin',      'ki rin'],
        ['MediaTek',   'mê đia tếch'],
        ['Qualcomm',   'quân com'],
        ['NVIDIA',     'en vi đia'],
        ['GeForce',    'gờ phót'],
        ['Radeon',     'ra đi ôn'],
        ['Intel',      'in teo'],
        ['AMD',        'ây em đi'],
        ['ARM',        'a ờ em'],
        ['TSMC',       'ti ét em xi'],
        ['RAM',        'ram'],
        ['ROM',        'rom'],
        ['SSD',        'ét ét đi'],
        ['HDD',        'hát đi đi'],
        ['USB',        'diu ét bi'],
        ['HDMI',       'hát đi em ai'],
        ['GPU',        'gờ pờ diu'],
        ['CPU',        'xê pờ diu'],
        ['NPU',        'en pờ diu'],
        ['SoC',        'ét ô xê'],
        ['OLED',       'ô lét'],
        ['AMOLED',     'a mô lét'],
        ['MiniLED',    'mi ni lét'],
        ['MicroLED',   'mai crô lét'],
        ['LED',        'lét'],
        ['LCD',        'eo xê đi'],
        ['LiDAR',      'lai đa'],
        ['eSIM',       'i sim'],
        ['NVMe',       'en vi em i'],
        ['PCIe',       'pê xê ai i'],
        ['DDR5',       'đê đê a năm'],
        ['DDR4',       'đê đê a bốn'],

        // Mạng & kết nối
        ['WiFi',     'uai fai'],
        ['Wi-Fi',    'uai fai'],
        ['Bluetooth', 'blú tút'],
        ['5G',       'năm gờ'],
        ['4G',       'bốn gờ'],
        ['3G',       'ba gờ'],
        ['NFC',      'en ép xê'],
        ['VPN',      'vê pê en'],
        ['DNS',      'đê en ét'],
        ['IP',       'ai pê'],
        ['LTE',      'eo ti i'],
        ['LoRa',     'lô ra'],

        // Phần mềm & dịch vụ
        ['ChatGPT',  'chát gờ pê tê'],
        ['GPT-4',    'gờ pê tê bốn'],
        ['GPT-4o',   'gờ pê tê bốn ô'],
        ['GPT',      'gờ pê tê'],
        ['OpenAI',   'ô pần ai'],
        ['Claude',   'clôt'],
        ['Llama',    'la ma'],
        ['Mistral',  'mít trồ'],
        ['DeepSeek', 'đíp xíc'],
        ['Grok',     'grốc'],
        ['Anthropic', 'an trô píc'],
        ['Perplexity', 'pơ plếch xi ti'],
        ['Midjourney', 'mít giơ ni'],
        ['Sora',     'xô ra'],
        ['Stable Diffusion', 'xtây bồ đi phiu dần'],
        ['Runway',   'ran uây'],
        ['Cursor',   'cơ xơ'],
        ['Meta AI',  'mê ta ai'],
        ['Meta',     'mê ta'],
        ['Facebook', 'phây búc'],
        ['Instagram', 'in xờ ta gram'],
        ['TikTok',   'tíc tóc'],
        ['Twitter',  'tuýt tơ'],
        ['X.com',    'éc chấm com'],
        ['LinkedIn', 'linh đin'],
        ['Zalo',     'da lô'],
        ['Telegram', 'tê lê gram'],
        ['WhatsApp', 'uốt áp'],
        ['Spotify',  'xờ pô ti fai'],
        ['Netflix',  'nét phờ lích'],
        ['Zoom',     'zum'],
        ['Slack',    'xlắc'],
        ['Discord',  'đít cót'],
        ['Reddit',   'rét đít'],
        ['Threads',  'thrét'],
        ['Signal',   'xíc nồ'],
        ['Pinterest', 'pin tơ rét'],
        ['Twitch',   'tuých'],
        ['Steam',    'xtim'],
        ['PlayStation', 'plây xtây sần'],
        ['Nintendo', 'nin ten đô'],
        ['GitHub',   'gít hắp'],
        ['GitLab',   'gít láp'],
        ['Docker',   'đóc cơ'],
        ['Kubernetes', 'cu bơ nê tít'],
        ['Linux',    'li nớt'],
        ['Ubuntu',   'u bun tu'],
        ['Debian',   'đê bi ần'],
        ['Python',   'pai thần'],
        ['JavaScript', 'gia va xcờ ríp'],
        ['TypeScript', 'tai pờ xcờ ríp'],
        ['React',    'ri ắc'],
        ['Node.js',  'nốt gờ ét'],
        ['Rust',     'rớt'],
        ['Swift',    'xuýp'],
        ['Flutter',  'phờ lắt tơ'],
        ['Kotlin',   'cốt lin'],
        ['npm',      'en pê em'],
        ['API',      'ây pê ai'],
        ['SDK',      'ét đê kê'],
        ['IDE',      'ai đê i'],
        ['AWS',      'ây đáp liu ét'],
        ['GCP',      'gờ xê pê'],
        ['UI',       'diu ai'],
        ['UX',       'diu éc'],
        ['AI',       'ây ai'],
        ['ML',       'em eo'],
        ['LLM',      'eo eo em'],
        ['AR',       'ây a'],
        ['VR',       'vê a'],
        ['XR',       'éc a'],
        ['IoT',      'ai ô ti'],
        ['NFT',      'en ép ti'],
        ['Web3',     'uép ba'],
        ['DeFi',     'đê fai'],
        ['Blockchain', 'blóc chen'],
        ['Bitcoin',  'bít coin'],
        ['Ethereum', 'i thê ri ầm'],
        ['crypto',   'cờ ríp tô'],
        ['Crypto',   'cờ ríp tô'],

        // Xe điện & năng lượng
        ['PHEV',     'pê hát i vi'],
        ['BEV',      'bi i vi'],
        ['EV',       'i vi'],

        // Đơn vị & ký hiệu kỹ thuật
        ['GHz',      'ghi ga hét'],
        ['MHz',      'mê ga hét'],
        ['GB',       'ghi ga bai'],
        ['TB',       'tê ra bai'],
        ['MB',       'mê ga bai'],
        ['KB',       'ki lô bai'],
        ['Gbps',     'ghi ga bít mỗi giây'],
        ['Mbps',     'mê ga bít mỗi giây'],
        ['mAh',      'mi li am pe giờ'],
        ['GW',       'ghi ga oát'],
        ['MW',       'mê ga oát'],
        ['kW',       'ki lô oát'],
        ['MWh',      'mê ga oát giờ'],
        ['kWh',      'ki lô oát giờ'],
        ['Wh',       'oát giờ'],
        ['W',        'oát'],
        ['nm',       'na nô mét'],
        ['fps',      'khung hình mỗi giây'],
        ['Hz',       'hét'],
        ['ms',       'mi li giây'],

        // Tên công ty VN & quốc tế
        ['Viettel',  'viết teo'],
        ['VNPT',     'vê en pê tê'],
        ['MobiFone', 'mô bi phôn'],
        ['Vietnamobile', 'việt nam mô bai'],
        ['FPT',      'ép pê tê'],
        ['VNG',      'vê en gờ'],
        ['Vingroup', 'vin grúp'],
        ['VinFast',  'vin phát'],
        ['Momo',     'mô mô'],
        ['ZaloPay',  'da lô pây'],
        ['VNPay',    'vê en pây'],
        ['Shopee',   'sô pi'],
        ['Lazada',   'la da đa'],
        ['Tiki',     'ti ki'],
        ['Sendo',    'xen đô'],
        ['Grab',     'gráp'],
        ['Be',       'bi'],
        ['Gojek',    'gô giéc'],
        ['Tinhte',   'tinh tế'],
        ['GenK',     'ghen kê'],
        ['ICTNews',  'ai xê tê niu'],
        ['VnReview', 'vê en ri viu'],
        ['Techz',    'tếch'],
        ['CafeF',    'ca phê ép'],
        ['VnExpress', 'vê en éc pờ rét'],
        ['Zing',     'dinh'],
        ['Kenh14',   'kênh mười bốn'],
        ['Dantri',   'dân trí'],
        ['Tuoitre',  'tuổi trẻ'],
        ['Thanhnien', 'thanh niên'],
        ['VietnamNet', 'việt nam nét'],
        ['Baomoi',   'báo mới'],

        // Viết tắt tiếng Anh thông dụng trong tin tức
        ['CEO',      'xê i ô'],
        ['CTO',      'xê ti ô'],
        ['CFO',      'xê ép ô'],
        ['COO',      'xê ô ô'],
        ['IPO',      'ai pê ô'],
        ['M&A',      'em và ây'],
        ['GDP',      'gờ đê pê'],
        ['FDI',      'ép đê ai'],
        ['ODA',      'ô đê ây'],
        ['ETF',      'i ti ép'],
        ['CPI',      'xê pê ai'],
        ['FED',      'phét'],
        ['CAGR',     'xê ây gờ a'],
        ['ROI',      'a ô ai'],
        ['P/E',      'pê trên i'],
        ['USD',      'đô la Mỹ'],
        ['EUR',      'ơ rô'],
        ['GBP',      'bảng Anh'],
        ['JPY',      'yên Nhật'],
        ['CNY',      'nhân dân tệ'],
        ['VND',      'đồng'],
        ['tỷ USD',   'tỷ đô la Mỹ'],
        ['triệu USD', 'triệu đô la Mỹ'],
        ['Q1',       'quý một'],
        ['Q2',       'quý hai'],
        ['Q3',       'quý ba'],
        ['Q4',       'quý bốn'],
        ['H1',       'nửa đầu năm'],
        ['H2',       'nửa cuối năm'],
        ['vs.',      'so với'],
        ['vs',       'so với'],
        ['%',        ' phần trăm'],
        ['&',        ' và ']
    ];

    // Xóa URL trước khi replace dictionary (tránh match ký tự trong URL)
    str = str.replace(/https?:\/\/\S+/g, '');

    var i, pair, key, val;
    for (i = 0; i < dict.length; i++) {
        pair = dict[i];
        key = pair[0];
        val = pair[1];
        // Các entry ngắn (≤3 ký tự chữ/số) cần word boundary để tránh match giữa từ
        // Ví dụ: 'W' không nên match trong 'WHO', 'nm' không nên match trong 'environment'
        if (key.length <= 3 && /^[A-Za-z0-9]+$/.test(key)) {
            str = str.replace(new RegExp('\\b' + key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\b', 'g'), val);
        } else {
            str = str.split(key).join(val);
        }
    }

    // Xóa ký tự đặc biệt thừa
    str = str.replace(/[_\[\]{}|\\^~`<>]/g, ' ');
    // Chuẩn hóa khoảng trắng
    str = str.replace(/\s{2,}/g, ' ').replace(/^\s+|\s+$/g, '');

    return str;
};

/* ================================================================
 * EDGE TTS (Engine duy nhất)
 * ================================================================ */

/**
 * Phát một đoạn text qua Edge TTS proxy
 */
LF.tts._playEdge = function (text, voice, onEnd, onError, idx) {
    if (!text) {
        if (onEnd) { onEnd(); }
        return;
    }

    var url = LF.tts.TTS_PROXY
        + '?q=' + encodeURIComponent(text)
        + '&voice=' + encodeURIComponent(voice || 'vi-VN-HoaiMyNeural')
        + '&rate=' + encodeURIComponent('-15%');
    if (typeof console !== 'undefined' && console.log) {
        console.log('[TTS] Playing:', text.substring(0, 80), '| URL length:', url.length);
    }
    var audio = new Audio(url);

    LF.tts._audio = audio;

    audio.onended = function () {
        LF.tts._audio = null;
        if (onEnd) { onEnd(); }
    };

    audio.onerror = function () {
        LF.tts._audio = null;
        if (onError) { onError(); }
    };

    try { audio.play(); } catch (e) { if (onError) { onError(); } }
};

/**
 * Tải trước audio của bài tiếp theo
 */
LF.tts._prefetchEdge = function (text, voice, idx) {
    if (!text) return;
    var url = LF.tts.TTS_PROXY
        + '?q=' + encodeURIComponent(text)
        + '&voice=' + encodeURIComponent(voice || 'vi-VN-HoaiMyNeural')
        + '&rate=' + encodeURIComponent('-15%');

    var audio = new Audio();
    audio.preload = "auto";
    audio.src = url;

    LF.tts._prefetchedAudio = audio;
    LF.tts._prefetchIndex = idx;
};

/**
 * Phát text qua Edge TTS — nếu lỗi thì bỏ qua (không fallback)
 */
LF.tts._speakEdgeTTS = function (text, onDone, onError, idx) {
    if (!LF.tts._isReading) {
        if (onDone) { onDone(); }
        return;
    }

    var gender = (LF.settings && LF.settings.current && LF.settings.current.ttsVoiceGender) ? LF.settings.current.ttsVoiceGender : 'female';
    var voice = (gender === 'male') ? 'vi-VN-NamMinhNeural' : 'vi-VN-HoaiMyNeural';

    LF.tts._playEdge(
        text, voice,
        function () { if (onDone) { onDone(); } },
        function () { if (onError) { onError(); } },
        idx
    );
};

/* ================================================================
 * PUBLIC API
 * ================================================================ */

/**
 * Dừng đọc ngay lập tức
 */
LF.tts.stop = function () {
    LF.tts._isReading = false;
    LF.tts._currentIndex = 0;
    LF.tts._readingTechNews = false;

    if (LF.tts._audio) {
        try { LF.tts._audio.pause(); LF.tts._audio.src = ''; } catch (e) { }
        LF.tts._audio = null;
    }

    LF.tts._updateTTSButton(false);
    LF.tts._updateTechTTSButton(false);

    // Resume cuộn
    if (LF.news) { LF.news._scrollPaused = false; LF.news.clearHighlight(); }
    if (LF.technews) {
        LF.technews._scrollPaused = false;
        var container = document.getElementById('technews-list');
        if (container) {
            var cards = container.getElementsByClassName('technews-card');
            for (var i = 0; i < cards.length; i++) {
                cards[i].className = cards[i].className.replace(/\s*technews-card-active/g, '');
            }
        }
    }
};

/**
 * Đọc một tech news item (title + summary)
 */
LF.tts.readTechNewsItem = function (item, onEnd, idx) {
    if (!item) { if (onEnd) { onEnd(); } return; }
    // Chỉ đọc title để tránh bị cắt nửa chừng
    var fullText = LF.tts._normalizeText(item.title || '');

    // Highlight card đang đọc
    var container = document.getElementById('technews-list');
    if (container) {
        var cards = container.getElementsByClassName('technews-card');
        var i;
        for (i = 0; i < cards.length; i++) {
            cards[i].className = cards[i].className.replace(/\s*technews-card-active/g, '');
        }
        if (cards[idx]) {
            cards[idx].className = cards[idx].className + ' technews-card-active';
            // Cuộn tới card đang đọc
            if (LF.technews) { LF.technews._scrollOffset = cards[idx].offsetTop; }
        }
    }

    LF.tts._speakEdgeTTS(fullText, function () { if (onEnd) { onEnd(); } },
        function () { if (onEnd) { onEnd(); } }, idx);
};

/**
 * Đọc danh sách tech news, sau đó tự động chuyển sang tin thường
 */
LF.tts.readTechNewsList = function (items, startIndex) {
    if (!items || items.length === 0) {
        // Không có tech news → đọc tin thường luôn
        var newsItems = (LF.news && LF.news._items) ? LF.news._items : [];
        if (newsItems.length > 0) { LF.tts.readNewsList(newsItems, 0); }
        return;
    }

    LF.tts._items = items;
    LF.tts._currentIndex = (typeof startIndex === 'number') ? startIndex : 0;
    LF.tts._isReading = true;
    LF.tts._readingTechNews = true;

    // Tạm dừng cuộn tech news
    if (LF.technews) { LF.technews._scrollPaused = true; }

    LF.tts._updateTTSButton(true);
    LF.tts._updateTechTTSButton(true);
    LF.tts._readNextTech();
};

/**
 * Đọc tech news item tiếp theo
 */
LF.tts._readNextTech = function () {
    if (!LF.tts._isReading) { return; }

    var items = LF.tts._items;
    var idx = LF.tts._currentIndex;

    if (idx >= items.length) {
        // Hết tech news → chuyển sang tin thường
        LF.tts._readingTechNews = false;
        LF.tts._updateTechTTSButton(false);
        if (LF.technews) {
            LF.technews._scrollPaused = false;
            // Xóa highlight
            var container = document.getElementById('technews-list');
            if (container) {
                var cards = container.getElementsByClassName('technews-card');
                for (var i = 0; i < cards.length; i++) {
                    cards[i].className = cards[i].className.replace(/\s*technews-card-active/g, '');
                }
            }
        }
        // Chuyển sang đọc tin thường
        var newsItems = (LF.news && LF.news._items) ? LF.news._items : [];
        if (newsItems.length > 0) {
            LF.tts.readNewsList(newsItems, 0);
        } else {
            LF.tts._isReading = false;
            LF.tts._updateTTSButton(false);
        }
        return;
    }

    LF.tts.readTechNewsItem(items[idx], function () {
        if (!LF.tts._isReading) { return; }
        LF.tts._currentIndex++;
        LF.tts._readNextTech();
    }, idx);
};

/**
 * Nếu Edge TTS lỗi → skip bài này, chuyển bài tiếp (chỉ cuộn)
 */
LF.tts.readNewsItem = function (item, onEnd, idx) {
    if (!item) {
        if (onEnd) { onEnd(); }
        return;
    }

    // Chỉ đọc title để tránh bị cắt nửa chừng do text quá dài
    var fullText = LF.tts._normalizeText(item.title || '');
    if (typeof console !== 'undefined' && console.log) {
        console.log('[TTS] News #' + idx + ' raw:', (item.title || '').substring(0, 60));
        console.log('[TTS] News #' + idx + ' normalized:', fullText.substring(0, 80));
    }

    // Cuộn tới bài đang đọc
    if (LF.news && LF.news.scrollToItem) {
        LF.news.scrollToItem(idx);
    }

    LF.tts._speakEdgeTTS(
        fullText,
        function () { if (onEnd) { onEnd(); } },
        function () {
            // Edge TTS lỗi → bỏ qua, chuyển bài tiếp
            if (onEnd) { onEnd(); }
        },
        idx
    );
};

/**
 * Đọc lần lượt danh sách tin tức
 */
LF.tts.readNewsList = function (items, startIndex) {
    if (!items || items.length === 0) { return; }

    LF.tts._items = items;
    LF.tts._currentIndex = (typeof startIndex === 'number') ? startIndex : 0;
    LF.tts._isReading = true;

    // Tạm dừng cuộn tự động
    if (LF.news) { LF.news._scrollPaused = true; }

    LF.tts._updateTTSButton(true);
    LF.tts._readNext();
};

/**
 * Đọc tin tiếp theo
 */
LF.tts._readNext = function () {
    if (!LF.tts._isReading) { return; }

    var items = LF.tts._items;
    var idx = LF.tts._currentIndex;

    if (idx >= items.length) {
        LF.tts._isReading = false;
        LF.tts._updateTTSButton(false);
        // Resume cuộn tự động
        if (LF.news) {
            LF.news._scrollPaused = false;
            LF.news.clearHighlight();
        }
        return;
    }

    // Prefetch bài tiếp theo đã bị tắt — tránh double request gây rate limit
    LF.tts.readNewsItem(items[idx], function () {
        if (!LF.tts._isReading) { return; }
        LF.tts._currentIndex++;
        LF.tts._readNext();
    }, idx);
};

/* ================================================================
 * UI HELPERS
 * ================================================================ */

/**
 * Cập nhật nút TTS tech news
 */
LF.tts._updateTechTTSButton = function (isReading) {
    var speakerSvg = '<svg viewBox="0 0 24 24" width="1em" height="1em" fill="currentColor" style="vertical-align:-0.1em"><path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z"/></svg>';
    var stopSvg = '<svg viewBox="0 0 24 24" width="1em" height="1em" fill="currentColor" style="vertical-align:-0.1em"><rect x="6" y="6" width="12" height="12" rx="1"/></svg>';
    var btn = document.getElementById('technews-tts-btn');
    if (!btn) { return; }
    if (isReading) {
        btn.innerHTML = stopSvg;
        btn.title = 'Dừng đọc';
        if (btn.className.indexOf('tts-speaking') === -1) { btn.className = btn.className + ' tts-speaking'; }
    } else {
        btn.innerHTML = speakerSvg;
        btn.title = 'Đọc tin công nghệ';
        btn.className = btn.className.replace(/\s*tts-speaking/g, '');
    }
};

/**
 * Cập nhật nút TTS trên inline widget
 */
LF.tts._updateTTSButton = function (isReading) {
    var speakerSvg = '<svg viewBox="0 0 24 24" width="1em" height="1em" fill="currentColor" style="vertical-align:-0.1em"><path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z"/></svg>';
    var stopSvg = '<svg viewBox="0 0 24 24" width="1em" height="1em" fill="currentColor" style="vertical-align:-0.1em"><rect x="6" y="6" width="12" height="12" rx="1"/></svg>';

    var btn = document.getElementById('news-inline-tts-btn');
    if (btn) {
        if (isReading) {
            btn.innerHTML = stopSvg;
            btn.title = 'Dừng đọc';
            if (btn.className.indexOf('tts-speaking') === -1) {
                btn.className = btn.className + ' tts-speaking';
            }
        } else {
            btn.innerHTML = speakerSvg;
            btn.title = 'Đọc tin tức';
            btn.className = btn.className.replace(/\s*tts-speaking/g, '');
        }
    }

    // Backward compat — old button
    var oldBtn = document.getElementById('news-tts-btn');
    if (oldBtn) {
        oldBtn.innerHTML = isReading ? stopSvg : speakerSvg;
    }

    var panelBtn = document.getElementById('news-panel-read-all-btn');
    if (panelBtn) {
        panelBtn.innerHTML = isReading ? (stopSvg + ' Dừng đọc') : (speakerSvg + ' Đọc tất cả');
    }
};

/**
 * Backward compat — teleprompter overlay đã bị loại bỏ
 */
LF.tts._updateTeleprompter = function () { };
LF.tts._closeTeleprompter = function () { };

/* ================================================================
 * MORNING SCHEDULER
 * ================================================================ */

LF.tts.scheduleDaily = function (timeStr) {
    LF.tts.stopSchedule();
    if (!timeStr || timeStr.indexOf(':') === -1) { return; }

    var parts = timeStr.split(':');
    var targetHour = parseInt(parts[0], 10);
    var targetMin = parseInt(parts[1], 10);
    if (isNaN(targetHour) || isNaN(targetMin)) { return; }

    var lastFiredDate = '';

    LF.tts._scheduleTimer = setInterval(function () {
        var now = new Date();
        var h = now.getHours();
        var m = now.getMinutes();
        var dateKey = now.getFullYear() + '-' + (now.getMonth() + 1) + '-' + now.getDate();

        if (h === targetHour && m === targetMin && dateKey !== lastFiredDate) {
            lastFiredDate = dateKey;
            LF.tts._triggerMorningRead();
        }
    }, 30000);
};

LF.tts._triggerMorningRead = function () {
    var techItems = (LF.technews && LF.technews._items && LF.technews._items.length) ? LF.technews._items : [];
    var newsItems = (LF.news && LF.news._items && LF.news._items.length) ? LF.news._items : null;

    // Nếu có tech news → đọc tech trước rồi tự chuyển sang tin thường
    if (techItems.length > 0) {
        LF.tts.readTechNewsList(techItems, 0);
        return;
    }

    // Không có tech news → đọc tin thường
    if (!newsItems || newsItems.length === 0) {
        if (LF.news && LF.news.loadMultiSource) { LF.news.loadMultiSource(); }
        setTimeout(function () {
            var loaded = (LF.news && LF.news._items && LF.news._items.length) ? LF.news._items : [];
            var tech = (LF.technews && LF.technews._items && LF.technews._items.length) ? LF.technews._items : [];
            if (tech.length > 0) {
                LF.tts.readTechNewsList(tech, 0);
            } else if (loaded.length > 0) {
                LF.tts.readNewsList(loaded, 0);
            }
        }, 15000);
        return;
    }

    LF.tts.readNewsList(newsItems, 0);
};

LF.tts.stopSchedule = function () {
    if (LF.tts._scheduleTimer !== null) {
        clearInterval(LF.tts._scheduleTimer);
        LF.tts._scheduleTimer = null;
    }
};

/* ================================================================
 * INIT
 * ================================================================ */

LF.tts.init = function () {
    if (!LF.tts.isAudioSupported()) {
        var ttsBtn = document.getElementById('news-inline-tts-btn');
        if (ttsBtn) { ttsBtn.style.display = 'none'; }
        return;
    }

    // Nút TTS trên inline widget
    var ttsBtn = document.getElementById('news-inline-tts-btn');
    if (ttsBtn) {
        ttsBtn.addEventListener('click', function (e) {
            e.stopPropagation();
            if (LF.tts._isReading) {
                LF.tts.stop();
            } else {
                var items = (LF.news && LF.news._items) ? LF.news._items : [];
                if (items.length > 0) {
                    LF.tts.readNewsList(items, 0);
                }
            }
        });
    }

    // Nút TTS tech news — đọc tech news trước, hết thì đọc tin thường
    var techTtsBtn = document.getElementById('technews-tts-btn');
    if (techTtsBtn) {
        techTtsBtn.addEventListener('click', function (e) {
            e.stopPropagation();
            if (LF.tts._isReading) {
                LF.tts.stop();
            } else {
                var techItems = (LF.technews && LF.technews._items) ? LF.technews._items : [];
                LF.tts.readTechNewsList(techItems, 0);
            }
        });
    }

    // Bật lịch hẹn giờ nếu đã cấu hình
    var current = (LF.settings && LF.settings.current) ? LF.settings.current : {};
    if (current.ttsScheduleEnabled && current.ttsScheduleTime) {
        LF.tts.scheduleDaily(current.ttsScheduleTime);
    }
};
