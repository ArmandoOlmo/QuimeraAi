import os, glob

components_dir = "/Users/armandoolmo/Desktop/QuimeraAi/QuimeraAi/components"
for filepath in glob.glob(os.path.join(components_dir, "*.tsx")):
    with open(filepath, "r") as f:
        content = f.read()

    changed = False
    
    if "\\\" backdrop-blur" in content:
        content = content.replace("\\\" backdrop-blur-xl border-y border-white/10 z-20 shadow-[0_4px_30px_rgba(0,0,0,0.1)]\\\"", "' backdrop-blur-xl border-y border-white/10 z-20 shadow-[0_4px_30px_rgba(0,0,0,0.1)]'")
        changed = True
        
    if "\\\"\\\"" in content:
        content = content.replace("\\\"\\\"", "''")
        changed = True

    if changed:
        with open(filepath, "w") as f:
            f.write(content)
        print(f"Fixed {os.path.basename(filepath)}")
