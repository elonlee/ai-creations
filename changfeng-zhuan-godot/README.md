# 长风传（Godot Web release）

这是《长风传》第一章的浏览器发布版，包含剧情、场景探索、随机遭遇和回合制战斗。本目录只保存 Web release、首页缩略图、发布清单与素材记录。

## 运行

前置条件：Python 3，以及支持 WebAssembly、WebGL 2 和 DecompressionStream 的现代浏览器。在仓库根目录运行：

```sh
python3 -m http.server 8767
```

打开 `http://localhost:8767/changfeng-zhuan-godot/web/`，或从作品首页点击「长风传 · Godot 版」。预期先看到「开始游戏」和「游戏说明」；开始后播放序幕，再进入荒山驿道。首次加载的引擎与资源约 42 MB，请等待加载结束。

必须通过 HTTP 或 HTTPS 访问，不能双击 HTML 使用 `file://` 打开。发布时完整保留 `web/` 下的文件名和目录关系。大文件以 `.wasm.gz`、`.pck.gz` 保存，由本地加载器使用浏览器原生 API 解压；普通静态服务器即可运行，无需额外设置压缩响应头，也没有外部 CDN 依赖。加载器兼容服务器已通过 HTTP gzip 解压的响应。

## 操作

- 方向键或 WASD 移动；右下角也有方向按钮。
- 靠近场景标记后，按 E、空格、回车，或点击「交谈 / 调查」。
- 老船工认出佩剑后，按 Q 或点击「检查剑柄」。
- 对话时点击半透明文字框、按空格或回车继续。流民对话末尾使用选项按钮。
- 战斗时点击出剑、破招、守势、服药或退走。破招消耗 2 点内力；程砚战不能退走。
- 点击右上角「声音：开 / 关」或按 M，同时暂停背景音乐和静音战斗音效。

山路有效移动会触发随机遭遇。气血归零时会进入失败画面，返回主界面后可重新开始。当前没有存档。游戏按 1280×720 设计，手机上会整体缩小。部分浏览器会在首次点击或按键前限制自动播放；进入游戏后即可听到声音。

## 发布文件与验证

`web/` 包含游戏入口、Godot 加载脚本、压缩后的引擎与资源包、音频 worklet、启动图片和许可证。`thumbnail.webp` 是首页缩略图。`release.json` 记录工具版本、优化参数、源文件哈希及发布文件校验值；素材来源与处理记录见 [GENERATION.md](GENERATION.md)。

源码、编辑器配置、独立素材副本和导入缓存已移除。游戏更新需要从 Git 历史恢复源工程后重新导出；源工程所在提交及字体子集、引擎优化、压缩参数见 [release.json](release.json)。更换发布包时必须同步更新 HTML 内的解压后文件大小，并保留 `compressed-fetch.js` 及 Godot 加载脚本中对应的调用。

在仓库根目录运行：

```sh
node --test tests/gallery.test.mjs tests/changfeng-web.test.mjs
```

测试检查首页入口、45 MiB 发布包预算、gzip 解压与 WASM 有效性、PCK 文件头、加载大小声明，以及静态文件和 HTTP gzip 两种服务器响应的解压行为。浏览器兼容性与部署要求参考 [Godot Web 导出说明](https://docs.godotengine.org/en/stable/tutorials/export/exporting_for_web.html)；原生解压 API 见 [DecompressionStream](https://developer.mozilla.org/en-US/docs/Web/API/DecompressionStream)。
