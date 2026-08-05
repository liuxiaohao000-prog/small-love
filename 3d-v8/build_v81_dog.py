#!/usr/bin/env python3
"""Convert the CC0 Quaternius Shiba glTF into Xiaoai's v8.1 offline GLB.

Usage:
    python3 build_v81_dog.py ShibaInu.gltf xiaoai-v81.glb
"""
from __future__ import annotations
import base64
import json
import struct
import sys
from pathlib import Path

PALETTE = {
    "Main": [0.68, 0.49, 0.25, 1.0],
    "Black": [0.035, 0.025, 0.022, 1.0],
    "Main_Light": [0.94, 0.84, 0.64, 1.0],
    "Eyes_Black": [0.006, 0.006, 0.006, 1.0],
    "Eyes_White": [0.96, 0.96, 0.93, 1.0],
    "Eyes_Pupil": [0.04, 0.022, 0.01, 1.0],
}
ANIMATION_ALIASES = {
    "Gallop": "Run",
    "Idle_2": "Happy",
    "Idle_2_HeadLow": "Sit",
}


def pad4(data: bytes, byte: bytes) -> bytes:
    return data + byte * ((4 - len(data) % 4) % 4)


def main(source: Path, output: Path) -> None:
    document = json.loads(source.read_text(encoding="utf-8"))
    uri = document["buffers"][0].pop("uri")
    if not uri.startswith("data:application/octet-stream;base64,"):
        raise ValueError("expected an embedded glTF buffer")
    binary = base64.b64decode(uri.split(",", 1)[1])

    for material in document.get("materials", []):
        name = material.get("name", "")
        pbr = material.setdefault("pbrMetallicRoughness", {})
        if name in PALETTE:
            pbr["baseColorFactor"] = PALETTE[name]
        pbr["metallicFactor"] = 0.0
        pbr["roughnessFactor"] = 0.42 if "Eye" in name else 0.86
        material["doubleSided"] = False

    for animation in document.get("animations", []):
        source_name = animation.get("name", "")
        if source_name in ANIMATION_ALIASES:
            animation.setdefault("extras", {})["sourceName"] = source_name
            animation["name"] = ANIMATION_ALIASES[source_name]

    document.setdefault("asset", {})["generator"] = (
        "Quaternius CC0 Shiba Inu + XiaoAi Manor v8.1 material pass"
    )
    document.setdefault("extras", {})["xiaoaiManor"] = {
        "version": "8.1.0",
        "role": "Xiaoai",
        "license": "CC0-1.0",
        "source": "Ultimate Animated Animal Pack by Quaternius",
    }
    document["buffers"][0]["byteLength"] = len(binary)

    json_chunk = pad4(
        json.dumps(document, separators=(",", ":"), ensure_ascii=False).encode("utf-8"),
        b" ",
    )
    bin_chunk = pad4(binary, b"\0")
    total = 12 + 8 + len(json_chunk) + 8 + len(bin_chunk)
    output.parent.mkdir(parents=True, exist_ok=True)
    with output.open("wb") as stream:
        stream.write(struct.pack("<III", 0x46546C67, 2, total))
        stream.write(struct.pack("<II", len(json_chunk), 0x4E4F534A))
        stream.write(json_chunk)
        stream.write(struct.pack("<II", len(bin_chunk), 0x004E4942))
        stream.write(bin_chunk)

    animation_names = {item.get("name") for item in document.get("animations", [])}
    required = {"Idle", "Walk", "Run", "Happy", "Sit"}
    if not required.issubset(animation_names):
        raise ValueError(f"missing game animations: {sorted(required - animation_names)}")
    if len(document.get("skins", [])) != 1:
        raise ValueError("expected one dog skin")
    print(f"wrote {output} ({output.stat().st_size} bytes)")


if __name__ == "__main__":
    if len(sys.argv) != 3:
        raise SystemExit("usage: build_v81_dog.py ShibaInu.gltf xiaoai-v81.glb")
    main(Path(sys.argv[1]), Path(sys.argv[2]))
