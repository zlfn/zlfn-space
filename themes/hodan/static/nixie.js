(function() {
    var tubes = document.getElementById('nixie-tubes');
    if (!tubes) return;

    function setCount(n) {
        var str = String(n).padStart(8, '0');
        var digits = tubes.querySelectorAll('.nixie-digit');
        for (var i = 0; i < digits.length && i < str.length; i++) {
            digits[i].textContent = str[i];
        }
    }

    // Show cached count immediately
    var cached = parseInt(localStorage.getItem('nixie_last') || '0');
    setCount(cached);

    // Fetch new count, then animate when boot sequence finishes
    var newCount = cached;

    fetch('https://api.counterapi.dev/v1/zlfn-space/visits/up')
        .then(function(r) { return r.ok ? r.json() : null; })
        .then(function(data) {
            if (data && data.count) {
                newCount = data.count;
                localStorage.setItem('nixie_last', newCount);
            }
        })
        .catch(function() {});

    // After boot sequence completes (~2.5s), roll up to new count
    setTimeout(function() {
        if (newCount <= cached) {
            setCount(newCount);
            return;
        }
        var current = cached;
        var step = Math.max(1, Math.floor((newCount - cached) / 20));
        var roll = setInterval(function() {
            current += step;
            if (current >= newCount) {
                current = newCount;
                clearInterval(roll);
            }
            setCount(current);
        }, 40);
    }, 2500);
})();
