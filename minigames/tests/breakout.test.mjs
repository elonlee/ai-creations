import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import { createHash } from 'node:crypto';

const html = readFileSync(new URL('../Breakout.html', import.meta.url), 'utf8');
const script = html.match(/<script>([\s\S]*?)<\/script>/)[1];

function loadGame({ tap, highScore = 0, navigator } = {}) {
    const elements = new Map();
    const frames = new Map();
    const intervals = new Map();
    let nextId = 1;
    const drawing = new Proxy({}, {
        get: (_, name) => name.startsWith('create')
            ? () => ({ addColorStop() {} }) : () => {},
        set: () => true
    });
    function element(id) {
        if (!elements.has(id)) elements.set(id, {
            width: 900, height: 540, textContent: '', hidden: false, open: false,
            listeners: {}, disabled: false, style: {}, clientWidth: 900, clientHeight: 540,
            capturedPointers: new Set(),
            setPointerCapture(id) { this.capturedPointers.add(id); },
            hasPointerCapture(id) { return this.capturedPointers.has(id); },
            releasePointerCapture(id) { this.capturedPointers.delete(id); },
            addEventListener(type, listener) { this.listeners[type] = listener; },
            getContext: () => drawing,
            getBoundingClientRect: () => ({ left: 0, top: 0, width: 900, height: 540 }),
            showModal() { this.open = true; },
            close() { this.open = false; },
            focus() {}, setAttribute() {}
        });
        return elements.get(id);
    }
    const sandbox = {
        ResizeObserver: class { observe() {} },
        console, Math, performance: { now: () => 1000 },
        localStorage: { getItem: () => String(highScore), setItem() {} },
        document: {
            getElementById: element,
            querySelectorAll: () => [element('sound-btn'), element('menu-sound-btn')],
            addEventListener() {}, hidden: false
        },
        HTMLButtonElement: class {},
        window: { tap, navigator, addEventListener() {} },
        requestAnimationFrame(callback) { const id = nextId++; frames.set(id, callback); return id; },
        cancelAnimationFrame(id) { frames.delete(id); },
        setInterval(callback) { const id = nextId++; intervals.set(id, callback); return id; },
        clearInterval(id) { intervals.delete(id); }
    };
    const context = vm.createContext(sandbox);
    vm.runInContext(script, context);
    return {
        run: code => vm.runInContext(code, context),
        element, frames, intervals,
        frame(ts) {
            const queued = [...frames.values()];
            frames.clear();
            queued.forEach(callback => callback(ts));
        }
    };
}

test('暂停冻结全部状态，并屏蔽鼠标移动', () => {
    const game = loadGame();
    game.run('restart(); togglePause();');
    const snapshot = createHash('sha256').update(game.run('JSON.stringify(state)')).digest('hex');
    game.run('update(0.25)');
    game.element('game-canvas').listeners.pointermove({ pointerType: 'mouse', pointerId: 1, clientX: 100, clientY: 300 });
    assert.equal(createHash('sha256').update(game.run('JSON.stringify(state)')).digest('hex'), snapshot);
    assert.equal(game.frames.size, 0, '暂停后不应保留动画帧');
});


test('初始主菜单不运行游戏，不能提前发球', () => {
    const game = loadGame();
    assert.equal(game.element('game-menu').open, true);
    assert.equal(game.frames.size, 0);
    game.run('launchBall(); update(1);');
    assert.equal(game.run('state.running'), false);
    assert.equal(game.run('state.ball.launched'), false);
});

test('开始游戏后等待发球，继续时不补算暂停时间', () => {
    const game = loadGame();
    game.element('menu-primary-btn').listeners.click();
    assert.equal(game.element('game-menu').open, false);
    assert.equal(game.run('state.running'), true);
    assert.equal(game.run('state.ball.launched'), false);
    game.run('launchBall()');
    game.frame(1000);
    game.frame(1016);
    game.run('togglePause()');
    const position = game.run('JSON.stringify(state.ball)');
    game.run('togglePause()');
    assert.equal(game.frames.size, 1);
    game.frame(60000);
    assert.equal(game.run('JSON.stringify(state.ball)'), position);
    game.frame(60016);
    assert.notEqual(game.run('JSON.stringify(state.ball)'), position);
});

test('暂停屏蔽触屏和移动按键，并清除按住状态', () => {
    const game = loadGame();
    game.run('restart(); keys.right = true; mobileLeft = true; togglePause();');
    const paddle = game.run('state.paddle.x');
    game.element('game-canvas').listeners.pointerdown({ pointerType: 'touch', pointerId: 1, clientX: 800, clientY: 200 });
    game.element('right-btn').listeners.pointerdown({ preventDefault() {} });
    game.run("onKeyDown({ key: 'ArrowRight' });");
    assert.equal(game.run('state.paddle.x'), paddle);
    assert.equal(game.run('keys.right || mobileLeft || mobileRight'), false);
});

test('重新开始清空上局状态，重复操作不会叠加动画循环', () => {
    const game = loadGame();
    game.run("restart(); state.score = 90; state.lives = 1; state.particles.push({life:1}); state.flash.time = 1; togglePause();");
    game.element('menu-restart-btn').listeners.click();
    assert.equal(game.run('state.score'), 0);
    assert.equal(game.run('state.lives'), 3);
    assert.equal(game.run('state.particles.length'), 0);
    assert.equal(game.run('state.flash.time'), 0);
    assert.equal(game.run('state.paused'), false);
    assert.equal(game.element('game-menu').open, false);
    game.run('restart(); startLoop();');
    assert.equal(game.frames.size, 1);
});

test('返回主菜单结束本局，再开始恢复初始关卡', () => {
    const game = loadGame();
    game.run('restart(); state.level = 3; state.score = 200; togglePause();');
    game.element('menu-home-btn').listeners.click();
    assert.equal(game.run('state.menu'), 'main');
    assert.equal(game.run('state.running'), false);
    assert.equal(game.frames.size, 0);
    game.element('menu-primary-btn').listeners.click();
    assert.equal(game.run('state.level'), 1);
    assert.equal(game.run('state.score'), 0);
});

test('暂停快捷键忽略长按重复，恢复后只运行一个循环', () => {
    const game = loadGame();
    game.run("restart(); onKeyDown({key:'p', repeat:false, preventDefault(){}});");
    game.run("onKeyDown({key:'p', repeat:true, preventDefault(){}});");
    assert.equal(game.run('state.paused'), true);
    game.run("onKeyDown({key:'Escape', repeat:false, preventDefault(){}});");
    assert.equal(game.run('state.paused'), false);
    assert.equal(game.frames.size, 1);
});


function loadTapGame(options = {}) {
    const submissions = [];
    const panels = [];
    const game = loadGame({
        ...options,
        tap: { getLeaderboardManager: () => ({
            submitScores(request) { submissions.push(request); },
            openLeaderboard(request) { panels.push(request); }
        }) }
    });
    return { ...game, submissions, panels };
}

test('游戏结束上报本局分数，使用真实周榜 ID，不能上传本地历史最高分', () => {
    const game = loadTapGame({ highScore: 99999 });
    game.run('restart(); state.score = 1234; state.lives = 1; loseLife();');
    assert.equal(game.submissions.length, 1);
    const score = game.submissions[0].scores[0];
    assert.equal(score.leaderboardId, 'saf3rqj1i105omprpk');
    assert.equal(score.score, 1234);
    game.submissions[0].callback.onSuccess({});
    assert.match(game.element('leaderboard-status').textContent, /已提交本局 1234 分/);
    game.run('returnToMainMenu(); restart();');
    assert.equal(game.submissions.length, 1, '结算后的返回或重开不能重复上报');
});

test('通关时提交最终分数，主动结束或重开也结算已有得分', () => {
    const game = loadTapGame();
    game.run("restart(); state.level=LEVELS.length; state.bricks=[{x:30,y:80,w:62,h:22,hp:1,alive:true,color:'#fff'}]; handleBrickHit(state.bricks[0],state.ball);");
    assert.equal(game.run('state.win'), true);
    assert.equal(game.submissions.length, 1);
    assert.equal(game.submissions[0].scores[0].score, game.run('state.score'));
    game.run('restart(); state.score=30; returnToMainMenu();');
    assert.equal(game.submissions.at(-1).scores[0].score, 30);
    game.run('restart(); state.score=50; restart();');
    assert.equal(game.submissions.at(-1).scores[0].score, 50);
});

test('主菜单与暂停菜单都能打开公开周榜，面板关闭后保持暂停', () => {
    const game = loadTapGame();
    game.element('menu-leaderboard-btn').listeners.click();
    assert.equal(game.panels[0].collection, 'public');
    assert.equal(game.panels[0].leaderboardId, 'saf3rqj1i105omprpk');
    game.run('restart(); launchBall();');
    game.element('leaderboard-btn').listeners.click();
    assert.equal(game.run('state.paused'), true);
    assert.equal(game.frames.size, 0);
    game.panels[1].callback.onSuccess({});
    assert.equal(game.run('state.paused'), true);
    assert.equal(game.frames.size, 0);
});

test('提交失败提供手动重试，等待回调时不重复提交', () => {
    const game = loadTapGame();
    game.run('restart(); state.score=520; returnToMainMenu();');
    game.submissions[0].callback.onFailure(500002, 'failure');
    assert.equal(game.element('menu-retry-score-btn').hidden, false);
    game.element('menu-retry-score-btn').listeners.click();
    assert.equal(game.submissions.length, 2);
    assert.equal(game.submissions[1].scores[0].score, 520);
    game.run('submitFinalScore(true)');
    assert.equal(game.submissions.length, 2);
    game.submissions[1].callback.onSuccess({});
    assert.equal(game.element('menu-retry-score-btn').hidden, true);
});

test('上一局延迟回调不影响新局，新局分数独立提交', () => {
    const game = loadTapGame({ highScore: 99999 });
    game.run('restart(); state.score=900; restart();');
    game.submissions[0].callback.onFailure(1, 'late failure');
    assert.equal(game.element('retry-score-btn').hidden, true);
    assert.equal(game.element('leaderboard-status').textContent, '本周最高单局分数 · 每周重置');
    game.run('state.score=100; returnToMainMenu();');
    assert.equal(game.submissions[1].scores[0].score, 100, '新周期由平台判断，客户端不能复用历史最高分');
    game.submissions[0].callback.onSuccess({});
    assert.match(game.element('leaderboard-status').textContent, /正在提交本局 100 分/);
});

test('普通浏览器无 TapTap 时不崩溃，零分不提交', () => {
    const game = loadGame();
    game.element('menu-leaderboard-btn').listeners.click();
    assert.match(game.element('menu-leaderboard-status').textContent, /请在 TapTap 内/);
    game.run('restart(); state.score=15; returnToMainMenu();');
    assert.match(game.element('menu-leaderboard-status').textContent, /本局 15 分/);
    const tapGame = loadTapGame();
    tapGame.run('restart(); returnToMainMenu();');
    assert.equal(tapGame.submissions.length, 0);
});

test('TapTap 同步抛错时显示失败提示，游戏保持可操作', () => {
    const game = loadGame({ tap: { getLeaderboardManager: () => ({
        submitScores() { throw new Error('offline'); },
        openLeaderboard() { throw new Error('offline'); }
    }) } });
    game.run('restart(); state.score=90; returnToMainMenu();');
    assert.equal(game.element('retry-score-btn').hidden, false);
    game.element('menu-leaderboard-btn').listeners.click();
    assert.match(game.element('menu-leaderboard-status').textContent, /暂时无法打开/);
    assert.equal(game.element('menu-retry-score-btn').hidden, false);
    game.run('restart()');
    assert.equal(game.run('state.running'), true);
});

test('画布同时受可用宽高约束，缩放不改变逻辑坐标', () => {
    const game = loadGame();
    game.run('restart(); state.score=123; state.level=3; launchBall(); togglePause();');
    const progress = game.run('JSON.stringify(state)');
    const stage = game.element('game-stage');
    stage.clientWidth = 780;
    stage.clientHeight = 260;
    game.run('fitCanvas()');
    assert.equal(game.element('game-canvas').style.width, `${260 * 900 / 540}px`);
    assert.equal(game.element('game-canvas').style.height, '260px');
    stage.clientWidth = 320;
    stage.clientHeight = 600;
    game.run('fitCanvas()');
    assert.equal(game.element('game-canvas').style.width, '320px');
    assert.equal(game.element('game-canvas').style.height, '192px');
    assert.equal(game.run('WIDTH'), 900);
    assert.equal(game.run('HEIGHT'), 540);
    assert.equal(game.run('JSON.stringify(state)'), progress, '旋屏只改变显示尺寸，保留当前进度和暂停状态');
});


test('触屏按下即可定位挡板，缩放后坐标正确且忽略第二根手指', () => {
    const game = loadGame();
    game.run('restart()');
    const canvas = game.element('game-canvas');
    canvas.getBoundingClientRect = () => ({ left: 100, top: 20, width: 450, height: 270 });
    const touch = { pointerType: 'touch', pointerId: 7, isPrimary: true, clientX: 325, preventDefault() {} };
    canvas.listeners.pointerdown(touch);
    assert.equal(game.run('state.paddle.x + state.paddle.w / 2'), 450);
    assert.equal(canvas.hasPointerCapture(7), true);
    canvas.listeners.pointerdown({ ...touch, isPrimary: false, pointerId: 8, clientX: 100 });
    canvas.listeners.pointermove({ ...touch, pointerId: 8, clientX: 100 });
    assert.equal(game.run('state.paddle.x + state.paddle.w / 2'), 450);
    canvas.listeners.pointermove({ ...touch, clientX: 900 });
    assert.equal(game.run('state.paddle.x + state.paddle.w'), 900, '拖出画布也持续跟踪，并限制在右边界');
    canvas.listeners.pointercancel(touch);
    canvas.listeners.pointermove({ ...touch, clientX: 100 });
    assert.equal(game.run('state.paddle.x + state.paddle.w'), 900, '手势取消后不再跟随该触点');
    assert.equal(canvas.hasPointerCapture(7), false);
});

test('暂停时释放拖拽捕获，恢复后不会继续旧手势', () => {
    const game = loadGame();
    game.run('restart()');
    const canvas = game.element('game-canvas');
    const touch = { pointerType: 'touch', pointerId: 3, clientX: 400, preventDefault() {} };
    canvas.listeners.pointerdown(touch);
    game.run('togglePause()');
    assert.equal(canvas.hasPointerCapture(3), false);
    const x = game.run('state.paddle.x');
    game.run('togglePause()');
    canvas.listeners.pointermove({ ...touch, clientX: 800 });
    assert.equal(game.run('state.paddle.x'), x);
});

test('方向按钮捕获触点，取消或丢失捕获时停止移动', () => {
    const game = loadGame();
    game.run('restart()');
    const button = game.element('right-btn');
    const pointer = { pointerId: 9, preventDefault() {} };
    button.listeners.pointerdown(pointer);
    assert.equal(game.run('mobileRight'), true);
    assert.equal(button.hasPointerCapture(9), true);
    button.listeners.pointercancel(pointer);
    assert.equal(game.run('mobileRight'), false);
    assert.equal(button.hasPointerCapture(9), false);
    button.listeners.pointerdown(pointer);
    button.listeners.lostpointercapture(pointer);
    assert.equal(game.run('mobileRight'), false);
});


test('十关使用不同砖阵，难度递进且移动范围始终位于球场内', () => {
    const game = loadGame();
    const levels = JSON.parse(game.run('JSON.stringify(LEVELS)'));
    assert.equal(levels.length, 10);
    assert.equal(new Set(levels.map(level => level.map.join(''))).size, levels.length);
    levels.forEach((config, index) => {
        assert.ok(config.map.every(row => row.length === 12 && /^[.1-4*]+$/.test(row)));
        if (index) {
            assert.ok(config.speed > levels[index - 1].speed);
            assert.ok(config.paddle < levels[index - 1].paddle);
        }
        game.run(`restart(); enterLevel(${index + 1}); launchBall(); updateBricks(1.4);`);
        assert.equal(game.run('state.ball.speed'), config.speed);
        assert.equal(game.run('state.paddle.w'), config.paddle);
        assert.ok(game.run('state.bricks.every(b => b.x >= 0 && b.x+b.w <= WIDTH && b.y+b.h < state.paddle.y-120)'));
        assert.equal(game.run('state.ball.launched'), true);
    });
});

test('爆破只伤害相邻八格一次，连锁不会重复计分，装甲显示剩余耐久', () => {
    const game = loadGame();
    game.run(`restart(); enterLevel(4);
        state.bricks = [
            {row:0,col:0,x:30,y:80,w:62,h:22,hp:1,maxHp:1,alive:true,explosive:true,color:'#fff'},
            {row:0,col:1,x:100,y:80,w:62,h:22,hp:1,maxHp:1,alive:true,explosive:true,color:'#fff'},
            {row:1,col:1,x:100,y:110,w:62,h:22,hp:3,maxHp:3,alive:true,color:'#fff'},
            {row:4,col:8,x:590,y:200,w:62,h:22,hp:2,maxHp:2,alive:true,color:'#fff'}
        ]; handleBrickHit(state.bricks[0],state.ball);`);
    assert.equal(game.run('state.bricks[0].alive || state.bricks[1].alive'), false);
    assert.equal(game.run('state.bricks[2].hp'), 1, '两颗相邻爆破砖各造成一次伤害');
    assert.equal(game.run('state.bricks[3].hp'), 2, '远处砖块不受影响');
    const score = game.run('state.score');
    game.run('handleBrickHit(state.bricks[0],state.ball)');
    assert.equal(game.run('state.score'), score, '死亡砖块不能被重复计分');
    assert.equal(game.run('state.effects.filter(e=>e.ring).length'), 2);
});

test('完整推进十关：过关等待、生命奖励、手动发球和最终结算只发生一次', () => {
    const game = loadTapGame();
    game.run('restart()');
    for (let level = 1; level <= 10; level++) {
        assert.equal(game.run('state.level'), level);
        const oldScore = game.run('state.score');
        const oldLives = game.run('state.lives');
        game.run(`state.bricks.forEach(b=>{b.alive=false});
            state.bricks[0].alive=true; state.bricks[0].hp=1;
            handleBrickHit(state.bricks[0],state.ball);`);
        assert.ok(game.run('state.score') >= oldScore + level * 150);
        if (level % 3 === 0 && oldLives < 5) assert.equal(game.run('state.lives'), oldLives + 1);
        assert.ok(game.run('state.lives') <= 5);
        if (level < 10) {
            assert.equal(game.submissions.length, 0, '中途过关不能提前结算整局');
            game.run('launchBall()');
            assert.equal(game.run('state.ball.launched'), false, '过关展示期间不能发球');
            const snapshot = game.run('JSON.stringify(state)');
            game.run('togglePause(); update(10); togglePause()');
            assert.equal(game.run('JSON.stringify(state)'), snapshot, '暂停冻结过关计时和所有表现');
            game.run('update(1.3)');
            assert.equal(game.run('state.level'), level + 1);
            assert.equal(game.run('state.ball.launched'), false);
            assert.equal(game.run('state.levelIntro'), true);
            assert.ok(game.run('state.bricks.every(b=>b.hp===b.maxHp)'), '新砖阵没有被清场前的球误伤');
            game.run('launchBall()');
        }
    }
    assert.equal(game.run('state.win'), true);
    assert.equal(game.run('state.level'), 10, '最终关不出现第 11 关');
    assert.equal(game.submissions.length, 1);
    assert.equal(game.submissions[0].scores[0].score, game.run('state.score'));
    game.run('returnToMainMenu(); restart()');
    assert.equal(game.submissions.length, 1);
    assert.equal(game.run('state.paddle.w'), 148);
    assert.equal(game.run('state.ball.speed'), 360);
    assert.equal(game.run('state.transition'), null);
    assert.equal(game.run('state.effects.length'), 0);
});

test('移动砖阵与特效在暂停时冻结，恢复后继续；掉球恢复本关基础球速', () => {
    const game = loadGame();
    game.run('restart(); enterLevel(8); launchBall(); update(0.2); togglePause()');
    const snapshot = game.run('JSON.stringify(state)');
    game.run('update(2)');
    assert.equal(game.run('JSON.stringify(state)'), snapshot);
    game.run('togglePause(); update(0.2)');
    assert.notEqual(game.run('state.bricks[0].x'), JSON.parse(snapshot).bricks[0].x);
    game.run('state.ball.speed=640; loseLife()');
    assert.equal(game.run('state.ball.speed'), 500);
    assert.equal(game.run('state.ball.launched'), false);
});

test('高速碰撞不会穿透砖墙或在同一碰撞中重复扣装甲耐久，挡板加速有上限', () => {
    const game = loadGame();
    game.run(`restart(); enterLevel(10); state.levelIntro=false;
        state.bricks=[{x:400,baseX:400,y:200,w:62,h:22,hp:4,maxHp:4,alive:true,color:'#fff',row:0,col:0}];
        Object.assign(state.ball,{x:430,y:250,vx:0,vy:-680,launched:true}); updateBall(0.1);`);
    assert.equal(game.run('state.bricks[0].hp'), 3);
    assert.ok(game.run('state.ball.vy > 0'));
    game.run(`state.paddle.x=398;
        Object.assign(state.ball,{x:450,y:480,vx:0,vy:950,launched:true}); updateBall(0.02);`);
    assert.ok(game.run('Math.hypot(state.ball.vx,state.ball.vy) <= currentLevel().speed+140+0.01'));
});


test('最后一块砖被高速球击碎后立即停止子步，手机结算可以重开或回主菜单', () => {
    const game = loadTapGame();
    game.run(`restart(); state.bricks=[{x:400,y:200,w:62,h:22,hp:1,maxHp:1,alive:true,color:'#fff'}];
        Object.assign(state.ball,{x:430,y:240,vx:0,vy:-600,launched:true}); updateBall(0.033);`);
    assert.ok(game.run('state.transition'));
    assert.equal(game.run('state.ball.launched'), false);
    assert.equal(game.run('state.ball.trail.length'), 0);
    assert.equal(game.run('state.level'), 1);
    assert.equal(game.submissions.length, 0);
    game.run('state.transition=null; state.lives=1; loseLife()');
    assert.equal(game.element('launch-mobile-btn').textContent, '重开');
    assert.equal(game.element('pause-btn').textContent, '主菜单');
    game.element('launch-mobile-btn').listeners.click();
    assert.equal(game.run('state.level'), 1);
    assert.equal(game.run('state.gameOver'), false);
    assert.equal(game.element('launch-mobile-btn').textContent, '发球');
    game.run('state.lives=1; loseLife()');
    game.element('pause-btn').listeners.click();
    assert.equal(game.run('state.menu'), 'main');
});


function loadShareGame() {
    const requests = [];
    const listeners = [];
    let offCount = 0;
    const game = loadGame({ highScore: 99999, tap: {
        showShareboard(request) { requests.push(request); },
        onShareMessage(listener) { listeners.push(listener); },
        offShareMessage() { offCount++; }
    } });
    return { ...game, requests, listeners, offCount: () => offCount };
}

test('分享入口只在掉光生命或通关后出现，包含本局得分与关卡', async () => {
    const game = loadShareGame();
    assert.equal(game.element('result-panel').hidden, true);
    game.run('restart()');
    await game.run('shareResult()');
    assert.equal(game.requests.length, 0);
    assert.equal(game.element('result-panel').hidden, true);
    game.run('state.score=1234; state.level=4; state.lives=1; loseLife()');
    assert.equal(game.element('result-panel').hidden, false);
    assert.match(game.element('result-summary').textContent, /1234 分.*4\/10/);
    assert.equal(game.element('result-title').textContent, '挑战结束');
    game.element('result-home-btn').listeners.click();
    assert.equal(game.element('result-panel').hidden, true);
    await game.run('shareResult()');
    assert.equal(game.requests.length, 0);
    game.run('restart(); enterLevel(LEVELS.length); completeLevel()');
    assert.equal(game.element('result-panel').hidden, false);
    assert.equal(game.element('result-title').textContent, '十关通关！');
    assert.match(game.element('result-summary').textContent, /全部 10 关/);
});

test('TapTap 分享使用已通过的模板及本局信息，打开面板不能误报分享成功', async () => {
    const game = loadShareGame();
    game.run('restart(); state.score=234; state.lives=1; loseLife()');
    const snapshot = game.run('JSON.stringify(state)');
    await game.run('shareResult()');
    assert.equal(game.requests.length, 1);
    assert.equal(game.requests[0].templateId, 'ST1792394335418E8UEMKVVA');
    assert.deepEqual(JSON.parse(game.requests[0].sceneParam), {score:234,level:1,totalLevels:10,cleared:false});
    assert.equal(game.element('share-result-btn').disabled, true);
    await game.run('shareResult()');
    assert.equal(game.requests.length, 1, '打开面板期间阻止重复点击');
    game.requests[0].success({});
    assert.match(game.element('share-status').textContent, /面板已打开/);
    assert.doesNotMatch(game.element('share-status').textContent, /分享成功/);
    assert.equal(game.element('share-result-btn').disabled, false);
    game.listeners[0].success({channel:'test'});
    assert.match(game.element('share-status').textContent, /分享成功/);
    assert.equal(game.offCount(), 1);
    game.requests[0].success({});
    assert.match(game.element('share-status').textContent, /分享成功/, '面板回调晚到不能覆盖真实分享结果');
    assert.equal(game.run('JSON.stringify(state)'), snapshot, '分享不能改分数、生命或重新运行游戏');
});

test('分享失败可重试，旧局及旧分享回调不能干扰新一局或解绑新监听', async () => {
    const game = loadShareGame();
    game.run('restart(); state.score=20; state.lives=1; loseLife()');
    await game.run('shareResult()');
    game.requests[0].fail({});
    assert.equal(game.element('share-result-btn').disabled, false);
    assert.match(game.element('share-status').textContent, /打开失败/);
    await game.run('shareResult()');
    game.requests[1].success({});
    game.listeners[1].fail({});
    assert.match(game.element('share-status').textContent, /未完成/);
    game.run('restart(); state.score=90; state.lives=1; loseLife()');
    await game.run('shareResult()');
    const off = game.offCount();
    game.listeners[0].success({});
    game.listeners[1].fail({});
    game.requests[0].success({});
    assert.equal(game.offCount(), off);
    assert.match(game.element('share-status').textContent, /正在打开/);
    assert.equal(game.element('share-result-btn').disabled, true);
    game.requests[2].success({});
    game.listeners[2].success({});
    assert.match(game.element('share-status').textContent, /分享成功/);
    game.element('result-restart-btn').listeners.click();
    assert.equal(game.element('result-panel').hidden, true);
    assert.equal(game.element('share-copy').hidden, true);
});

test('TapTap 分享接口同步异常时恢复按钮，不影响游戏结算', async () => {
    const game = loadGame({tap:{showShareboard(){throw new Error('bridge error');}}});
    game.run('restart(); state.lives=1; loseLife()');
    await game.run('shareResult()');
    assert.match(game.element('share-status').textContent, /暂不可用/);
    assert.equal(game.element('share-result-btn').disabled, false);
    assert.equal(game.run('state.gameOver'), true);
});

test('普通浏览器系统分享使用本局成绩，取消后可重试且不会复制文案', async () => {
    const requests = [];
    let cancel = false;
    let copied = false;
    const game = loadGame({navigator:{
        async share(data){ requests.push(data); if(cancel) throw {name:'AbortError'}; },
        clipboard:{async writeText(){copied=true;}}
    }});
    game.run('restart(); state.score=345; state.lives=1; loseLife()');
    await game.run('shareResult()');
    assert.match(requests[0].text, /345 分/);
    assert.equal(requests[0].url, undefined, '不把 localhost 或文件地址分享出去');
    assert.equal(copied, false);
    cancel=true;
    await game.run('shareResult()');
    assert.equal(game.element('share-status').textContent, '已取消分享');
    assert.equal(game.element('share-result-btn').disabled, false);
    assert.equal(copied, false);
});

test('不支持系统分享时复制成绩，剪贴板拒绝或完全不支持时显示可手动复制的文案', async () => {
    const writes=[];
    const game=loadGame({navigator:{clipboard:{async writeText(text){writes.push(text);}}}});
    game.run('restart(); state.score=500; enterLevel(10); completeLevel()');
    await game.run('shareResult()');
    assert.match(writes[0], /通关全部 10 关.*2000 分/);
    assert.match(game.element('share-status').textContent, /已复制/);
    const denied=loadGame({navigator:{clipboard:{async writeText(){throw new Error('denied');}}}});
    denied.run('restart(); state.score=12; state.lives=1; loseLife()');
    await denied.run('shareResult()');
    assert.equal(denied.element('share-copy').hidden, false);
    assert.match(denied.element('share-copy').value, /12 分/);
    assert.doesNotMatch(denied.element('share-status').textContent, /已复制/);
    const unsupported=loadGame();
    unsupported.run('restart(); state.lives=1; loseLife()');
    await unsupported.run('shareResult()');
    assert.equal(unsupported.element('share-copy').hidden, false);
    assert.equal(unsupported.element('share-result-btn').disabled, false);
});

test('旧系统分享的异步完成不能覆盖新局状态或泄露旧文案', async () => {
    let reject;
    const game = loadGame({navigator:{share:()=>new Promise((_,r)=>{reject=r;})}});
    game.run('restart(); state.score=123; state.lives=1; loseLife()');
    const pending=game.run('shareResult()');
    game.run('restart()');
    reject(new Error('late failure'));
    await pending;
    assert.equal(game.element('result-panel').hidden, true);
    assert.equal(game.element('share-copy').hidden, true);
    assert.equal(game.element('share-copy').value, '');
    assert.equal(game.element('share-status').textContent, '晒出本局成绩，邀请朋友挑战');
});
