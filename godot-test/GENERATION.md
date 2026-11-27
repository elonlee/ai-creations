# 碎岳 · 同行 Web 发布记录

## 构建与快照

2026-10-18 将相邻目录 `godot-test` 工程中的《碎岳 · 同行》导出为 Web release 并接入本仓库首页。本次发布流程未重新生成图片或改写游戏玩法，使用 Godot `4.7.2.stable.official.ed1daf0bf` 与同版本官方单线程 Web release 模板。

运行资源复制到临时工程后导入、导出，未修改原工程。导出预设见 [export_presets.cfg](export_presets.cfg)，SHA-256 清单见 [release.json](release.json)：`source_files_sha256` 记录原始输入，`files_sha256` 记录处理后的临时工程，`artifacts_sha256` 记录发布产物。`web/` 为实际构建产物；本目录未收录完整 Godot 源码。

## 美术与音频

原项目的角色、村道、森林和古祠美术由 AI 图像生成工具生成。原始制作说明与各版完整提示词保存在 [provenance/ART.md](provenance/ART.md) 及下列记录中，其中路径描述的是源工程当时的素材位置，并非本发布目录内的独立 PNG：

- [初始战斗美术](provenance/generation.json)
- [第四版队伍扩展](provenance/generation-v4.json)
- [第五版森林探索](provenance/generation-v5.json)
- [第七版探索步态](provenance/generation-v7.json)
- [第十版渡口与八方向美术](provenance/generation-v10.json)

本次直接使用源工程中的成品纹理，未重新生成或编辑。程序绘制的招式效果与运行时合成音效沿用源项目。

首页 [thumbnail.png](thumbnail.png) 直接复制自源工程实机截图（1280×800），未做裁切、缩放或重画，用于展示青溪渡口。

## 字体与引擎

字体源自原工程的 Noto Sans CJK SC Regular。当前 release 使用其字形子集，保留原有字形轮廓、字体版权和许可信息，并将修改版字体家族名改为「Suiyue Web UI」，继续按 [SIL OFL 1.1](web/OFL.txt) 分发。资源路径保留原文件名以兼容游戏脚本。引擎与第三方组件的许可随包提供：[Godot MIT 许可](web/GODOT-LICENSE.txt)、[第三方版权清单](web/GODOT-COPYRIGHT.txt)。

## 2026-10-18：发布包体积优化

PCK 文件目录显示，初版完整 CJK 字体的导入资源占 14,444,313 字节，两个停用的第七版行走图集占 2,778,136 字节。为适应静态托管体积限制，字体使用 FontTools 4.67.0 按 GDScript、场景、项目配置和可打印 ASCII 字符生成子集；原字体 16,437,364 字节减为 136,608 字节，核对所需的 403 个 Unicode 字符全部保留。停用的图集与读取器在临时工程中移除，说明文档及素材记录由导出预设排除。全部实际使用的图片维持原分辨率、像素与透明度。

引擎使用 Binaryen 133 的 `wasm-opt -Oz` 与当前模板已使用的 WASM 功能开关优化，未启用额外的 GC、memory64、尾调用或 relaxed SIMD。HTML 内的文件大小声明随构建更新。流程保存于 [build-web.py](build-web.py)，依赖及重建命令见 [README.md](README.md)。

| 文件 | 初版字节数 | 优化后字节数 |
| --- | ---: | ---: |
| `web/index.pck` | 36,885,348 | 19,747,068 |
| `web/index.wasm` | 39,514,754 | 38,172,167 |

优化后的 `web/` 总计 58,359,428 字节，比初版约 76.8 MB 减少约 24%。资源包低于 GitHub 网页上传的 25 MiB 上限，引擎低于 GitHub 的 50 MiB 警告阈值；引擎仍大于 25 MiB，应通过 Git 推送。限制以 [GitHub 官方说明](https://docs.github.com/en/repositories/working-with-files/managing-large-files/about-large-files-on-github) 为准。

## 验证

`node --test tests/gallery.test.mjs tests/godot-web.test.mjs` 的 5 项检查全部通过，包含体积预算和 `WebAssembly.validate`。浏览器完成了行囊开关、地图往返、战斗出招、胜利结算、升级与返回探索流程，中文显示正常，控制台未见错误或警告；1280px 与 375px 首页视口均无横向溢出。
