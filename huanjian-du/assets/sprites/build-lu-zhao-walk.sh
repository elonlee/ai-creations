#!/usr/bin/env bash
set -euo pipefail

sprite_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source_image="${sprite_dir}/lu-zhao-walk-source-v1.png"
frame_dir="${sprite_dir}/lu-zhao-walk-frames"
scratch_dir="$(mktemp -d)"
trap 'rm -rf "${scratch_dir}"' EXIT

mkdir -p "${frame_dir}"

# ImageGen 原图是 3 列 × 4 行，每格 362 × 362。先等比缩为每格 64 × 64。
ffmpeg -hide_banner -loglevel error -y -i "${source_image}" \
  -vf 'scale=192:256:flags=neighbor' -pix_fmt rgba "${scratch_dir}/raw.png"

# 各帧的人物中心略有偏移。下面仅平移整格像素，保持角色大小和动作不变。
make_frame() {
  local index="$1" source_x="$2" source_y="$3" pad_x="$4" pad_y="$5"
  ffmpeg -hide_banner -loglevel error -y -i "${scratch_dir}/raw.png" \
    -vf "crop=64:64:${source_x}:${source_y},scale=48:48:flags=neighbor,format=rgba,pad=80:80:${pad_x}:${pad_y}:color=black@0,crop=64:64:0:0" \
    -pix_fmt rgba "${frame_dir}/frame-${index}.png"
}

# 行顺序：下、左、右、上；列顺序：左脚、站立、右脚。
make_frame 00 0   0   2  13
make_frame 01 64  0  10  14
make_frame 02 128 0   8  13
make_frame 03 0   64  8  13
make_frame 04 64  64 14  13
make_frame 05 128 64  6  13
make_frame 06 0   128 8  13
make_frame 07 64  128 7  13
make_frame 08 128 128 8  13
make_frame 09 0   192 12 19
make_frame 10 64  192 10 21
make_frame 11 128 192 14 19

ffmpeg -hide_banner -loglevel error -y -framerate 1 \
  -i "${frame_dir}/frame-%02d.png" -vf 'tile=3x4' -frames:v 1 \
  -pix_fmt rgba "${sprite_dir}/lu-zhao-walk-64-v1.png"
