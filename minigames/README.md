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
经典打砖块玩法，带粒子、闪屏、抖动等反馈效果，并内置音效与背景音乐（可开关）。

**How to Play:**
1. Open `Breakout.html` in your web browser
2. Use arrow keys (or A/D) to move the paddle
3. Press Space to launch ball
4. Clear all bricks to pass level, avoid losing all lives

**Controls:**
- Arrow Left / Arrow Right / A / D: Move paddle
- Space: Launch ball
- P: Pause/Resume
- R: Restart
- 声音按钮: 开/关 音效与音乐

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
