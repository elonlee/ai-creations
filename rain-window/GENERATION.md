# 雨窗手记制作说明

雨窗手记是一个在雨窗前写日常的纯前端页面。入口是 [index.html](index.html)，运行和操作方法见 [README.md](README.md)。页面参考了用户提供的雨窗界面截图，并按后续反馈调整雨滴、背景和声音。

## 使用的模型与工具

页面代码、交互逻辑、雨滴效果和本文档由 **Codex（基于 GPT-6）** 辅助编写。当前会话没有提供可核验的模型变体 ID 或每次修改的模型调用记录，因此不标注 Astra、Sol 等具体变体。

四张背景图在项目中记录为 AI 生成图片，分别是 `assets/tokyo.jpg`、`assets/harbor.jpg`、`assets/terraces.jpg` 和 `assets/village.jpg`。现有文件没有保留图像生成工具的底层模型编号、原始提示词或生成参数，无法准确补写这些信息，也不能保证重新生成相同画面。

雨声和雷声没有使用音乐生成模型。它们来自公开录音，裁剪、处理和转码后作为本地 MP3 播放；页面运行时不调用 AI 服务。

## 制作过程

最初按用户提供的三张截图制作书写区和右侧控制面板，加入手记管理、背景选择、天气预设、雨滴参数和文字设置。随后补充雨声、雷声与两处乡村背景。

雨滴效果经过多次调整。用户希望背景保持可辨认，静止在玻璃上的只保留小水珠，较大的雨滴可以移动，但不要留下大块雨痕。最终版本优先使用 WebGL 2 绘制水滴的弧面、折射和移动轨迹；移动水滴经过时会扫开细珠。浏览器不支持 WebGL 2 时，页面改用 Canvas 2D。实现思路参考了用户提供的[雨窗演示](https://2lt3tc7rdlpgi.ok.kimi.link/)；着色器和页面代码在本项目中编写。

[app.mjs](app.mjs) 负责面板、手记、音频和设置保存；[state.mjs](state.mjs) 负责默认值及本地数据校验；[glass.mjs](glass.mjs) 是 WebGL 2 效果；[rain.mjs](rain.mjs) 负责 Canvas 2D 所需的雨滴分布。手记和设置保存在当前浏览器的 `localStorage`。用户上传的背景图会缩小后存入本地，不会发送到服务器。

## 声音素材

| 本地文件 | 原始录音与授权 | 制作处理 |
| --- | --- | --- |
| `assets/rain-ambience.mp3` | [Light Rain Distant Thunder July 5th 2016.wav](https://commons.wikimedia.org/wiki/File:Light_Rain_Distant_Thunder_July_5th_2016.wav)，kvgarlic，CC0 | 截取约 14～70 秒的轻雨片段；削弱低频轰鸣和高频噪声；将首尾交叠 3 秒后做音量处理，编码为 53 秒立体声 MP3。 |
| `assets/thunder.mp3` | [Rain and thunder.ogg](https://commons.wikimedia.org/wiki/File:Rain_and_thunder.ogg)，Caesar，公有领域 | 转码为 MP3，用于雷雨天气和手动试听。 |

雨声需要用户点击后才播放，并会循环；雷雨或暴雨模式会间歇播放雷声。浏览器对自动播放的限制仍然适用。

## 验证与限制

在仓库根目录运行 `node --test rain-window/tests/*.test.mjs`，检查手记状态、天气预设、乡村背景和雨滴约束。预期 7 项测试全部通过；本次文档更新时实际运行了该命令，结果为 7 项通过。手记仅存在当前浏览器中，清除网站数据后无法从本项目恢复。
