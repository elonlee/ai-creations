# 《还剑渡》角色素材生成记录

这里记录《还剑渡》第一版的对话头像和陆照的地图行走图。对话头像是独立 PNG；行走图是按固定尺寸排列的逐帧图集。

## 角色与文件

| 角色 | 视觉设定 | 原图 | 对话镜像图 |
| --- | --- | --- | --- |
| 陆照 | 蓝灰旧衣、简束发、背剑带，初入江湖的克制感 | [原图](assets/portraits/lu-zhao-v1.png) | [镜像图](assets/portraits/lu-zhao-v1-mirrored.png) |
| 沈棠 | 青色便服、褐色围裙、木簪，渡口酒肆老板娘 | [原图](assets/portraits/shen-tang-v1.png) | [镜像图](assets/portraits/shen-tang-v1-mirrored.png) |
| 程砚 | 深绿门派衣袍、束发、佩剑，神情严厉 | [原图](assets/portraits/cheng-yan-v1.png) | [镜像图](assets/portraits/cheng-yan-v1-mirrored.png) |
| 老船工 | 斗笠、旧蓑衣、灰发，见过十年前的旧案 | [原图](assets/portraits/old-ferryman-v1.png) | [镜像图](assets/portraits/old-ferryman-v1-mirrored.png) |

“沈棠”和“程砚”是本次为此前未命名的角色暂定的名字；故事尚未将这两个名字写入游戏。

## 工具与提示词

四张图由 Codex 内置 ImageGen 工具分别生成，未使用外部参考图片。当前工具结果没有提供可核验的底层图像模型版本，因此不标注具体型号。生成时启用了透明背景。

四张图共用的英文风格提示词要点：

> Independent square dialogue portrait for retro Chinese wuxia pixel RPG 《还剑渡》. Head and shoulders, three-quarter view, safe margins. Handcrafted 16-bit era pixel art, intentional pixel clusters, restrained muted palette, dark pixel outline, readable at small dialogue-box size, subtle ink-painting atmosphere translated into pixels. Transparent background. No text, frame, watermark, smooth digital painting, photorealism or chibi proportions.

每张图的角色提示词：

- 陆照：19-year-old male junior disciple; lean face, dark hair in a simple high knot, faded indigo travelling robe, off-white collar, worn leather sword strap; alert and principled, neither glamorous nor aggressive.
- 沈棠：28-year-old daughter of Shen Du and ferry-side wine shop owner; calm unwavering gaze, simple wooden hairpin, weathered teal robe, rolled sleeves, faded rust-brown apron; practical and self-reliant, quiet grief.
- 程砚：31-year-old senior disciple of Qingya Sect; angular face, tightly bound hair, modest metal clasp, desaturated pine-green and charcoal martial robe, sword hilt; controlled stern expression with inner conflict.
- 老船工：ferryman in his late 60s; weather-beaten face, wrinkles, gray beard, tilted straw rain hat, patched dark ochre cloak, muted gray-blue work clothes; kind yet wary eyes.

## 检查与使用限制

使用 `sips` 检查了四张原图：均为 1254 × 1254 像素的 PNG，且包含 Alpha 透明通道。已目视检查角色外形、服饰、色彩和构图。

四张对话镜像图由 `ffmpeg -vf hflip -pix_fmt rgba` 从原图制作。使用 Swift 逐像素对比确认，镜像图的每个 RGBA 像素都与原图对应的水平反转位置一致。生成式镜像和 `sips` 镜像曾用于尝试，但会改变少量像素，未保留其结果。

当前头像是高分辨率概念图；正式游戏中的显示尺寸、缩放效果以及与对话框的配合尚未验证。

## 陆照四方向行走图

游戏用图集是 [lu-zhao-walk-64-v1.png](assets/sprites/lu-zhao-walk-64-v1.png)，尺寸为 192 × 256 像素。每帧占 64 × 64 像素，3 列 × 4 行。自上而下依次是下、左、右、上；每行从左到右依次是左脚迈步、站立、右脚迈步。循环播放顺序建议为第 2、1、2、3 列，速度暂定每秒 6 帧。程序可读取 [lu-zhao-walk-64-v1.json](assets/sprites/lu-zhao-walk-64-v1.json) 获取这些参数。

另存了 [12 张独立帧](assets/sprites/lu-zhao-walk-frames/) 和 [ImageGen 原图](assets/sprites/lu-zhao-walk-source-v1.png)。原图尺寸为 1086 × 1448 像素，每格 362 × 362 像素。生成时把陆照头像作为身份和服装参考，要求输出同一角色的四方向、每方向三帧透明像素图。核心提示词如下：

> Production-ready 2D top-down RPG walking sprite sheet. Image 1 is an identity and costume reference only for Lu Zhao: young Chinese male disciple, black high-tied hair with blue band, faded indigo robe, off-white inner collar, brown diagonal sword strap and sheathed sword on his back. Make exactly twelve full-body pixel sprites in a precise 3-column by 4-row grid. Rows: down, left, right, up. Columns: left-foot step, neutral stand, right-foot step. Same character, scale, costume and foot baseline in every cell. Authentic small 16-bit pixel art with chunky clean pixels and transparent background. No scenery, dividers, labels or extra figures.

使用 [build-lu-zhao-walk.sh](assets/sprites/build-lu-zhao-walk.sh) 将原图以最近邻采样缩小，并调整每帧在格子中的位置。这一步只改变大小与位置，没有重画人物。脚本生成 12 张 64 × 64 像素独立帧，然后拼成图集。

检查结果：图集为 192 × 256 像素透明 PNG；12 张独立帧均已生成。逐格检查 Alpha 边界后，所有人物像素都位于格子内部，没有越界。每个方向的两张迈步帧与站立帧像素不同。实际游戏中的动画速度、移动碰撞和镜头效果尚未验证。

## 场景设计图

[SCENES.md](SCENES.md) 记录四个场景的连接方式、剧情事件和使用限制。下列四张图由 Codex 内置 ImageGen 分别生成，未使用外部素材。乌篷渡图先生成；酒肆和码头图使用乌篷渡图作为风格与配色参考。荒山驿道的初稿过于接近渡口，最终重做为独立的山路图。未采用的初稿没有加入项目。

| 场景 | 最终提示词要点 | 文件 |
| --- | --- | --- |
| 荒山驿道 | `Remote mountain wilderness; left-to-right walkable dirt road; short loop around a boulder; broken grain cart; sparse pines; no buildings, river or bridge; orthographic top-down wuxia pixel RPG map.` | [mountain-road-concept-v1.png](assets/scenes/mountain-road-concept-v1.png) |
| 乌篷渡 | `Compact riverside settlement; central walkable square; wine shop at upper-left; mountain-road entrance at southwest; eastern path to dock; dusk after rain; orthographic top-down 16-bit pixel art.` | [wupeng-ferry-concept-v1.png](assets/scenes/wupeng-ferry-concept-v1.png) |
| 酒肆 | `Compact top-down wine-shop interior; bottom entrance; counter and jars; two tables; flood marks and relief-grain sacks; warm lantern; open central floor; same palette as ferry village.` | [wine-shop-concept-v1.png](assets/scenes/wine-shop-concept-v1.png) |
| 码头 | `Rainy midnight dock; west entrance; open duel space; timber pier toward east-side river; moored covered grain barge, sacks and lanterns; same palette as ferry village.` | [dock-concept-v1.png](assets/scenes/dock-concept-v1.png) |

四张图已目视检查场景主题和主要通路，并用 `sips` 核对文件尺寸。它们尚未拆分为地图图块，也未验证人物碰撞、相机滚动或场景切换。ImageGen 的底层图像模型版本仍无法从工具结果核验。

## 战斗界面与人物

[BATTLE.md](BATTLE.md) 说明战斗画面布局、指令含义与预览方式。[battle-preview.html](battle-preview.html)、[battle-preview.css](battle-preview.css)、[battle-preview.js](battle-preview.js) 和 [battle-animation.mjs](battle-animation.mjs) 组成可切换场景的动作预览。代码由 Codex 编写，未使用外部 UI 库或网络字体。人物战斗姿态由内置 ImageGen 分别生成，未使用外部图片：

- [lu-zhao-stance-v1.png](assets/battle/lu-zhao-stance-v1.png)：以陆照头像为身份和服装参考，提示词要求完整站姿、朝右、低位持剑防备、蓝灰旧衣与背剑带、透明背景和清晰像素轮廓。
- [cheng-yan-stance-v1.png](assets/battle/cheng-yan-stance-v1.png)：以程砚头像为身份和服装参考，提示词要求完整站姿、朝左、横剑守势、深绿门派衣袍、克制的表情和透明背景。
- [road-bandit-stance-v1.png](assets/battle/road-bandit-stance-v1.png)：无图片参考，提示词要求一个写实可信的山贼、褐色补丁衣、暗红头巾、草披肩、短刀、朝左的战斗姿态和透明背景。

三张人物图均已目视检查朝向和完整站姿。初版预览页在浏览器中检查了驿道与码头两种状态、程砚战禁用退走、键盘选择“破招”，以及 375 像素宽视口无横向溢出。预览尚未接入正式回合制逻辑。

## 战斗攻防动画

内置 ImageGen 以三张战斗姿态图分别作为角色参考，生成 [陆照](assets/battle/animations/lu-zhao-actions-v1.png)、[山贼](assets/battle/animations/road-bandit-actions-v1.png)和[程砚](assets/battle/animations/cheng-yan-actions-v1.png)的透明动作图集。生成时要求沿用原角色的脸、服装、兵器与朝向，保持 16 位武侠像素风格。每张图集为 1774 × 887 像素，按四列、两行排列：第一行是攻击的起势、蓄力、出招、收势；第二行是防御的起势、举兵器、格挡、收势。主要提示词如下：

> Create a production-ready pixel art combat animation sprite sheet for the exact character in the reference image. Maintain facial features, costume palette, equipment, proportions and facing direction. Strictly four columns by two rows of equally sized full-body frames on a transparent background. Top row: ready, anticipation, swing or thrust, recovery. Bottom row: ready, raised weapon, guarded block with a small impact spark, recovery. No scenery, text, extra figures or panel borders.

[build-frames.py](assets/battle/animations/build-frames.py) 使用最近邻缩放，将每张图集拆为 444 × 444 像素的独立帧。原始图集中的剑气和刀光跨过分格，曾混入相邻攻击帧。脚本现在按像素区域保留当前人物，清除相邻帧残影。山贼出招帧的刀光与人物分离，因此保留这两个区域。原始图集仍保留作生成记录，预览使用修正后的独立帧。

若要重建，在仓库根目录运行 `uv run --with pillow python huanjian-du/assets/battle/animations/build-frames.py`。需要已安装 `uv`，首次运行会下载 Pillow。动作帧是高分辨率预览素材，尚未按游戏最终分辨率重新绘制。ImageGen 未提供可核验的底层图像模型版本。

已目视检查三名角色的出招帧和格挡帧。`node --test huanjian-du/tests/battle-animation.test.mjs` 检查了 36 张帧文件互不重复、受击从命中帧开始、播放后恢复站姿，以及切换场景时取消旧动作。

`uv run --with pillow python -m unittest discover -s huanjian-du/tests -p 'test_battle_frames.py'` 检查三名角色的攻击帧。山贼出招帧应有“人物”和“刀光”两个主要区域，其他攻击帧应只有一个。灰底合成图和浏览器预览均已目视检查：陆照、山贼、程砚的收势帧不再出现相邻动作残影。

## 受击动画

内置 ImageGen 以三张战斗姿态图作为身份参考，分别生成 [陆照](assets/battle/animations/lu-zhao-hit-source-v1.png)、[山贼](assets/battle/animations/road-bandit-hit-source-v1.png)和[程砚](assets/battle/animations/cheng-yan-hit-source-v1.png)的透明受击图。生成时要求沿用角色服装、兵器、朝向和像素风格。每张原图为两列、两行，按顺序表现被击中、后仰、失衡和重新站稳。主要提示词如下：

> Create a production-ready four-frame hit reaction sprite sheet for the exact character in the reference image. Preserve identity, costume, weapon, palette, pixel-art style and facing direction. Two columns by two rows, one full-body character per cell on transparent background. Frames: impact begins with weapon low and not blocking; clear recoil with a small impact spark; stagger backward; regain footing while still hurt. No attacker, blood, scenery, text or borders.

三张原图的尺寸分别为 1254 × 1254、1230 × 1278 和 1245 × 1263 像素。原图中的部分手脚越过了两行之间的分格线。[build-frames.py](assets/battle/animations/build-frames.py) 按各角色相连的非透明像素提取完整人形，再缩放到 444 × 444 像素的独立帧；这一步没有重画角色。已目视检查 12 张受击帧，人物和兵器没有被裁断，也没有相邻帧残影。ImageGen 未提供可核验的底层图像模型版本。

浏览器预览确认：驿道战的山贼、码头战的程砚在“出剑”后显示受击；“预览陆照受击”显示陆照被敌人击中。命中时气血数值保持不变，控制台没有错误。`test_battle_frames.py` 检查受击帧的完整人物均在画布内。

## 可玩第一章

[index.html](index.html)、[game.css](game.css)、[menu.css](menu.css)、[game.mjs](game.mjs)、[menu.mjs](menu.mjs) 与 [game-app.mjs](game-app.mjs) 由 Codex 编写，使用以上已记录的本地图片和动作帧，未引入新的外部素材或库。`game.mjs` 负责场景通行、剧情线索、随机遭遇、战斗和升级规则；`menu.mjs` 管理主界面、说明页和游戏页的切换；页面脚本负责键盘与按钮操作、界面更新和动作播放。详细运行方式与当前限制见 [README.md](README.md)。

浏览器中已从驿道走到码头，验证粮车调查、流民交粮、山贼遭遇、线索解锁、等级提升、程砚战退走限制，以及战胜程砚后的章节结局。战斗规则和场景交互另由 `node --test huanjian-du/tests/*.test.mjs` 检查。

主界面以乌篷渡场景图为背景，使用陆照现有战斗姿态图，没有重新生成图片。浏览器已验证打开页面先显示两个选单，“游戏说明”可返回主界面，“开始游戏”进入驿道，从游戏返回主界面后再次开始会重置进度。375 像素宽度下，主界面和说明页没有横向溢出。
