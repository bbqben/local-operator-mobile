"""Re-derive the U08 pins for the staged tree (`git add` first), as the pin file's
own error message asks. Run from the app worktree root."""
import re, subprocess
printed = subprocess.run(["node", "tools/audit/u08-content-pins.ts", "--print"], capture_output=True, text=True).stdout
p = "tools/audit/u08-content-pins.ts"
s = open(p).read()
def val(key):
    return re.search(r'"' + re.escape(key) + r'": "([0-9a-f]{64})"', printed).group(1)
src, pkg, lock = val("src"), val("package.json"), val("pnpm-lock.yaml")
note = ('\t/* PR feat/pele-diagrams: ```mermaid fences draw as diagrams (new session/diagram-*\n'
        '\t * modules, markdown parser `unterminated` flag, catalogue keys). Re-derived with\n'
        '\t * --print over the staged tree; source admission only, NOT rendered, native or\n'
        '\t * device evidence. */\n')
i = s.rindex('\tsrc: "'); j = s.index("\n", i)
s = s[:i] + (note if "feat/pele-diagrams" not in s[i - 600:i] else "") + '\tsrc: "' + src + '",' + s[j:]
def refile(name, new, add):
    global s
    m = re.search(r'(\t"' + re.escape(name) + r'":\n\t\t")([0-9a-f]{64})(")', s)
    s = s[:m.start()] + (add if add not in s else "") + m.group(1) + new + m.group(3) + s[m.end():]
refile("package.json", pkg, '\t// --print re-pin (feat/pele-diagrams): adds `pele` 1.13.0 (pure JS, no native\n\t// code); the web bundle draws its diagrams with it, source admission only.\n')
refile("pnpm-lock.yaml", lock, "")
open(p, "w").write(s)
print("src", src[:12], "pkg", pkg[:12], "lock", lock[:12])
