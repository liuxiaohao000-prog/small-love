#!/usr/bin/env bash
set -euo pipefail

# Usage:
#   apply-v8-assets.sh <unpacked-apk-root> <xiaoyu.vrm> <three-runtime-dir>
#
# The unpacked root must contain assets/www/game3d.js and assets/www/index.html.
# The runtime directory must contain GLTFLoader.js, BufferGeometryUtils.js,
# SkeletonUtils.js, three.module.min.js and three.core.min.js.

ROOT=${1:?unpacked APK root required}
VRM=${2:?CC0 VRM path required}
RUNTIME=${3:?Three runtime directory required}
SCRIPT_DIR=$(cd "$(dirname "$0")" && pwd)

[[ -f "$ROOT/assets/www/game3d.js" ]]
[[ -f "$ROOT/assets/www/index.html" ]]
[[ -f "$VRM" ]]

TMP=$(mktemp -d)
trap 'rm -rf "$TMP"' EXIT

base64 -d "$SCRIPT_DIR/patches/game3d-v8.patch.gz.b64" | gzip -d > "$TMP/game3d.patch"
base64 -d "$SCRIPT_DIR/patches/index-v8.patch.gz.b64" | gzip -d > "$TMP/index.patch"

(
  cd "$ROOT"
  patch --batch --forward -p0 < "$TMP/game3d.patch"
  patch --batch --forward -p0 < "$TMP/index.patch"
)

install -D -m 0644 "$SCRIPT_DIR/VRMRuntime.js" "$ROOT/assets/www/vendor/VRMRuntime.js"
for file in GLTFLoader.js BufferGeometryUtils.js SkeletonUtils.js three.module.min.js three.core.min.js; do
  install -D -m 0644 "$RUNTIME/$file" "$ROOT/assets/www/vendor/$file"
done
install -D -m 0644 "$VRM" "$ROOT/assets/www/models/xiaoyu.vrm"
install -D -m 0644 "$SCRIPT_DIR/V8_REDESIGN_PLAN.md" "$ROOT/assets/www/V8_REDESIGN_PLAN.md"
install -D -m 0644 "$SCRIPT_DIR/V8_ART_REVIEW.md" "$ROOT/assets/www/V8_ART_REVIEW.md"

node --check "$ROOT/assets/www/game3d.js"
node --check "$ROOT/assets/www/vendor/VRMRuntime.js"
echo "v8 VRM runtime and source patches applied"
