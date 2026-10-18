# 长风传 Godot 版素材与制作记录

这个目录没有生成新的角色或场景图片。`assets/` 中的四张场景图、人物立绘、四方向行走帧和战斗动作帧复用自已移除的原生网页版。图片来源与处理记录已整理到下文，素材已打包进 `web/index.pck.gz`；下文的 `res://` 路径指资源包内文件。素材制作时游戏暂名《还剑渡》、主角名为陆照；文件名保留旧名，游戏内名称统一使用“陆寒江”。

Godot 版的规则脚本、界面脚本、场景和测试由 Codex 编写。主菜单、对话框、状态栏、按钮和结局页均由 Godot 控件绘制。Web 导出需要随包提供中文字形，因此加入 Noto Sans CJK SC Regular（`res://assets/fonts/NotoSansCJKsc-Regular.otf`）。字体来自 [notofonts/noto-cjk](https://github.com/notofonts/noto-cjk)，按 [SIL OFL 1.1](web/OFL.txt) 许可分发；当前 release 按游戏全部界面文字与可打印 ASCII 生成字体子集，保留原字形轮廓及版权信息，修改版字体名称为「Changfeng Web UI」。首页缩略图使用本项目在 Godot 4.7.2 下运行时截取的战斗画面。

## 图片来源与处理

以下记录整理自原网页版的素材生成记录。图片由 Codex 内置 ImageGen 生成；工具结果未提供可核验的底层图像模型版本。没有使用外部图片，参考图均为此前生成的本作图片。发布包保留运行所需的成品，原始动作图集、独立 PNG 和处理脚本未单独收录。

人物立绘（`res://assets/portraits/`） 使用透明背景和 16 位武侠像素风格。陆照、沈棠、程砚和老船工分别生成，未使用外部参考图。共同提示词要点为：

> Independent square dialogue portrait for retro Chinese wuxia pixel RPG 《还剑渡》. Head and shoulders, three-quarter view, safe margins. Handcrafted 16-bit era pixel art, intentional pixel clusters, restrained muted palette, dark pixel outline, readable at small dialogue-box size, subtle ink-painting atmosphere translated into pixels. Transparent background. No text, frame, watermark, smooth digital painting, photorealism or chibi proportions.

角色提示词分别为：陆照是 19 岁、蓝灰旧衣、束发背剑的年轻弟子；沈棠是 28 岁、木簪青衣、神情坚定的酒肆主人；程砚是 31 岁、深绿门派衣袍、神情克制的师兄；老船工戴斗笠、穿旧蓑衣，灰发且神情和善警觉。拦路流民以沈棠头像为风格参考，要求四十岁左右、疲惫但有尊严的男性、灰褐补丁粗布衣、朝右的半身像，不复用她的身份和服装。原图均为 1254×1254 透明 PNG；镜像图使用 FFmpeg 的 `-vf hflip -pix_fmt rgba` 制作。

四方向行走帧（`res://assets/sprites/`） 以陆照头像为身份与服装参考，原图为 1086×1448，三列四行，每格 362×362。提示词要求十二个完整人物，方向自上而下为下、左、右、上，每行依次为迈步、站立、迈步，同一服装和脚底基线、透明背景，无场景、分隔线或额外人物。使用最近邻采样缩小并调整各帧位置，成品为十二张 64×64 透明 PNG，文件编号为 `frame-00.png` 至 `frame-11.png`。

四张场景由 ImageGen 分别生成。乌篷渡先生成，酒肆和码头以它为风格与配色参考；荒山驿道最终重做为独立山路。最终提示词要点如下：

| 场景 | 提示词要点 | 文件 |
| --- | --- | --- |
| 荒山驿道 | `Remote mountain wilderness; left-to-right walkable dirt road; short loop around a boulder; broken grain cart; sparse pines; no buildings, river or bridge; orthographic top-down wuxia pixel RPG map.` | mountain-road-concept-v1.png（`res://assets/scenes/mountain-road-concept-v1.png`） |
| 乌篷渡 | `Compact riverside settlement; central walkable square; wine shop at upper-left; mountain-road entrance at southwest; eastern path to dock; dusk after rain; orthographic top-down 16-bit pixel art.` | wupeng-ferry-concept-v1.png（`res://assets/scenes/wupeng-ferry-concept-v1.png`） |
| 酒肆 | `Compact top-down wine-shop interior; bottom entrance; counter and jars; two tables; flood marks and relief-grain sacks; warm lantern; open central floor; same palette as ferry village.` | wine-shop-concept-v1.png（`res://assets/scenes/wine-shop-concept-v1.png`） |
| 码头 | `Rainy midnight dock; west entrance; open duel space; timber pier toward east-side river; moored covered grain barge, sacks and lanterns; same palette as ferry village.` | dock-concept-v1.png（`res://assets/scenes/dock-concept-v1.png`） |

战斗素材（`res://assets/battle/`） 包含陆照、程砚和山贼的站姿、攻击、格挡与受击帧。陆照和程砚站姿以各自头像为身份与服装参考，要求完整人物、低位持剑防备、透明背景，分别朝右和朝左。山贼未使用参考图，提示词要求褐色补丁衣、暗红头巾、草披肩、短刀、朝左的可信人物。

攻防图集以三张站姿图为参考，原图均为 1774×887，四列两行：上行为攻击的起势、蓄力、出招、收势，下行为防御的起势、举兵器、格挡、收势。主要提示词如下：

> Create a production-ready pixel art combat animation sprite sheet for the exact character in the reference image. Maintain facial features, costume palette, equipment, proportions and facing direction. Strictly four columns by two rows of equally sized full-body frames on a transparent background. Top row: ready, anticipation, swing or thrust, recovery. Bottom row: ready, raised weapon, guarded block with a small impact spark, recovery. No scenery, text, extra figures or panel borders.

受击图同样以站姿图为参考，原图分别为 1254×1254、1230×1278 和 1245×1263。主要提示词如下：

> Create a production-ready four-frame hit reaction sprite sheet for the exact character in the reference image. Preserve identity, costume, weapon, palette, pixel-art style and facing direction. Two columns by two rows, one full-body character per cell on transparent background. Frames: impact begins with weapon low and not blocking; clear recoil with a small impact spark; stagger backward; regain footing while still hurt. No attacker, blood, scenery, text or borders.

攻防与受击帧使用最近邻采样拆为 444×444 独立透明 PNG，并按非透明像素区域清除相邻分格的动作残影。山贼出招保留人物与分离的刀光两个主要区域；受击帧提取完整人物，避免跨格的手脚被截断。这些处理只改变大小、位置和像素保留区域，没有重画角色。

## 音频来源

2026-09-29 从 OpenGameArt 下载音频。下列来源页均将对应作品标为 [CC0 1.0](https://creativecommons.org/publicdomain/zero/1.0/)，游戏可以使用和修改，无强制署名要求。这里仍保留作者及来源，便于以后替换或核对。音频保存在资源包内的 `res://assets/audio/`，随发布包分发。

| 用途与文件 | 作者、作品与来源 | 处理 |
| --- | --- | --- |
| 菜单及序幕 `menu.mp3` | thisismyusername，[1 minute.](https://opengameart.org/content/1-minute) | 原 MP3，未修改 |
| 探索及对话 `explore.mp3` | Tozan，[Asianoriental2](https://opengameart.org/content/asianoriental2) | 将原 OGG 转为 MP3；作者描述为中国风尝试 |
| 普通战斗及首领战 `battle.mp3` | Wolfgang_，[Battle Theme](https://opengameart.org/content/battle-theme-0) | 原 MP3，未修改 |
| 出剑 `attack.mp3` | pauliuw，[Attack miss or hit sounds(2)](https://opengameart.org/content/attack-miss-or-hit-sounds2) 的 `attack_hit.mp3` | 原 MP3，未修改 |
| 破招 `skill.mp3` | pauliuw，[Skill hit](https://opengameart.org/content/skill-hit) | 原 MP3，未修改 |
| 守势与格挡 `guard.mp3` | BMacZero，[Metal Impact Sounds](https://opengameart.org/content/metal-impact-sounds) 的 `clink2.wav` | 将原 WAV 转为 MP3 |
| 受击 `hit.mp3` | GreyFrogGames，[Player Hit (damage)](https://opengameart.org/content/player-hit-damage) | 原 MP3，未修改 |

转换使用本机 FFmpeg 的 `libmp3lame` 编码器；探索曲的质量参数为 `-q:a 4`，格挡音为 `-q:a 3`。原 OGG、WAV 未收入项目，可从来源页重新下载。音乐在 Godot 中从头循环；原作者没有保证所有曲目都可无缝循环。浏览器可能要求先点击或按键才允许播放声音，见 [Godot Web 导出说明](https://docs.godotengine.org/en/4.5/tutorials/export/exporting_for_web.html#audio)。

`web/` 使用 Godot 4.7.2 官方导出模板构建。随导出文件附有 [Godot 许可](web/GODOT-LICENSE.txt)、[第三方版权说明](web/GODOT-COPYRIGHT.txt)和[字体许可](web/OFL.txt)。

场景图是整幅概念图，并非逐块拼接的 TileMap。人物按 20×12 的逻辑坐标叠加在场景图上，通行区域由 `game_rules.gd` 判断。画面和点击区域在 1280×720 的基准视口设计；小屏幕会缩放整个游戏画面，尚未为手机重新排版。

## 2026-10-18：仅保留 Web release 与体积优化

用户补充要求只保留 Web release，并移除不用文件、压缩大文件。运行源码和素材先复制到临时工程，发布包验证后移除本目录内的 Godot 源码、场景、预设、独立素材和 `.godot/` 缓存。许可和原始图片制作记录继续保留在本发布目录中；`res://` 路径不表示存在对应的仓库文件。

完整中文字库由 FontTools 4.67.0 按全部 GDScript、场景、项目配置及可打印 ASCII 生成子集，从 16,437,364 字节减为 179,664 字节；核对所需的 516 个 Unicode 字符均有保留。移除了五张未被游戏使用的立绘副本，首页缩略图和测试也不再打入 PCK。游戏内图片的分辨率、颜色和透明度以及音频内容均保持原样。

引擎使用 Binaryen 133 的 `wasm-opt -Oz` 优化，功能开关与相同版本模板对应，参数见 [release.json](release.json)。引擎和资源包均使用 gzip level 9 无损压缩，`mtime=0`；浏览器通过原生 DecompressionStream 还原。`compressed-fetch.js` 接在 Godot Preloader 的资源获取处，识别 gzip 文件头，兼容普通静态服务和服务器已解压的响应，并将下载或解压失败交给原有重试与错误提示处理。解压后的大小同步写入 HTML 的 `GODOT_CONFIG.fileSizes`。

| 文件 | 优化前字节数 | 发布文件字节数 | 解压后字节数 |
| --- | ---: | ---: | ---: |
| 引擎 | 39,514,754 | 9,934,253 | 38,172,167 |
| 游戏资源 | 52,771,396 | 31,936,461 | 32,128,772 |

首页缩略图由原 1280×720 截图缩为 640×360，再使用 WebP 无损编码，文件名为 `thumbnail.webp`。此操作只影响首页预览。Godot MIT、引擎第三方版权及字体 OFL 许可继续随 `web/` 分发。

临时工程的规则、界面和音频测试全部通过。发布测试覆盖 gzip 文件解压、WASM 有效性、PCK 文件头、HTML 大小声明及两种服务器响应的加载行为。原始工程提交、字体子集字数、优化参数和发布产物 SHA-256 清单均记录在 [release.json](release.json)。

最终 `web/` 为 42,312,129 字节，比原 92,726,322 字节减少 54.4%；整个项目目录约 42.6 MB，比原约 158.0 MB 减少 73.0%（该比较均不计编辑器缓存）。另移除 52,724,753 字节本地导入缓存。

`node --test tests/gallery.test.mjs tests/changfeng-web.test.mjs` 的 6 项检查全部通过，`git diff --check` 通过，发布文件哈希及所有本地文档和页面依赖均已核对。浏览器中实际完成菜单与说明页打开、序幕、驿道行走、粮车调查、多轮对话、静音开关、山贼遭遇及出剑动作；双方气血随回合更新，控制台未见错误或警告。源码删除后重新加载，游戏仍可独立进入主菜单。尚未验证所有浏览器或公网部署。
