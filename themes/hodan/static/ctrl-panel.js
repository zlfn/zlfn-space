(function() {
    var needleX = document.getElementById('needle-x');
    var needleY = document.getElementById('needle-y');
    var labelX = document.getElementById('ctrl-x');
    var labelY = document.getElementById('ctrl-y');
    var barAz = document.getElementById('bar-az');
    var barEl = document.getElementById('bar-el');
    var barVx = document.getElementById('bar-vx');
    var barVy = document.getElementById('bar-vy');
    if (!needleX || !needleY) return;

    var lastX = 0, lastY = 0;

    // Oscilloscope
    var canvas = document.getElementById('scope-canvas');
    var ctx = canvas ? canvas.getContext('2d') : null;
    var scopeW = 300, scopeH = 120;
    var bufferX = new Array(scopeW).fill(scopeH / 2);
    var bufferY = new Array(scopeW).fill(scopeH / 2);
    var writePos = 0;

    function drawScope() {
        if (!ctx) return;
        ctx.clearRect(0, 0, scopeW, scopeH);

        // Grid
        ctx.strokeStyle = 'rgba(99, 41, 68, 0.5)';
        ctx.lineWidth = 0.5;
        for (var gx = 0; gx < scopeW; gx += 30) {
            ctx.beginPath(); ctx.moveTo(gx, 0); ctx.lineTo(gx, scopeH); ctx.stroke();
        }
        for (var gy = 0; gy < scopeH; gy += 20) {
            ctx.beginPath(); ctx.moveTo(0, gy); ctx.lineTo(scopeW, gy); ctx.stroke();
        }

        // X waveform (teal)
        ctx.strokeStyle = 'rgba(75, 147, 149, 0.9)';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        for (var i = 0; i < scopeW; i++) {
            var idx = (writePos + i) % scopeW;
            if (i === 0) ctx.moveTo(i, bufferX[idx]);
            else ctx.lineTo(i, bufferX[idx]);
        }
        ctx.stroke();

        // Y waveform (peach)
        ctx.strokeStyle = 'rgba(247, 170, 95, 0.9)';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        for (var j = 0; j < scopeW; j++) {
            var jdx = (writePos + j) % scopeW;
            if (j === 0) ctx.moveTo(j, bufferY[jdx]);
            else ctx.lineTo(j, bufferY[jdx]);
        }
        ctx.stroke();

        requestAnimationFrame(drawScope);
    }
    if (ctx) requestAnimationFrame(drawScope);

    document.addEventListener('mousemove', function(e) {
        var ratioX = e.clientX / window.innerWidth;
        var ratioY = e.clientY / window.innerHeight;
        var dx = Math.abs(ratioX - lastX);
        var dy = Math.abs(ratioY - lastY);
        lastX = ratioX;
        lastY = ratioY;

        var angleX = ratioX * 360 - 180;
        var angleY = ratioY * 360 - 180;

        needleX.setAttribute('transform', 'rotate(' + angleX + ' 60 60)');
        needleY.setAttribute('transform', 'rotate(' + angleY + ' 60 60)');

        if (labelX) labelX.textContent = 'X: ' + String(Math.floor(ratioX * 9999)).padStart(4, '0');
        if (labelY) labelY.textContent = 'Y: ' + String(Math.floor(ratioY * 9999)).padStart(4, '0');

        if (barAz) barAz.style.width = (ratioX * 100) + '%';
        if (barEl) barEl.style.width = (ratioY * 100) + '%';
        if (barVx) barVx.style.width = Math.min(dx * 1500, 100) + '%';
        if (barVy) barVy.style.width = Math.min(dy * 1500, 100) + '%';

        // Feed oscilloscope
        bufferX[writePos] = (1 - ratioX) * scopeH;
        bufferY[writePos] = ratioY * scopeH;
        writePos = (writePos + 1) % scopeW;
    });
})();
