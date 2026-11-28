import { BoxGeometry, Group, Mesh, PlaneGeometry } from '../second-room/vendor/three.core.js';

export const ROOM_FLOOR_Y = .0335;

export function addBox(parent, material, w, h, d, x = 0, y = 0, z = 0, cast = true) {
  const mesh = new Mesh(new BoxGeometry(w, h, d), material);
  mesh.position.set(x, y, z);
  mesh.castShadow = cast;
  mesh.receiveShadow = true;
  parent.add(mesh);
  return mesh;
}

export function buildBookcase(parent, materials, { width, height, depth, rows }) {
  const board = .09;
  const backing = .045;
  const sidesX = (width - board) / 2;
  const innerWidth = width - 2 * board;
  const centerY = ROOM_FLOOR_Y + height / 2;
  const rowHeight = (height - board) / rows.length;
  const covers = [materials.cream, materials.sage, materials.lavenderDeep, materials.pink];

  for (const x of [-sidesX, sidesX]) addBox(parent, materials.oak, board, height, depth, x, centerY);
  addBox(parent, materials.oak, innerWidth, height, backing, 0, centerY, (backing - depth) / 2);
  for (let row = 0; row <= rows.length; row++) {
    const shelfY = ROOM_FLOOR_Y + rowHeight * row;
    addBox(parent, materials.oakDark, innerWidth, board, depth - backing, 0, shelfY + board / 2, backing / 2);
  }

  for (const [row, heights] of rows.entries()) {
    const shelfTop = ROOM_FLOOR_Y + rowHeight * row + board;
    let left = -innerWidth / 2 + .035 + (row % 2) * .11;
    for (const [i, bookHeight] of heights.entries()) {
      const bookWidth = [.12, .16, .13][i % 3];
      const bookDepth = depth - .17 - (i % 2) * .04;
      addBox(parent, covers[(i + row) % covers.length], bookWidth, bookHeight, bookDepth,
        left + bookWidth / 2, shelfTop + bookHeight / 2, backing / 2 + .015);
      left += bookWidth + .017;
    }
  }
}

export function buildBedFrame(bed, materials) {
  const baseBottom = .17;
  const baseTop = .51;
  const headboardTop = 1.37;
  addBox(bed, materials.oak, 3.1, baseTop - baseBottom, 3.1, 0, (baseBottom + baseTop) / 2, 0);
  for (const x of [-1.42, 1.42]) {
    for (const z of [-1.42, 1.42]) addBox(bed, materials.oakDark, .18, .18, .18, x, .09, z);
  }
  // The headboard sits on the base so their aligned rear faces share only an edge.
  addBox(bed, materials.oakDark, 2.94, headboardTop - baseTop, .14, 0, (baseTop + headboardTop) / 2, -1.48);
  addBox(bed, materials.oak, 2.62, .72, .05, 0, .92, -1.40, false);
}

export function buildShowerEnclosure(shower, materials, glass) {
  const halfWidth = .88;
  const halfDepth = 1.015;
  const bottom = .12;
  const top = 2.49;
  const frame = .065;
  const height = top - bottom;
  const middleY = (top + bottom) / 2;
  const openingEdge = .08;
  const innerWidth = 2 * halfWidth - frame;

  for (const x of [-halfWidth, halfWidth]) {
    for (const z of [-halfDepth, halfDepth]) {
      addBox(shower, materials.white, frame, height, frame, x, middleY, z);
    }
  }
  for (const [x, z, length, rotation] of [
    [-halfWidth, 0, 2 * halfDepth - frame, Math.PI / 2],
    [halfWidth, 0, 2 * halfDepth - frame, Math.PI / 2],
    [0, halfDepth, innerWidth, 0],
  ]) {
    const side = new Group();
    side.position.set(x, 0, z);
    side.rotation.y = rotation;
    shower.add(side);
    addBox(side, materials.white, length, frame, frame, 0, bottom + frame / 2);
    addBox(side, materials.white, length, frame, frame, 0, top - frame / 2);
    addGlassPane(side, glass, length, height - 2 * frame, 0, middleY);
  }

  const trackZ = -halfDepth - .028;
  const threshold = .041;
  addBox(shower, materials.white, innerWidth, threshold, .13, 0, bottom + threshold / 2, trackZ);
  addBox(shower, materials.white, innerWidth, frame, .13, 0, top - frame / 2, trackZ);
  const fixedBottom = bottom + threshold;
  const fixedTop = top - frame;
  const fixedLeft = openingEdge + frame / 2;
  const fixedRight = halfWidth - frame / 2;
  addBox(shower, materials.white, frame, fixedTop - fixedBottom, frame, openingEdge, (fixedTop + fixedBottom) / 2, -halfDepth);
  addGlassPane(shower, glass, fixedRight - fixedLeft, fixedTop - fixedBottom,
    (fixedRight + fixedLeft) / 2, (fixedTop + fixedBottom) / 2, -halfDepth);

  const door = new Group();
  door.position.z = -halfDepth - .055;
  shower.add(door);
  const trim = .032;
  const left = -halfWidth + frame / 2 + .008;
  const right = openingEdge - .008;
  const doorBottom = fixedBottom + .006;
  const doorTop = fixedTop - .006;
  const doorHeight = doorTop - doorBottom;
  const doorY = (doorTop + doorBottom) / 2;
  const doorX = (left + right) / 2;
  const paneWidth = right - left - 2 * trim;
  for (const x of [left + trim / 2, right - trim / 2]) {
    addBox(door, materials.white, trim, doorHeight, trim, x, doorY);
  }
  for (const y of [doorBottom + trim / 2, doorTop - trim / 2]) {
    addBox(door, materials.white, paneWidth, trim, trim, doorX, y);
  }
  addGlassPane(door, glass, paneWidth, doorHeight - 2 * trim, doorX, doorY);
  const handleX = left + .12;
  for (const y of [1.05, 1.31]) addBox(door, materials.gold, .028, .028, .078, handleX, y, -.035);
  addBox(door, materials.gold, .028, .29, .034, handleX, 1.18, -.069);
  return { door, travel: openingEdge + .02 - left };
}

function addGlassPane(parent, material, width, height, x, y, z = 0) {
  const pane = new Mesh(new PlaneGeometry(width, height), material);
  pane.position.set(x, y, z);
  parent.add(pane);
}
