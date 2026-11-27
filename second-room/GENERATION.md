# 第二间房生成记录

本目录保存 73㎡ 两室一厅交互式 3D 家装演示网页。页面入口是 [index.html](index.html)，运行方法和操作见 [README.md](README.md)。户型与家具尺寸仅作概念展示，不作为施工依据。

## 渲染与建模方案

网页采用 Three.js 0.186.1 进行浏览器内 3D 渲染（许可见 [vendor/LICENSE-three.txt](vendor/LICENSE-three.txt)）。场景围绕“居家工作 / 朋友留宿 / 留给未来”三种生活方案一键切换整屋布局，支持立体剖视、正交俯视、1.35m 剖切与第一人称漫游（WASD 移动、碰撞检测与门扇开合）、开场平面生长动效以及上午/下午/夜晚动态光照切换。

所有家具先由 [generate_assets.py](generate_assets.py) 程序化建模，再由 Blender 5.2.2 的 Python 组件执行 [blender_finalize.py](blender_finalize.py) 倒角并导出为低面数 GLB；木纹、布料与石材纹理由页面内的 Canvas 程序在运行时生成，未使用外部家具贴图或图像生成模型。

## 资产生成与复现

资产制作使用 macOS ARM、Python 3.13 与 `bpy==5.2.2`。在仓库根目录可执行以下命令重建 GLB（`assets/furniture/`）：

```sh
python3.13 -m venv /tmp/second-room-bpy
/tmp/second-room-bpy/bin/python -m pip install bpy==5.2.2
python3 second-room/generate_assets.py
/tmp/second-room-bpy/bin/python second-room/blender_finalize.py
node --test second-room/tests/assets.test.mjs
```

页面运行时通过本地 `GLTFLoader` 加载静态 GLB，不依赖 Blender、Python 或外部服务。

## 验证

运行 `node --test second-room/tests/*.test.mjs`、`node --check second-room/app.mjs` 与 `git diff --check` 验证几何逻辑、资产结构与语法。此前已在桌面与 375px 窄屏检查三种方案、四种视角、夜间灯光与房间清单交互，控制台无报错。
