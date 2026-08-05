#!/usr/bin/env bash
set -euo pipefail

# Usage:
#   apply-v82-bichon.sh <unpacked-apk-root>
#
# The unpacked v8.1 root must contain:
#   assets/www/game3d.js
#   assets/www/index.html
#   assets/www/models/xiaoai-v81.glb

ROOT=${1:?unpacked v8.1 APK root required}
SCRIPT_DIR=$(cd "$(dirname "$0")" && pwd)
TMP=$(mktemp -d)
trap 'rm -rf "$TMP"' EXIT

[[ -f "$ROOT/assets/www/game3d.js" ]]
[[ -f "$ROOT/assets/www/index.html" ]]
[[ -f "$ROOT/assets/www/models/xiaoai-v81.glb" ]]

base64 -d "$SCRIPT_DIR/build_v82_bichon.py.gz.b64" | gzip -d > "$TMP/build_v82_bichon.py"
base64 -d "$SCRIPT_DIR/patches/game3d-v82-bichon.patch.gz.b64" | gzip -d > "$TMP/game3d.patch"
base64 -d "$SCRIPT_DIR/patches/index-v82-bichon.patch.gz.b64" | gzip -d > "$TMP/index.patch"

python3 "$TMP/build_v82_bichon.py" \
  "$ROOT/assets/www/models/xiaoai-v81.glb" \
  "$ROOT/assets/www/models/xiaoai-bichon-v82.glb"

(
  cd "$ROOT"
  patch --batch --forward -p0 < "$TMP/game3d.patch"
  patch --batch --forward -p0 < "$TMP/index.patch"
)

cat > "$ROOT/assets/www/models/LICENSE_XIAOAI_BICHON_CC0.txt" <<'EOF'
Xiaoai Bichon Frise v8.2

Base rig and animations:
Ultimate Animated Animal Pack by Quaternius
https://quaternius.com/packs/ultimateanimatedanimals.html
License: Creative Commons CC0 1.0 Universal
https://creativecommons.org/publicdomain/zero/1.0/

XiaoAi Manor modifications:
round head, short muzzle, drop ears, compact body, fluffy legs,
back-curled tail, white coat, skinned fur shell and curl clumps.
EOF

node --check "$ROOT/assets/www/game3d.js"
node --check "$ROOT/assets/www/vendor/VRMRuntime.js"
echo "v8.2 Bichon model and runtime patches applied"
