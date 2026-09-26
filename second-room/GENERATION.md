# 第二间房生成记录

这个目录保存 73㎡ 两室一厅交互式家装网页。页面入口是 [index.html](index.html)，运行方法和操作见 [README.md](README.md)。户型和家具尺寸用于概念展示，不能作为施工依据。

## 使用的模型与工具

本次由 **Codex（基于 GPT-6）** 编写页面、场景、家具生成脚本和测试，并在浏览器中检查效果。当前会话没有提供可核验的具体模型变体 ID 或推理参数，因此不标注 Astra、Sol 等子型号。没有调用图像生成模型，也没有使用外部生成的家具图片。

Three.js 0.186.1 负责浏览器内的 3D 渲染。它是渲染库，不是生成模型。家具先由 [generate_assets.py](generate_assets.py) 程序化建模，再由 Blender 5.2.2 的 Python 组件执行 [blender_finalize.py](blender_finalize.py)，加一段倒角并导出 32 件 GLB。木纹、布料和石材纹理由网页里的 Canvas 代码在运行时生成。Blender 组件只用于制作资产，不随网页部署。

## 用户提示词

最初的生成要求保留原文：

> 用 Three.js 做一个 73㎡ 两室一厅户型的交互式 3D 家装网页：同一户型给出"第二间房"的三种生活答案（在家工作 / 朋友留宿 / 留给未来），一键切换整屋家具布局。页面包含四种视角：dollhouse 立体剖视、正交俯视、1.35m 剖切图和第一人称漫游（WASD 走动、墙体与家具碰撞、点击门扇开合）。开场动画从 2D 户型图生长出墙体、窗框和家具；顶部时间滑杆驱动上午/下午/夜晚光照，夜晚各房间台灯吊灯自动亮起。点击任意房间弹出面积尺寸卡片与家具清单。全部家具为程序化建模并替换为 Blender 预制的 32 件低面数 GLB 高质量资产，带木纹、布料、石材程序化贴图与软阴影，风格为浅橡木+暖白+灰绿的日式简约。

生成后，用户补充要求：“加入生成的说明, 包括提示词和模型等信息. 然后提交代码”。这份记录用于补齐该说明。

## 资产生成与复现

本次资产制作使用 macOS ARM、Python 3.13 和 `bpy==5.2.2`。在仓库根目录执行以下命令，可以重建最终 GLB：

```sh
python3.13 -m venv /tmp/second-room-bpy
/tmp/second-room-bpy/bin/python -m pip install bpy==5.2.2
python3 second-room/generate_assets.py
/tmp/second-room-bpy/bin/python second-room/blender_finalize.py
node --test second-room/tests/assets.test.mjs
```

前两条命令准备 Blender Python 环境。第三条命令按家具清单生成图元 GLB，会覆盖已有资产。第四条命令在 Blender 中倒角并重新导出 32 件文件。最后一条命令检查文件数量、GLB 结构和 Blender 导出标记；预期结果是 1 项测试通过。其他平台需要使用支持 `bpy==5.2.2` 的 Python 环境。

最终 32 件 GLB 位于 `assets/furniture/`，总计 3378 个三角形，单件最多 342 个。网页通过本地 GLTFLoader 加载它们，并按材质名称应用 Canvas 生成的纹理。页面运行时无需 Blender、Python、CDN 或后端。

## 设计假设与验证

用户没有提供真实户型图、朝向、门窗尺寸或 Blender 原始文件。因此面积按五个空间分配到合计 73㎡，家具和门窗位置依据文字需求设计，不代表真实住宅测量结果。开场的 2D 户型图是示意图，不是扫描或复刻的建筑图纸。

交付前运行 `node --test second-room/tests/*.test.mjs`，6 项测试通过；运行 `node --check second-room/app.mjs` 和 `git diff --check`，均无报错。浏览器检查了桌面与 375px 手机布局、三种方案、四种视角、夜间灯光和房间详情。Blender 资产替换后，浏览器再次载入 32 件 GLB，方案切换可用，控制台未发现错误。WASD 的连续移动和所有门扇位置没有做逐一自动化验收；碰撞逻辑有单元测试，仍应把漫游视为展示交互。
