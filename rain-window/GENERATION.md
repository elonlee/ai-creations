# 雨窗手记制作说明

雨窗手记是一个在雨窗前记录日常的纯前端页面。入口是 [index.html](index.html)，运行和操作方法见 [README.md](README.md)。

## 素材与实现

- **背景图像**：四张背景图（`assets/tokyo.jpg`、`assets/harbor.jpg`、`assets/terraces.jpg`、`assets/village.jpg`）均为 AI 生成的本地静态资源；支持用户自行上传背景图并在压缩后存入浏览器本地，不会上传服务器。
- **雨滴渲染**：优先使用 WebGL 2 实时计算水珠弧面、折射、色散与移动雨滴扫开细珠效果，同时保留背景可辨认度；不支持 WebGL 2 时自动回退到 Canvas 2D。
- **本地存储**：[app.mjs](app.mjs) 负责面板、手记、音频与设置管理；[state.mjs](state.mjs) 负责默认值与校验；[glass.mjs](glass.mjs) 与 [rain.mjs](rain.mjs) 分别实现 WebGL 2 与 Canvas 2D 雨滴效果。手记与设置均保存在当前浏览器的 `localStorage`。雨滴高度场思路参考了[公开雨窗前端演示](https://2lt3tc7rdlpgi.ok.kimi.link/)，着色器与页面代码在本项目独立编写。

## 声音素材

| 本地文件 | 原始录音与授权 | 制作处理 |
| --- | --- | --- |
| `assets/rain-ambience.mp3` | [Light Rain Distant Thunder July 5th 2016.wav](https://commons.wikimedia.org/wiki/File:Light_Rain_Distant_Thunder_July_5th_2016.wav)，kvgarlic，CC0 | 截取约 14～70 秒轻雨片段，削弱低频轰鸣与高频噪声并交叠 3 秒实现无缝循环，编码为 53 秒立体声 MP3。 |
| `assets/thunder.mp3` | [Rain and thunder.ogg](https://commons.wikimedia.org/wiki/File:Rain_and_thunder.ogg)，Caesar，公有领域 | 转码为 MP3，用于雷雨天气及试听。 |

雨声需点击触发开启后循环播放，雷雨与暴雨模式会间歇触发雷声。

## 验证与限制

在仓库根目录运行 `node --test rain-window/tests/*.test.mjs`，预期 7 项测试全部通过。手记仅存在当前浏览器本地，清除站点数据后无法从项目恢复。
