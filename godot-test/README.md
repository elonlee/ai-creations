# 碎岳 · 同行（Web release）

这是相邻 `godot-test` 项目的浏览器发布版，由 Godot 4.7.2 官方模板以 release 模式导出。包含青溪渡口、青岚野林、八方向探索、点击寻路、双人队伍、随机遭遇和回合战斗。此目录保存 Web 构建及制作记录；Godot 源工程仍在原项目中。

## 运行

前置条件：Python 3，以及支持 WebAssembly、WebGL 2 的现代浏览器。在本仓库根目录执行：

```sh
python3 -m http.server 8767
```

打开 `http://localhost:8767/godot-test/web/`，或从作品首页点击「碎岳 · 同行」。预期加载后显示青溪渡口、云川和青蘅。优化后首次加载的引擎与资源约 58 MB，实际网络传输量还取决于服务器压缩。请等待进度条结束。必须通过 HTTP 或 HTTPS 访问，不能双击 HTML 使用 `file://` 打开。

构建采用 Compatibility 渲染器和单线程，无需配置跨域隔离响应头，可随本仓库一起由静态服务器发布。部署时应完整保留 `web/` 下的文件名与目录关系，并将 `.wasm` 以 `application/wasm` 提供。浏览器要求与导出限制见 [Godot 官方说明](https://docs.godotengine.org/en/stable/tutorials/export/exporting_for_web.html)。

## 操作

- WASD / 方向键：八方向移动；点击地面：自动寻路。
- 顶栏「前往野林 / 前往渡口」或 F6：切换地图，保留队伍状态。
- B：开关行囊；E：在调息点恢复；顶栏「遇敌」：开关随机遭遇。
- 战斗中 Q / E：选择队友；Tab：切换目标；1—5 或点击菜单：出招；F：逃跑；Enter：确认结算。
- M：切换音效。首次点击或按键后浏览器才可能允许播放声音。

游戏以 640×400 为基准缩放。手机可点击寻路和战斗菜单，尚未逐项验证触屏操作；建议使用桌面浏览器。Esc 在源项目中会退出游戏，浏览器中结束后需刷新页面重新开始。

## 重新导出

前置条件：原始 `godot-test` 工程、Godot 4.7.2 标准版和完全相同版本的官方 Web 导出模板，以及 Python 3、FontTools 和 Binaryen 的 `wasm-opt`。本次验证版本为 FontTools 4.67.0、Binaryen 133。在本仓库根目录执行（以下 Binaryen 安装命令适用于 macOS Homebrew）：

```sh
brew install binaryen
python3 -m venv .venv-web
.venv-web/bin/python -m pip install -r godot-test/build-requirements.txt
.venv-web/bin/python godot-test/build-web.py
node --test tests/gallery.test.mjs tests/godot-web.test.mjs
```

[build-web.py](build-web.py) 默认读取相邻 `../godot-test` 工程，优先使用 PATH 中的 `godot`，否则使用 `/Applications/Godot.app/Contents/MacOS/Godot`。可通过 `--source /绝对路径/godot-test` 和 `--godot /绝对路径/Godot` 指定其他位置。

脚本在临时目录复制运行资源，移除停用的第七版行走图集与旧读取器，排除素材说明和生成记录，再按全部 GDScript、场景、项目配置及 ASCII 字符生成字体子集。它会核对源字体支持的所需字形仍然全部保留，并用 `wasm-opt -Oz` 优化引擎；使用的 WASM 功能开关对应现有模板需要的功能，不启用 GC、memory64、尾调用等额外功能。贴图分辨率、颜色与透明度保持原样。

构建成功后自动更新 HTML 中的引擎文件大小、`release.json` 的原始/处理后文件哈希与工具版本、素材生成记录及许可证。字体子集以独立名称「Suiyue Web UI」标识，继续按 SIL OFL 1.1 分发。原始 Godot 工程不会被修改，临时工程自动清理。发布前还应检查缩略图是否需要更新，并验证首页跳转、中文显示、地图切换和战斗。

构建与测试将资源包限制在 25 MiB 内、引擎限制在 50 MiB 以下。引擎仍超过 GitHub 网页上传的 25 MiB 上限，应通过 Git 提交推送；GitHub 对超过 50 MiB 的文件警告、超过 100 MiB 的文件阻止推送，见 [GitHub 文件大小说明](https://docs.github.com/en/repositories/working-with-files/managing-large-files/about-large-files-on-github)。

## 素材与许可

美术、音效和字体来源见 [GENERATION.md](GENERATION.md)。`web/` 随附 Godot MIT 许可、第三方版权清单与 Noto Sans CJK SC 的 SIL OFL 1.1 许可。
