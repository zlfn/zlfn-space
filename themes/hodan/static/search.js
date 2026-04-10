(function() {
    var index = null;
    var searchOpen = false;

    var overlay = document.getElementById('search-overlay');
    var input = document.getElementById('search-input');
    var results = document.getElementById('search-results');
    var trigger = document.getElementById('search-trigger');

    if (!overlay || !input || !results) return;

    function openSearch() {
        if (searchOpen) return;
        searchOpen = true;
        overlay.classList.add('active');
        input.value = '';
        results.innerHTML = '<div class="search-hint">&gt; TYPE TO SEARCH_</div>';
        input.focus();
        loadIndex();
    }

    function closeSearch() {
        searchOpen = false;
        overlay.classList.remove('active');
        input.value = '';
        results.innerHTML = '';
    }

    function loadIndex() {
        if (index) return;
        var lang = window.SITE_LANG || 'ko';

        // Register dummy pipelines for languages not built into elasticlunr
        ['ko', 'ja'].forEach(function(l) {
            ['trimmer-', 'stopWordFilter-', 'stemmer-'].forEach(function(p) {
                var name = p + l;
                if (!elasticlunr.Pipeline.registeredFunctions[name]) {
                    var fn = function(t) { return t; };
                    elasticlunr.Pipeline.registerFunction(fn, name);
                }
            });
        });

        fetch('/search_index.' + lang + '.json')
            .then(function(r) { return r.ok ? r.json() : null; })
            .then(function(data) {
                if (data) index = elasticlunr.Index.load(data);
            })
            .catch(function() {});
    }

    function doSearch(query) {
        if (!query || query.length < 2) {
            results.innerHTML = '<div class="search-hint">&gt; TYPE TO SEARCH_</div>';
            return;
        }

        if (!index) return;

        var r = index.search(query, { expand: true, bool: 'OR' });
        var allResults = [];
        for (var i = 0; i < r.length; i++) {
            var doc = index.documentStore.getDoc(r[i].ref);
            if (doc) allResults.push(doc);
        }

        if (allResults.length === 0) {
            results.innerHTML = '<div class="search-hint">&gt; NO RESULTS FOUND</div>';
            return;
        }

        var html = '';
        var max = Math.min(allResults.length, 8);
        for (var m = 0; m < max; m++) {
            var d = allResults[m];
            var title = d.title || 'Untitled';
            var body = (d.body || '').substring(0, 120).replace(/</g, '&lt;') + '...';
            var url = d.id;
            try { url = new URL(d.id).pathname; } catch(e) {}
            html += '<a class="search-result" href="' + url + '">';
            html += '<div class="search-result-title">' + title + '</div>';
            html += '<div class="search-result-body">' + body + '</div>';
            html += '</a>';
        }
        results.innerHTML = html;
    }

    if (trigger) {
        trigger.addEventListener('click', function(e) {
            e.preventDefault();
            openSearch();
        });
    }

    document.addEventListener('keydown', function(e) {
        if (e.key === '/' && !searchOpen && document.activeElement.tagName !== 'INPUT' && document.activeElement.tagName !== 'TEXTAREA') {
            e.preventDefault();
            openSearch();
        }
        if (e.key === 'Escape' && searchOpen) closeSearch();
    });

    overlay.addEventListener('click', function(e) {
        if (e.target === overlay) closeSearch();
    });

    input.addEventListener('input', function() {
        doSearch(input.value);
    });
})();
