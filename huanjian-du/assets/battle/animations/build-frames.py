"""从透明图集重建攻防与受击帧。运行：uv run --with pillow python build-frames.py"""

from collections import deque
from pathlib import Path

from PIL import Image, ImageDraw


ASSET_DIR = Path(__file__).resolve().parent
ACTORS = ("lu-zhao", "road-bandit", "cheng-yan")
ACTIONS = ("attack", "guard")
FRAME_SIZE = 444


def keep_primary_components(frame: Image.Image, count: int = 1, min_alpha: int = 1) -> Image.Image:
    """保留人物及当前招式的主要像素区域，排除相邻分格残影。"""
    alpha = frame.getchannel("A")
    width, height = alpha.size
    pixels = alpha.load()
    visited = set()
    components = []

    for y in range(height):
        for x in range(width):
            if (x, y) in visited or pixels[x, y] < min_alpha:
                continue
            component = []
            queue = deque([(x, y)])
            visited.add((x, y))
            while queue:
                px, py = queue.popleft()
                component.append((px, py))
                for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)):
                    nx, ny = px + dx, py + dy
                    if not (0 <= nx < width and 0 <= ny < height):
                        continue
                    if (nx, ny) in visited or pixels[nx, ny] < min_alpha:
                        continue
                    visited.add((nx, ny))
                    queue.append((nx, ny))
            components.append(component)

    if len(components) < count:
        raise ValueError("攻击帧中没有角色像素")
    kept_alpha = Image.new("L", (width, height))
    for component in sorted(components, key=len, reverse=True)[:count]:
        for x, y in component:
            kept_alpha.putpixel((x, y), pixels[x, y])
    frame.putalpha(kept_alpha)
    return frame


def split_hit_sheet(sheet: Image.Image) -> list[Image.Image]:
    """按四个独立的人物轮廓拆图，避免手脚越过图集分格线。"""
    width, height = sheet.size
    alpha = sheet.getchannel("A").tobytes()
    visited = bytearray(len(alpha))
    bodies = []

    for start, value in enumerate(alpha):
        if value == 0 or visited[start]:
            continue
        queue = deque([start])
        visited[start] = 1
        component = []
        while queue:
            pixel = queue.popleft()
            component.append(pixel)
            x, y = pixel % width, pixel // width
            neighbors = []
            if x > 0:
                neighbors.append(pixel - 1)
            if x + 1 < width:
                neighbors.append(pixel + 1)
            if y > 0:
                neighbors.append(pixel - width)
            if y + 1 < height:
                neighbors.append(pixel + width)
            for neighbor in neighbors:
                if alpha[neighbor] and not visited[neighbor]:
                    visited[neighbor] = 1
                    queue.append(neighbor)
        if len(component) > 50_000:
            bodies.append(component)

    if len(bodies) != 4:
        raise ValueError(f"受击图集应有四个人物区域，实际为 {len(bodies)}")

    source_pixels = sheet.load()
    frames = [None] * 4
    for body in bodies:
        x_values = [pixel % width for pixel in body]
        y_values = [pixel // width for pixel in body]
        left, right = min(x_values), max(x_values) + 1
        top, bottom = min(y_values), max(y_values) + 1
        position = (2 if (top + bottom) / 2 >= height / 2 else 0)
        position += 1 if (left + right) / 2 >= width / 2 else 0
        if frames[position] is not None:
            raise ValueError("受击图集中的人物位置重复")

        region = Image.new("RGBA", (right - left, bottom - top))
        region_pixels = region.load()
        for pixel in body:
            x, y = pixel % width, pixel // width
            region_pixels[x - left, y - top] = source_pixels[x, y]
        scale = min(428 / region.width, 428 / region.height)
        region = region.resize(
            (round(region.width * scale), round(region.height * scale)),
            Image.Resampling.NEAREST,
        )
        frame = Image.new("RGBA", (FRAME_SIZE, FRAME_SIZE))
        frame.alpha_composite(region, ((FRAME_SIZE - region.width) // 2, FRAME_SIZE - 8 - region.height))
        frames[position] = frame

    return frames


for actor in ACTORS:
    sheet = Image.open(ASSET_DIR / f"{actor}-actions-v1.png").convert("RGBA")
    if sheet.size != (1774, 887):
        raise ValueError(f"图集尺寸不符：{actor} {sheet.size}")

    for row, action in enumerate(ACTIONS):
        for index in range(4):
            if action == "attack" and index == 2:
                # 挥剑跨越图集分格，单独提取完整人形及剑气。
                region = sheet.crop((800, 0, 1400, 443))
                region = region.resize((444, 328), Image.Resampling.NEAREST)
                frame = Image.new("RGBA", (FRAME_SIZE, FRAME_SIZE))
                frame.paste(region, (0, 116))
                clean = ImageDraw.Draw(frame)
                if actor != "lu-zhao":
                    clean.rectangle((0, 351, 59, 443), fill=(0, 0, 0, 0))
                    clean.rectangle((401, 0, 443, 349), fill=(0, 0, 0, 0))
            else:
                left = round(index * sheet.width / 4)
                right = round((index + 1) * sheet.width / 4)
                top = round(row * sheet.height / 2)
                bottom = round((row + 1) * sheet.height / 2)
                region = sheet.crop((left, top, right, bottom))
                frame = region.resize((FRAME_SIZE, FRAME_SIZE), Image.Resampling.NEAREST)

            if action == "attack":
                # 山贼出招帧的刀光独立于人物；其余帧只需一个主体区域。
                count = 2 if actor == "road-bandit" and index == 2 else 1
                # 细微半透明像素会把山贼蓄力帧的残影连到人物上。
                min_alpha = 1 if actor == "lu-zhao" else 32
                frame = keep_primary_components(frame, count=count, min_alpha=min_alpha)
            frame.save(ASSET_DIR / f"{actor}-{action}-{index}.png")

    hit_sheet = Image.open(ASSET_DIR / f"{actor}-hit-source-v1.png").convert("RGBA")
    for index, frame in enumerate(split_hit_sheet(hit_sheet)):
        frame.save(ASSET_DIR / f"{actor}-hit-{index}.png")
