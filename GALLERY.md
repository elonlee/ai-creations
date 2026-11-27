# 首页缩略图生成记录

仓库根目录的 [index.html](index.html) 是作品入口页，采用流式缩略图卡片布局展示各作品入口，运行方式见 [README.md](README.md)。

## 制作与素材

页面结构、样式、SVG 缩略图与链接保留测试均为本地编写与维护，不依赖外部图片、字体、脚本或接口请求。

- [gallery-art.svg](gallery-art.svg) 中的 12 幅画面为展示用矢量插画，用于提示作品内容，并非运行截图；
- `ink-scroll-book/assets/mountains.jpg`、`ink-scroll-book/assets/return-boat.jpg` 和 `rain-window/assets/village.jpg` 复用仓库已有插画资源，分别见 [ink-scroll-book/GENERATION.md](ink-scroll-book/GENERATION.md) 和 [rain-window/GENERATION.md](rain-window/GENERATION.md)；
- Cat Music 缩略图使用本地绘制的 [thumbnail.svg](cat-music-demo/thumbnail.svg)；
- 《长风传 · Godot 版》使用运行画面截图 [thumbnail.webp](changfeng-zhuan-godot/thumbnail.webp)，记录见 [changfeng-zhuan-godot/GENERATION.md](changfeng-zhuan-godot/GENERATION.md)；
- 《碎岳 · 同行》使用实机截图 [thumbnail.png](godot-test/thumbnail.png)，记录见 [godot-test/GENERATION.md](godot-test/GENERATION.md)。

## 验证与限制

`node --test tests/gallery.test.mjs` 检查所有入口链接、卡片缩略图与标题，并核对首页总数及编号。`cat-music-demo/thumbnail.svg` 已通过 XML 解析。此前已在 375px、768px、1024px、1280px 和 1440px 视口检查卡片布局与跳转；Godot 作品按固定基准视口设计（《长风传 · Godot 版》为 1280×720，《碎岳 · 同行》为 640×400），窄屏会整体等比缩放。展示插画不保证与作品运行时的每个画面一致。
