# Little Games Collection

A collection of small HTML5 games for learning and nostalgia. Each game is a simple recreation of classic arcade games built with modern web technologies.

## 🎮 Available Games

```markdown
### 1. Klondike Solitaire
A classic Klondike Solitaire implementation featuring drag-and-drop or click-to-play controls, Draw 1 and Draw 3 modes, undo/hint systems, autocomplete animations, and a polished green felt interface.
```

**How to Play:**
1. Open `Solitaire.html` in your web browser
2. Drag cards or click to select/move them
3. Build four foundation piles (A→K by suit) to win

**Controls:**
- Click / Drag: Move cards
- Double-click: Auto-move card to foundation
- Space: Draw from stock
- Z: Undo
- H: Hint
- N: New game
- Escape: Deselect

**Features:**
- Klondike rules with draw-1 / draw-3 modes
- Drag-and-drop + click-to-select
- Undo (unlimited history)
- Smart hint system
- Auto-complete animation
- Score & timer tracking
- Fully responsive layout

---

### 1. FC Galaxian
A classic space shooter game inspired by the original Galaxian arcade game.

**How to Play:**
1. Open `Galaxian.html` in your web browser
2. Click "Start Game"
3. Use arrow keys to move, spacebar to shoot
4. Destroy enemies and avoid their attacks

**Features:**
- 50 enemies in formation with dive attacks
- Visual effects: explosions, particles, animated backgrounds
- 8-bit music and sound effects
- High score tracking with localStorage
- 3 lives with heart indicators

**Controls:**
- Arrow Keys: Move left/right
- Spacebar: Shoot
- Sound Toggle: On/off checkbox

**Scoring:**
- Regular enemies: 10 points
- Diving enemies: 20 points
- High score automatically saved

### 2. Classic Snake
经典贪吃蛇玩法：网格移动、吃食物增长、计分、碰撞结束、可重开。

**How to Play:**
1. Open `Snake.html` in your web browser
2. Use arrow keys or WASD to control direction
3. Eat food to grow and gain score
4. Press `P` to pause/resume, `R` to restart after game over

**Controls:**
- Arrow Keys / WASD: Move
- P: Pause/Resume
- R: Restart

### 3. Breakout
经典打砖块玩法，包含六个关卡、主菜单和暂停菜单。游戏内置碰撞、碎砖、掉命、通关音效和循环背景音乐。声音使用 Web Audio API（浏览器提供的音频接口）实时合成，不需要外部音频文件。

使用现代浏览器直接打开本目录的 `Breakout.html`，点击主菜单中的“开始游戏”，再按空格发球。清空所有砖块即可进入下一关，生命耗尽则结束。

**操作方式：**

- 左右方向键 / A、D / 鼠标 / 触屏：移动挡板；手机也可使用底部方向按钮。
- 空格 / 发球按钮：发球。
- P / Esc / 暂停按钮：打开暂停菜单或继续游戏。
- R / 重开按钮：从第一关重新开始。
- 暂停菜单：继续游戏、重新开始，或返回主菜单并结束本局；再次开始会重置分数、生命和关卡，最高分保留。
- 声音按钮：统一开启或关闭音效和音乐。浏览器需要在点击开始等用户操作后才能播放音频。

暂停时停止动画循环、球与挡板移动、背景、粒子和计时，同时暂停音频。切换标签页或窗口失去焦点时也会自动暂停，返回后需要手动继续。

在仓库根目录运行以下命令，预期暂停、恢复、返回主菜单和重开回归测试全部通过：

```sh
node --test minigames/tests/breakout.test.mjs
```

### 4. Tetris
经典俄罗斯方块玩法，含幽灵方块、行消除闪烁、锁定粒子等表现增强，并内置音效与背景音乐（可开关）。

**How to Play:**
1. Open `Tetris.html` in your web browser
2. Stack blocks to complete full lines
3. Keep board from reaching the top

**Controls:**
- Arrow Left / Arrow Right (A / D): Move
- Arrow Up / X / W: Rotate clockwise
- Z: Rotate counter-clockwise
- Arrow Down / S: Soft drop
- Space: Hard drop
- P: Pause/Resume
- R: Restart
- 声音按钮: 开/关 音效与音乐

### 5. Castlevania-style Demo
恶魔城风横版动作 Demo：平台跳跃、近战攻击、敌人 AI、Boss 战、通关结算，支持键盘和触屏。

**How to Play:**
1. Open `Castlevania.html` in your web browser
2. Press `Enter` to start
3. Defeat enemies and boss, then reach the gate to win

**Controls:**
- A / D or Arrow Left / Right: Move
- K / Arrow Up / Space: Jump
- J: Attack
- P: Pause/Resume
- M: Toggle sound
- R: Restart after win/lose

**Art Assets:**
- Uses selected set #3: Kenney New Platformer Pack (CC0)
- Asset folder: `assets/kenney_new_platformer_pack/`

## 🛠️ Technologies Used

- HTML5 Canvas
- JavaScript ES6+
- Web Audio API
- CSS3
- Local Storage

## 📁 Project Structure

```
h5-minigames/
├── Galaxian.html          # FC Galaxian space shooter
├── Snake.html             # Classic Snake
├── Breakout.html          # Breakout / Arkanoid
├── Tetris.html            # Tetris
├── Castlevania.html       # Castlevania-style platformer demo
├── Solitaire.html         # Klondike Solitaire card game ← NEW
├── assets/                # Shared game assets
└── README.md              # This documentation
```

## 🎯 Learning Objectives

This project collection demonstrates:
- HTML5 Canvas 2D graphics programming
- JavaScript game development fundamentals
- Web Audio API for sound generation
- Game loop programming and optimization
- Collision detection algorithms
- Object-oriented programming in games
- User interface design for games

## 🚀 Future Games

More classic arcade games will be added to this collection, including:
- Tetris
- Pac-Man
- Space Invaders
- Snake
- Pong
- And more...

## 📄 License

Open source - feel free to use, modify, and distribute. Original games are owned by their respective companies.

---

*Relive the golden age of arcade gaming!* 🕹️
