# 长风传 Godot 版素材与制作记录

这个目录没有生成新的角色或场景图片。`assets/` 中的四张场景图、人物立绘、四方向行走帧和战斗动作帧复制自 [原网页项目](../huanjian-du/assets/)。原始提示词、生成工具、镜像与逐帧处理方法见 [原项目的生成记录](../huanjian-du/GENERATION.md)。素材文件名保留旧名；游戏内名称统一使用“陆寒江”。

Godot 版的规则脚本、界面脚本、场景和测试由 Codex 编写。主菜单、对话框、状态栏、按钮和结局页均由 Godot 控件绘制。Web 导出需要随包提供中文字形，因此加入 [Noto Sans CJK SC Regular](assets/fonts/NotoSansCJKsc-Regular.otf)。字体来自 [notofonts/noto-cjk](https://github.com/notofonts/noto-cjk)，按 [SIL OFL 1.1](assets/fonts/OFL.txt) 许可分发；没有修改字体文件。首页缩略图使用本项目在 Godot 4.7.2 下运行时截取的战斗画面。

## 音频来源

2026-09-29 从 OpenGameArt 下载音频。下列来源页均将对应作品标为 [CC0 1.0](https://creativecommons.org/publicdomain/zero/1.0/)，游戏可以使用和修改，无强制署名要求。这里仍保留作者及来源，便于以后替换或核对。项目运行时使用的文件都在 `assets/audio/`。

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
