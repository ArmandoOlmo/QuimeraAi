import os, glob, re

components_dir = "/Users/armandoolmo/Desktop/QuimeraAi/QuimeraAi/components"
for filepath in glob.glob(os.path.join(components_dir, "*.tsx")):
    with open(filepath, "r") as f:
        content = f.read()

    changed = False

    def replacer(match):
        prefix = match.group(1)
        classname = match.group(2)
        suffix = match.group(3)
        
        if classname.startswith("className={"):
            new_classname = classname[:-2] + r" ${glassEffect ? ' backdrop-blur-xl border-y border-white/10 z-20 shadow-[0_4px_30px_rgba(0,0,0,0.1)]' : ''}`}"
        else:
            inside = classname[11:-1]
            new_classname = "className={`" + inside + r" ${glassEffect ? ' backdrop-blur-xl border-y border-white/10 z-20 shadow-[0_4px_30px_rgba(0,0,0,0.1)]' : ''}`}"
            
        new_style = re.sub(
            r"backgroundColor:\s*([^,}]+)", 
            r"backgroundColor: glassEffect ? hexToRgba(\1, 0.4) : \1", 
            suffix
        )
        
        return prefix + new_classname + new_style

    if "glassEffect" in content and "backdrop-blur" not in content and "Header.tsx" not in filepath and "Hero.tsx" not in filepath:
        new_content = re.sub(
            r"(<section[^>]*?)(className=(?:\"[^\"]*\"|\{`[^`]*`\}|\{[^\}]*\}))(.*?style=\{\{.*?backgroundColor:\s*[^,}]+.*?\}\})", 
            replacer, 
            content,
            flags=re.DOTALL
        )
        if new_content != content:
            changed = True
            content = new_content

    if changed:
        with open(filepath, "w") as f:
            f.write(content)
        print(f"Fixed multiline in {os.path.basename(filepath)}")
