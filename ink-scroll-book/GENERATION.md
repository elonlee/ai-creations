# 《山水有归处》制作说明

这是一部浏览器中的六段水墨长卷电子书。入口是 [index.html](index.html)，运行方法见 [README.md](README.md)。正文、布局和交互由原生 HTML/CSS/ESM 实现；三张背景画由 AI 图像生成工具制作；配乐使用开放授权的古琴演奏录音。

## 水墨画生成提示词

三张水墨画分别为 `assets/mountains.jpg`、`assets/rain-bridge.jpg` 和 `assets/return-boat.jpg`。原图为 PNG，经 macOS `sips` 以 JPEG 质量 85 转码保存。页面文字、竖排题签、朱红印记和宣纸纹理由 HTML/CSS 排版完成。

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

[index.html](index.html) 按入卷、听雨、过桥、寻山、归舟、跋排列六个章节。[style.css](style.css) 负责宣纸底色、细纹、题签、印记和宽窄屏布局。[reader.mjs](reader.mjs) 根据滚动位置更新阅读进度与卷目。图片作为章节背景放置，文字保留在 HTML 中便于选择、缩放和辅助技术读取。

[music.mjs](music.mjs) 使用浏览器原生音频元素播放本地文件。音乐默认关闭，点击后开始播放，支持暂停、换曲以及曲目结束自动连播。

## 配乐来源与授权

| 曲目 | 演奏者 | 原始录音 | 本地文件 |
| --- | --- | --- | --- |
| 《阳关三叠》 | Charlie Huang | [维基共享资源](https://commons.wikimedia.org/wiki/File:Guqin-Yangguan_Sandie.ogg) | `assets/audio/yangguan-sandie.mp3` |
| 《醉渔唱晚》 | Charlie Huang | [维基共享资源](https://commons.wikimedia.org/wiki/File:Guqin-Zuiyu_Changwan.ogg) | `assets/audio/zuiyu-changwan.mp3` |

两段录音均按 [CC BY-SA 3.0](https://creativecommons.org/licenses/by-sa/3.0/) 授权。制作时下载了原始 Ogg 文件，并用 `ffmpeg`（`libmp3lame`，`-q:a 5`）转码为 MP3，未剪辑或改编演奏内容。本地两份 MP3 继续按 CC BY-SA 3.0 提供；正文、代码和水墨插画不因此改用该授权。

## 验证

在仓库根目录运行 `node --test ink-scroll-book/tests/*.test.mjs`，检查六段卷目、阅读进度、音乐手动启动、本地音频文件和授权链接。此前已在 1440×900 与 375×812 视口检查播放、切换与无横向溢出。
