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
        ['BTC',      'bê tê xê'],
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
        ['UNESCO',   'u nét cô'],
        ['UNICEF',   'u ni xép'],
        ['WHO',      'vê kép hát ô'],
        ['WTO',      'vê kép tê ô'],
        ['IMF',      'i em ép'],
        ['WB',       'vê kép bê'],
        ['EU',       'ê u'],
        ['UN',       'u en'],
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
        ['MSI',      'em ét i'],
        ['Razer',    'rây dơ'],

        // Xe điện & năng lượng
        ['BYD',      'bê i-grét đê'],
        ['CATL',     'xê a tê eo'],
        ['Rivian',   'ri vi ần'],
        ['Lucid',    'lu xít'],
        ['NIO',      'ni ô'],
        ['Hyundai',  'hiên đê'],
        ['Kia',      'ki a'],
        ['VinFast',  'vin phát'],
        ['Land Cruiser', 'len cru dơ'],
        ['Toyota',   'tô yô ta'],
        ['Honda',    'hon đa'],
        ['Mazda',    'mát đa'],
        ['BMW',      'bê em vê kép'],
        ['Mercedes', 'mẹc xê đét'],
        ['Porsche',  'po sơ'],
        ['Audi',     'ao đi'],
        ['Lexus',    'lếch xớt'],

        // Model names & suffixes
        ['Pro Max',  'prô mắc'],
        ['Ultra',    'ân tra'],
        ['Plus',     'plớt'],
        ['Mini PC',  'mi ni pê xê'],
        ['Mini Pro', 'mi ni prô'],
        ['Mini',     'mi ni'],
        ['Pro',      'prô'],
        ['Max',      'mắc'],
        ['Lite',     'lai'],
        ['Elite',    'ê lít'],
        ['Air',      'e'],
        ['SE',       'ét i'],
        ['4K',       'bốn kê'],
        ['8K',       'tám kê'],
        ['2K',       'hai kê'],
        ['1080p',    'một không tám không pê'],
        ['720p',     'bảy hai không pê'],

        // Chip & phần cứng
        ['Snapdragon 8 Elite', 'snép đờ ra gần tám ê lít'],
        ['Snapdragon', 'snép đờ ra gần'],
        ['Ryzen',    'rai dần'],
        ['Core Ultra', 'co ân tra'],
        ['Core i9',  'co ai chín'],
        ['Core i7',  'co ai bảy'],
        ['Core i5',  'co ai năm'],
        ['Core i3',  'co ai ba'],
        ['Dimensity',  'đi men xi ti'],
        ['Exynos',     'éc xi nốt'],
        ['Kirin',      'ki rin'],
        ['MediaTek',   'mê đia tếch'],
        ['Qualcomm',   'quân com'],
        ['NVIDIA',     'en vi đia'],
        ['GeForce',    'gờ phót'],
        ['Radeon',     'ra đi ôn'],
        ['Intel',      'in teo'],
        ['AMD',        'a em đê'],
        ['ARM',        'a e-rờ em'],
        ['TSMC',       'tê ét em xê'],
        ['RAM',        'ram'],
        ['ROM',        'rom'],
        ['SSD',        'ét ét đê'],
        ['HDD',        'hát đê đê'],
        ['USB',        'u ét bê'],
        ['HDMI',       'hát đê em i'],
        ['GPU',        'giê pê u'],
        ['CPU',        'xê pê u'],
        ['NPU',        'en pê u'],
        ['TPU',        'tê pê u'],
        ['SoC',        'ét ô xê'],
        ['OLED',       'ô lét'],
        ['AMOLED',     'a mô lét'],
        ['MiniLED',    'mi ni lét'],
        ['MicroLED',   'mai crô lét'],
        ['LED',        'lét'],
        ['LCD',        'eo xê đê'],
        ['LiDAR',      'lai đa'],
        ['eSIM',       'i sim'],
        ['NVMe',       'en vê em ê'],
        ['PCIe',       'pê xê i ê'],
        ['DDR5',       'đê đê e-rờ năm'],
        ['DDR4',       'đê đê e-rờ bốn'],

        // Mạng & kết nối
        ['WiFi',     'uai fai'],
        ['Wi-Fi',    'uai fai'],
        ['Bluetooth', 'blú tút'],
        ['5G',       'năm gờ'],
        ['4G',       'bốn gờ'],
        ['3G',       'ba gờ'],
        ['6G',       'sáu gờ'],
        ['NFC',      'en ép xê'],
        ['VPN',      'vê pê en'],
        ['DNS',      'đê en ét'],
        ['IP',       'i pê'],
        ['LTE',      'eo tê ê'],
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
        ['Claude',   'clôt'],
        ['Llama',    'la ma'],
        ['Mistral',  'mít trồ'],
        ['Copilot',  'cô pai lốt'],
        ['Gemma',    'gê ma'],
        ['Phi-3',    'fai ba'],
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
        ['API',      'a pê i'],
        ['SDK',      'ét đê ca'],
        ['IDE',      'i đê ê'],
        ['AWS',      'a vê kép ét'],
        ['GCP',      'gờ xê pê'],
        ['UI',       'u i'],
        ['UX',       'u ích'],
        ['AI',       'a i'],
        ['ML',       'em eo'],
        ['LLM',      'eo eo em'],
        ['AR',       'a e-rờ'],
        ['VR',       'vê a'],
        ['XR',       'éc a'],
        ['IoT',      'i ô tê'],
        ['NFT',      'en ép tê'],
        ['Web3',     'uép ba'],
        ['DeFi',     'đê fai'],
        ['Blockchain', 'blóc chen'],
        ['Bitcoin',  'bít coin'],
        ['Ethereum', 'i thê ri ầm'],
        ['crypto',   'cờ ríp tô'],
        ['Crypto',   'cờ ríp tô'],

        // Xe điện & năng lượng
        ['PHEV',     'pê hát ê vê'],
        ['BEV',      'bê ê vê'],
        ['EV',       'ê vê'],

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
        ['PC',       'pê xê'],

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
        ['ICTNews',  'i xê tê niu'],
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
        ['Pi Network', 'pai nét uốc'],
        ['DeFi',     'đê fai'],
        ['NFT',      'en ép ti'],
        ['Web3',     'uép ba'],

        // ── Y tế & sức khỏe ─────────────────────────────────────────────────
        ['WHO',      'vê kép hát ô'],
        ['FDA',      'ép đê a'],
        ['CDC',      'xê đê xê'],
        ['PCR',      'pê xê a'],
        ['ADN',      'a đê en'],
        ['DNA',      'đê en a'],
        ['RNA',      'e-rờ en a'],
        ['HIV',      'hát i vê'],
        ['AIDS',     'ết'],
        ['ICU',      'i xê u'],
        ['MRI',      'em e-rờ i'],
        ['CT',       'xê tê'],
        ['ECG',      'ê xê giê'],
        ['BMI',      'bê em i'],
        ['vaccine',  'vắc xin'],
        ['Vaccine',  'vắc xin'],
        ['virus',    'vi rút'],
        ['Virus',    'vi rút'],
        ['COVID',    'cô vít'],
        ['Covid',    'cô vít'],
        ['Omicron',  'ô mi crôn'],
        ['Delta',    'đen ta'],
        ['pandemic', 'đại dịch'],
        ['Pandemic', 'đại dịch'],

        // ── Pháp luật & tư pháp ─────────────────────────────────────────────
        ['BLHS',     'Bộ luật Hình sự'],
        ['BLDS',     'Bộ luật Dân sự'],
        ['BLTTDS',   'Bộ luật Tố tụng dân sự'],
        ['BLTTHS',   'Bộ luật Tố tụng hình sự'],
        ['NĐ-CP',   'Nghị định Chính phủ'],
        ['NĐ',      'Nghị định'],
        ['TT-BTC',  'Thông tư Bộ Tài chính'],
        ['QĐ-TTg',  'Quyết định Thủ tướng'],
        ['QĐ',      'Quyết định'],
        ['TT',      'Thông tư'],
        ['PCCC',     'Phòng cháy chữa cháy'],
        ['ANTT',     'An ninh trật tự'],
        ['ATGT',     'An toàn giao thông'],
        ['TNGT',     'Tai nạn giao thông'],
        ['ĐKKD',     'Đăng ký kinh doanh'],
        ['GCNĐKKD',  'Giấy chứng nhận đăng ký kinh doanh'],
        ['CMND',     'Chứng minh nhân dân'],
        ['CCCD',     'Căn cước công dân'],

        // ── Giáo dục ────────────────────────────────────────────────────────
        ['ĐH',      'Đại học'],
        ['CĐ',      'Cao đẳng'],
        ['THPT',     'Trung học phổ thông'],
        ['THCS',     'Trung học cơ sở'],
        ['GDTX',     'Giáo dục thường xuyên'],
        ['IELTS',    'i eo tê ét'],
        ['TOEFL',    'tô phồ'],
        ['TOEIC',    'tô ích'],
        ['GPA',      'giê pê a'],
        ['SAT',      'ét a tê'],
        ['PhD',      'tiến sĩ'],
        ['MBA',      'em bê a'],
        ['PGS',      'Phó Giáo sư'],
        ['GS',       'Giáo sư'],
        ['TS',       'Tiến sĩ'],
        ['ThS',      'Thạc sĩ'],
        ['CN',       'Cử nhân'],

        // ── Quân sự & quốc phòng ────────────────────────────────────────────
        ['UAV',      'u a vê'],
        ['ICBM',     'i xê bê em'],
        ['NATO',     'na tô'],
        ['S-400',    'ét bốn trăm'],
        ['S-300',    'ét ba trăm'],
        ['F-35',     'ép ba mươi lăm'],
        ['F-16',     'ép mười sáu'],
        ['Su-57',    'su năm mươi bảy'],
        ['Su-35',    'su ba mươi lăm'],
        ['MiG-29',   'mích hai mươi chín'],
        ['B-52',     'bê năm mươi hai'],
        ['AK-47',    'a ka bốn mươi bảy'],
        ['RPG',      'e-rờ pê giê'],
        ['IED',      'i ê đê'],
        ['WMD',      'vê kép em đê'],
        ['THAAD',    'thát'],
        ['Patriot',  'pát tri ốt'],
        ['Aegis',    'i gít'],
        ['Shahed',   'sa hét'],
        ['Houthi',   'hu thi'],
        ['Hezbollah','hét bô la'],
        ['Hamas',    'ha mát'],
        ['Taliban',  'ta li ban'],

        // ── Bất động sản & xây dựng ─────────────────────────────────────────
        ['BĐS',     'Bất động sản'],
        ['NƠXH',    'Nhà ở xã hội'],
        ['NƠTM',    'Nhà ở thương mại'],
        ['QSDĐ',    'Quyền sử dụng đất'],
        ['GCNQSDĐ', 'Giấy chứng nhận quyền sử dụng đất'],
        ['sổ đỏ',   'sổ đỏ'],
        ['m2',       'mét vuông'],
        ['m²',       'mét vuông'],
        ['m³',       'mét khối'],
        ['km2',      'ki lô mét vuông'],
        ['km²',      'ki lô mét vuông'],
        ['ha',       'héc ta'],

        // ── Nông nghiệp & môi trường ────────────────────────────────────────
        ['ĐBSCL',    'Đồng bằng sông Cửu Long'],
        ['ĐBSH',     'Đồng bằng sông Hồng'],
        ['AQI',      'a cu i'],
        ['PM2.5',    'pê em hai phẩy năm'],
        ['PM10',     'pê em mười'],
        ['CO2',      'xê ô hai'],
        ['ESG',      'ê ét giê'],
        ['COP',      'cóp'],
        ['REDD',     'rét'],

        // ── Giao thông & hạ tầng ────────────────────────────────────────────
        ['BOT',      'bê ô tê'],
        ['BT',       'bê tê'],
        ['PPP',      'pê pê pê'],
        ['TOD',      'tê ô đê'],
        ['BRT',      'bê e-rờ tê'],
        ['MRT',      'em e-rờ tê'],
        ['LRT',      'eo e-rờ tê'],
        ['QL',       'Quốc lộ'],
        ['TL',       'Tỉnh lộ'],
        ['CT',       'Cao tốc'],

        // ── Thuật ngữ CNTT, điện thoại, AI bổ sung ──────────────────────────
        // Điện thoại & phụ kiện
        ['smartphone', 'xờ mát phôn'],
        ['Smartphone', 'xờ mát phôn'],
        ['smartwatch', 'xờ mát uốt'],
        ['Smartwatch', 'xờ mát uốt'],
        ['tablet',   'táp lét'],
        ['Tablet',   'táp lét'],
        ['laptop',   'láp tóp'],
        ['Laptop',   'láp tóp'],
        ['desktop',  'đét tóp'],
        ['Desktop',  'đét tóp'],
        ['wearable', 'ue ra bồ'],
        ['Wearable', 'ue ra bồ'],
        ['foldable', 'phôn đa bồ'],
        ['Foldable', 'phôn đa bồ'],
        ['notch',    'nóc'],
        ['bezel',    'bê dồ'],
        ['refresh rate', 'tần số quét'],
        ['Refresh Rate', 'tần số quét'],
        ['megapixel', 'mê ga píc xồ'],
        ['Megapixel', 'mê ga píc xồ'],
        ['selfie',   'xeo phi'],
        ['Selfie',   'xeo phi'],
        ['wireless', 'uai lét'],
        ['Wireless', 'uai lét'],
        ['charger',  'cha giơ'],
        ['fast charging', 'sạc nhanh'],
        ['Fast Charging', 'sạc nhanh'],
        ['MagSafe',  'mắc xây'],
        ['Qi',       'chi'],

        // AI & Machine Learning
        ['transformer', 'tran pho mơ'],
        ['Transformer', 'tran pho mơ'],
        ['neural network', 'niu rồ nét uốc'],
        ['Neural Network', 'niu rồ nét uốc'],
        ['deep learning', 'đíp lơ ninh'],
        ['Deep Learning', 'đíp lơ ninh'],
        ['machine learning', 'mơ shin lơ ninh'],
        ['Machine Learning', 'mơ shin lơ ninh'],
        ['fine-tuning', 'phai tunh ninh'],
        ['Fine-tuning', 'phai tunh ninh'],
        ['fine tuning', 'phai tunh ninh'],
        ['prompt',   'prôm'],
        ['Prompt',   'prôm'],
        ['token',    'tô kần'],
        ['Token',    'tô kần'],
        ['chatbot',  'chát bót'],
        ['Chatbot',  'chát bót'],
        ['multimodal', 'mân ti mô đồ'],
        ['Multimodal', 'mân ti mô đồ'],
        ['open source', 'mã nguồn mở'],
        ['Open Source', 'mã nguồn mở'],
        ['open-source', 'mã nguồn mở'],
        ['benchmark', 'ben mác'],
        ['Benchmark', 'ben mác'],
        ['dataset',  'đa ta xét'],
        ['Dataset',  'đa ta xét'],
        ['startup',  'xờ tát áp'],
        ['Startup',  'xờ tát áp'],
        ['cloud',    'clao'],
        ['Cloud',    'clao'],
        ['server',   'xơ vơ'],
        ['Server',   'xơ vơ'],
        ['data center', 'đa ta xen tơ'],
        ['Data Center', 'đa ta xen tơ'],
        ['chip',     'chíp'],
        ['Chip',     'chíp'],
        ['firmware', 'phơm ue'],
        ['Firmware', 'phơm ue'],
        ['update',   'áp đây'],
        ['Update',   'áp đây'],
        ['upgrade',  'áp grây'],
        ['Upgrade',  'áp grây'],
        ['feature',  'phi chơ'],
        ['Feature',  'phi chơ'],
        ['display',  'đít plây'],
        ['Display',  'đít plây'],
        ['sensor',   'xen xơ'],
        ['Sensor',   'xen xơ'],
        ['router',   'rao tơ'],
        ['Router',   'rao tơ'],
        ['modem',    'mô đem'],
        ['Modem',    'mô đem'],
        ['streaming', 'xờ tri minh'],
        ['Streaming', 'xờ tri minh'],
        ['podcast',  'pót cát'],
        ['Podcast',  'pót cát'],
        ['hashtag',  'hát tắc'],
        ['Hashtag',  'hát tắc'],
        ['trending', 'tren đinh'],
        ['Trending', 'tren đinh'],
        ['viral',    'vai rồ'],
        ['Viral',    'vai rồ'],
        ['online',   'on lai'],
        ['Online',   'on lai'],
        ['offline',  'óp lai'],
        ['Offline',  'óp lai'],
        ['download', 'đao lốt'],
        ['Download', 'đao lốt'],
        ['upload',   'áp lốt'],
        ['Upload',   'áp lốt'],
        ['backup',   'bắc áp'],
        ['Backup',   'bắc áp'],
        ['hacker',   'hắc cơ'],
        ['Hacker',   'hắc cơ'],
        ['malware',  'mao ue'],
        ['Malware',  'mao ue'],
        ['ransomware', 'ran xầm ue'],
        ['Ransomware', 'ran xầm ue'],
        ['phishing', 'phít sinh'],
        ['Phishing', 'phít sinh'],
        ['firewall', 'phai uồ'],
        ['Firewall', 'phai uồ'],
        ['encryption', 'en cờ ríp sần'],
        ['Encryption', 'en cờ ríp sần'],
        ['pixel',    'píc xồ'],
        ['Pixel',    'píc xồ'],
        ['drone',    'đờ rôn'],
        ['Drone',    'đờ rôn'],
        ['robot',    'rô bốt'],
        ['Robot',    'rô bốt'],
        ['robotics', 'rô bốt tíc'],
        ['Robotics', 'rô bốt tíc'],

        // Viết tắt tiếng Anh thông dụng trong tin tức
        ['CEO',      'xê i ô'],
        ['CTO',      'xê ti ô'],
        ['CFO',      'xê ép ô'],
        ['COO',      'xê ô ô'],
        ['IPO',      'i pê ô'],
        ['M&A',      'em và a'],
        ['GDP',      'gờ đê pê'],
        ['FDI',      'ép đê i'],
        ['ODA',      'ô đê a'],
        ['ETF',      'ê tê ép'],
        ['CPI',      'xê pê i'],
        ['FED',      'phét'],
        ['CAGR',     'xê a giê e-rờ'],
        ['ROI',      'e-rờ ô i'],
        ['P/E',      'pê trên ê'],
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

    // ── Context-aware: số + đơn vị đọc tự nhiên ──────────────────────────────

    // Ngày tháng: 22/3, 15/03/2026
    str = str.replace(/(\d{1,2})\/(\d{1,2})\/(\d{4})/g, function(_, d, m, y) {
        return 'ngày ' + parseInt(d,10) + ' tháng ' + parseInt(m,10) + ' năm ' + y;
    });
    str = str.replace(/(\d{1,2})\/(\d{1,2})/g, function(_, d, m) {
        return 'ngày ' + parseInt(d,10) + ' tháng ' + parseInt(m,10);
    });

    // Giờ: 10:30, 06h30
    str = str.replace(/(\d{1,2})[hH:](\d{2})/g, function(_, h, m) {
        return parseInt(h,10) + ' giờ ' + (parseInt(m,10) > 0 ? parseInt(m,10) + ' phút' : '');
    });

    // Số thập phân: 1,5 → một phẩy năm (chỉ khi có 1-2 chữ số sau dấu phẩy)
    str = str.replace(/(\d+),(\d{1,2})(?!\d)/g, function(_, a, b) {
        return a + ' phẩy ' + b;
    });

    // Số có dấu chấm ngăn cách hàng nghìn: 1.000, 10.000, 1.000.000
    str = str.replace(/(\d{1,3})\.(\d{3})\.(\d{3})\.(\d{3})/g, '$1$2$3$4');
    str = str.replace(/(\d{1,3})\.(\d{3})\.(\d{3})/g, '$1$2$3');
    str = str.replace(/(\d{1,3})\.(\d{3})/g, '$1$2');

    // Viết tắt có dấu chấm: TP., PGS., TS., Th.S, GS.
    str = str.replace(/\bTP\./g, 'Thành phố');
    str = str.replace(/\bPGS\.\s*/g, 'Phó Giáo sư ');
    str = str.replace(/\bGS\.\s*/g, 'Giáo sư ');
    str = str.replace(/\bTS\.\s*/g, 'Tiến sĩ ');
    str = str.replace(/\bTh\.?S\.\s*/g, 'Thạc sĩ ');
    str = str.replace(/\bBS\.\s*/g, 'Bác sĩ ');
    str = str.replace(/\bKTS\.\s*/g, 'Kiến trúc sư ');
    str = str.replace(/\bLS\.\s*/g, 'Luật sư ');

    // Đọc ký hiệu toán học / so sánh
    str = str.replace(/≥/g, ' lớn hơn hoặc bằng ');
    str = str.replace(/≤/g, ' nhỏ hơn hoặc bằng ');
    str = str.replace(/±/g, ' cộng trừ ');
    str = str.replace(/°C/g, ' độ xê');
    str = str.replace(/°F/g, ' độ ép');
    str = str.replace(/°/g, ' độ ');

    // Dấu gạch ngang giữa 2 số = "đến" (VD: 10-15 → 10 đến 15)
    str = str.replace(/(\d)\s*[-–]\s*(\d)/g, '$1 đến $2');

    // Chuẩn hóa khoảng trắng
    str = str.replace(/\s{2,}/g, ' ').replace(/^\s+|\s+$/g, '');

    return str;
};

/* ================================================================
 * EDGE TTS (Engine duy nhất)
 * ================================================================ */

/**
 * Phát text qua Edge TTS proxy — 1 request/tin, không chunking
 */
LF.tts._playEdge = function (text, voice, onEnd, onError, idx) {
    if (!text) {
        if (onEnd) { onEnd(); }
        return;
    }

    // Giới hạn 1400 ký tự để URL không quá dài
    if (text.length > 1400) { text = text.substring(0, 1400); }

    var url = LF.tts.TTS_PROXY
        + '?q=' + encodeURIComponent(text)
        + '&voice=' + encodeURIComponent(voice || 'vi-VN-HoaiMyNeural')
        + '&rate=' + encodeURIComponent('+0%');
    if (typeof console !== 'undefined' && console.log) {
        console.log('[TTS] #' + idx + ' (' + text.length + ' chars):', text.substring(0, 80));
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
 * Prefetch — disabled
 */
LF.tts._prefetchEdge = function (text, voice, idx) {
};

/**
 * Phát text qua Edge TTS — nếu lỗi thì bỏ qua (không fallback)
 */
LF.tts._speakEdgeTTS = function (text, onDone, onError, idx) {
    if (!LF.tts._isReading) {
        if (onDone) { onDone(); }
        return;
    }

    // Luân phiên giọng nam/nữ theo index bài
    var voices = ['vi-VN-HoaiMyNeural', 'vi-VN-NamMinhNeural'];
    var voice = voices[(typeof idx === 'number' ? idx : 0) % 2];

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
                // Fetch tin mới trước khi đọc
                if (LF.news && LF.news.loadMultiSource) { LF.news.loadMultiSource(); }
                if (LF.technews && LF.technews.load) { LF.technews.load(); }
                setTimeout(function () {
                    var techItems = (LF.technews && LF.technews._items) ? LF.technews._items : [];
                    if (techItems.length > 0) {
                        LF.tts.readTechNewsList(techItems, 0);
                    } else {
                        var items = (LF.news && LF.news._items) ? LF.news._items : [];
                        if (items.length > 0) { LF.tts.readNewsList(items, 0); }
                    }
                }, 3000);
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
                // Fetch tin mới trước khi đọc
                if (LF.technews && LF.technews.load) { LF.technews.load(); }
                setTimeout(function () {
                    var techItems = (LF.technews && LF.technews._items) ? LF.technews._items : [];
                    LF.tts.readTechNewsList(techItems, 0);
                }, 3000);
            }
        });
    }

    // Bật lịch hẹn giờ nếu đã cấu hình
    var current = (LF.settings && LF.settings.current) ? LF.settings.current : {};
    if (current.ttsScheduleEnabled && current.ttsScheduleTime) {
        LF.tts.scheduleDaily(current.ttsScheduleTime);
    }
};
