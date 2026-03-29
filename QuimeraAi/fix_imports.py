import re

with open('components/dashboard/agency/landing/AgencyLandingEditor.tsx', 'r') as f:
    text = f.read()

def replace_relative_paths(match):
    path = match.group(1)
    if 'LandingPageControls' in path: 
        # local file in dashboard/admin
        return "from '../../admin/LandingPageControls'"
    count = path.count('../')
    new_path = '../' * (count + 1) + path.replace('../', '')
    return "from '" + new_path + "'"

text = re.sub(r"from\s+'((?:\.\./)+[^']+)'", replace_relative_paths, text)
text = re.sub(r"from\s+'\./LandingPageControls'", "from '../../admin/LandingPageControls'", text)


with open('components/dashboard/agency/landing/AgencyLandingEditor.tsx', 'w') as f:
    f.write(text)

print("Fixed relative imports!")
