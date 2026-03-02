/**
 * radio.js — Module radio cải lương xưa cho Legacy Frame
 * Dùng YouTube IFrame API để stream audio từ các video cải lương
 * Tất cả cú pháp ES5 (var, function) — không dùng let/const/arrow/template literals
 */

var LF = LF || {};

LF.radio = {};

/** Trạng thái */
LF.radio._player = null;
LF.radio._ready = false;
LF.radio._playing = false;
LF.radio._currentIndex = 0;
LF.radio._volume = 70;
LF.radio._apiLoaded = false;
LF.radio._retryCount = 0;
LF.radio._titleTimer = null;

/**
 * Danh sách kênh radio (mỗi kênh là 1 search query hoặc playlist)
 * YouTube IFrame API hỗ trợ listType: 'search' để tìm và phát tự động
 */
LF.radio.channels = [
    { name: 'Cải lương xưa', query: 'cải lương xưa trước 1975 trọn tuồng', type: 'search' },
    { name: 'Vọng cổ hay', query: 'vọng cổ hơi dài hay nhất', type: 'search' },
    { name: 'Tân cổ giao duyên', query: 'tân cổ giao duyên hay nhất', type: 'search' },
    { name: 'Ca cổ Miền Tây', query: 'ca cổ cải lương miền tây hay nhất', type: 'search' },
    { name: 'Thanh Nga', query: 'cải lương Thanh Nga trọn tuồng', type: 'search' },
    { name: 'Lệ Thủy Minh Vương', query: 'cải lương Lệ Thủy Minh Vương', type: 'search' },
    { name: 'Út Trà Ôn', query: 'vọng cổ Út Trà Ôn hay nhất', type: 'search' },
    { name: 'Phượng Hằng Châu Thanh', query: 'tân cổ Phượng Hằng Châu Thanh', type: 'search' }
];

LF.radio._currentChannel = 0;

/**
 * Tải YouTube IFrame API
 */
LF.radio._loadAPI = function () {
    if (LF.radio._apiLoaded) { return; }
    if (typeof YT !== 'undefined' && YT.Player) {
        LF.radio._apiLoaded = true;
        LF.radio._createPlayer();
        return;
    }

    LF.radio._apiLoaded = true;
    var tag = document.createElement('script');
    tag.src = 'https://www.youtube.com/iframe_api';
    var first = document.getElementsByTagName('script')[0];
    if (first && first.parentNode) {
        first.parentNode.insertBefore(tag, first);
    }
};

/**
 * Callback toàn cục khi YouTube API sẵn sàng
 */

// Gắn callback toàn cục — YouTube API gọi window.onYouTubeIframeAPIReady
(function () {
    var _origCallback = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = function () {
        if (typeof _origCallback === 'function') { _origCallback(); }
        LF.radio._createPlayer();
    };
})();

/**
 * Tạo YouTube player ẩn (1x1 pixel, off-screen)
 */
LF.radio._createPlayer = function () {
    if (LF.radio._player) { return; }
    if (typeof YT === 'undefined' || !YT.Player) { return; }

    var container = document.getElementById('yt-radio-player');
    if (!container) { return; }

    var channel = LF.radio.channels[LF.radio._currentChannel] || LF.radio.channels[0];

    LF.radio._player = new YT.Player('yt-radio-player', {
        height: '1',
        width: '1',
        playerVars: {
            autoplay: 0,
            controls: 0,
            disablekb: 1,
            fs: 0,
            modestbranding: 1,
            playsinline: 1,
            rel: 0,
            showinfo: 0
        },
        events: {
            onReady: function (event) {
                LF.radio._ready = true;
                event.target.setVolume(LF.radio._volume);
                // Tải kênh đầu tiên
                LF.radio._loadChannel(LF.radio._currentChannel);
            },
            onStateChange: function (event) {
                LF.radio._onStateChange(event);
            },
            onError: function (event) {
                // Video lỗi (bị xóa, chặn) → chuyển bài tiếp
                LF.radio._retryCount++;
                if (LF.radio._retryCount < 5) {
                    setTimeout(function () {
                        if (LF.radio._player && LF.radio._player.nextVideo) {
                            LF.radio._player.nextVideo();
                        }
                    }, 1000);
                }
            }
        }
    });
};

/**
 * Xử lý thay đổi trạng thái player
 */
LF.radio._onStateChange = function (event) {
    var state = event.data;

    // YT.PlayerState: PLAYING=1, PAUSED=2, ENDED=0, BUFFERING=3
    if (state === 1) {
        // Đang phát
        LF.radio._playing = true;
        LF.radio._retryCount = 0;
        LF.radio._updateUI();
        LF.radio._updateTitle();
    } else if (state === 2) {
        // Tạm dừng
        LF.radio._playing = false;
        LF.radio._updateUI();
    } else if (state === 0) {
        // Kết thúc → phát bài tiếp
        if (LF.radio._player && LF.radio._player.nextVideo) {
            LF.radio._player.nextVideo();
        }
    }
};

/**
 * Tải một kênh (search query) vào player
 * @param {number} channelIndex
 */
LF.radio._loadChannel = function (channelIndex) {
    if (!LF.radio._player || !LF.radio._ready) { return; }

    var channel = LF.radio.channels[channelIndex];
    if (!channel) { return; }

    LF.radio._currentChannel = channelIndex;

    if (channel.type === 'playlist' && channel.listId) {
        LF.radio._player.loadPlaylist({
            list: channel.listId,
            listType: 'playlist',
            index: 0,
            suggestedQuality: 'small'
        });
    } else {
        LF.radio._player.loadPlaylist({
            list: channel.query,
            listType: 'search',
            index: 0,
            suggestedQuality: 'small'
        });
    }

    LF.radio._player.setVolume(LF.radio._volume);
    LF.radio._updateChannelLabel();
};

/**
 * Cập nhật tên bài đang phát
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

/**
 * Cập nhật label kênh hiện tại
 */
LF.radio._updateChannelLabel = function () {
    var labelEl = document.getElementById('radio-channel');
    if (!labelEl) { return; }
    var channel = LF.radio.channels[LF.radio._currentChannel];
    if (channel) {
        labelEl.textContent = channel.name;
    }
};

/**
 * Cập nhật UI (nút play/pause)
 */
LF.radio._updateUI = function () {
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

/**
 * Phát / Tạm dừng
 */
LF.radio.togglePlay = function () {
    if (!LF.radio._player || !LF.radio._ready) {
        // Chưa sẵn sàng → tải API
        LF.radio._loadAPI();
        return;
    }

    if (LF.radio._playing) {
        LF.radio._player.pauseVideo();
    } else {
        LF.radio._player.playVideo();
    }
};

/**
 * Chuyển bài tiếp theo
 */
LF.radio.next = function () {
    if (!LF.radio._player || !LF.radio._ready) { return; }
    LF.radio._player.nextVideo();
};

/**
 * Chuyển bài trước
 */
LF.radio.prev = function () {
    if (!LF.radio._player || !LF.radio._ready) { return; }
    LF.radio._player.previousVideo();
};

/**
 * Chuyển kênh (cycle qua danh sách)
 */
LF.radio.nextChannel = function () {
    var next = (LF.radio._currentChannel + 1) % LF.radio.channels.length;
    LF.radio._loadChannel(next);
};

/**
 * Tăng âm lượng (+10)
 */
LF.radio.volumeUp = function () {
    LF.radio._volume = Math.min(100, LF.radio._volume + 10);
    if (LF.radio._player && LF.radio._ready) {
        LF.radio._player.setVolume(LF.radio._volume);
    }
    LF.radio._updateVolumeLabel();
};

/**
 * Giảm âm lượng (-10)
 */
LF.radio.volumeDown = function () {
    LF.radio._volume = Math.max(0, LF.radio._volume - 10);
    if (LF.radio._player && LF.radio._ready) {
        LF.radio._player.setVolume(LF.radio._volume);
    }
    LF.radio._updateVolumeLabel();
};

/**
 * Cập nhật label âm lượng
 */
LF.radio._updateVolumeLabel = function () {
    var el = document.getElementById('radio-volume');
    if (el) {
        el.textContent = LF.radio._volume + '%';
    }
};

/**
 * Dừng hoàn toàn
 */
LF.radio.stop = function () {
    if (LF.radio._player && LF.radio._ready) {
        LF.radio._player.stopVideo();
    }
    LF.radio._playing = false;
    LF.radio._updateUI();
};

/**
 * Khởi tạo radio — bind events cho các nút
 */
LF.radio.init = function () {
    // Bind play/pause
    var playBtn = document.getElementById('radio-play-btn');
    if (playBtn) {
        playBtn.addEventListener('click', function (e) {
            e.stopPropagation();
            if (!LF.radio._apiLoaded) {
                LF.radio._loadAPI();
                // Đợi API load xong rồi phát
                var waitReady = setInterval(function () {
                    if (LF.radio._ready) {
                        clearInterval(waitReady);
                        LF.radio.togglePlay();
                    }
                }, 500);
                setTimeout(function () { clearInterval(waitReady); }, 15000);
                return;
            }
            LF.radio.togglePlay();
        });
    }

    // Bind next
    var nextBtn = document.getElementById('radio-next-btn');
    if (nextBtn) {
        nextBtn.addEventListener('click', function (e) {
            e.stopPropagation();
            LF.radio.next();
        });
    }

    // Bind prev
    var prevBtn = document.getElementById('radio-prev-btn');
    if (prevBtn) {
        prevBtn.addEventListener('click', function (e) {
            e.stopPropagation();
            LF.radio.prev();
        });
    }

    // Bind channel switch
    var channelBtn = document.getElementById('radio-channel-btn');
    if (channelBtn) {
        channelBtn.addEventListener('click', function (e) {
            e.stopPropagation();
            LF.radio.nextChannel();
        });
    }

    // Bind volume
    var volUpBtn = document.getElementById('radio-vol-up');
    if (volUpBtn) {
        volUpBtn.addEventListener('click', function (e) {
            e.stopPropagation();
            LF.radio.volumeUp();
        });
    }

    var volDownBtn = document.getElementById('radio-vol-down');
    if (volDownBtn) {
        volDownBtn.addEventListener('click', function (e) {
            e.stopPropagation();
            LF.radio.volumeDown();
        });
    }

    // Cập nhật UI ban đầu
    LF.radio._updateUI();
    LF.radio._updateChannelLabel();
    LF.radio._updateVolumeLabel();
};
