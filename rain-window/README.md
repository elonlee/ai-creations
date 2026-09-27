# 雨窗手记

雨窗手记是一个纯前端的日常记录页面。文字写在雨窗前，四处场景、天气、玻璃水滴和声音都可以在右侧面板调整。

模型、制作过程和素材处理记录见 [GENERATION.md](GENERATION.md)。

## 运行

在仓库根目录执行：

```bash
python3 -m http.server 8000
```

然后在浏览器打开 `http://localhost:8000/rain-window/`。无需安装依赖。直接打开 `rain-window/index.html` 时，浏览器可能限制 ES 模块和本地音频加载，因此建议使用本地 HTTP 服务。

## 使用

- 在页面中央输入文字。手记和设置会自动保存到当前浏览器的 `localStorage`。点击“全部手记”可新建、切换或删除手记。
- 在“效果”里选择天气、两处城市夜景、山间梯田或乡村夜路，也可以上传自己的背景图片。上传的图片会缩小并保存在当前浏览器，不会发送到服务器。
- 调整雨滴密度、速度、大小、短雨线长度、风向和尺度；也可改变雾气、折射、色散与文字样式。静止雨滴始终是小水珠；较大的雨滴只会在移动时出现，不会留下长水痕。
- 点击“开启雨声”播放循环雨声。雷雨或暴雨模式会间歇播放雷声，也可点击“试听雷声”。浏览器要求用户先点击按钮才能播放声音。
- 按 `P` 显示或隐藏控制面板，按 `H` 进入沉浸模式，按 `Esc` 退出沉浸模式。输入文字时不会触发快捷键。

手记只保存在当前浏览器。清除网站数据或使用其他设备时，手记不会自动迁移。较大的自定义图片可能超过浏览器存储空间；页面会显示保存失败提示。

玻璃效果优先使用 WebGL 2 实时计算小水珠和移动雨滴。水滴有弧形厚度，移动时会扫开途经的小水珠，并留下零散的细小水珠。静止图层只保留小水珠。浏览器不支持 WebGL 2 时会自动改用 Canvas 2D。系统启用“减少动态效果”时，较大的移动雨滴会隐藏。

雨滴的高度场和扫开细珠的处理参考了[这个雨窗演示](https://2lt3tc7rdlpgi.ok.kimi.link/)的公开前端实现；本项目的着色器独立编写，没有依赖该站脚本。

## 素材

- `assets/tokyo.jpg`、`assets/harbor.jpg`、`assets/terraces.jpg`、`assets/village.jpg`：使用 AI 生成的背景图。
- `assets/rain-ambience.mp3`：取自 Wikimedia Commons 的 [Light Rain Distant Thunder July 5th 2016.wav](https://commons.wikimedia.org/wiki/File:Light_Rain_Distant_Thunder_July_5th_2016.wav)，录音者 kvgarlic，CC0。截取较平稳的轻雨片段，削弱低频轰鸣并处理循环衔接后转为立体声 MP3。
- `assets/thunder.mp3`：由 Wikimedia Commons 的 [Rain and thunder.ogg](https://commons.wikimedia.org/wiki/File:Rain_and_thunder.ogg) 转码，原作者 Caesar，公有领域。

音频使用 MP3 文件，浏览器可直接播放；这里不需要视频格式的 MP4。
