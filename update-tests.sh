#!/bin/bash
# update-tests.sh — எழுது
# Reads versions from each source file and updates the versions
# table in TESTS.md automatically.
# Usage: bash update-tests.sh

ELUTHU_DIR="$(cd "$(dirname "$0")" && pwd)"

# Read @version comment from HTML/CSS/JSON files
get_version() {
  local file="$1"
  local pattern="$2"
  grep -m1 "$pattern" "$file" 2>/dev/null | grep -oP '[\d]+\.[\d]+\.[\d]+'
}

# Read version from ELUTHU_VERSIONS registration line in JS files
# e.g. window.ELUTHU_VERSIONS['typing.js'] = '1.5.1';
get_js_version() {
  local file="$1"
  local key="$2"
  grep -m1 "ELUTHU_VERSIONS\['${key}'\]" "$file" 2>/dev/null \
    | grep -oP "'\K[\d]+\.[\d]+\.[\d]+(?=')"
}

# Read versions from each file
V_HTML=$(get_version    "$ELUTHU_DIR/index.html"               '@version')
V_CSS=$(get_version     "$ELUTHU_DIR/css/style.css"            '@version')
V_JSON=$(get_version    "$ELUTHU_DIR/data/tamil99-keymap.json" '"_version"')
V_T99=$(get_js_version  "$ELUTHU_DIR/js/tamil99.js"            'tamil99.js')
V_COM=$(get_js_version  "$ELUTHU_DIR/js/combination.js"        'combination.js')
V_TYP=$(get_js_version  "$ELUTHU_DIR/js/typing.js"             'typing.js')
V_LES=$(get_js_version  "$ELUTHU_DIR/js/lessons.js"            'lessons.js')
V_APP=$(get_js_version  "$ELUTHU_DIR/js/app.js"                'app.js')
V_VER=$(get_js_version  "$ELUTHU_DIR/js/version.js"            'version.js')
V_TST=$(get_version     "$ELUTHU_DIR/tamil99-tester.html"      '@version')

echo "Versions found:"
echo "  index.html           v$V_HTML"
echo "  style.css            v$V_CSS"
echo "  tamil99-keymap.json  v$V_JSON"
echo "  tamil99.js           v$V_T99"
echo "  combination.js       v$V_COM"
echo "  typing.js            v$V_TYP"
echo "  lessons.js           v$V_LES"
echo "  app.js               v$V_APP"
echo "  version.js           v$V_VER"
echo "  tamil99-tester.html  v$V_TST"

# Replace the versions table in TESTS.md
TESTS="$ELUTHU_DIR/TESTS.md"

# Build new table
NEW_TABLE="## File Versions
| File | Version |
|---|---|
| index.html | $V_HTML |
| style.css | $V_CSS |
| tamil99-keymap.json | $V_JSON |
| tamil99.js | $V_T99 |
| combination.js | $V_COM |
| typing.js | $V_TYP |
| lessons.js | $V_LES |
| app.js | $V_APP |
| version.js | $V_VER |
| tamil99-tester.html | $V_TST |"

# Replace between "## File Versions" and next "---"
python3 - "$TESTS" "$NEW_TABLE" << 'EOF'
import sys, re

tests_file = sys.argv[1]
new_table  = sys.argv[2]

with open(tests_file, 'r') as f:
    content = f.read()

updated = re.sub(
    r'## File Versions\n\| File \| Version \|.*?(?=\n---)',
    new_table,
    content,
    flags=re.DOTALL
)

with open(tests_file, 'w') as f:
    f.write(updated)

print("TESTS.md updated")
EOF
