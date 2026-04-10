(function() {
    var left = document.querySelector('.reel-left');
    var right = document.querySelector('.reel-right');
    if (!left || !right) return;

    window.addEventListener('scroll', function() {
        var deg = window.scrollY * 0.3;
        left.style.transform = 'translateY(-50%) rotate(' + (-deg) + 'deg)';
        right.style.transform = 'translateY(-50%) rotate(' + (deg) + 'deg)';
    }, { passive: true });
})();
