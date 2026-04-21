import os, re

components_dir = "/Users/armandoolmo/Desktop/QuimeraAi/QuimeraAi/components"
filepath = os.path.join(components_dir, "Team.tsx")
with open(filepath, "r") as f:
    content = f.read()

# It has `glassEffect,\n  glassEffect, imageUrl,` from my previous run!
content = content.replace("  glassEffect,\n  glassEffect, imageUrl,", "  imageUrl,")
content = content.replace("const Team: React.FC<TeamProps> = ({", "const Team: React.FC<TeamProps> = ({\n  glassEffect,")

# Now replace the <section>
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

new_content = re.sub(
    r"(<section[^>]*?)(className=(?:\"[^\"]*\"|\{`[^`]*`\}|\{[^\}]*\}))(.*?style=\{\{.*?backgroundColor:\s*[^,}]+.*?\}\})", 
    replacer, 
    content,
    flags=re.DOTALL
)

with open(filepath, "w") as f:
    f.write(new_content)
print("Fixed Team.tsx")
