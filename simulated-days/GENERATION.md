# 模拟时光生成记录

《模拟时光》是一款浏览器中的单人生活模拟网页应用。入口是 [index.html](index.html)，运行与操作说明见 [README.md](README.md)。

## 实现与资产

- **玩法与模块**：包含生活模式（饥饿、精力、娱乐、社交、卫生五项状态与技能成长）、建造/购买模式（5×5 网格摆放家具）与紫蓝巷社区浏览三个入口，每次有效操作推进游戏内时间并自动写入 `localStorage`。
- **三维与矢量素材**：Miri、小屋和家具均由 JavaScript 几何体程序化构建，街区地图与图标由页面内 SVG 绘制，未调用图像生成模型或外部图片。Three.js 0.186.1 渲染库复用仓库本地副本，许可见 [../second-room/vendor/LICENSE-three.txt](../second-room/vendor/LICENSE-three.txt)。
- **设计规范**：结合可访问性、键盘焦点、响应式布局与减弱动画（`prefers-reduced-motion`）支持实现。

## 限制与验证

游戏时间仅在玩家操作时推进，家具摆放暂不检查碰撞。运行 `node --test simulated-days/tests/game.test.mjs`、`node --check` 与 `git diff --check` 均通过；此前已在 375px 与 1440px 视口验证做饭、画画、布置家具、邻居互动及存档恢复，无横向溢出。
