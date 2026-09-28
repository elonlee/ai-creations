# 长风传（Godot 4 版）

这是《长风传》第一章的 Godot 4 + GDScript 版本，放在独立项目目录中。剧情、角色、场景、随机遭遇和回合制战斗延续原来的 [网页版本](../huanjian-du/README.md)。图片复制到本项目的 `assets/`，打开项目不依赖原目录。

## 运行

前置条件：安装 Godot 4 标准版，建议使用已验证的 4.7.2。本项目使用 GDScript，不需要 .NET 版。在 Godot 项目管理器中导入本目录的 `project.godot`，打开后按 F5 运行。首次打开会导入图片和字体素材，需要等待导入结束。其他 Godot 4 版本尚未验证。

也可在仓库根目录运行（将 `godot` 换成本机 Godot 可执行文件路径）：

```sh
godot --path changfeng-zhuan-godot
```

预期先看到“开始游戏”和“游戏说明”。开始后黑屏字幕会自动播放；点击画面或按空格可提前进入下一句。剧情可从荒山驿道一直玩到夜雨码头的章节结局。菜单、探索和战斗会切换背景音乐；战斗动作会播放音效。

## 操作

- 方向键或 WASD 移动；右下角也有方向按钮。
- 靠近场景标记后，按 E、空格、回车，或点击“交谈 / 调查”。
- 老船工认出佩剑后，按 Q 或点击“检查剑柄”。
- 对话时点击半透明文字框、按空格或回车继续。流民对话末尾使用选项按钮。
- 战斗时点击出剑、破招、守势、服药或退走。破招消耗 2 点内力；程砚战不能退走。
- 点击右上角“声音：开 / 关”或按 M，可同时暂停背景音乐和静音战斗音效。

山路有效移动会触发随机遭遇。气血归零时会进入失败画面，返回主界面后可重新开始。当前版本没有存档。

## 调试和测试

启动参数 `--debug=节点` 可直接进入关键画面。支持 `intro`、`ferry`、`tavern`、`dock`、`dialogue`、`battle`、`boss`、`ending`、`defeat`。例如：

```sh
godot --path changfeng-zhuan-godot -- --debug=boss
godot --headless --path changfeng-zhuan-godot --script res://tests/test_game_rules.gd
godot --headless --path changfeng-zhuan-godot --script res://tests/test_game_ui.gd
godot --headless --path changfeng-zhuan-godot --script res://tests/test_audio.gd
```

第一条命令预期直接显示程砚的战前对话；后三条分别检查游戏规则、界面操作和音频切换，成功时退出码均为 0。`tests/capture_screen.gd` 可在支持图形界面的本机截取关键画面，例如：

```sh
godot --path changfeng-zhuan-godot --script res://tests/capture_screen.gd -- --debug=battle --capture=/tmp/changfeng-battle.png
```

## 浏览器导出

先安装与 Godot 编辑器版本完全一致的官方导出模板。然后在仓库根目录运行：

```sh
godot --headless --editor --path changfeng-zhuan-godot --export-release Web web/index.html
python3 -m http.server 8767
```

打开 `http://localhost:8767/changfeng-zhuan-godot/web/`。Web 导出使用单线程和 Compatibility 渲染器。必须通过 HTTP 或 HTTPS 提供文件，不能直接用 `file://` 打开。部分浏览器会在首次点击或按键前限制自动播放；进入游戏后即可听到声音。仓库中的 `web/` 是供作品首页使用的构建产物；修改脚本或素材后需重新导出并同步更新它。

## 项目结构

`scripts/game_rules.gd` 管理剧情状态、通行、随机遭遇、经验和战斗；`scripts/main.gd` 绘制界面并播放动作帧；`scripts/audio_director.gd` 管理音乐切换、战斗音效和静音。`scenes/main.tscn` 是运行入口。角色名字集中在 `game_rules.gd` 的 `NAMES` 常量；素材文件名保留制作时的旧称呼。素材来源与复用范围见 [GENERATION.md](GENERATION.md)。
