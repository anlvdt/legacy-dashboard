/**
 * radio.js — Module radio cải lương xưa cho Legacy Frame
 * Dùng YouTube IFrame API + proxy search để stream audio
 * Tất cả cú pháp ES5 (var, function)
 */

var LF = LF || {};

LF.radio = {};

LF.radio._player = null;
LF.radio._ready = false;
LF.radio._playing = false;
LF.radio._volume = 70;
LF.radio._apiLoaded = false;
LF.radio._retryCount = 0;
LF.radio._currentChannel = 0;
LF.radio._initDone = false;
LF.radio._pendingPlay = false;
LF.radio._videoIds = [];
LF.radio._videoIndex = 0;

LF.radio.CACHE_KEY = 'radio_videos';
LF.radio.CACHE_TTL = 3600000; // 1 giờ

/**
 * Danh sách kênh — mỗi kênh là 1 search query
 */
LF.radio.channels = [
    { name: 'Cải Lương Xưa', query: 'cải lương xưa trước 1975 trọn tuồng hay nhất' },
    { name: 'Vọng Cổ Hay', query: 'vọng cổ hơi dài hay nhất tuyển chọn' },
    { name: 'Tân Cổ Giao Duyên', query: 'tân cổ giao duyên hay nhất tuyển chọn' },
    { name: 'Ca Cổ Miền Tây', query: 'ca cổ cải lương miền tây hay nhất' },
    { name: 'Thanh Nga', query: 'cải lương Thanh Nga trọn tuồng hay nhất' },
    { name: 'Lệ Thủy Minh Vương', query: 'cải lương Lệ Thủy Minh Vương trọn tuồng' },
    { name: 'Út Trà Ôn', query: 'vọng cổ Út Trà Ôn tuyển chọn hay nhất' },
    { name: 'Châu Thanh Phượng Hằng', query: 'tân cổ Châu Thanh Phượng Hằng hay nhất' }
];

/**
 * Tải YouTube IFrame API
 */
LF.radio._loadAPI = function () {
    if (LF.radio._apiLoaded) { return; }
    LF.radio._apiLoaded = true;

    if (typeof YT !== 'undefined' && YT.Player) {
        LF.radio._onAPIReady();
        return;
    }

    var tag = document.createElement('script');
    tag.src = 'https://www.youtube.com/iframe_api';
    var first = document.getElementsByTagName('script')[0];
    if (first && first.parentNode) {
        first.parentNode.insertBefore(tag, first);
    }

    var titleEl = document.getElementById('radio-title');
    if (titleEl) { titleEl.textContent = 'Đang tải trình phát...'; }
};

/**
 * Khi YouTube API sẵn sàng
 */
LF.radio._onAPIReady = function () {
    if (LF.radio._player) { return; }
    if (typeof YT === 'undefined' || !YT.Player) { return; }

    var container = document.getElementById('yt-radio-player');
    if (!container) { return; }

    LF.radio._player = new YT.Player('yt-radio-player', {
        height: '1',
        width: '1',
        playerVars: {
            autoplay: 0,
            controls: 0,
            disablekb: 1,
            fs: 0,
            iv_load_policy: 3,
            modestbranding: 1,
            playsinline: 1,
            rel: 0
        },
        events: {
            onReady: function (event) {
                LF.radio._ready = true;
                event.target.setVolume(LF.radio._volume);
                if (LF.radio._pendingPlay) {
                    LF.radio._pendingPlay = false;
                    LF.radio._startPlaying();
                }
            },
            onStateChange: function (event) {
                LF.radio._onStateChange(event);
            },
            onError: function () {
                LF.radio._retryCount++;
                if (LF.radio._retryCount < 5) {
                    LF.radio._videoIndex++;
                    if (LF.radio._videoIndex < LF.radio._videoIds.length) {
                        setTimeout(function () {
                            LF.radio._playCurrentVideo();
                        }, 1000);
                    }
                }
            }
        }
    });
};

/**
 * Xử lý state change
 */
LF.radio._onStateChange = function (event) {
    var state = event.data;
    if (state === 1) {
        LF.radio._playing = true;
        LF.radio._retryCount = 0;
        LF.radio._updatePlayBtn();
        LF.radio._updateTitle();
    } else if (state === 2) {
        LF.radio._playing = false;
        LF.radio._updatePlayBtn();
    } else if (state === 0) {
        // Hết bài → phát bài tiếp
        LF.radio._videoIndex++;
        if (LF.radio._videoIndex >= LF.radio._videoIds.length) {
            LF.radio._videoIndex = 0;
        }
        LF.radio._playCurrentVideo();
    }
};

/**
 * Tìm video IDs qua proxy rồi phát
 */
LF.radio._startPlaying = function () {
    var ch = LF.radio.channels[LF.radio._currentChannel];
    if (!ch) { return; }

    var titleEl = document.getElementById('radio-title');
    if (titleEl) { titleEl.textContent = 'Đang tìm bài hát...'; }

    // Kiểm tra cache
    var cacheKey = LF.radio.CACHE_KEY + '_' + LF.radio._currentChannel;
    var cached = null;
    if (LF.utils && LF.utils.cacheGet) {
        cached = LF.utils.cacheGet(cacheKey, LF.radio.CACHE_TTL);
    }

    if (cached && cached.length > 0) {
        LF.radio._videoIds = cached;
        LF.radio._videoIndex = 0;
        LF.radio._shuffle(LF.radio._videoIds);
        LF.radio._playCurrentVideo();
        return;
    }

    // Fetch từ proxy
    var url = '/api/youtube-search?q=' + encodeURIComponent(ch.query) + '&n=20';
    if (LF.utils && LF.utils.makeRequest) {
        LF.utils.makeRequest(url, function (err, data) {
            if (err || !data || !data.items || data.items.length === 0) {
                if (titleEl) { titleEl.textContent = 'Không tìm thấy bài. Thử đổi kênh.'; }
                return;
            }

            var ids = [];
            for (var i = 0; i < data.items.length; i++) {
                if (data.items[i].id) {
                    ids.push(data.items[i].id);
                }
            }

            if (ids.length === 0) {
                if (titleEl) { titleEl.textContent = 'Không tìm thấy bài.'; }
                return;
            }

            // Cache kết quả
            if (LF.utils && LF.utils.cacheSet) {
                LF.utils.cacheSet(cacheKey, ids, LF.radio.CACHE_TTL);
            }

            LF.radio._videoIds = ids;
            LF.radio._videoIndex = 0;
            LF.radio._shuffle(LF.radio._videoIds);
            LF.radio._playCurrentVideo();
        }, 15000);
    }
};

/**
 * Phát video hiện tại theo index
 */
LF.radio._playCurrentVideo = function () {
    if (!LF.radio._player || !LF.radio._ready) { return; }
    if (LF.radio._videoIds.length === 0) { return; }

    var vid = LF.radio._videoIds[LF.radio._videoIndex];
    if (!vid) { return; }

    LF.radio._player.loadVideoById({
        videoId: vid,
        suggestedQuality: 'small'
    });
    LF.radio._player.setVolume(LF.radio._volume);
};

/**
 * Shuffle mảng (Fisher-Yates)
 */
LF.radio._shuffle = function (arr) {
    var i, j, tmp;
    for (i = arr.length - 1; i > 0; i--) {
        j = Math.floor(Math.random() * (i + 1));
        tmp = arr[i];
        arr[i] = arr[j];
        arr[j] = tmp;
    }
};

/**
 * Toggle play/pause
 */
LF.radio.togglePlay = function () {
    if (!LF.radio._apiLoaded) {
        LF.radio._pendingPlay = true;
        LF.radio._loadAPI();
        return;
    }
    if (!LF.radio._ready) {
        LF.radio._pendingPlay = true;
        return;
    }
    if (LF.radio._playing) {
        LF.radio._player.pauseVideo();
    } else {
        if (LF.radio._videoIds.length === 0) {
            LF.radio._startPlaying();
        } else {
            LF.radio._player.playVideo();
        }
    }
};

LF.radio.next = function () {
    if (LF.radio._videoIds.length === 0) { return; }
    LF.radio._videoIndex++;
    if (LF.radio._videoIndex >= LF.radio._videoIds.length) {
        LF.radio._videoIndex = 0;
    }
    LF.radio._playCurrentVideo();
};

LF.radio.prev = function () {
    if (LF.radio._videoIds.length === 0) { return; }
    LF.radio._videoIndex--;
    if (LF.radio._videoIndex < 0) {
        LF.radio._videoIndex = LF.radio._videoIds.length - 1;
    }
    LF.radio._playCurrentVideo();
};

LF.radio.nextChannel = function () {
    LF.radio._currentChannel = (LF.radio._currentChannel + 1) % LF.radio.channels.length;
    LF.radio._videoIds = [];
    LF.radio._videoIndex = 0;
    LF.radio._updateChannelLabel();
    if (LF.radio._ready) {
        LF.radio._startPlaying();
    }
};

LF.radio.volumeUp = function () {
    LF.radio._volume = Math.min(100, LF.radio._volume + 10);
    if (LF.radio._player && LF.radio._ready) {
        LF.radio._player.setVolume(LF.radio._volume);
    }
    LF.radio._updateVolumeLabel();
};

LF.radio.volumeDown = function () {
    LF.radio._volume = Math.max(0, LF.radio._volume - 10);
    if (LF.radio._player && LF.radio._ready) {
        LF.radio._player.setVolume(LF.radio._volume);
    }
    LF.radio._updateVolumeLabel();
};

LF.radio.stop = function () {
    if (LF.radio._player && LF.radio._ready) {
        LF.radio._player.stopVideo();
    }
    LF.radio._playing = false;
    LF.radio._updatePlayBtn();
};

/**
 * Cập nhật tên bài
 */
LF.radio._updateTitle = function () {
    var titleEl = document.getElementById('radio-title');
    if (!titleEl || !LF.radio._player) { return; }
    try {
        var data = LF.radio._player.getVideoData();
        if (data && data.title) {
            titleEl.textContent = data.title;
        } else {
            titleEl.textContent = 'Đang phát...';
        }
    } catch (e) {
        titleEl.textContent = 'Đang phát...';
    }
};

LF.radio._updateChannelLabel = function () {
    var el = document.getElementById('radio-channel');
    if (!el) { return; }
    var ch = LF.radio.channels[LF.radio._currentChannel];
    if (ch) { el.textContent = ch.name; }
};

LF.radio._updatePlayBtn = function () {
    var btn = document.getElementById('radio-play-btn');
    if (!btn) { return; }
    if (LF.radio._playing) {
        btn.innerHTML = '<svg viewBox="0 0 24 24" width="1em" height="1em" fill="currentColor"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg>';
        btn.title = 'Tạm dừng';
    } else {
        btn.innerHTML = '<svg viewBox="0 0 24 24" width="1em" height="1em" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>';
        btn.title = 'Phát';
    }
};

LF.radio._updateVolumeLabel = function () {
    var el = document.getElementById('radio-volume');
    if (el) { el.textContent = LF.radio._volume + '%'; }
};

/**
 * Khởi tạo — bind events
 */
LF.radio.init = function () {
    if (LF.radio._initDone) { return; }
    LF.radio._initDone = true;

    var ids = ['radio-play-btn', 'radio-next-btn', 'radio-prev-btn',
               'radio-channel-btn', 'radio-vol-up', 'radio-vol-down'];
    var fns = [
        function () { LF.radio.togglePlay(); },
        function () { LF.radio.next(); },
        function () { LF.radio.prev(); },
        function () { LF.radio.nextChannel(); },
        function () { LF.radio.volumeUp(); },
        function () { LF.radio.volumeDown(); }
    ];

    for (var i = 0; i < ids.length; i++) {
        (function (idx) {
            var el = document.getElementById(ids[idx]);
            if (el) {
                el.addEventListener('click', function (e) {
                    e.stopPropagation();
                    fns[idx]();
                });
            }
        })(i);
    }

    LF.radio._updatePlayBtn();
    LF.radio._updateChannelLabel();
    LF.radio._updateVolumeLabel();
};

// Callback toàn cục cho YouTube IFrame API
(function () {
    if (typeof window === 'undefined') { return; }
    var _prev = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = function () {
        if (typeof _prev === 'function') { _prev(); }
        LF.radio._onAPIReady();
    };
})();
