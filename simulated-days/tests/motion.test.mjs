import test from 'node:test';
import assert from 'node:assert/strict';
import {
  ACTION_TO_INTERACTION,
  INTERACTION_STAGES,
  clampAndSnapBuildPoint,
  computeAnchoredCardPosition,
  createCharacterController,
  findRoomPath,
} from '../motion.mjs';

function stepUntil(ctrl, predicate, maxSteps = 400, dt = 0.04, reducedMotion = false) {
  let latest = null;
  for (let i = 0; i < maxSteps; i++) {
    latest = ctrl.update(dt, reducedMotion);
    if (predicate(ctrl.state, latest)) return { reached: true, pose: latest, steps: i + 1 };
  }
  return { reached: false, pose: latest, steps: maxSteps };
}

test('寻路避开沙发和茶桌等静态障碍物并支持可移动家具避障', () => {
  const path = findRoomPath([-4.7, 0.88], [1.52, 1.45], { plant: { x: 1, z: 1 }, rug: { x: 2, z: 2 } });
  assert.ok(path.length >= 2, '从浴室门口到床边应绕过客厅沙发，而不是直线穿模');
  const last = path[path.length - 1];
  assert.ok(Math.hypot(last[0] - 1.52, last[1] - 1.45) < 0.35);

  // 检验路径各分段不穿过沙发内部中心区域
  let prev = [-4.7, 0.88];
  for (const pt of path) {
    for (let s = 1; s <= 10; s++) {
      const t = s / 10;
      const x = prev[0] + (pt[0] - prev[0]) * t;
      const z = prev[1] + (pt[1] - prev[1]) * t;
      const insideSofa = x > -3.3 && x < -0.8 && z > 0.85 && z < 1.95;
      assert.equal(insideSofa, false, `路径点 (${x.toFixed(2)}, ${z.toFixed(2)}) 穿过了沙发`);
    }
    prev = pt;
  }

  // 即使玩家把可移动家具摆在目标附近，依然能生成可达路径
  const fallback = findRoomPath([-0.2, 0.2], INTERACTION_STAGES.tea.approach, { armchair: { x: 1, z: 3 } });
  assert.ok(fallback.length >= 1);
});

test('所有房间互动都会触发真实走动、朝向与专属动作姿势，最后回到待机', () => {
  const expectedProps = {
    cook: { prop: 'ladle', effect: 'cook' },
    eat: { prop: 'fork', effect: 'eat' },
    paint: { prop: 'brush', effect: 'paint' },
    rest: { prop: null, effect: 'rest' },
    shower: { prop: null, effect: 'shower' },
    read: { prop: 'book', effect: 'read' },
    tea: { prop: 'cup', effect: 'tea' },
  };

  for (const [actionId, expectInfo] of Object.entries(expectedProps)) {
    const ctrl = createCharacterController(-0.2, 0.2);
    assert.equal(ctrl.startAction(actionId, { plant: { x: 1, z: 1 }, rug: { x: 2, z: 2 } }), true);

    // 1. 应先进入行走阶段并产生迈步摆臂姿态
    const walkRes = stepUntil(ctrl, (st, pose) => st.phase === 'walk' && Math.abs(pose.leftLegRotX) > 0.1, 40);
    assert.equal(walkRes.reached, true, `${actionId} 应先进入走路动作`);

    // 2. 应到达目标并进入 act 动作阶段
    const actRes = stepUntil(ctrl, st => st.phase === 'act', 250);
    assert.equal(actRes.reached, true, `${actionId} 应进入执行动作阶段`);

    // 采样动作中段的多帧，确认动画有动态变化而非静止
    const frames = [];
    for (let i = 0; i < 12; i++) frames.push(ctrl.update(0.08));
    const mid = frames[5];
    assert.equal(mid.prop, expectInfo.prop, `${actionId} 道具应为 ${expectInfo.prop}`);
    assert.equal(mid.effect, expectInfo.effect, `${actionId} 特效应为 ${expectInfo.effect}`);
    assert.ok(mid.activityLabel && mid.activityLabel.length > 0, `${actionId} 应显示状态提示`);

    if (actionId === 'cook') {
      const armsVary = new Set(frames.map(f => f.rightArmRotX.toFixed(3))).size > 3;
      assert.ok(armsVary, '做饭时右手应持续搅拌');
      assert.ok(frames.some(f => f.potShake > 0), '做饭时锅盖应轻微跳动');
    } else if (actionId === 'eat') {
      assert.ok(mid.x < -3.0 && mid.z < -2.0, '吃早午餐时应站在厨房餐盒前');
      const forkMoves = new Set(frames.map(f => f.rightArmRotX.toFixed(3))).size > 3;
      assert.ok(forkMoves, '吃早午餐时应有进食抬手动作');
    } else if (actionId === 'paint') {
      assert.ok(mid.leftLegRotX < -1.0, '画画时应坐在画桌椅子上');
      const brushMoves = new Set(frames.map(f => f.rightArmRotY.toFixed(3))).size > 3;
      assert.ok(brushMoves, '画画时画笔手臂应来回描绘');
    } else if (actionId === 'rest') {
      assert.ok(mid.poseRotX < -1.2, '小睡时人物应躺上床');
      assert.ok(mid.y > 0.9, '小睡时人物高度应在床垫上方');
      assert.ok(mid.eyeScaleY < 0.3, '小睡时眼睛应闭上');
    } else if (actionId === 'shower') {
      assert.ok(mid.x < -4.5 && mid.z > 1.3, '洗澡时应走进玻璃淋浴间');
      assert.ok(mid.rightArmRotX < -1.2, '洗澡时应抬手搓洗');
    } else if (actionId === 'read') {
      assert.ok(mid.headRotX > 0.15, '看书时应低头看书');
      assert.ok(mid.leftArmRotX < -0.6 && mid.rightArmRotX < -0.6, '看书时应双手捧书');
    } else if (actionId === 'tea') {
      assert.ok(mid.leftLegRotX < -1.0, '泡茶时应坐在客厅沙发上');
      const sipMoves = new Set(frames.map(f => f.rightArmRotX.toFixed(3))).size > 3;
      assert.ok(sipMoves, '泡茶时应有举杯品茶动作');
    }

    // 3. 动作完成后应干净退出回到 idle 站立状态
    const doneRes = stepUntil(ctrl, st => st.phase === 'idle', 250);
    assert.equal(doneRes.reached, true, `${actionId} 完成后应回到待机`);
    assert.equal(doneRes.pose.prop, null);
    assert.equal(doneRes.pose.effect, null);
    assert.equal(doneRes.pose.poseRotX, 0);
  }
});

test('在躺卧或坐姿中切换新动作时，会先起身退出再走去新家具', () => {
  const ctrl = createCharacterController(-0.2, 0.2);
  ctrl.startAction('rest');
  const sleeping = stepUntil(ctrl, st => st.phase === 'act', 250);
  assert.equal(sleeping.reached, true);
  assert.equal(ctrl.state.occupiedInteraction, 'bed');

  // 睡觉途中直接点击画画
  ctrl.startAction('paint');
  assert.equal(ctrl.state.phase, 'exit', '应先平稳下床再前往画桌');

  const deskAct = stepUntil(ctrl, st => st.phase === 'act' && st.activeInteraction === 'desk', 300);
  assert.equal(deskAct.reached, true, '下床后应顺利走到画桌并坐下画画');
  assert.equal(deskAct.pose.prop, 'brush');
});

test('在动作进行中再次点击同一动作会立即续接动作而不卡顿', () => {
  const ctrl = createCharacterController(0.88, -2.28);
  ctrl.startAction('paint');
  const acting = stepUntil(ctrl, st => st.phase === 'act', 100);
  assert.equal(acting.reached, true);
  ctrl.update(1.5);
  const prevTimer = ctrl.state.timer;
  ctrl.startAction('paint');
  assert.equal(ctrl.state.phase, 'act');
  assert.ok(ctrl.state.timer < prevTimer);
});

test('睡到明天清晨也会触发床铺卧睡动画并显示专属状态提示', () => {
  const ctrl = createCharacterController(-0.2, 0.2);
  assert.equal(ctrl.startAction('sleep'), true);
  const walkPose = ctrl.update(0.04);
  assert.match(walkPose.activityLabel, /安睡/);
  const actRes = stepUntil(ctrl, st => st.phase === 'act', 250);
  assert.equal(actRes.reached, true);
  assert.equal(actRes.pose.effect, 'rest');
  assert.match(actRes.pose.activityLabel, /安睡到明天清晨/);
  assert.ok(actRes.pose.poseRotX < -1.2);
});

test('减弱动态偏好与互动失败反应均可正常完成', () => {
  const ctrl = createCharacterController(-0.2, 0.2);
  ctrl.triggerReaction('oops');
  assert.equal(ctrl.state.phase, 'react');
  const oopsPose = ctrl.update(0.15);
  assert.notEqual(oopsPose.headRotY, 0);
  const backIdle = stepUntil(ctrl, st => st.phase === 'idle', 60);
  assert.equal(backIdle.reached, true);

  ctrl.startAction('cook', {}, true);
  const reducedPose = ctrl.update(0.04, true);
  assert.equal(ctrl.state.phase, 'act');
  assert.equal(reducedPose.prop, 'ladle');
  assert.equal(reducedPose.potShake, 0);
  assert.ok(Math.hypot(reducedPose.x - INTERACTION_STAGES[ACTION_TO_INTERACTION.cook].actPos[0], reducedPose.z - INTERACTION_STAGES[ACTION_TO_INTERACTION.cook].actPos[2]) < 0.01);
});

test('交互菜单会贴近场景锚点定位，并自动避开顶部与边界溢出', () => {
  const mid = computeAnchoredCardPosition({
    anchorX: 300,
    anchorY: 420,
    cardWidth: 260,
    cardHeight: 140,
    stageWidth: 640,
    stageHeight: 720,
  });
  assert.equal(mid.placement, 'above');
  assert.equal(mid.left, 170);
  assert.equal(mid.top, 260);

  // 靠上方的锚点会自动翻到热点下方，避免遮住顶部提示条
  const topEdge = computeAnchoredCardPosition({
    anchorX: 50,
    anchorY: 200,
    cardWidth: 260,
    cardHeight: 140,
    stageWidth: 480,
    stageHeight: 720,
  });
  assert.equal(topEdge.placement, 'below');
  assert.equal(topEdge.left, 12);
  assert.ok(topEdge.top >= 220);

  // 右侧边界也会安全钳制在画布内
  const rightEdge = computeAnchoredCardPosition({
    anchorX: 470,
    anchorY: 420,
    cardWidth: 260,
    cardHeight: 140,
    stageWidth: 480,
    stageHeight: 720,
  });
  assert.equal(rightEdge.left, 480 - 260 - 12);
});

test('建造模式跟随指针移动时正确钳制地板范围并对齐五乘五网格', () => {
  const center = clampAndSnapBuildPoint(-0.15, 0.05);
  assert.equal(center.cellX, 2);
  assert.equal(center.cellZ, 2);
  assert.ok(Math.abs(center.snapX - (-0.19)) < 0.01);
  assert.ok(Math.abs(center.snapZ - 0.01) < 0.01);

  // 超出墙外时也限制在室内网格边界
  const out = clampAndSnapBuildPoint(-12, 15);
  assert.equal(out.x, -5.1);
  assert.equal(out.z, 4.1);
  assert.equal(out.cellX, 0);
  assert.equal(out.cellZ, 4);
});
