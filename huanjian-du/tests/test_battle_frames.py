"""检查攻击帧没有混入相邻分格的残影。"""

from collections import deque
from pathlib import Path
import unittest

from PIL import Image


ASSETS = Path(__file__).resolve().parents[1] / "assets/battle/animations"


def large_alpha_components(image: Image.Image) -> int:
    alpha = image.getchannel("A")
    width, height = alpha.size
    pixels = alpha.load()
    visited = set()
    large = 0

    for y in range(height):
        for x in range(width):
            if (x, y) in visited or pixels[x, y] < 32:
                continue
            queue = deque([(x, y)])
            visited.add((x, y))
            count = 0
            while queue:
                px, py = queue.popleft()
                count += 1
                for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)):
                    nx, ny = px + dx, py + dy
                    if not (0 <= nx < width and 0 <= ny < height):
                        continue
                    if (nx, ny) in visited or pixels[nx, ny] < 32:
                        continue
                    visited.add((nx, ny))
                    queue.append((nx, ny))
            large += count >= 50
    return large


class BattleFrameTests(unittest.TestCase):
    def test_attack_frames_have_no_neighbor_ghosts(self):
        for actor in ("lu-zhao", "road-bandit", "cheng-yan"):
            for index in range(4):
                with self.subTest(actor=actor, index=index):
                    frame = Image.open(ASSETS / f"{actor}-attack-{index}.png").convert("RGBA")
                    # 山贼出招帧的刀光与人物分离，保留两个主要区域。
                    expected = 2 if actor == "road-bandit" and index == 2 else 1
                    self.assertEqual(large_alpha_components(frame), expected)

    def test_hit_frames_keep_the_full_figure_inside_the_canvas(self):
        for actor in ("lu-zhao", "road-bandit", "cheng-yan"):
            for index in range(4):
                with self.subTest(actor=actor, index=index):
                    alpha = Image.open(ASSETS / f"{actor}-hit-{index}.png").convert("RGBA").getchannel("A")
                    left, top, right, bottom = alpha.getbbox()
                    self.assertGreaterEqual(left, 4)
                    self.assertGreaterEqual(top, 4)
                    self.assertLessEqual(right, 440)
                    self.assertLessEqual(bottom, 440)


if __name__ == "__main__":
    unittest.main()
