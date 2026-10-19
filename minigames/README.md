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
经典打砖块玩法，包含十个主题关卡、主菜单和暂停菜单。游戏内置碰撞、碎砖、掉命、通关音效和循环背景音乐。声音使用 Web Audio API（浏览器提供的音频接口）实时合成，不需要外部音频文件。

使用现代浏览器直接打开本目录的 `Breakout.html`，点击主菜单中的“开始游戏”，再按空格发球。清空所有砖块后展示过关奖励，再进入下一关等待手动发球。生命耗尽则结束。

十关依次为：霓虹启航、双子之门、棱镜之心、引爆回路、深空阶梯、流光列阵、装甲堡垒、跃动星环、赤焰防线、终极矩阵。各关使用独立砖阵和配色。基础球速从每秒 360 个逻辑像素提高到 540，挡板宽度从 148 缩至 104。碰撞挡板会加速，最高不超过本关基础速度加 140；掉球后恢复本关基础速度。

装甲砖上的亮点表示剩余耐久。橙色菱形砖被击碎时，对相邻八格各造成一次伤害，可以引发连锁。第 6、8、9、10 关的砖阵左右移动。所有砖块都可以摧毁，不需要等待特殊解锁条件。

每关完成奖励 `关数 × 150` 分，不乘连击。第 3、6、9 关补一条生命，最多持有五条。关内进度条、命中闪白、得分浮字、爆破冲击环和过关卡片提供反馈。结束后手机发球按钮变为“重开”，暂停按钮变为“主菜单”。十关机制及验证范围见 [关卡扩展记录](validation/levels-2026-10-19.md)。

**操作方式：**

- 左右方向键 / A、D / 鼠标 / 触屏：移动挡板；手机也可使用底部方向按钮。
- 空格 / 发球按钮：发球。
- P / Esc / 暂停按钮：打开暂停菜单或继续游戏。
- R / 重开按钮：从第一关重新开始。
- 暂停菜单：继续游戏、重新开始，或返回主菜单并结束本局；再次开始会重置分数、生命和关卡，最高分保留。
- 声音按钮：统一开启或关闭音效和音乐。浏览器需要在点击开始等用户操作后才能播放音频。

暂停时停止动画循环、球与挡板移动、背景、粒子和计时，同时暂停音频。切换标签页或窗口失去焦点时也会自动暂停，返回后需要手动继续。

手机端会按实际可用宽高等比缩放画布，并为刘海、圆角和底部手势区保留安全边距。竖屏时方向按钮位于底部；矮横屏时方向按钮分列两侧，左上角发球、右上角暂停。重开、声音和排行榜操作可在菜单中找到。旋屏或浏览器工具栏引起高度变化时，只调整画布的显示尺寸，不重置关卡和分数。

触屏按下画布即可定位挡板，随后拖动控制移动；也可按住方向按钮。拖出画布后仍能跟随，抬手、手势取消或暂停时会结束拖动。手机布局与输入验证见 [手机适配记录](validation/mobile-2026-10-19.md)。

**结算分享：**

生命耗尽或通关后，结算卡片提供“分享成绩”“再来一局”和“主菜单”。分享由玩家点击触发，不会自动发送，也不改变分数、生命或排行榜结算。

TapTap 内使用已审核通过的分享模板，打开原生分享面板。模板文案固定为“挑战我的高分”；本局得分、到达关卡和通关标记作为场景参数传递，不会自动变成卡片上的动态文字。普通浏览器优先使用系统分享；没有该接口时复制带有成绩的文案，无法访问剪贴板时显示可手动复制的文本。浏览器分享不包含本地文件或 localhost 地址。

接口、模板信息和验证范围见 [分享接入记录](validation/share-2026-10-19.md)。

**TapTap 每周排行榜：**

已绑定 moon工作室的「经典打砖块」（App ID：`985310`）。榜单名为“每周高分榜”，客户端 ID 为 `saf3rqj1i105omprpk`，后台管理 ID 为 `9450`。榜单已发布，按数值从高到低排序，每人保留本周最高单局分数，显示前 100 名。服务端重置周期为每周，时间为 `00:00:00`；周起始日和时区按 TapTap 平台规则执行，工具返回值未提供这两项信息。

- 主菜单和暂停菜单有“每周排行榜”入口，桌面版游戏底部也提供该按钮。游戏进行中打开排行榜会先暂停，关闭原生面板后需手动继续。
- 游戏结束、通关、主动重开或返回主菜单时，会提交本局大于零的分数。每局仅结算一次。提交失败时，可在开始下一局前点击“重试提交成绩”。
- 本地 `HIGH` 仍表示设备上的历史最高分。它不参与上报，也不会在新一周自动补传，因此不会用历史纪录覆盖周榜。
- TapTap 运行环境提供全局 `tap` 对象，无需安装 SDK。普通浏览器保留完整游戏玩法，排行榜入口会提示在 TapTap 内使用。

接入方式参考 [TapTap 小游戏排行榜文档](https://developer.taptap.cn/minigameapidoc/dev/tutorial/open-capabilities/leaderboard-tutorial/)。本地测试覆盖接口参数、结算入口、失败重试和暂停行为，使用模拟的 TapTap 接口，不会写入真实榜单。2026-10-19 曾将单文件包按横屏上传至该应用，随后用户已撤回审核。当前手机适配、十关版本和结算分享尚未重新上传。真实玩家成绩、原生面板和跨周重置仍待在 TapTap 自测环境验证。上传校验值、平台状态和验证步骤见 [上传与验证记录](validation/taptap-2026-10-19.md)。

在仓库根目录运行以下命令，预期菜单、暂停、重开和排行榜回归测试全部通过：

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
