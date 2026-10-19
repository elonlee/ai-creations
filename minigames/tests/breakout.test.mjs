import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import { createHash } from 'node:crypto';

const html = readFileSync(new URL('../Breakout.html', import.meta.url), 'utf8');
const script = html.match(/<script>([\s\S]*?)<\/script>/)[1];

function loadGame() {
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
            listeners: {}, disabled: false,
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
        console, Math, performance: { now: () => 1000 },
        localStorage: { getItem: () => null, setItem() {} },
        document: {
            getElementById: element,
            querySelectorAll: () => [element('sound-btn'), element('menu-sound-btn')],
            addEventListener() {}, hidden: false
        },
        HTMLButtonElement: class {},
        window: { addEventListener() {} },
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
    game.element('game-canvas').listeners.mousemove({ clientX: 100, clientY: 300 });
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
    game.element('game-canvas').listeners.touchmove({ touches: [{ clientX: 800, clientY: 200 }] });
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
