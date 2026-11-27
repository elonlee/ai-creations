# Cat Music 静态播放器制作说明

这个作品将 `gamdl-player` 前端播放器界面改写为可独立运行的静态演示页面。入口是 [index.html](index.html)，运行步骤见 [README.md](README.md)。页面中的示例资料仅用于界面演示，不连接真实音乐库或后端接口。

## 设计与实现

页面结构参考 `gamdl-player` 的顶部播放栏、左侧资料库、专辑网格与右侧滑出详情布局，使用原生 HTML、CSS 和 JavaScript ES 模块重新编写。封面与首页缩略图由本地 CSS 和 SVG 绘制，未使用外部图片、字体或音乐生成模型。

- 专辑大图页提供四种 CSS 视觉特效与两种基于 Web Audio API `AnalyserNode` 的本地实时频谱/波形特效，支持在播放时驱动顶部小频谱或封面大图动效（最多 30fps，暂停或关闭时停止绘制）。
- 播放控制支持双击歌曲行播放/暂停、收藏、搜索、深浅主题切换及待播列表状态指示；收藏与主题保存在本地 `localStorage`。

## 音频来源

| 本地文件 | 来源与授权 | 处理 |
| --- | --- | --- |
| `assets/chopin-waltz.mp3` | [WaltzB.46InEFlatMajor.mp3](https://commons.wikimedia.org/wiki/File:WaltzB.46InEFlatMajor.mp3)，Wikimedia Commons 页面标为 CC0 1.0；作品来自 Musopen，曲作者为 Frédéric Chopin。 | 从 Wikimedia Commons 下载原 MP3，未编辑；时长约 2 分 24 秒，SHA-256：`48d13922cda2c73c0272afe4bdc0ffe10fad6070219d0f3bd21bcb7fcabc5615`。 |
| `assets/shumi-marista-piano.mp3` | [Shumi-Marista Piano Instrumental.ogg](https://commons.wikimedia.org/wiki/File:Shumi-Marista_Piano_Instrumental.ogg)，Parchokhalq 上传并标为 CC0 1.0。 | 下载原 Ogg 后用 `ffmpeg -codec:a libmp3lame -b:a 160k` 转成 MP3；时长约 48 秒，SHA-256：`ceda33991682059e037241e24d73ae7df7842b0162492c73a8b4c0096b4faaed`。 |

页面仅读取上述本地 MP3 文件，不向 Wikimedia Commons 实时请求音频。

## 文件与限制

- [model.mjs](model.mjs) 管理专辑、歌曲、搜索、切歌与特效状态；[visualizer.mjs](visualizer.mjs) 计算频谱柱高与波形坐标；[app.mjs](app.mjs) 负责界面渲染、音频播放与画布绘制。
- 真实录音仅两首，其余专辑与曲目为界面示例，无法播放；不包含下载、文件扫描、歌词或后端服务。
- 需通过点击播放按钮或双击曲目触发播放以符合浏览器自动播放限制；实时频谱需浏览器支持 Web Audio API。

## 验证

`node --test cat-music-demo/tests/*.test.mjs tests/gallery.test.mjs` 检查资料关联、音频文件、搜索、切歌、播放列表状态、特效切换、顶部布局与音频数据映射；`node --check` 检查三个模块语法。此前已在本地 HTTP 服务下完成双曲播放切换、特效切换、浅深主题对比度与 375px 窄屏无横向溢出验证，控制台无报错。
