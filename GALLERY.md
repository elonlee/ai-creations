# 首页缩略图生成记录

仓库根目录的 [index.html](index.html) 是作品入口页，目前展示 17 个入口。运行方式见 [README.md](README.md)。

## 用户提示词

> 目前根目录的index.html有每个项目的链接, 但是我想做成缩略图流式布局的展示样子, 你能帮我实现吗

## 模型、工具与素材

本次由 Codex（基于 GPT-6）编写首页、样式、SVG 缩略图和测试。当前会话没有可核验的更细模型变体 ID 或推理参数。设计与可访问性检查参考了本地 `ui-ux-pro-max` 技能；链接保留测试先于页面实现编写。

[gallery-art.svg](gallery-art.svg) 中的 12 幅画面是此前用 SVG 绘制的展示用插画，用于提示作品内容，并非作品运行截图。另两张缩略图复用了仓库已有文件：`ink-scroll-book/assets/mountains.jpg` 和 `rain-window/assets/village.jpg`。前者的图像生成记录见 [ink-scroll-book/GENERATION.md](ink-scroll-book/GENERATION.md)，后者可核验的素材信息见 [rain-window/GENERATION.md](rain-window/GENERATION.md)。Cat Music 的缩略图使用本地绘制的 [thumbnail.svg](cat-music-demo/thumbnail.svg)，参考了该静态演示页的布局。《长风传》网页版本复用游戏已有的[夜雨码头场景图](huanjian-du/assets/scenes/dock-concept-v1.png)；Godot 版使用运行画面截图 [thumbnail.png](changfeng-zhuan-godot/thumbnail.png)。素材记录见两版各自的 `GENERATION.md`。首页没有新增外部图片、字体、脚本或接口请求。

## 验证与限制

`node --test tests/gallery.test.mjs` 检查 17 个入口、卡片缩略图与标题，并核对首页总数及编号。`cat-music-demo/thumbnail.svg` 已通过 XML 解析。此前已在本地浏览器确认 Cat Music 缩略图与入口可用。

此前的 14 张卡片曾检查过 375px、768px、1024px 和 1440px 视口。《长风传》网页版卡片曾在 1496 像素宽的 Chrome 页面确认图片加载成功。新增 Godot 卡片在 375 像素宽的 Chrome 页面确认可见，首页无横向溢出，并能跳转到已导出的游戏；桌面浏览器也确认中文菜单可用。Godot 游戏本身按 1280×720 设计，手机上会整体缩小。展示插画不保证与作品运行时的每个画面一致。
