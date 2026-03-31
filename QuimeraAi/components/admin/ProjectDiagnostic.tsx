/**
 * ProjectDiagnostic - Temporary admin tool to diagnose and restore project data
 * Navigate to /admin/diagnose to use
 * DELETE THIS FILE after fixing the data
 */
import React, { useEffect, useState } from 'react';
import { useAuth } from '../../contexts/core/AuthContext';
import { db, collection, getDocs, doc, getDoc, setDoc } from '../../firebase';

interface ProjectFingerprint {
  id: string;
  name: string;
  lastUpdated: string;
  status: string;
  heroHeadline: string;
  heroSubheadline: string;
  footerCompany: string;
  primaryColor: string;
  fontHeader: string;
  pagesCount: number;
  menusCount: number;
  agentName: string;
  componentOrder: string;
}

interface PublishedFingerprint {
  publishedAt: string;
  heroHeadline: string;
  footerCompany: string;
  primaryColor: string;
  fontHeader: string;
  agentName: string;
}

interface ProjectDiag {
  draft: ProjectFingerprint;
  published: PublishedFingerprint | null;
  mismatches: string[];
  rawDraft: any;
  rawPublished: any;
}

const ProjectDiagnostic: React.FC = () => {
  const { user } = useAuth();
  const [projects, setProjects] = useState<ProjectDiag[]>([]);
  const [loading, setLoading] = useState(true);
  const [restoring, setRestoring] = useState<string | null>(null);
  const [log, setLog] = useState<string[]>([]);

  const addLog = (msg: string) => setLog(prev => [...prev, `[${new Date().toLocaleTimeString()}] ${msg}`]);

  useEffect(() => {
    if (!user) return;
    diagnose();
  }, [user]);

  const diagnose = async () => {
    if (!user) return;
    setLoading(true);
    setLog([]);
    addLog('Starting diagnosis...');

    try {
      const projectsCol = collection(db, 'users', user.uid, 'projects');
      const snap = await getDocs(projectsCol);
      addLog(`Found ${snap.size} projects`);

      const results: ProjectDiag[] = [];

      for (const docSnap of snap.docs) {
        const p = docSnap.data();
        const projectId = docSnap.id;

        const draft: ProjectFingerprint = {
          id: projectId,
          name: p.name || '(unnamed)',
          lastUpdated: p.lastUpdated || '(unknown)',
          status: p.status || '(unknown)',
          heroHeadline: truncate(p.data?.hero?.headline, 80),
          heroSubheadline: truncate(p.data?.hero?.subheadline, 80),
          footerCompany: truncate(p.data?.footer?.companyName, 60),
          primaryColor: p.theme?.globalColors?.primary || p.theme?.primaryColor || '(none)',
          fontHeader: p.theme?.fontFamilyHeader || '(none)',
          pagesCount: p.pages?.length || 0,
          menusCount: p.menus?.length || 0,
          agentName: p.aiAssistantConfig?.agentName || '(none)',
          componentOrder: (p.componentOrder || []).slice(0, 5).join(', '),
        };

        let published: PublishedFingerprint | null = null;
        let rawPublished: any = null;
        try {
          const pubRef = doc(db, 'publicStores', projectId);
          const pubSnap = await getDoc(pubRef);
          if (pubSnap.exists()) {
            const pub = pubSnap.data();
            rawPublished = pub;
            published = {
              publishedAt: pub.publishedAt || '(unknown)',
              heroHeadline: truncate(pub.data?.hero?.headline, 80),
              footerCompany: truncate(pub.data?.footer?.companyName, 60),
              primaryColor: pub.theme?.globalColors?.primary || pub.theme?.primaryColor || '(none)',
              fontHeader: pub.theme?.fontFamilyHeader || '(none)',
              agentName: pub.aiAssistantConfig?.agentName || '(none)',
            };
          }
        } catch (e: any) {
          addLog(`Warning: Could not check publicStores for ${projectId}: ${e.message}`);
        }

        const mismatches: string[] = [];
        if (published) {
          if (draft.heroHeadline !== published.heroHeadline) mismatches.push('Hero Headline');
          if (draft.primaryColor !== published.primaryColor) mismatches.push('Primary Color');
          if (draft.fontHeader !== published.fontHeader) mismatches.push('Font Header');
          if (draft.footerCompany !== published.footerCompany) mismatches.push('Footer Company');
          if (draft.agentName !== published.agentName) mismatches.push('Agent Name');
        }

        results.push({ draft, published, mismatches, rawDraft: p, rawPublished });
        addLog(`✓ Analyzed: "${draft.name}" (${projectId}) - ${mismatches.length > 0 ? `⚠️ ${mismatches.length} mismatches` : '✅ OK'}`);
      }

      // Cross-project duplicate check
      for (let i = 0; i < results.length; i++) {
        for (let j = i + 1; j < results.length; j++) {
          const a = results[i].draft;
          const b = results[j].draft;
          if (a.heroHeadline && b.heroHeadline && a.heroHeadline === b.heroHeadline && a.heroHeadline !== '(none)') {
            addLog(`⚠️ DUPLICATE: "${a.name}" and "${b.name}" share the same hero headline!`);
          }
          if (a.footerCompany && b.footerCompany && a.footerCompany === b.footerCompany && a.footerCompany !== '(none)') {
            addLog(`⚠️ SHARED FOOTER: "${a.name}" and "${b.name}" share footer: "${a.footerCompany}"`);
          }
        }
      }

      setProjects(results);
    } catch (e: any) {
      addLog(`❌ Error: ${e.message}`);
    }
    setLoading(false);
  };

  const restoreFromPublished = async (projectId: string) => {
    if (!user) return;
    const proj = projects.find(p => p.draft.id === projectId);
    if (!proj?.rawPublished) {
      addLog(`❌ No published version for ${projectId}`);
      return;
    }

    setRestoring(projectId);
    try {
      addLog(`🔄 Restoring "${proj.draft.name}" from publicStores...`);

      const pubData = proj.rawPublished;
      const projectRef = doc(db, 'users', user.uid, 'projects', projectId);

      // Restore key fields from published version
      const restoreData: any = {};
      if (pubData.data) restoreData.data = pubData.data;
      if (pubData.theme) restoreData.theme = pubData.theme;
      if (pubData.brandIdentity) restoreData.brandIdentity = pubData.brandIdentity;
      if (pubData.componentOrder) restoreData.componentOrder = pubData.componentOrder;
      if (pubData.sectionVisibility) restoreData.sectionVisibility = pubData.sectionVisibility;
      if (pubData.pages) restoreData.pages = pubData.pages;
      if (pubData.menus) restoreData.menus = pubData.menus;
      if (pubData.aiAssistantConfig) restoreData.aiAssistantConfig = pubData.aiAssistantConfig;
      if (pubData.seoConfig) restoreData.seoConfig = pubData.seoConfig;
      if (pubData.designTokens) restoreData.designTokens = pubData.designTokens;
      if (pubData.responsiveStyles) restoreData.responsiveStyles = pubData.responsiveStyles;
      if (pubData.componentStyles) restoreData.componentStyles = pubData.componentStyles;
      restoreData.lastUpdated = new Date().toISOString();
      restoreData.restoredFrom = 'publicStores';
      restoreData.restoredAt = new Date().toISOString();

      await setDoc(projectRef, restoreData, { merge: true });
      addLog(`✅ Restored "${proj.draft.name}" successfully!`);

      // Re-diagnose
      await diagnose();
    } catch (e: any) {
      addLog(`❌ Restore failed: ${e.message}`);
    }
    setRestoring(null);
  };

  const truncate = (val: any, len: number) => {
    if (!val) return '(none)';
    const s = typeof val === 'string' ? val : JSON.stringify(val);
    return s.length > len ? s.substring(0, len) + '...' : s;
  };

  if (!user) return <div style={styles.container}><p>Please log in first.</p></div>;

  return (
    <div style={styles.container}>
      <h1 style={styles.title}>🔍 Project Diagnostic Tool</h1>
      <p style={styles.subtitle}>Compares draft (Firestore) vs published (publicStores) data</p>

      <button onClick={diagnose} disabled={loading} style={styles.button}>
        {loading ? '⏳ Analyzing...' : '🔄 Re-scan Projects'}
      </button>

      {projects.map((proj) => (
        <div key={proj.draft.id} style={{
          ...styles.card,
          borderLeft: proj.mismatches.length > 0 ? '4px solid #f59e0b' : '4px solid #22c55e'
        }}>
          <div style={styles.cardHeader}>
            <h2 style={styles.cardTitle}>
              {proj.mismatches.length > 0 ? '⚠️' : '✅'} {proj.draft.name}
            </h2>
            <span style={styles.projectId}>{proj.draft.id}</span>
          </div>

          <div style={styles.columns}>
            <div style={styles.column}>
              <h3 style={styles.columnTitle}>📝 Draft (Firestore)</h3>
              <table style={styles.table}>
                <tbody>
                  <Row label="Hero Headline" value={proj.draft.heroHeadline} mismatch={proj.mismatches.includes('Hero Headline')} />
                  <Row label="Hero Subheadline" value={proj.draft.heroSubheadline} />
                  <Row label="Footer Company" value={proj.draft.footerCompany} mismatch={proj.mismatches.includes('Footer Company')} />
                  <Row label="Primary Color" value={proj.draft.primaryColor} mismatch={proj.mismatches.includes('Primary Color')} />
                  <Row label="Font Header" value={proj.draft.fontHeader} mismatch={proj.mismatches.includes('Font Header')} />
                  <Row label="Agent Name" value={proj.draft.agentName} mismatch={proj.mismatches.includes('Agent Name')} />
                  <Row label="Pages" value={String(proj.draft.pagesCount)} />
                  <Row label="Menus" value={String(proj.draft.menusCount)} />
                  <Row label="Components" value={proj.draft.componentOrder} />
                  <Row label="Last Updated" value={proj.draft.lastUpdated} />
                </tbody>
              </table>
            </div>

            <div style={styles.column}>
              <h3 style={styles.columnTitle}>📤 Published (publicStores)</h3>
              {proj.published ? (
                <table style={styles.table}>
                  <tbody>
                    <Row label="Hero Headline" value={proj.published.heroHeadline} mismatch={proj.mismatches.includes('Hero Headline')} />
                    <Row label="Footer Company" value={proj.published.footerCompany} mismatch={proj.mismatches.includes('Footer Company')} />
                    <Row label="Primary Color" value={proj.published.primaryColor} mismatch={proj.mismatches.includes('Primary Color')} />
                    <Row label="Font Header" value={proj.published.fontHeader} mismatch={proj.mismatches.includes('Font Header')} />
                    <Row label="Agent Name" value={proj.published.agentName} mismatch={proj.mismatches.includes('Agent Name')} />
                    <Row label="Published At" value={proj.published.publishedAt} />
                  </tbody>
                </table>
              ) : (
                <p style={{ color: '#94a3b8' }}>No published version available</p>
              )}
            </div>
          </div>

          {proj.mismatches.length > 0 && proj.published && (
            <div style={styles.actions}>
              <p style={{ color: '#f59e0b', marginBottom: 8 }}>
                ⚠️ Mismatches: {proj.mismatches.join(', ')}
              </p>
              <button
                onClick={() => restoreFromPublished(proj.draft.id)}
                disabled={restoring === proj.draft.id}
                style={{ ...styles.button, backgroundColor: '#f59e0b', color: '#000' }}
              >
                {restoring === proj.draft.id ? '⏳ Restoring...' : '🔄 Restore from Published Version'}
              </button>
            </div>
          )}
        </div>
      ))}

      {/* Log output */}
      <div style={styles.logBox}>
        <h3 style={styles.logTitle}>📋 Log</h3>
        {log.map((entry, i) => (
          <div key={i} style={styles.logEntry}>{entry}</div>
        ))}
      </div>
    </div>
  );
};

const Row: React.FC<{ label: string; value: string; mismatch?: boolean }> = ({ label, value, mismatch }) => (
  <tr>
    <td style={{ ...styles.td, fontWeight: 600 }}>{label}</td>
    <td style={{ ...styles.td, color: mismatch ? '#f59e0b' : '#e2e8f0', backgroundColor: mismatch ? 'rgba(245,158,11,0.1)' : 'transparent' }}>
      {mismatch && '❌ '}{value}
    </td>
  </tr>
);

const styles: Record<string, React.CSSProperties> = {
  container: { padding: 32, maxWidth: 1200, margin: '0 auto', fontFamily: 'Inter, system-ui, sans-serif', color: '#e2e8f0', backgroundColor: '#0f172a', minHeight: '100vh' },
  title: { fontSize: 28, fontWeight: 700, marginBottom: 4 },
  subtitle: { color: '#94a3b8', marginBottom: 24 },
  button: { padding: '10px 20px', borderRadius: 8, border: 'none', cursor: 'pointer', fontWeight: 600, backgroundColor: '#6366f1', color: '#fff', fontSize: 14 },
  card: { backgroundColor: '#1e293b', borderRadius: 12, padding: 24, marginBottom: 24 },
  cardHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  cardTitle: { fontSize: 20, fontWeight: 700, margin: 0 },
  projectId: { fontSize: 12, color: '#64748b', fontFamily: 'monospace' },
  columns: { display: 'flex', gap: 24 },
  column: { flex: 1 },
  columnTitle: { fontSize: 14, fontWeight: 600, color: '#94a3b8', marginBottom: 12, textTransform: 'uppercase' as const },
  table: { width: '100%', borderCollapse: 'collapse' as const, fontSize: 13 },
  td: { padding: '6px 8px', borderBottom: '1px solid #334155', color: '#e2e8f0', verticalAlign: 'top', wordBreak: 'break-word' as const },
  actions: { marginTop: 16, paddingTop: 16, borderTop: '1px solid #334155' },
  logBox: { backgroundColor: '#1e293b', borderRadius: 12, padding: 16, marginTop: 24 },
  logTitle: { fontSize: 14, fontWeight: 600, color: '#94a3b8', marginBottom: 8 },
  logEntry: { fontSize: 12, fontFamily: 'monospace', color: '#94a3b8', padding: '2px 0' },
};

export default ProjectDiagnostic;
