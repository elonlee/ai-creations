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
手机竖屏打砖块，使用 540×900 的竖向球场，包含十个主题关卡、主菜单和暂停菜单。游戏内置碰撞、碎砖、掉命、通关音效和循环背景音乐，使用随包提供的 MP3 文件。

使用现代浏览器直接打开本目录的 `Breakout.html`，竖握手机，点击主菜单中的“开始游戏”，再点击底部“发球”。在球场底部的滑动区左右拖动即可控制挡板，不需要把手指放到挡板上。电脑也可用鼠标左键点击球场或按空格发球。清空所有砖块后展示过关奖励，再进入下一关等待手动发球。生命耗尽则结束。

十关依次为：霓虹启航、双子之门、棱镜之心、引爆回路、深空阶梯、流光列阵、装甲堡垒、跃动星环、赤焰防线、终极矩阵。各关使用独立砖阵和配色。基础球速从每秒 360 个逻辑像素提高到 540，挡板宽度从 116 缩至 80。12 列砖阵按竖屏宽度重新排列；移动到两端时也不越界。挡板位于逻辑坐标 y=800，下方保留 100 像素区域用于滑动操作，砖阵与挡板之间保留接球反应距离。碰撞挡板会加速，最高不超过本关基础速度加 140；掉球后恢复本关基础速度。

装甲砖上的亮点表示剩余耐久。橙色菱形砖被击碎时，对相邻八格各造成一次伤害，可以引发连锁。第 6、8、9、10 关的砖阵左右移动。所有砖块都可以摧毁，不需要等待特殊解锁条件。

每关完成奖励 `关数 × 150` 分，不乘连击。第 3、6、9 关补一条生命，最多持有五条。关内进度条、命中闪白、得分浮字、爆破冲击环和过关卡片提供反馈。结束后手机发球按钮变为“重开”，暂停按钮变为“主菜单”。十关机制及验证范围见 [关卡扩展记录](validation/levels-2026-10-19.md)。

**操作方式：**

- 左右方向键 / A、D / 鼠标 / 触屏：移动挡板；手机也可使用底部方向按钮。
- 鼠标左键点击球场 / 空格 / 发球按钮：发球。
- P / Esc / 暂停按钮：打开暂停菜单或继续游戏。
- R / 重开按钮：从第一关重新开始。
- 暂停菜单：继续游戏、重新开始，或返回主菜单并结束本局；再次开始会重置分数、生命和关卡，最高分保留。
- 声音按钮：统一开启或关闭音效和音乐。声音在点击开始等用户操作后启动；加载或播放失败时按钮显示“声音: 重试”，点击可重新加载，不重置游戏。

暂停时停止动画循环、球与挡板移动、背景、粒子和计时，同时暂停音频。切换标签页或窗口失去焦点时也会自动暂停，返回后需要手动继续。

手机端会按实际可用宽高等比缩放竖向球场，并为刘海、圆角和底部手势区保留安全边距。顶部显示得分、最高分、生命、关卡和连击，右上角为暂停；底部始终提供至少 56 像素高的方向和发球按钮。小屏暂停菜单可以滚动，结算卡片限制在可视区域内。桌面同样显示竖向球场；矮横屏保留竖向球场比例，将方向按钮放在两侧。重开、声音和排行榜操作可在菜单中找到。旋屏或浏览器工具栏引起高度变化时，只调整画布的显示尺寸，不重置关卡和分数。

触屏按下画布即可定位挡板，随后拖动控制移动；也可按住方向按钮。拖出画布后仍能跟随，抬手、手势取消或暂停时会结束拖动。手机布局与输入验证见 [手机适配记录](validation/mobile-2026-10-19.md)。

**MP3 音频：**

音频位于 `assets/breakout-audio/`，包含 9 个事件音效和一首约 57.6 秒的循环背景音乐，总计 965,826 字节（约 943 KB）。音效来自 Kenney 的 Digital Audio，音乐为 MintoDog 的 Plains Stage，来源页面均标注 CC0。作者、原始下载地址、转换方式和许可见 [素材来源](assets/breakout-audio/SOURCES.md)，最终文件校验值见 [音频清单](assets/breakout-audio/manifest.json)。

TapTap 内优先使用 `tap.createInnerAudioContext` 播放文件，短音效按[官方说明](https://developer.taptap.cn/minigameapidoc/dev/api/media/audio/tap.createInnerAudioContext/)使用 `useWebAudioImplement: true` 的低延迟驱动，背景音乐使用 `false` 的流式驱动。普通浏览器使用 `HTMLAudioElement`，不再依赖浏览器 `AudioContext` 合成。开局为每种音效预建两个声道并加载文件；命中时只播放已就绪的空闲声道，不创建、加载或停止重播，未就绪或繁忙时跳过声音。同类音效间隔至少 35 毫秒，碰撞及爆破共用至少 40 毫秒间隔，避免连锁触发密集原生调用。

音乐音量低于事件音效；暂停、返回菜单或关闭声音会暂停音乐并停止短音效，继续时保留音乐进度。短音效在自然结束或暂停时复位，结束时停音乐并保留结算音效。离开页面或失败重试时释放资源。

打开或打包游戏时必须保留入口旁的整个 `assets/breakout-audio/` 目录，运行时不访问外部素材网址。只拷贝 HTML 会缺少音频。手机系统静音开关仍按宿主默认规则处理。用户已确认旧 MP3 版在 TapTap 中开声命中卡顿、关声不卡；此次音频性能改动仍待 TapTap 真机复测，不能以普通浏览器或模拟接口测试替代。

**结算分享：**

生命耗尽或通关后，结算卡片提供“分享成绩”“再来一局”和“主菜单”。分享由玩家点击触发，不会自动发送，也不改变分数、生命或排行榜结算。

TapTap 内使用已审核通过的分享模板，打开原生分享面板。模板文案固定为“挑战我的高分”；本局得分、到达关卡和通关标记作为场景参数传递，不会自动变成卡片上的动态文字。普通浏览器优先使用系统分享；没有该接口时复制带有成绩的文案，无法访问剪贴板时显示可手动复制的文本。浏览器分享不包含本地文件或 localhost 地址。

接口、模板信息和验证范围见 [分享接入记录](validation/share-2026-10-19.md)。

**TapTap 每周排行榜：**

已绑定 moon工作室的「经典打砖块」（App ID：`985310`）。榜单名为“每周高分榜”，客户端 ID 为 `saf3rqj1i105omprpk`，后台管理 ID 为 `9450`。榜单已发布，按数值从高到低排序，每人保留本周最高单局分数，显示前 100 名。服务端重置周期为每周，时间为 `00:00:00`；周起始日和时区按 TapTap 平台规则执行，工具返回值未提供这两项信息。

- 主菜单和暂停菜单有“每周排行榜”入口。游戏进行中打开排行榜会先暂停，关闭原生面板后需手动继续。
- 游戏结束、通关、主动重开或返回主菜单时，会提交本局大于零的分数。每局仅结算一次。提交失败时，可在开始下一局前点击“重试提交成绩”。
- 本地“最高”仍表示设备上的历史最高分。它不参与上报，也不会在新一周自动补传，因此不会用历史纪录覆盖周榜。
- TapTap 运行环境提供全局 `tap` 对象，无需安装 SDK。普通浏览器保留完整游戏玩法，排行榜入口会提示在 TapTap 内使用。

接入方式参考 [TapTap 小游戏排行榜文档](https://developer.taptap.cn/minigameapidoc/dev/tutorial/open-capabilities/leaderboard-tutorial/)。本地测试覆盖接口参数、结算入口、失败重试和暂停行为，使用模拟的 TapTap 接口，不会写入真实榜单。2026-10-19 已将竖屏十关版本（含结算分享，仍为合成音频）上传至包体库：H5 版本 ID 为 `330863`，包体 ID 为 `99370`，文件名为 `breakout-portrait-20261019.zip`，大小 17,084 字节（后台显示 16.68 KB），屏幕方向为竖屏。ZIP 只含 `breakout/index.html` 及其外层目录，入口内容与上传时源码逐字节一致。按用户要求仅创建包体版本，未提交审核，核验时审核状态仍为“未发布”（0）。旧横屏包体 `328253` 保留为历史版本。本地新增 MP3 与原生播放路径的版本尚未重新上传。真实玩家成绩、原生面板和跨周重置仍待在 TapTap 自测环境验证。历史上传记录见 [上传与验证记录](validation/taptap-2026-10-19.md)。

在仓库根目录运行以下命令，预期竖屏缩放、触屏输入、十关边界、高速碰撞、菜单、暂停、重开、排行榜和分享回归测试全部通过：

```sh
node --test minigames/tests/breakout.test.mjs
```

2026-10-19 的竖屏与 MP3 验证：43 项逻辑测试通过，包含缺少浏览器 AudioContext 的 TapTap 原生播放、音频暂停/静音、资源路径、失败重试及旧回调隔离，并新增首次命中无创建/加载/停止调用、未就绪跳过、繁忙声道复用和连锁爆破播放限频验证。性能改动后的本地 Chrome 开声运行至得分 56，暂停菜单声音保持开启，控制台无警告或错误；这不能代表 TapTap 真机帧时间验证。本地 Chrome 检查了 320×568、375×667、390×844，以及平板、桌面和矮横屏视口；球场保持竖向比例，无水平溢出，操作按钮均可见且满足至少 44 像素的触控尺寸。实际操作验证了发球、暂停和重开；MP3 版本的音乐与事件音频请求返回 200，控制台没有音频警告或错误。全部 MP3 通过 FFmpeg 完整解码检查。触屏与原生接口使用模拟环境测试，仍需在真实手机和 TapTap 宿主中复测。

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
