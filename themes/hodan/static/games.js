(function() {
    if (!document.querySelector('.hero-screen')) return;

    // === State ===
    const screen = document.querySelector('.hero-screen');
    const bootContent = screen.innerHTML;
    const W = 40, H = 20;
    let currentGame = null;
    let gameLoop = null;
    let resetting = false;
    let resetTimer = null;

    // === Utilities ===
    function emptyGrid() {
        return Array.from({length: H}, () => Array(W).fill(' '));
    }

    function renderFrame(grid, score, label) {
        const top = '┌' + '─'.repeat(W) + '┐\n';
        const bot = '└' + '─'.repeat(W) + '┘';
        const mid = grid.map(row => '│' + row.join('') + '│').join('\n') + '\n';
        return top + mid + bot + '\n ' + label + '  SCORE: ' + score + '  [ESC] QUIT';
    }

    const isTouch = navigator.maxTouchPoints > 0;

    function createGameScreen() {
        screen.innerHTML = '<pre class="game-display" id="game-display"></pre>';
        return document.getElementById('game-display');
    }

    function simulateKey(key) {
        document.dispatchEvent(new KeyboardEvent('keydown', { key: key }));
    }

    function showTouchControls(type) {
        removeTouchControls();
        if (!isTouch) return;

        var overlay = document.createElement('div');
        overlay.className = 'touch-controls';
        overlay.id = 'touch-controls';

        if (type === 'snake' || type === 'invaders') {
            // D-pad + action buttons
            overlay.innerHTML =
                '<div class="touch-dpad">' +
                    '<button class="touch-btn touch-up" data-key="ArrowUp">▲</button>' +
                    '<div class="touch-dpad-mid">' +
                        '<button class="touch-btn touch-left" data-key="ArrowLeft">◀</button>' +
                        '<button class="touch-btn touch-right" data-key="ArrowRight">▶</button>' +
                    '</div>' +
                    '<button class="touch-btn touch-down" data-key="ArrowDown">▼</button>' +
                '</div>' +
                '<div class="touch-actions">' +
                    (type === 'invaders' ? '<button class="touch-btn touch-fire" data-key=" ">FIRE</button>' : '') +
                    '<button class="touch-btn touch-esc" data-key="Escape">ESC</button>' +
                '</div>';
        } else if (type === 'pong') {
            overlay.innerHTML =
                '<div class="touch-dpad">' +
                    '<button class="touch-btn touch-up" data-key="ArrowUp">▲</button>' +
                    '<button class="touch-btn touch-down" data-key="ArrowDown">▼</button>' +
                '</div>' +
                '<div class="touch-actions">' +
                    '<button class="touch-btn touch-esc" data-key="Escape">ESC</button>' +
                '</div>';
        }

        screen.appendChild(overlay);

        // Touch event handling with repeat
        var intervals = {};
        overlay.querySelectorAll('.touch-btn').forEach(function(btn) {
            var key = btn.getAttribute('data-key');

            btn.addEventListener('touchstart', function(e) {
                e.preventDefault();
                simulateKey(key);
                if (key !== 'Escape' && key !== ' ') {
                    intervals[key] = setInterval(function() { simulateKey(key); }, 100);
                }
            });

            btn.addEventListener('touchend', function(e) {
                e.preventDefault();
                if (intervals[key]) { clearInterval(intervals[key]); delete intervals[key]; }
                if (key === 'ArrowUp' || key === 'ArrowDown') {
                    document.dispatchEvent(new KeyboardEvent('keyup', { key: key }));
                }
            });
        });
    }

    function removeTouchControls() {
        var el = document.getElementById('touch-controls');
        if (el) el.remove();
    }

    function stopGame() {
        if (gameLoop) { clearInterval(gameLoop); gameLoop = null; }
        currentGame = null;
        removeTouchControls();
    }

    // === Nixie Counter ===
    function setNixieDigits(n) {
        const tubes = document.getElementById('nixie-tubes');
        if (!tubes) return;
        const str = String(n).padStart(8, '0');
        const digits = tubes.querySelectorAll('.nixie-digit');
        for (let i = 0; i < digits.length && i < str.length; i++) {
            digits[i].textContent = str[i];
        }
    }

    function rollNixie(from, to) {
        if (to <= from) { setNixieDigits(to); return; }
        let current = from;
        const step = Math.max(1, Math.floor((to - current) / 20));
        const roll = setInterval(function() {
            current += step;
            if (current >= to) { current = to; clearInterval(roll); }
            setNixieDigits(current);
        }, 40);
    }

    // === Reset Screen ===
    function resetScreen() {
        stopGame();
        resetting = true;
        screen.innerHTML = bootContent;
        if (resetTimer) clearTimeout(resetTimer);

        let fetchDone = false, timerDone = false;
        const cachedCount = parseInt(localStorage.getItem('nixie_last') || '0');
        let newCount = cachedCount;

        fetch('https://api.counterapi.dev/v1/zlfn-space/visits/up')
            .then(r => r.ok ? r.json() : null)
            .then(data => {
                if (data && data.count) {
                    newCount = data.count;
                    localStorage.setItem('nixie_last', newCount);
                }
            })
            .catch(() => {})
            .finally(() => {
                fetchDone = true;
                if (timerDone) { rollNixie(cachedCount, newCount); resetting = false; }
            });

        resetTimer = setTimeout(() => {
            timerDone = true;
            resetTimer = null;
            if (fetchDone) { rollNixie(cachedCount, newCount); resetting = false; }
        }, 2500);
    }

    // === Snake ===
    function startSnake() {
        stopGame();
        currentGame = 'snake';
        const disp = createGameScreen();
        let snake = [{x: 10, y: 10}];
        let dir = {x: 1, y: 0}, nextDir = {x: 1, y: 0};
        let score = 0, dead = false;
        let food = spawnFood();

        function spawnFood() {
            let f;
            do { f = {x: Math.floor(Math.random() * W), y: Math.floor(Math.random() * H)}; }
            while (snake.some(s => s.x === f.x && s.y === f.y));
            return f;
        }

        function tick() {
            if (dead) return;
            dir = {...nextDir};
            const head = {x: snake[0].x + dir.x, y: snake[0].y + dir.y};
            if (head.x < 0 || head.x >= W || head.y < 0 || head.y >= H ||
                snake.some(s => s.x === head.x && s.y === head.y)) {
                dead = true; draw(); return;
            }
            snake.unshift(head);
            if (head.x === food.x && head.y === food.y) { score += 10; food = spawnFood(); }
            else { snake.pop(); }
            draw();
        }

        function draw() {
            const grid = emptyGrid();
            grid[food.y][food.x] = '■';
            for (let i = snake.length - 1; i >= 0; i--) {
                const s = snake[i];
                if (s.x >= 0 && s.x < W && s.y >= 0 && s.y < H)
                    grid[s.y][s.x] = i === 0 ? '█' : '▓';
            }
            let out = renderFrame(grid, score, 'SNAKE');
            if (dead) out += '  GAME OVER! [R] RESTART';
            disp.textContent = out;
        }

        function onKey(e) {
            if (currentGame !== 'snake') { document.removeEventListener('keydown', onKey); return; }
            switch (e.key) {
                case 'ArrowUp': case 'w': case 'W': if (dir.y !== 1) nextDir = {x:0,y:-1}; break;
                case 'ArrowDown': case 's': case 'S': if (dir.y !== -1) nextDir = {x:0,y:1}; break;
                case 'ArrowLeft': case 'a': case 'A': if (dir.x !== 1) nextDir = {x:-1,y:0}; break;
                case 'ArrowRight': case 'd': case 'D': if (dir.x !== -1) nextDir = {x:1,y:0}; break;
                case 'r': case 'R': if (dead) startSnake(); break;
                case 'Escape': resetScreen(); break;
            }
            if (['ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(e.key)) e.preventDefault();
        }
        document.addEventListener('keydown', onKey);
        draw();
        gameLoop = setInterval(tick, 120);
        showTouchControls("snake");
    }

    // === Pong ===
    function startPong() {
        stopGame();
        currentGame = 'pong';
        const disp = createGameScreen();
        const PH = 4;
        let p1 = Math.floor(H/2 - PH/2), p2 = p1;
        let ball = {x: Math.floor(W/2), y: Math.floor(H/2)};
        let bdir = {x: 1, y: 1};
        let score1 = 0, score2 = 0;
        const keys = {};

        function resetBall(dx) {
            ball = {x: Math.floor(W/2), y: Math.floor(H/2)};
            bdir = {x: dx, y: Math.random() > 0.5 ? 1 : -1};
        }

        function tick() {
            if (keys['w'] || keys['W'] || keys['ArrowUp']) p1 = Math.max(0, p1 - 1);
            if (keys['s'] || keys['S'] || keys['ArrowDown']) p1 = Math.min(H - PH, p1 + 1);
            const c2 = p2 + PH/2;
            if (c2 < ball.y) p2 = Math.min(H - PH, p2 + 1);
            if (c2 > ball.y) p2 = Math.max(0, p2 - 1);

            ball.x += bdir.x; ball.y += bdir.y;
            if (ball.y <= 0 || ball.y >= H - 1) bdir.y *= -1;
            if (ball.x === 2 && ball.y >= p1 && ball.y < p1 + PH) bdir.x = 1;
            if (ball.x === W - 3 && ball.y >= p2 && ball.y < p2 + PH) bdir.x = -1;
            if (ball.x <= 0) { score2++; resetBall(-1); }
            if (ball.x >= W - 1) { score1++; resetBall(1); }
            draw();
        }

        function draw() {
            const grid = emptyGrid();
            for (let y = 0; y < H; y++) { if (y % 2 === 0) grid[y][Math.floor(W/2)] = '┊'; }
            for (let i = 0; i < PH; i++) {
                if (p1+i < H) grid[p1+i][1] = '█';
                if (p2+i < H) grid[p2+i][W-2] = '█';
            }
            if (ball.x >= 0 && ball.x < W && ball.y >= 0 && ball.y < H) grid[ball.y][ball.x] = 'O';
            disp.textContent = renderFrame(grid, score1 + ' - ' + score2, 'PONG');
        }

        function onKeyDown(e) {
            if (currentGame !== 'pong') {
                document.removeEventListener('keydown', onKeyDown);
                document.removeEventListener('keyup', onKeyUp);
                return;
            }
            keys[e.key] = true;
            if (e.key === 'Escape') resetScreen();
            if (['ArrowUp','ArrowDown','w','s'].includes(e.key)) e.preventDefault();
        }
        function onKeyUp(e) { keys[e.key] = false; }
        document.addEventListener('keydown', onKeyDown);
        document.addEventListener('keyup', onKeyUp);
        draw();
        gameLoop = setInterval(tick, 80);
        showTouchControls("pong");
    }

    // === Space Invaders ===
    function startInvaders() {
        stopGame();
        currentGame = 'invaders';
        const disp = createGameScreen();

        let player = Math.floor(W/2);
        let playerBullet = null;
        let enemyBullets = [];
        let invaders = [], invDir = 1, invTimer = 0, invSpeed = 15;
        let score = 0, dead = false;

        // Barricades
        const barricades = [];
        const barricadeY = H - 4;
        for (const bx of [7, 15, 23, 31]) {
            for (let dy = 0; dy < 2; dy++)
                for (let dx = 0; dx < 3; dx++)
                    if (!(dy === 1 && dx === 1)) barricades.push({x: bx+dx, y: barricadeY+dy, hp: 2});
        }

        function spawnWave() {
            invaders = [];
            for (let row = 0; row < 3; row++)
                for (let col = 0; col < 8; col++)
                    invaders.push({x: 4 + col*4, y: 2 + row*2, alive: true});
        }
        spawnWave();

        function hitBarricade(bx, by) {
            for (let i = barricades.length - 1; i >= 0; i--) {
                if (barricades[i].x === bx && barricades[i].y === by) {
                    barricades[i].hp--;
                    if (barricades[i].hp <= 0) barricades.splice(i, 1);
                    return true;
                }
            }
            return false;
        }

        function tick() {
            if (dead) return;

            // Player bullet
            if (playerBullet) {
                playerBullet.y--;
                if (playerBullet.y < 0) { playerBullet = null; }
            }
            if (playerBullet) {
                for (const inv of invaders) {
                    if (inv.alive && (playerBullet.x === inv.x || playerBullet.x === inv.x+1) && playerBullet.y === inv.y) {
                        inv.alive = false; playerBullet = null; score += 100; break;
                    }
                }
            }
            if (playerBullet && hitBarricade(playerBullet.x, playerBullet.y)) playerBullet = null;

            // Enemy bullets
            for (const b of enemyBullets) b.y++;
            enemyBullets = enemyBullets.filter(b => {
                if (b.y >= H) return false;
                if (hitBarricade(b.x, b.y)) return false;
                if (b.y === H-1 && b.x >= player-1 && b.x <= player+1) { dead = true; return false; }
                return true;
            });

            // Enemy shooting
            const alive = invaders.filter(i => i.alive);
            if (alive.length > 0 && Math.random() < 0.03) {
                const shooter = alive[Math.floor(Math.random() * alive.length)];
                enemyBullets.push({x: shooter.x, y: shooter.y + 1});
            }

            // Move invaders
            const speed = Math.max(3, Math.floor(invSpeed * alive.length / 24));
            invTimer++;
            if (invTimer >= speed) {
                invTimer = 0;
                const hitEdge = invaders.some(inv => inv.alive && (inv.x + invDir >= W-2 || inv.x + invDir <= 0));
                if (hitEdge) {
                    invDir *= -1;
                    invaders.forEach(inv => { if (inv.alive) inv.y++; });
                } else {
                    invaders.forEach(inv => { if (inv.alive) inv.x += invDir; });
                }
                if (invaders.some(inv => inv.alive && inv.y >= H-2)) dead = true;
            }

            // Wave clear
            if (invaders.every(i => !i.alive)) { spawnWave(); invSpeed = Math.max(5, invSpeed - 2); }
            draw();
        }

        function draw() {
            const grid = emptyGrid();
            for (const br of barricades) {
                if (br.x >= 0 && br.x < W && br.y >= 0 && br.y < H)
                    grid[br.y][br.x] = br.hp >= 2 ? '█' : '▄';
            }
            for (const inv of invaders) {
                if (!inv.alive) continue;
                if (inv.x >= 0 && inv.x < W && inv.y >= 0 && inv.y < H) grid[inv.y][inv.x] = '▼';
                if (inv.x+1 >= 0 && inv.x+1 < W && inv.y >= 0 && inv.y < H) grid[inv.y][inv.x+1] = '▼';
            }
            if (player-1 >= 0) grid[H-1][player-1] = '▄';
            grid[H-1][player] = '█';
            if (player+1 < W) grid[H-1][player+1] = '▄';
            if (playerBullet && playerBullet.y >= 0 && playerBullet.y < H) grid[playerBullet.y][playerBullet.x] = '│';
            for (const b of enemyBullets) { if (b.y >= 0 && b.y < H) grid[b.y][b.x] = ':'; }
            let out = renderFrame(grid, score, 'INVADERS');
            if (dead) out += '  GAME OVER! [R] RESTART';
            disp.textContent = out;
        }

        function onKey(e) {
            if (currentGame !== 'invaders') { document.removeEventListener('keydown', onKey); return; }
            switch (e.key) {
                case 'ArrowLeft': case 'a': case 'A': player = Math.max(1, player - 1); break;
                case 'ArrowRight': case 'd': case 'D': player = Math.min(W - 2, player + 1); break;
                case ' ': if (!dead && !playerBullet) playerBullet = {x: player, y: H-2}; e.preventDefault(); break;
                case 'r': case 'R': if (dead) startInvaders(); break;
                case 'Escape': resetScreen(); break;
            }
            if (['ArrowLeft','ArrowRight',' '].includes(e.key)) e.preventDefault();
        }
        document.addEventListener('keydown', onKey);
        draw();
        gameLoop = setInterval(tick, 60);
        showTouchControls("invaders");
    }

    // === Event Bindings ===
    document.addEventListener('click', function(e) {
        if (resetting) return;
        const btn = e.target.closest('[data-game]');
        if (!btn) return;
        const game = btn.getAttribute('data-game');
        if (game === 'snake') startSnake();
        if (game === 'pong') startPong();
        if (game === 'invaders') startInvaders();
    });

    const resetBtn = document.getElementById('btn-reset');
    if (resetBtn) resetBtn.addEventListener('click', resetScreen);
})();
