import re

with open('components/agency-landing/AgencyLandingPage.tsx', 'r') as f:
    text = f.read()

# Since AgencyLandingPage is 1 level deeper than LandingPage, we need to promote ALL relative paths by exactly ONE level.
# E.g., `import { Foo } from '../hooks/foo'` -> `import { Foo } from '../../hooks/foo'`
# And `import { Bar } from './components/Bar'` -> `import { Bar } from '../components/Bar'`

def promote_path(match):
    path = match.group(1)
    if path.startswith('./'):
        return "from '../" + path[2:] + "'"
    elif path.startswith('../'):
        return "from '../" + path + "'"
    return match.group(0)

text = re.sub(r"from\s+'((?:\.\./|\./)[^']+)'", promote_path, text)

with open('components/agency-landing/AgencyLandingPage.tsx', 'w') as f:
    f.write(text)

print("Fixed AgencyLandingPage paths")
