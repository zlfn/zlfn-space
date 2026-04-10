(function() {
    var hwEl = document.getElementById('si-hw');
    var featEl = document.getElementById('si-feat');
    var mediaEl = document.getElementById('si-media');
    var timeEl = document.getElementById('si-time');
    var statEl = document.getElementById('si-stat');
    if (!timeEl) return;

    var startTime = Date.now();
    var clicks = 0, keys = 0;
    document.addEventListener('click', function() { clicks++; });
    document.addEventListener('keydown', function() { keys++; });

    function getNet() {
        var conn = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
        if (conn) {
            var type = (conn.effectiveType || '---').toUpperCase();
            var dl = conn.downlink ? conn.downlink + 'Mb' : '';
            return type + (dl ? ' ' + dl : '');
        }
        return navigator.onLine ? 'ONLINE' : 'OFFLINE';
    }

    function yn(test) { return test ? 'OK' : '--'; }

    // GPU
    var gpu = '---';
    try {
        var c = document.createElement('canvas');
        var gl = c.getContext('webgl2') || c.getContext('webgl');
        if (gl) {
            var ext = gl.getExtension('WEBGL_debug_renderer_info');
            if (ext) gpu = gl.getParameter(ext.UNMASKED_RENDERER_WEBGL);
            else gpu = gl.getParameter(gl.RENDERER);
        }
    } catch(e) {}
    if (gpu.length > 30) gpu = gpu.substring(0, 28) + '..';

    var hasGL = gpu !== '---';
    var h264 = typeof MediaRecorder !== 'undefined' && MediaRecorder.isTypeSupported('video/webm;codecs=h264');
    var vp9 = typeof MediaRecorder !== 'undefined' && MediaRecorder.isTypeSupported('video/webm;codecs=vp9');
    var av1 = typeof MediaRecorder !== 'undefined' && MediaRecorder.isTypeSupported('video/webm;codecs=av1');

    // Static: hardware
    if (hwEl) {
        hwEl.textContent = [
            'PLATFORM ' + (navigator.platform || '---') + '  LANG ' + (navigator.language || '---'),
            'DISPLAY  ' + screen.width + 'x' + screen.height + ' @' + window.devicePixelRatio + 'x  ' + screen.colorDepth + 'bit',
            'CORES ' + (navigator.hardwareConcurrency || '?') + '  MEM ' + (navigator.deviceMemory ? navigator.deviceMemory + 'GB' : '---') + '  TOUCH ' + (navigator.maxTouchPoints > 0 ? navigator.maxTouchPoints + 'pt' : 'NO'),
            'GPU ' + gpu,
        ].join('\n');
    }

    // Static: features
    if (featEl) {
        featEl.textContent = [
            'JS:' + yn(true) + ' WASM:' + yn(typeof WebAssembly !== 'undefined') + ' GL:' + yn(hasGL) + ' WRK:' + yn(typeof Worker !== 'undefined'),
            'CLIP:' + yn(!!navigator.clipboard) + ' SW:' + yn('serviceWorker' in navigator) + ' GPS:' + yn(!!navigator.geolocation) + ' GYRO:' + yn('DeviceOrientationEvent' in window),
            'SHARE:' + yn(!!navigator.share) + ' WAKE:' + yn('wakeLock' in navigator) + ' PDF:' + yn(navigator.pdfViewerEnabled) + ' NFC:' + yn('NDEFReader' in window),
        ].join('\n');
    }

    // Static: media
    if (mediaEl) {
        mediaEl.textContent = [
            'H264:' + yn(h264) + ' VP9:' + yn(vp9) + ' AV1:' + yn(av1),
            'NET ' + getNet() + '  ' + (navigator.onLine ? 'ONLINE' : 'OFFLINE'),
        ].join('\n');
    }

    // Dynamic
    function render() {
        var elapsed = Math.floor((Date.now() - startTime) / 1000);
        var h = String(Math.floor(elapsed / 3600)).padStart(2, '0');
        var m = String(Math.floor((elapsed % 3600) / 60)).padStart(2, '0');
        var s = String(elapsed % 60).padStart(2, '0');
        var now = new Date();
        var tz = 'UTC' + (now.getTimezoneOffset() > 0 ? '-' : '+') + Math.abs(now.getTimezoneOffset() / 60);

        if (timeEl) {
            timeEl.textContent = [
                tz + '  ' + now.toTimeString().slice(0, 8),
                'VIEWPORT ' + window.innerWidth + 'x' + window.innerHeight,
                'UPTIME ' + h + ':' + m + ':' + s,
            ].join('\n');
        }

        var scrollPct = Math.round(window.scrollY / (document.documentElement.scrollHeight - window.innerHeight) * 100) || 0;
        if (statEl) {
            statEl.textContent = [
                'SCROLL ' + scrollPct + '%  CLICK ' + clicks + '  KEYS ' + keys,
            ].join('\n');
        }
    }

    render();
    setInterval(render, 1000);
    window.addEventListener('scroll', render, { passive: true });
})();
