(function() {
    document.querySelectorAll('.post-content pre').forEach(function(pre) {
        var wrapper = document.createElement('div');
        wrapper.className = 'code-wrapper';
        pre.parentNode.insertBefore(wrapper, pre);
        wrapper.appendChild(pre);

        var btn = document.createElement('button');
        btn.className = 'copy-btn';
        btn.textContent = 'COPY';
        btn.addEventListener('click', function() {
            var code = pre.querySelector('code');
            var text = code ? code.textContent : pre.textContent;
            navigator.clipboard.writeText(text).then(function() {
                btn.textContent = 'DONE';
                btn.classList.add('copied');
                setTimeout(function() {
                    btn.textContent = 'COPY';
                    btn.classList.remove('copied');
                }, 1500);
            });
        });
        wrapper.appendChild(btn);
    });
})();
