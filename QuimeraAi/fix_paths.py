import re

with open('components/dashboard/agency/landing/AgencyLandingEditor.tsx', 'r') as f:
    text = f.read()

# Replace local imports
text = re.sub(r"from\s+'\./LandingPageControls'", "from '../../admin/LandingPageControls'", text)

# Replace all relative paths `from '../` by adding one more `../`
def replace_relative_paths(match):
    path = match.group(1)
    # count how many ../
    count = path.count('../')
    # add one more ../
    new_path = '../' * (count + 1) + path.replace('../', '')
    return "from '" + new_path + "'"

text = re.sub(r"from\s+'((?:\.\./)+[^']+)'", replace_relative_paths, text)

# Write back
with open('components/dashboard/agency/landing/AgencyLandingEditor.tsx', 'w') as f:
    f.write(text)

print("Fixed relative imports correctly!")
