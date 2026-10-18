# 碎岳 · 同行 Web 发布记录

## 用户请求

> 将godto-test项目发布为web版本, 将web release加入到本项目中

2026-10-18，Codex（基于 GPT-6）将本机相邻目录 `godot-test` 的《碎岳 · 同行》导出并加入 `ai-creations`。当前会话没有可核验的更细模型变体或推理参数。首页接入使用 `test-driven-development` 技能，先确认缺少新入口时测试失败。没有在此发布任务中生成新图片或改写游戏玩法。

## 构建与快照

使用 Godot `4.7.2.stable.official.ed1daf0bf` 与同版本官方单线程 Web release 模板。运行资源复制到临时工程后导入、导出，未修改原工程。当前构建还经过下文的字体子集和 WASM 优化。导出预设见 [export_presets.cfg](export_presets.cfg)，SHA-256 清单见 [release.json](release.json)：`source_files_sha256` 记录原始输入，`files_sha256` 记录处理后的临时工程，`artifacts_sha256` 记录发布产物。`web/` 为实际构建产物；本目录未收录完整 Godot 源码。

## 美术与音频

原项目的角色、村道、森林和古祠美术由内置 ImageGen 生成。原始制作说明与各版完整提示词以原文保存在 [provenance/ART.md](provenance/ART.md) 及下列记录中，其中路径描述的是源工程当时的素材位置，并非本发布目录内的独立 PNG：

- [初始战斗美术](provenance/generation.json)
- [第四版队伍扩展](provenance/generation-v4.json)
- [第五版森林探索](provenance/generation-v5.json)
- [第七版探索步态](provenance/generation-v7.json)
- [第十版渡口与八方向美术](provenance/generation-v10.json)

本次直接使用源工程中的成品纹理，未重新生成或编辑。原项目说明其未使用《仙剑奇侠传》原版角色、地图或录音。程序绘制的招式效果与运行时合成音效沿用源项目。

首页 [thumbnail.png](thumbnail.png) 直接复制自源工程的实机截图 `captures/v11-02-meadow.png`（1280×800），没有裁切、缩放或重画。此图用于展示青溪渡口，遇敌开关等状态可能与首次启动不同。

## 字体与引擎

字体源自原工程的 Noto Sans CJK SC Regular。当前 release 使用其字形子集，保留原有字形轮廓、字体版权和许可信息，并将修改版字体家族名改为「Suiyue Web UI」，继续按 [SIL OFL 1.1](web/OFL.txt) 分发。资源路径保留原文件名以兼容游戏脚本。引擎与第三方组件的许可随包提供：[Godot MIT 许可](web/GODOT-LICENSE.txt)、[第三方版权清单](web/GODOT-COPYRIGHT.txt)。后两份文件复用仓库中相同 Godot 4.7.2 构建的许可文本。

## 验证

初次导入与 release 导出命令退出码均为 0，日志未见错误或警告。初版 PCK 为 36,885,348 字节，WASM 为 39,514,754 字节；校验了二进制文件头、本地 HTML 依赖、许可文件以及素材记录 JSON。通过本地 HTTP 服务访问时，HTML、PCK、WASM 与音频 worklet 均返回 200，WASM 的 MIME 为 `application/wasm`。优化后的大小见下表。

`node --test tests/gallery.test.mjs` 的 3 项检查全部通过。在应用内浏览器中实际完成了打开行囊、往返两张地图、行走触发双狼遭遇、云川「万剑诀」与青蘅「流萤火」出招、胜利结算以及返回探索；本次结算获得每位队友 70 经验、36 文和狼牙 ×2，地图切换后队伍资源与战绩保留。控制台未见错误或警告。首页在 1280px、375px 宽度均无横向溢出，新增卡片可跳转并加载游戏。尚未验证所有浏览器、触屏操作或公网部署。

## 2026-10-18：发布包体积优化

用户补充请求：

> 能不能把文件再压缩小一点, GitHub似乎建议文件不能太大

PCK 文件目录显示，初版完整 CJK 字体的导入资源占 14,444,313 字节，两个停用的第七版行走图集占 2,778,136 字节。字体使用 FontTools 4.67.0，按 GDScript、场景、项目配置和可打印 ASCII 字符生成子集；原字体 16,437,364 字节变为 136,608 字节，核对所需的 403 个 Unicode 字符全部保留。停用的图集与读取器在临时工程中移除，说明文档及素材记录由导出预设排除。全部实际使用的图片维持原分辨率、像素与透明度。

引擎使用 Binaryen 133 的 `wasm-opt -Oz` 与当前模板已使用的 WASM 功能开关优化，未启用额外的 GC、memory64、尾调用或 relaxed SIMD。HTML 内的文件大小声明随构建更新。流程保存于 [build-web.py](build-web.py)，依赖及重建命令见 [README.md](README.md)。

| 文件 | 初版字节数 | 优化后字节数 |
| --- | ---: | ---: |
| `web/index.pck` | 36,885,348 | 19,747,068 |
| `web/index.wasm` | 39,514,754 | 38,172,167 |

优化后的 `web/` 总计 58,359,428 字节，比初版约 76.8 MB 减少约 24%。资源包低于 GitHub 网页上传的 25 MiB 上限，引擎低于 GitHub 的 50 MiB 警告阈值；引擎仍大于 25 MiB，应通过 Git 推送。限制以 [GitHub 官方说明](https://docs.github.com/en/repositories/working-with-files/managing-large-files/about-large-files-on-github) 为准。

`node --test tests/gallery.test.mjs tests/godot-web.test.mjs` 的 5 项检查全部通过，包含体积预算和 `WebAssembly.validate`。构建产物哈希、HTML 声明的大小及原始工程未变化均已核对。

优化版另在浏览器完成了行囊开关、地图往返、苍狼与山魈遭遇、双方出招、胜利结算、升级和返回探索。此次获得每人 105 经验、60 文、狼牙 ×1 与灵木碎片 ×1，两位队友均升至 2 级；返回渡口后状态与道具保留。地图、菜单、技能、升级与道具中文显示正常，控制台未见错误或警告。
