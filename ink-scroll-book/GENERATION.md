# 《山水有归处》制作说明

这是一部浏览器中的六段水墨长卷电子书。入口是 [index.html](index.html)，运行方法见 [README.md](README.md)。正文、布局和交互代码由 Codex 编写；三张背景画由图像生成工具制作；配乐使用有明确授权的古琴演奏录音。

## 模型与工具

本次由 **Codex（基于 GPT-6）** 编写故事、HTML、CSS、JavaScript 和测试。当前会话没有提供可核验的具体模型变体 ID 或推理参数，因此不标注 Astra、Sol 等子型号。

三张水墨画使用 **OpenAI ImageGen 图像生成工具**，分别对应 `assets/mountains.jpg`、`assets/rain-bridge.jpg` 和 `assets/return-boat.jpg`。工具没有向会话提供可核验的底层图像模型版本或生成参数，因此不写具体模型编号。生成结果原为 PNG，制作时用 macOS `sips` 以 JPEG 质量 85 转为网站资源。相同提示词再次生成时，画面不保证完全一致。

页面没有调用音乐生成模型。两段古琴录音由 Charlie Huang 演奏，来源、授权和转码方式见下文。浏览器播放本地 MP3，不依赖在线音乐服务。

## 用户提示词

以下保留影响这部作品的用户原话：

> 做一本电子书。把章节做成中式水墨长卷。竖排题签、宣纸质感，六段滚动叙事从入卷到跋。

> 可以加入合适的音乐吗

> 这个音乐有点简单, 能不能到网上找一些古风音乐代替?

> 加入制作说明, 包括提示词和相关模型, 然后提交

音乐最初是浏览器合成的五声音阶旋律。收到第三条反馈后，改为两段真实古琴演奏，并增加换曲按钮。旧旋律不在当前版本中。

## 水墨画生成提示词

以下是提交给 ImageGen 的英文提示词原文。页面文字、竖排题签、朱红印记和宣纸纹理由 HTML/CSS 排版完成，没有要求图像模型在画面里生成文字。

### 群山与卷首：`assets/mountains.jpg`

```text
Use case: illustration-story. Asset type: atmospheric background artwork for a Chinese interactive scrolling ebook. Create an original classical Chinese shan shui ink-wash painting on warm ivory xuan paper: a broad misty mountain range receding in layered grey ink, delicate pine silhouettes on rocky cliffs, a tiny winding river and one small boat at the lower right, faint distant birds. The upper central and left areas are mostly generous clean paper negative space for HTML text overlay. Refined Song-dynasty-inspired brushwork, dry-brush texture, wet ink diffusion, soft edges, restrained charcoal gray, muted sage and very subtle warm taupe. Landscape composition, no border. Absolutely no lettering, no calligraphy, no stamps, no logos, no watermarks, no UI.
```

### 雨与石桥：`assets/rain-bridge.jpg`

```text
Use case: illustration-story. Asset type: atmospheric background for a classical Chinese scrolling ebook chapter about listening to rain and crossing a bridge. Original Chinese ink wash painting on warm ivory xuan paper. A small arched stone bridge over a quiet canal, willow branches and slender bamboo on the left, fine diagonal spring rain, rooflines of a distant Jiangnan village fading into pale mist. Main visual mass in lower half and right edge; generous blank paper in upper and left areas for readable HTML text. Song dynasty literati landscape brushwork, charcoal grey with restrained sage wash, delicate dry brush and wet ink bleed. Wide landscape. No text, no seals, no logos, no watermarks, no border.
```

### 归舟与暮江：`assets/return-boat.jpg`

```text
Use case: illustration-story. Asset type: atmospheric background for final chapters of a classical Chinese scrolling ebook. Original Chinese ink wash painting on warm ivory xuan paper. A lone small wooden boat with a tiny cloaked figure drifting across a mirror-still river at dusk, far layered mountains, sparse pine and reeds on the river bank, a soft muted vermilion sun almost hidden by mist. Main visual mass in lower half and left edge; generous blank paper in upper and right areas for readable HTML text. Song dynasty literati landscape brushwork, charcoal grey, muted sage and warm taupe, delicate dry brush and wet ink bleed. Wide landscape. No text, no seals, no logos, no watermarks, no border.
```

## 排版与交互

[index.html](index.html) 按入卷、听雨、过桥、寻山、归舟、跋排列六个章节。[style.css](style.css) 负责宣纸底色、细纹、题签、印记和宽窄屏布局。[reader.mjs](reader.mjs) 根据滚动位置更新阅读进度与卷目。图片作为章节背景放置，文字保留在真正的 HTML 中，方便选择、缩放和辅助技术读取。

[music.mjs](music.mjs) 使用浏览器原生音频元素播放本地文件。音乐默认关闭，读者点击后才开始；播放器支持暂停和换曲。曲目结束后会自动播放下一首。

## 配乐来源与授权

| 曲目 | 演奏者 | 原始录音 | 本地文件 |
| --- | --- | --- | --- |
| 《阳关三叠》 | Charlie Huang | [维基共享资源](https://commons.wikimedia.org/wiki/File:Guqin-Yangguan_Sandie.ogg) | `assets/audio/yangguan-sandie.mp3` |
| 《醉渔唱晚》 | Charlie Huang | [维基共享资源](https://commons.wikimedia.org/wiki/File:Guqin-Zuiyu_Changwan.ogg) | `assets/audio/zuiyu-changwan.mp3` |

两段录音均按 [CC BY-SA 3.0](https://creativecommons.org/licenses/by-sa/3.0/) 授权。制作时下载了原始 Ogg 文件，再用 `ffmpeg` 的 `libmp3lame` 编码器和 `-q:a 5` 参数转码为 MP3，没有剪辑或改变演奏内容。本地两份 MP3 继续按 CC BY-SA 3.0 提供。正文、代码和水墨插画不因引用这些录音而改用该授权。书末也显示演奏者、曲目来源和授权链接。

## 验证

在仓库根目录运行 `node --test ink-scroll-book/tests/*.test.mjs`，检查六段卷目、阅读进度、音乐手动启动、本地音频文件和授权链接。使用浏览器打开本地 HTTP 服务后，还需检查播放、暂停、换曲及窄屏布局。此前的浏览器验收在 1440×900 和 375×812 视口进行；录音能够加载和切换，手机页面没有横向溢出。
