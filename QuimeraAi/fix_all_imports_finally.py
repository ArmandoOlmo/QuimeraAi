import re

with open('components/dashboard/agency/landing/AgencyLandingEditor.tsx', 'r') as f:
    text = f.read()

# Exact correct paths we know must exist:
replacements = {
    "from '../../../../../contexts/tenant'": "from '../../../../contexts/tenant'",
    "from '../../../../../hooks/useUndoRedo'": "from '../../../../hooks/useUndoRedo'",
    "from '../../../../ui/UndoButton'": "from '../../../ui/UndoButton'",
    "from '../../../../../contexts/undo'": "from '../../../../contexts/undo'",
    "from '../../../DashboardSidebar'": "from '../../DashboardSidebar'",
    "from '../../../admin/LandingPageControls'": "from '../../admin/LandingPageControls'",
    "from '../../../../ui/Modal'": "from '../../../ui/Modal'",
    "from '../../../../../types'": "from '../../../../types'",
    "from '../../../../../firebase'": "from '../../../../firebase'",
    "from '../../../../../services/agencyLandingService'": "from '../../../../services/agencyLandingService'",
    "from '../../../../../types/agencyLanding'": "from '../../../../types/agencyLanding'",
}

for old, new_ in replacements.items():
    text = text.replace(old, new_)

with open('components/dashboard/agency/landing/AgencyLandingEditor.tsx', 'w') as f:
    f.write(text)

print("Fixed imports exactly")
