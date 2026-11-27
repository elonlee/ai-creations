# 《山水有归处 · 重装版》制作说明

本目录为《山水有归处》的 v2 重装版本，保留原版 [`../ink-scroll-book/`](../ink-scroll-book/README.md) 完整不动，重新构建了活水墨全景画布、三种阅读模式、七弦拨韵与山川声景、以及自题钤印留笺功能。

## 用户提示词

> 看一下山水有归处这个项目, 如果让你来重装, 你会给我什么惊喜? 重做一份我看看
> 保留原来的版本, 新建一个v2版本
> 可以把整体文案重新生成吗? 不用参考原文, 就用你擅长的风格和理解
> 每卷首的标题, 是不是可以优化一下排版和文字. 比如对齐和押韵

## 技术构成与文件说明

- [index.html](index.html)：长卷语义结构、SVG 印石滤镜、装裱轴头、工具栏、净卷赏画 HUD、过桥画境细观、卷末自题钤印工坊与七弦琴匣。
- [style.css](style.css)：晴昼宣纸与夜读松烟双主题、绫裱滚动轴头、现代横排与宋刊竖排乌丝栏排版、墨韵渐显动画与响应式适配。
- [scene.mjs](scene.mjs)：纯逻辑模块，负责六幕镜头轨迹与大气参数插值、声景混合权重、干支纪年以及 1–4 字印文规整与排布。
- [ink-stage.mjs](ink-stage.mjs)：Canvas 2D 活水墨引擎，调度三幅原画的平推与叠化、净卷赏画三景无缝拼接、缩略舆图、实时粒子（烟云、春雨、涟漪、飞瀑、远鸟、波光、萤火）以及 `1200×1800` 长卷留笺 PNG 导出。
- [music.mjs](music.mjs)：复用两段本地古琴实录并补充 Web Audio 七弦五声音阶拨弦合成、钤印触感声效及随章节变化的程序化雨风江波声景。
- [reader.mjs](reader.mjs)：阅读进度计算、滚动驱动画布与声景、夜读/竖排/赏画模式切换、眉批展开、`localStorage` 状态保存及钤印留笺交互。

## 素材复用

页面直接复用 `../ink-scroll-book/assets/` 中的三幅水墨画（`mountains.jpg`、`rain-bridge.jpg`、`return-boat.jpg`）和两段 Charlie Huang 古琴录音（`yangguan-sandie.mp3`、`zuiyu-changwan.mp3`，按 CC BY-SA 3.0 使用）。画作与录音生成与来源记录详见 [../ink-scroll-book/GENERATION.md](../ink-scroll-book/GENERATION.md)。

## 测试验证

在仓库根目录执行 `node --test ink-scroll-book-v2/tests/*.test.mjs` 验证章节导航、阅读进度数学、场景插值、声景权重、印文排布、音乐手动触发与本地资产引用；并运行 `node --test tests/gallery.test.mjs` 验证根目录作品首页清单。
