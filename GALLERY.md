# 首页缩略图生成记录

仓库根目录的 [index.html](index.html) 是作品入口页。它将原有的 14 个链接改为带缩略图的流式卡片，运行方式见 [README.md](README.md)。

## 用户提示词

> 目前根目录的index.html有每个项目的链接, 但是我想做成缩略图流式布局的展示样子, 你能帮我实现吗

## 模型、工具与素材

本次由 Codex（基于 GPT-6）编写首页、样式、SVG 缩略图和测试。当前会话没有可核验的更细模型变体 ID 或推理参数。设计与可访问性检查参考了本地 `ui-ux-pro-max` 技能；链接保留测试先于页面实现编写。

[gallery-art.svg](gallery-art.svg) 中的 12 幅画面是本次用 SVG 绘制的展示用插画，用于提示作品内容，并非作品运行截图。另两张缩略图复用了仓库已有文件：`ink-scroll-book/assets/mountains.jpg` 和 `rain-window/assets/village.jpg`。前者的图像生成记录见 [ink-scroll-book/GENERATION.md](ink-scroll-book/GENERATION.md)，后者可核验的素材信息见 [rain-window/GENERATION.md](rain-window/GENERATION.md)。首页没有新增外部图片、字体、脚本或接口请求。

## 验证与限制

`node --test tests/gallery.test.mjs` 检查 14 个原有链接都存在、对应页面可在仓库中找到，并且每张卡片有缩略图与标题。SVG 文件通过 XML 解析。浏览器中检查了实际缩略图渲染、从卡片进入“小小丰收”再返回、375px、768px、1024px 和 1440px 视口；这些宽度下均无横向溢出，控制台未见错误或警告。展示插画不保证与作品运行时的每个画面一致。
