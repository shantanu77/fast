import React, { useState, useEffect } from 'react';

// Helper to extract domain from any URL format
const extractDomain = (url) => {
  if (!url) return '';
  // Remove protocol
  let domain = url.replace(/^https?:\/\//i, '');
  // Remove www.
  domain = domain.replace(/^www\./i, '');
  // Get domain only (before /, ?, or #)
  domain = domain.split('/')[0].split('?')[0].split('#')[0];
  return domain.toLowerCase();
};

const SearchPage = ({ onBack, onScanNew }) => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [filter, setFilter] = useState('all');
  const [sort, setSort] = useState('recent');
  const [showScanModal, setShowScanModal] = useState(false);
  const [newUrl, setNewUrl] = useState('');
  const [scanningNew, setScanningNew] = useState(false);
  const [autoScanning, setAutoScanning] = useState(false);
  const [scannedDomain, setScannedDomain] = useState('');

  const perPage = 20;

  const getGradeColor = (grade) => {
    if (!grade) return '#64748b';
    if (grade.startsWith('A')) return '#4ade80';
    if (grade.startsWith('B')) return '#38bdf8';
    if (grade.startsWith('C')) return '#fbbf24';
    if (grade.startsWith('D')) return '#f87171';
    return '#ef4444';
  };

  const getSafetyColor = (rating) => {
    switch (rating) {
      case 'SAFE_FOR_ALL': return '#22c55e';
      case 'PARENTAL_GUIDANCE': return '#84cc16';
      case 'TEEN': return '#eab308';
      case 'MATURE': return '#f97316';
      case 'BLOCKED': return '#ef4444';
      default: return '#6b7280';
    }
  };

  const getSafetyEmoji = (rating) => {
    switch (rating) {
      case 'SAFE_FOR_ALL': return '👶';
      case 'PARENTAL_GUIDANCE': return '👪';
      case 'TEEN': return '🧑';
      case 'MATURE': return '🔞';
      case 'BLOCKED': return '🚫';
      default: return '❓';
    }
  };

  const getSafetyLabel = (rating) => {
    switch (rating) {
      case 'SAFE_FOR_ALL': return 'All Ages';
      case 'PARENTAL_GUIDANCE': return 'Parental Guidance';
      case 'TEEN': return 'Teen (13+)';
      case 'MATURE': return 'Mature (17+)';
      case 'BLOCKED': return 'Blocked';
      default: return 'Unknown';
    }
  };

  const searchWebsites = async (searchPage = 1) => {
    if (!query.trim() && searchPage === 1) {
      setResults([]);
      setTotal(0);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(
        `/api/websites/search?q=${encodeURIComponent(query)}&page=${searchPage}&per_page=${perPage}&filter=${filter}&sort=${sort}`
      );
      const data = await response.json();

      if (response.ok) {
        setResults(data.results || []);
        setTotal(data.total || 0);
        
        // Auto-scan if not found and this is a domain-like query
        if (data.total === 0 && searchPage === 1) {
          const domain = extractDomain(query);
          if (domain && domain.includes('.')) {
            setScannedDomain(domain);
            await autoScanDomain(domain);
          }
        }
      } else {
        setError(data.error || 'Search failed');
      }
    } catch (err) {
      setError('Failed to connect to server');
    } finally {
      setLoading(false);
    }
  };

  // Auto-scan a domain without asking for new URL
  const autoScanDomain = async (domain) => {
    setAutoScanning(true);
    try {
      const response = await fetch('/api/websites/scan-new', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: domain }),
      });

      const data = await response.json();

      if (response.ok) {
        if (data.exists) {
          // Domain exists, refresh search
          await searchWebsites(1);
        } else {
          // New scan completed, refresh search to show it
          await searchWebsites(1);
        }
      }
    } catch (err) {
      console.error('Auto-scan failed:', err);
    } finally {
      setAutoScanning(false);
    }
  };

  const handleScanNew = async () => {
    if (!newUrl.trim()) return;

    setScanningNew(true);
    setError(null);

    try {
      const domain = extractDomain(newUrl);
      const response = await fetch('/api/websites/scan-new', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: domain }),
      });

      const data = await response.json();

      if (response.ok) {
        if (data.exists) {
          alert('Website already exists in database!');
          setQuery(domain);
          searchWebsites();
        } else {
          alert('Website scanned and added successfully!');
          setShowScanModal(false);
          setNewUrl('');
          setQuery(domain);
          searchWebsites();
        }
      } else {
        setError(data.error || 'Scan failed');
      }
    } catch (err) {
      setError('Failed to scan website');
    } finally {
      setScanningNew(false);
    }
  };

  useEffect(() => {
    const timeout = setTimeout(() => {
      if (query) {
        setPage(1);
        searchWebsites(1);
      }
    }, 300);

    return () => clearTimeout(timeout);
  }, [query, filter, sort]);

  const totalPages = Math.ceil(total / perPage);

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <button onClick={onBack} style={styles.backButton}>
          ← Back to Scanner
        </button>
        <h1 style={styles.title}>🔍 Search Websites</h1>
        <p style={styles.subtitle}>Find and explore scanned websites</p>
      </div>

      <div style={styles.searchSection}>
        <div style={styles.searchBox}>
          <input
            type="text"
            placeholder="Enter URL (e.g., web.abc.com/hello?a=1) - we'll search by domain"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            style={styles.searchInput}
          />
          <button onClick={() => searchWebsites(1)} disabled={loading || autoScanning} style={{...styles.searchButton, opacity: loading || autoScanning ? 0.6 : 1}}>
            {loading || autoScanning ? 'Searching...' : 'Search'}
          </button>
        </div>
        
        {/* Show extracted domain */}
        {query && (
          <div style={styles.domainHint}>
            Searching for domain: <strong>{extractDomain(query) || '...'}</strong>
          </div>
        )}

        <div style={styles.filters}>
          <select value={filter} onChange={(e) => setFilter(e.target.value)} style={styles.select}>
            <option value="all">All Websites</option>
            <option value="safe">Safe for Kids</option>
            <option value="unsafe">Adult Content</option>
          </select>

          <select value={sort} onChange={(e) => setSort(e.target.value)} style={styles.select}>
            <option value="recent">Most Recent</option>
            <option value="score">Highest Score</option>
            <option value="name">Name (A-Z)</option>
          </select>
        </div>
      </div>

      {error && (
        <div style={styles.errorBox}>
          ⚠️ {error}
        </div>
      )}

      {!query && !loading && (
        <div style={styles.emptyState}>
          <div style={styles.emptyIcon}>🔍</div>
          <h3 style={styles.emptyTitle}>Start Searching</h3>
          <p style={styles.emptyText}>Enter a website URL or domain name to search</p>
        </div>
      )}

      {loading && (
        <div style={styles.loadingState}>
          <div style={styles.spinner}></div>
          <p>Searching...</p>
        </div>
      )}

      {!loading && results.length > 0 && (
        <div style={styles.resultsSection}>
          <div style={styles.resultsHeader}>
            <span style={styles.resultsCount}>
              Found {total} website{total !== 1 ? 's' : ''}
            </span>
          </div>

          <div style={styles.resultsList}>
            {results.map((site) => (
              <div key={site.id} style={styles.resultCard}>
                <div style={styles.resultHeader}>
                  <div style={styles.resultUrl}>{site.url}</div>
                  <div style={styles.resultBadges}>
                    {site.kids_safety?.rating && (
                      <span
                        style={{
                          ...styles.safetyBadge,
                          backgroundColor: getSafetyColor(site.kids_safety.rating) + '20',
                          color: getSafetyColor(site.kids_safety.rating),
                          borderColor: getSafetyColor(site.kids_safety.rating) + '40',
                        }}
                        title={`Safety Score: ${site.kids_safety.score}/100`}
                      >
                        {getSafetyEmoji(site.kids_safety.rating)} {getSafetyLabel(site.kids_safety.rating)}
                      </span>
                    )}
                    {site.grade && (
                      <span
                        style={{
                          ...styles.gradeBadge,
                          backgroundColor: getGradeColor(site.grade),
                        }}
                      >
                        {site.grade}
                      </span>
                    )}
                  </div>
                </div>

                <div style={styles.resultStats}>
                  <div style={styles.stat}>
                    <span style={styles.statLabel}>Score</span>
                    <span style={styles.statValue}>
                      {site.performance_score ? Math.round(site.performance_score) : '-'}
                    </span>
                  </div>
                  <div style={styles.stat}>
                    <span style={styles.statLabel}>Load Time</span>
                    <span style={styles.statValue}>
                      {site.load_time ? `${Math.round(site.load_time)}ms` : '-'}
                    </span>
                  </div>
                  <div style={styles.stat}>
                    <span style={styles.statLabel}>Status</span>
                    <span style={{
                      ...styles.statValue,
                      color: site.status_code === 200 ? '#4ade80' : '#f87171'
                    }}>
                      {site.status_code || '-'}
                    </span>
                  </div>
                  <div style={styles.stat}>
                    <span style={styles.statLabel}>Scanned</span>
                    <span style={styles.statValue}>
                      {new Date(site.timestamp * 1000).toLocaleDateString()}
                    </span>
                  </div>
                </div>

                <div style={styles.resultFooter}>
                  <span style={styles.scanMethod}>
                    {site.scan_method === 'browser' ? '🌐 Browser Scan' : '📡 Legacy Scan'}
                  </span>
                </div>
              </div>
            ))}
          </div>

          {totalPages > 1 && (
            <div style={styles.pagination}>
              <button
                onClick={() => { setPage(p => p - 1); searchWebsites(page - 1); }}
                disabled={page <= 1}
                style={styles.pageButton}
              >
                Previous
              </button>
              <span style={styles.pageInfo}>
                Page {page} of {totalPages}
              </span>
              <button
                onClick={() => { setPage(p => p + 1); searchWebsites(page + 1); }}
                disabled={page >= totalPages}
                style={styles.pageButton}
              >
                Next
              </button>
            </div>
          )}
        </div>
      )}

      {!loading && query && results.length === 0 && !autoScanning && (
        <div style={styles.notFoundState}>
          <div style={styles.emptyIcon}>😕</div>
          <h3 style={styles.emptyTitle}>No websites found</h3>
          <p style={styles.emptyText}>We couldn't find "{extractDomain(query)}" in our database</p>
          <p style={styles.emptySubtext}>Tried to auto-scan but failed. You can try manually:</p>
          <button onClick={() => setShowScanModal(true)} style={styles.scanNewButton}>
            + Scan This Website
          </button>
        </div>
      )}

      {/* Auto-scanning indicator */}
      {autoScanning && (
        <div style={styles.autoScanState}>
          <div style={styles.scanSpinner}></div>
          <h3 style={styles.emptyTitle}>Scanning {scannedDomain}...</h3>
          <p style={styles.emptyText}>This domain wasn't in our database. Running a scan now...</p>
        </div>
      )}

      {/* Floating Scan Button */}
      <button
        onClick={() => setShowScanModal(true)}
        style={styles.floatingButton}
        title="Scan New Website"
      >
        +
      </button>

      {/* Scan New Website Modal */}
      {showScanModal && (
        <div style={styles.modalOverlay}>
          <div style={styles.modal}>
            <h2 style={styles.modalTitle}>🚀 Scan New Website</h2>
            <p style={styles.modalText}>
              Enter a website URL to scan and add it to our database.
            </p>
            <input
              type="text"
              placeholder="e.g., example.com"
              value={newUrl}
              onChange={(e) => setNewUrl(e.target.value)}
              style={styles.modalInput}
              onKeyPress={(e) => e.key === 'Enter' && handleScanNew()}
            />
            <div style={styles.modalActions}>
              <button
                onClick={() => { setShowScanModal(false); setNewUrl(''); }}
                style={styles.modalCancel}
              >
                Cancel
              </button>
              <button
                onClick={handleScanNew}
                disabled={scanningNew || !newUrl.trim()}
                style={{
                  ...styles.modalConfirm,
                  opacity: scanningNew || !newUrl.trim() ? 0.6 : 1,
                }}
              >
                {scanningNew ? 'Scanning...' : 'Start Scan'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const styles = {
  container: {
    minHeight: '100vh',
    padding: '40px 20px',
    maxWidth: '1000px',
    margin: '0 auto',
    color: '#f8fafc',
    fontFamily: "'Outfit', sans-serif",
  },
  header: {
    marginBottom: '40px',
    textAlign: 'center',
  },
  backButton: {
    position: 'absolute',
    top: '20px',
    left: '20px',
    padding: '10px 20px',
    borderRadius: '12px',
    border: '1px solid rgba(255,255,255,0.1)',
    background: 'rgba(30, 41, 59, 0.8)',
    color: '#94a3b8',
    cursor: 'pointer',
    fontSize: '0.9rem',
    transition: 'all 0.2s',
    ':hover': {
      background: 'rgba(56, 189, 248, 0.1)',
      color: '#38bdf8',
    }
  },
  title: {
    fontSize: '2.5rem',
    fontWeight: '800',
    marginBottom: '8px',
    background: 'linear-gradient(135deg, #38bdf8 0%, #818cf8 100%)',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
  },
  subtitle: {
    color: '#64748b',
    fontSize: '1.1rem',
  },
  searchSection: {
    marginBottom: '30px',
  },
  searchBox: {
    display: 'flex',
    gap: '12px',
    marginBottom: '16px',
  },
  searchInput: {
    flex: 1,
    padding: '16px 24px',
    borderRadius: '16px',
    border: '1px solid rgba(255,255,255,0.1)',
    backgroundColor: 'rgba(30, 41, 59, 0.6)',
    color: '#fff',
    fontSize: '1rem',
    outline: 'none',
    transition: 'all 0.3s',
    ':focus': {
      borderColor: '#38bdf8',
      boxShadow: '0 0 0 3px rgba(56, 189, 248, 0.1)',
    }
  },
  searchButton: {
    padding: '16px 32px',
    borderRadius: '16px',
    border: 'none',
    background: 'linear-gradient(135deg, #38bdf8 0%, #818cf8 100%)',
    color: '#0f172a',
    fontWeight: '700',
    fontSize: '1rem',
    cursor: 'pointer',
    transition: 'all 0.2s',
    ':hover': {
      transform: 'translateY(-2px)',
      boxShadow: '0 10px 20px -10px rgba(56, 189, 248, 0.5)',
    }
  },
  domainHint: {
    fontSize: '0.85rem',
    color: '#64748b',
    marginBottom: '12px',
    padding: '8px 12px',
    backgroundColor: 'rgba(56, 189, 248, 0.1)',
    borderRadius: '8px',
    border: '1px solid rgba(56, 189, 248, 0.2)',
  },
  filters: {
    display: 'flex',
    gap: '12px',
    justifyContent: 'center',
  },
  select: {
    padding: '12px 20px',
    borderRadius: '12px',
    border: '1px solid rgba(255,255,255,0.1)',
    backgroundColor: 'rgba(30, 41, 59, 0.6)',
    color: '#fff',
    fontSize: '0.9rem',
    cursor: 'pointer',
    outline: 'none',
  },
  errorBox: {
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    border: '1px solid rgba(239, 68, 68, 0.3)',
    borderRadius: '12px',
    padding: '16px',
    marginBottom: '20px',
    color: '#fca5a5',
    textAlign: 'center',
  },
  emptyState: {
    textAlign: 'center',
    padding: '60px 20px',
    backgroundColor: 'rgba(30, 41, 59, 0.4)',
    borderRadius: '24px',
    border: '1px dashed rgba(255,255,255,0.1)',
  },
  notFoundState: {
    textAlign: 'center',
    padding: '60px 20px',
    backgroundColor: 'rgba(30, 41, 59, 0.4)',
    borderRadius: '24px',
    border: '1px dashed rgba(255,255,255,0.1)',
  },
  autoScanState: {
    textAlign: 'center',
    padding: '60px 20px',
    backgroundColor: 'rgba(56, 189, 248, 0.1)',
    borderRadius: '24px',
    border: '1px dashed rgba(56, 189, 248, 0.3)',
  },
  scanSpinner: {
    width: '48px',
    height: '48px',
    border: '4px solid rgba(56, 189, 248, 0.2)',
    borderTop: '4px solid #38bdf8',
    borderRadius: '50%',
    animation: 'spin 1s linear infinite',
    margin: '0 auto 20px',
  },
  emptySubtext: {
    color: '#94a3b8',
    fontSize: '0.9rem',
    marginBottom: '16px',
  },
  emptyIcon: {
    fontSize: '4rem',
    marginBottom: '16px',
  },
  emptyTitle: {
    fontSize: '1.5rem',
    fontWeight: '700',
    marginBottom: '8px',
    color: '#f8fafc',
  },
  emptyText: {
    color: '#64748b',
    marginBottom: '20px',
  },
  scanNewButton: {
    padding: '14px 28px',
    borderRadius: '12px',
    border: 'none',
    background: 'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)',
    color: '#fff',
    fontWeight: '700',
    fontSize: '1rem',
    cursor: 'pointer',
    transition: 'all 0.2s',
    ':hover': {
      transform: 'translateY(-2px)',
      boxShadow: '0 10px 20px -10px rgba(34, 197, 94, 0.5)',
    }
  },
  loadingState: {
    textAlign: 'center',
    padding: '60px 20px',
  },
  spinner: {
    width: '48px',
    height: '48px',
    border: '4px solid rgba(56, 189, 248, 0.1)',
    borderTop: '4px solid #38bdf8',
    borderRadius: '50%',
    animation: 'spin 1s linear infinite',
    margin: '0 auto 20px',
  },
  resultsSection: {
    marginTop: '20px',
  },
  resultsHeader: {
    marginBottom: '16px',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  resultsCount: {
    color: '#94a3b8',
    fontSize: '0.9rem',
  },
  resultsList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
  },
  resultCard: {
    backgroundColor: 'rgba(30, 41, 59, 0.6)',
    borderRadius: '16px',
    padding: '20px',
    border: '1px solid rgba(255,255,255,0.05)',
    transition: 'all 0.2s',
    ':hover': {
      backgroundColor: 'rgba(30, 41, 59, 0.8)',
      borderColor: 'rgba(56, 189, 248, 0.2)',
    }
  },
  resultHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '16px',
    flexWrap: 'wrap',
    gap: '12px',
  },
  resultUrl: {
    fontSize: '1.1rem',
    fontWeight: '600',
    color: '#38bdf8',
    wordBreak: 'break-all',
  },
  resultBadges: {
    display: 'flex',
    gap: '8px',
    flexWrap: 'wrap',
  },
  safetyBadge: {
    padding: '6px 12px',
    borderRadius: '20px',
    fontSize: '0.75rem',
    fontWeight: '600',
    border: '1px solid',
  },
  gradeBadge: {
    padding: '6px 12px',
    borderRadius: '8px',
    fontSize: '0.85rem',
    fontWeight: '800',
    color: '#0f172a',
  },
  resultStats: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(100px, 1fr))',
    gap: '16px',
    padding: '16px 0',
    borderTop: '1px solid rgba(255,255,255,0.05)',
    borderBottom: '1px solid rgba(255,255,255,0.05)',
  },
  stat: {
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
  },
  statLabel: {
    fontSize: '0.75rem',
    color: '#64748b',
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
  },
  statValue: {
    fontSize: '1rem',
    fontWeight: '600',
    color: '#f8fafc',
  },
  resultFooter: {
    marginTop: '12px',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  scanMethod: {
    fontSize: '0.8rem',
    color: '#64748b',
  },
  pagination: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    gap: '20px',
    marginTop: '30px',
  },
  pageButton: {
    padding: '10px 20px',
    borderRadius: '10px',
    border: '1px solid rgba(255,255,255,0.1)',
    backgroundColor: 'rgba(30, 41, 59, 0.6)',
    color: '#f8fafc',
    cursor: 'pointer',
    transition: 'all 0.2s',
    ':disabled': {
      opacity: 0.5,
      cursor: 'not-allowed',
    }
  },
  pageInfo: {
    color: '#94a3b8',
    fontSize: '0.9rem',
  },
  floatingButton: {
    position: 'fixed',
    bottom: '30px',
    right: '30px',
    width: '60px',
    height: '60px',
    borderRadius: '50%',
    border: 'none',
    background: 'linear-gradient(135deg, #38bdf8 0%, #818cf8 100%)',
    color: '#0f172a',
    fontSize: '2rem',
    fontWeight: '700',
    cursor: 'pointer',
    boxShadow: '0 10px 30px -10px rgba(56, 189, 248, 0.5)',
    transition: 'all 0.2s',
    ':hover': {
      transform: 'scale(1.1)',
    }
  },
  modalOverlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.8)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
    padding: '20px',
    backdropFilter: 'blur(8px)',
  },
  modal: {
    backgroundColor: '#1e293b',
    padding: '40px',
    borderRadius: '24px',
    maxWidth: '450px',
    width: '100%',
    textAlign: 'center',
    border: '1px solid rgba(56, 189, 248, 0.2)',
  },
  modalTitle: {
    fontSize: '1.5rem',
    fontWeight: '800',
    marginBottom: '12px',
    color: '#f8fafc',
  },
  modalText: {
    color: '#94a3b8',
    marginBottom: '24px',
  },
  modalInput: {
    width: '100%',
    padding: '16px 20px',
    borderRadius: '12px',
    border: '1px solid rgba(255,255,255,0.1)',
    backgroundColor: '#0f172a',
    color: '#fff',
    fontSize: '1rem',
    marginBottom: '20px',
    outline: 'none',
    boxSizing: 'border-box',
  },
  modalActions: {
    display: 'flex',
    gap: '12px',
  },
  modalCancel: {
    flex: 1,
    padding: '14px 20px',
    borderRadius: '12px',
    border: '1px solid rgba(255,255,255,0.1)',
    backgroundColor: 'transparent',
    color: '#94a3b8',
    cursor: 'pointer',
    transition: 'all 0.2s',
  },
  modalConfirm: {
    flex: 1,
    padding: '14px 20px',
    borderRadius: '12px',
    border: 'none',
    background: 'linear-gradient(135deg, #38bdf8 0%, #818cf8 100%)',
    color: '#0f172a',
    fontWeight: '700',
    cursor: 'pointer',
    transition: 'all 0.2s',
  },
};

export default SearchPage;
