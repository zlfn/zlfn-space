(function() {
    var el = document.getElementById('ctrl-sysinfo');
    if (!el) return;

    var lines = [];

    // Platform
    lines.push('PLATFORM: ' + (navigator.platform || '---'));
    lines.push('UA: ' + (navigator.userAgent.split(' ').slice(-2).join(' ') || '---'));
    lines.push('LANG: ' + (navigator.language || '---'));
    lines.push('CORES: ' + (navigator.hardwareConcurrency || '?'));
    lines.push('MEMORY: ' + (navigator.deviceMemory ? navigator.deviceMemory + 'GB' : '---'));
    lines.push('SCREEN: ' + screen.width + 'x' + screen.height);
    lines.push('DEPTH: ' + screen.colorDepth + 'bit');
    lines.push('PIXEL: ' + window.devicePixelRatio + 'x');
    lines.push('TOUCH: ' + (navigator.maxTouchPoints > 0 ? 'YES(' + navigator.maxTouchPoints + ')' : 'NO'));

    // Network
    var conn = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
    if (conn) {
        lines.push('NET: ' + (conn.effectiveType || '---').toUpperCase());
        if (conn.downlink) lines.push('DL: ' + conn.downlink + 'Mbps');
        if (conn.rtt) lines.push('RTT: ' + conn.rtt + 'ms');
        lines.push('SAVER: ' + (conn.saveData ? 'ON' : 'OFF'));
    } else {
        lines.push('NET: ' + (navigator.onLine ? 'ONLINE' : 'OFFLINE'));
    }

    // Features
    var features = [];
    features.push('JS:OK');
    features.push('WASM:' + (typeof WebAssembly !== 'undefined' ? 'OK' : '--'));
    features.push('GL:' + (function() {
        try { return document.createElement('canvas').getContext('webgl2') ? 'v2' : (document.createElement('canvas').getContext('webgl') ? 'v1' : '--'); }
        catch(e) { return '--'; }
    })());
    features.push('WRK:' + (typeof Worker !== 'undefined' ? 'OK' : '--'));
    features.push('SW:' + ('serviceWorker' in navigator ? 'OK' : '--'));
    features.push('CLIP:' + (navigator.clipboard ? 'OK' : '--'));
    features.push('MIDI:' + (navigator.requestMIDIAccess ? 'OK' : '--'));
    features.push('BT:' + (navigator.bluetooth ? 'OK' : '--'));
    features.push('USB:' + (navigator.usb ? 'OK' : '--'));
    features.push('GPS:' + (navigator.geolocation ? 'OK' : '--'));
    features.push('NFC:' + ('NDEFReader' in window ? 'OK' : '--'));
    features.push('GYRO:' + ('DeviceOrientationEvent' in window ? 'OK' : '--'));
    features.push('SHARE:' + (navigator.share ? 'OK' : '--'));
    features.push('NOTIF:' + ('Notification' in window ? 'OK' : '--'));
    features.push('WAKE:' + ('wakeLock' in navigator ? 'OK' : '--'));

    lines.push('');
    lines.push('FEATURES:');
    // Group features 3 per line
    for (var i = 0; i < features.length; i += 3) {
        lines.push(features.slice(i, i + 3).join(' '));
    }

    // Time
    var now = new Date();
    lines.push('');
    lines.push('TZ: UTC' + (now.getTimezoneOffset() > 0 ? '-' : '+') + Math.abs(now.getTimezoneOffset() / 60));
    lines.push('BOOT: ' + now.toISOString().slice(0, 19).replace('T', ' '));

    el.textContent = lines.join('\n');
})();
