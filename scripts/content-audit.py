#!/usr/bin/env python3
"""Content audit for smartbolig.net guides.

Extracts and validates all fenced code blocks in src/content/docs/**/*.mdx:
  - yaml   -> PyYAML parse (with Home Assistant custom tags tolerated)
  - json   -> json.loads
  - bash   -> bash -n syntax check
  - javascript -> node --check

Also checks:
  - internal markdown links resolve to an existing content page or public/ file
  - image references resolve to files in public/
"""
import json
import os
import re
import subprocess
import sys
import tempfile
from pathlib import Path

import yaml

ROOT = Path(__file__).resolve().parent.parent
DOCS = ROOT / "src" / "content" / "docs"
PUBLIC = ROOT / "public"

# --- Home Assistant / ESPHome custom YAML tags (valid in HA, unknown to PyYAML) ---
HA_TAGS = [
    "!include", "!include_dir_list", "!include_dir_named",
    "!include_dir_merge_list", "!include_dir_merge_named",
    "!secret", "!env_var", "!input", "!lambda",
]


class HALoader(yaml.SafeLoader):
    pass


def _unknown_tag(loader, tag_suffix, node):
    return None


for tag in HA_TAGS:
    HALoader.add_constructor(tag, lambda loader, node: None)
# Catch-all for any other custom tags (e.g. ESPHome !extend)
yaml.add_multi_constructor("!", _unknown_tag, Loader=HALoader)

CODE_FENCE_RE = re.compile(r"^```(\w*)\s*$")
LINK_RE = re.compile(r"\[([^\]]*)\]\(([^)\s]+)(?:\s+\"[^\"]*\")?\)")
IMG_SRC_RE = re.compile(r'(?:src=["\']|!\[[^\]]*\]\()(/[^"\')\s]+\.(?:png|jpe?g|svg|gif|webp|ico))')


def extract_code_blocks(text):
    """Yield (language, start_line, code) for every fenced code block."""
    lines = text.split("\n")
    in_block = False
    lang = ""
    start = 0
    buf = []
    for i, line in enumerate(lines, start=1):
        m = CODE_FENCE_RE.match(line.strip()) if line.strip().startswith("```") else None
        if not in_block and m:
            in_block = True
            lang = m.group(1).lower()
            start = i
            buf = []
        elif in_block and line.strip().startswith("```"):
            yield lang, start, "\n".join(buf)
            in_block = False
        elif in_block:
            buf.append(line)


def strip_mdx_placeholders(code):
    """Content uses <dit-xyz> / DIN_xyz placeholders that are intentional."""
    return code


def check_yaml(code):
    # Several guides show partial YAML ("...":) or list fragments - try as-is first.
    try:
        list(yaml.load_all(code, Loader=HALoader))
        return None
    except yaml.YAMLError as e:
        return f"{type(e).__name__}: {str(e).splitlines()[0] if str(e) else e}"


def check_json(code):
    try:
        json.loads(code)
        return None
    except json.JSONDecodeError as e:
        return f"JSONDecodeError: {e}"


def check_bash(code):
    with tempfile.NamedTemporaryFile("w", suffix=".sh", delete=False) as f:
        f.write(code)
        path = f.name
    try:
        r = subprocess.run(["bash", "-n", path], capture_output=True, text=True, timeout=10)
        if r.returncode != 0:
            return r.stderr.strip().replace(path, "<block>").splitlines()[0]
        return None
    finally:
        os.unlink(path)


def check_javascript(code):
    with tempfile.NamedTemporaryFile("w", suffix=".mjs", delete=False) as f:
        f.write(code)
        path = f.name
    try:
        r = subprocess.run(["node", "--check", path], capture_output=True, text=True, timeout=10)
        if r.returncode != 0:
            first = r.stderr.strip().replace(path, "<block>").splitlines()
            return next((l for l in first if l.strip()), "syntax error")
        return None
    finally:
        os.unlink(path)


def page_exists(url_path, all_slugs):
    """Check whether an internal link target exists as a content page."""
    p = url_path.split("#")[0].split("?")[0]
    p = p.rstrip("/")
    if not p:
        return True  # site root (middleware handles it)
    if p in ("/da", "/en"):
        return True
    # /da/ai/nyheder/rss.xml and other generated routes
    if p.endswith((".xml", ".txt", ".json")):
        return True
    slug = p.lstrip("/")
    return slug in all_slugs


def main():
    mdx_files = sorted(DOCS.rglob("*.mdx"))
    # Build set of all valid page slugs (da/foo/bar from da/foo/bar.mdx or .../index.mdx)
    all_slugs = set()
    for f in mdx_files:
        rel = f.relative_to(DOCS).with_suffix("")
        slug = str(rel)
        all_slugs.add(slug)
        if slug.endswith("/index"):
            all_slugs.add(slug[: -len("/index")])

    code_issues = []
    link_issues = []
    image_issues = []
    stats = {}

    for f in mdx_files:
        rel = str(f.relative_to(ROOT))
        text = f.read_text(encoding="utf-8")

        # --- code blocks ---
        for lang, line, code in extract_code_blocks(text):
            stats[lang or "(untagged)"] = stats.get(lang or "(untagged)", 0) + 1
            if not code.strip():
                continue
            err = None
            if lang == "yaml":
                err = check_yaml(code)
            elif lang == "json":
                err = check_json(code)
            elif lang in ("bash", "sh", "shell"):
                err = check_bash(code)
            elif lang in ("javascript", "js"):
                err = check_javascript(code)
            if err:
                code_issues.append((rel, line, lang, err))

        # --- internal links ---
        for m in LINK_RE.finditer(text):
            target = m.group(2)
            if target.startswith("/") and not target.startswith("//"):
                if target.startswith("/images/") or target.startswith("/brand/"):
                    fs = PUBLIC / target.lstrip("/").split("#")[0].split("?")[0]
                    if not fs.exists():
                        image_issues.append((rel, target, "linked file missing in public/"))
                elif not page_exists(target, all_slugs):
                    line_no = text[: m.start()].count("\n") + 1
                    link_issues.append((rel, line_no, target))

        # --- image refs (src= and markdown images) ---
        for m in IMG_SRC_RE.finditer(text):
            target = m.group(1)
            fs = PUBLIC / target.lstrip("/")
            if not fs.exists():
                line_no = text[: m.start()].count("\n") + 1
                image_issues.append((rel, f"line {line_no}: {target}", "image missing in public/"))

    print("=== CODE BLOCK STATS ===")
    for lang, count in sorted(stats.items(), key=lambda kv: -kv[1]):
        print(f"  {count:5d}  {lang}")

    print(f"\n=== CODE SYNTAX ISSUES ({len(code_issues)}) ===")
    for rel, line, lang, err in code_issues:
        print(f"  {rel}:{line} [{lang}] {err}")

    print(f"\n=== BROKEN INTERNAL LINKS ({len(link_issues)}) ===")
    for rel, line, target in link_issues:
        print(f"  {rel}:{line} -> {target}")

    print(f"\n=== MISSING IMAGES/FILES ({len(image_issues)}) ===")
    for rel, target, why in image_issues:
        print(f"  {rel}: {target} ({why})")

    total = len(code_issues) + len(link_issues) + len(image_issues)
    print(f"\nTOTAL ISSUES: {total}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
