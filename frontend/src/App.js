import React, { useState } from 'react';

function App() {
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [userRating, setUserRating] = useState(0);
  const [ratingStats, setRatingStats] = useState({ average: 0, count: 0 });
  const [hasRated, setHasRated] = useState(localStorage.getItem('fast_scanner_rated') === 'true');
  const [feedback, setFeedback] = useState('');
  const [submittedFeedback, setSubmittedFeedback] = useState(localStorage.getItem('fast_scanner_feedback') || '');
  const [recentScans, setRecentScans] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [currentScanId, setCurrentScanId] = useState(null);
  const [selectedStars, setSelectedStars] = useState(0);
  const [visitorName, setVisitorName] = useState('');
  const [stats, setStats] = useState({ live_users: 0, total_users: 0, total_reviews: 0 });

  // Generate random fun name
  const generateRandomName = () => {
    const adjectives = [
      'Funny', 'Laughing', 'Flying', 'Dancing', 'Singing', 'Happy', 'Jolly',
      'Bouncing', 'Smiling', 'Cheerful', 'Playful', 'Clever', 'Wise', 'Swift',
      'Brave', 'Gentle', 'Curious', 'Mighty', 'Tiny', 'Sleepy'
    ];
    const animals = [
      'Duck', 'Cow', 'Fish', 'Penguin', 'Panda', 'Koala', 'Dolphin', 'Owl',
      'Fox', 'Bear', 'Rabbit', 'Tiger', 'Lion', 'Elephant', 'Giraffe',
      'Monkey', 'Zebra', 'Kangaroo', 'Turtle', 'Whale'
    ];
    const adj = adjectives[Math.floor(Math.random() * adjectives.length)];
    const animal = animals[Math.floor(Math.random() * animals.length)];
    return `${adj} ${animal}`;
  };

  const fetchRecentScans = async () => {
    try {
      const response = await fetch('/api/recent-scans');
      const data = await response.json();
      setRecentScans(data);
    } catch (err) {
      console.error("Failed to fetch recent scans", err);
    }
  };

  const fetchStats = async () => {
    try {
      const response = await fetch('/api/stats');
      const data = await response.json();
      setStats(data);
    } catch (err) {
      console.error("Failed to fetch stats", err);
    }
  };

  React.useEffect(() => {
    fetchRecentScans();
    fetchStats();
    setVisitorName(generateRandomName());

    const statsInterval = setInterval(fetchStats, 15000); // Update stats every 15s

    if (window.location.search.includes('reset=true')) {
      localStorage.removeItem('fast_scanner_rated');
      localStorage.removeItem('fast_scanner_feedback');
      setHasRated(false);
      setSubmittedFeedback('');
      window.history.replaceState({}, document.title, "/");
    }

    return () => clearInterval(statsInterval);
  }, []);

  const getEmotionalIcon = (stars) => {
    if (stars >= 5) return '🤩';
    if (stars >= 4) return '😊';
    if (stars >= 3) return '😐';
    if (stars >= 2) return '😟';
    return '😢';
  };

  const getGradeColor = (grade) => {
    if (grade.startsWith('A')) return '#4ade80';
    if (grade.startsWith('B')) return '#38bdf8';
    if (grade.startsWith('C')) return '#fbbf24';
    if (grade.startsWith('D')) return '#f87171';
    return '#ef4444';
  };

  const handleScan = async (e) => {
    e.preventDefault();
    if (!url) return;

    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const response = await fetch('/api/scan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url }),
      });

      const data = await response.json();
      if (data.error) throw new Error(data.error);
      setResult(data);
      setCurrentScanId(data.id);
      fetchRecentScans();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleStarClick = (stars) => {
    if (hasRated) return;
    setSelectedStars(stars);
    setVisitorName(generateRandomName());
    setShowModal(true);
  };

  const submitRating = async () => {
    // Check feedback word count
    const words = feedback.trim().split(/\s+/).filter(w => w.length > 0);
    if (words.length < 3) {
      alert("Please enter at least 3 words in your feedback!");
      return;
    }

    try {
      const response = await fetch('/api/rate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          scan_id: currentScanId,
          rating: selectedStars,
          comment: feedback,
          visitor_name: visitorName.trim() || generateRandomName()
        }),
      });
      const data = await response.json();
      if (data.success) {
        setRatingStats({ average: data.average_rating, count: data.total_ratings });
        setHasRated(true);
        setSubmittedFeedback(feedback);
        setShowModal(false);
        localStorage.setItem('fast_scanner_rated', 'true');
        localStorage.setItem('fast_scanner_feedback', feedback);
        // "Teleport" back to the main scanner URL after rating
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    } catch (err) {
      console.error("Failed to submit rating", err);
    }
  };

  return (
    <div style={styles.container}>
      <header style={styles.header}>
        <div style={styles.badge}>
          <span style={styles.badgeIcon}>🛡️</span> Trusted by Ashwat Singh
        </div>
        <h1 style={styles.title}>Fast <span style={styles.accent}>Scanner</span></h1>
        <p style={styles.subtitle}>High-performance website security and speed analysis.</p>

        <div style={styles.statsRow}>
          <div style={styles.statChip}>
            <span style={{ ...styles.statDot, backgroundColor: '#4ade80' }}></span>
            <strong>{stats.live_users}</strong> Live Users
          </div>
          <div style={styles.statChip}>
            <span style={{ ...styles.statDot, backgroundColor: '#38bdf8' }}></span>
            <strong>{stats.total_users}</strong> Total Scans
          </div>
          <div style={styles.statChip}>
            <span style={{ ...styles.statDot, backgroundColor: '#fbbf24' }}></span>
            <strong>{stats.total_reviews}</strong> Reviews
          </div>
        </div>
      </header>

      <main style={styles.main}>
        <form onSubmit={handleScan} style={styles.form}>
          <div style={styles.inputWrapper}>
            <input
              type="text"
              placeholder="Enter website URL (e.g. google.com)"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              style={styles.input}
            />
          </div>
          <button type="submit" disabled={loading} style={styles.button}>
            {loading ? 'Scanning...' : 'Scan Website'}
          </button>
        </form>

        {error && <div style={styles.errorCard}>{error}</div>}

        {result && (
          <div style={styles.resultsContainer}>
            <div style={{ ...styles.safeBanner, backgroundColor: result.is_safe ? '#065f46' : '#7f1d1d', border: `1px solid ${result.is_safe ? '#059669' : '#dc2626'}`, color: result.is_safe ? '#ecfdf5' : '#fef2f2' }}>
              <div style={{ ...styles.gradeBadge, backgroundColor: getGradeColor(result.grade) }}>
                {result.grade}
              </div>
              <div style={styles.statusTextContainer}>
                <h2 style={styles.statusHeadline}>{result.safety_status}</h2>
                {result.safety_reasons.length > 0 && (
                  <p style={styles.statusSubline}>{result.safety_reasons.join(' | ')}</p>
                )}
              </div>
            </div>

            <div style={styles.resultGrid}>
              <ResultCard label="Performance Score" value={`${Math.round(result.performance_score)}/100`} sub="Internal Speed Rank" />
              <ResultCard label="Load Time" value={`${result.load_time_ms} ms`} sub="Total response time" />
              <ResultCard label="Page Size" value={`${(result.content_length / 1024).toFixed(2)} KB`} sub="Payload size" />
              <ResultCard label="Status" value={result.status} sub="HTTP response code" />

              <div style={styles.bugsSection}>
                <h3 style={styles.sectionTitle}>Detected Issues / Bugs</h3>
                {result.bugs.length > 0 ? (
                  <ul style={styles.bugList}>
                    {result.bugs.map((bug, i) => (
                      <li key={i} style={styles.bugItem}>⚠️ {bug}</li>
                    ))}
                  </ul>
                ) : (
                  <p style={styles.successText}>✅ No critical bugs detected!</p>
                )}
              </div>
            </div>
          </div>
        )}

        <div style={styles.layoutGroup}>
          <div style={styles.mainContent}>
            <section style={styles.aboutSection}>
              <div style={styles.aboutContent}>
                <div style={styles.avatarPlaceholder}>
                  <img src="/ashwat.jpg" alt="Ashwat Singh" style={styles.avatarImg} />
                </div>
                <div style={styles.bio}>
                  <h3 style={styles.bioTitle}>About the Creator</h3>
                  <p style={styles.bioText}>
                    Hi, I'm <strong>Ashwat Singh</strong>. I'm 10 years old and a student at <strong>Heritage Experiential School, Gurgaon</strong>.
                    I love coding and science, and I designed this website to help people verify their websites quickly and safely.
                  </p>
                </div>
              </div>

              <div style={styles.ratingBox}>
                <p style={styles.ratingTitle}>{hasRated ? 'Thanks for your feedback!' : 'Rate our service'}</p>

                <div style={{ ...styles.stars, cursor: hasRated ? 'default' : 'pointer' }}>
                  {[1, 2, 3, 4, 5].map((s) => (
                    <span
                      key={s}
                      onClick={() => handleStarClick(s)}
                      style={{
                        ...styles.star,
                        color: s <= (hasRated ? userRating : selectedStars) ? '#fbbf24' : '#475569',
                        opacity: hasRated && s > userRating ? 0.3 : 1
                      }}
                    >
                      ★
                    </span>
                  ))}
                </div>

                {hasRated && submittedFeedback && (
                  <div style={styles.userComment}>
                    <p style={styles.commentLabel}>Your feedback:</p>
                    <p style={styles.commentText}>"{submittedFeedback}"</p>
                  </div>
                )}

                {hasRated && (
                  <button
                    onClick={() => {
                      localStorage.removeItem('fast_scanner_rated');
                      localStorage.removeItem('fast_scanner_feedback');
                      window.location.reload();
                    }}
                    style={styles.resetButton}
                  >
                    Reset Rating (for testing)
                  </button>
                )}

                <p style={styles.ratingStats}>
                  {ratingStats.count > 0 ? `${ratingStats.average} (${ratingStats.count} reviews)` : 'No reviews yet'}
                </p>
              </div>
            </section>
          </div>

          <aside style={styles.sidebar}>
            <h3 style={styles.sidebarTitle}>Recent Top Scans</h3>
            <div style={styles.scansList}>
              {recentScans.length > 0 ? recentScans.map((scan, i) => (
                <div key={i} style={styles.scanItem}>
                  <div style={{ ...styles.miniGrade, backgroundColor: getGradeColor(scan.grade) }}>{scan.grade}</div>
                  <div style={styles.scanInfo}>
                    <div style={styles.scanUrl}>{scan.url}</div>
                    <div style={styles.scanMeta}>
                      {scan.visitor_name && <span>{scan.visitor_name} • </span>}
                      {Math.round(scan.score)} points • {scan.load_time}ms
                    </div>
                  </div>
                </div>
              )) : (
                <p style={styles.emptyScans}>No scans recorded yet.</p>
              )}
            </div>
          </aside>
        </div>

        {showModal && (
          <div style={styles.modalOverlay}>
            <div style={styles.modal}>
              <div style={styles.modalIcon}>{getEmotionalIcon(selectedStars)}</div>
              <h2 style={styles.modalTitle}>We value your feedback!</h2>
              <p style={styles.modalSub}>You selected {selectedStars} stars. Tell us more (min 3 words):</p>

              <input
                type="text"
                style={styles.modalInput}
                placeholder={visitorName}
                value={visitorName}
                onChange={(e) => setVisitorName(e.target.value)}
              />

              <textarea
                style={styles.modalTextarea}
                placeholder="Site looks great and works fast..."
                value={feedback}
                onChange={(e) => setFeedback(e.target.value)}
              />

              <div style={styles.modalActions}>
                <button onClick={() => setShowModal(false)} style={styles.cancelBtn}>Cancel</button>
                <button onClick={submitRating} style={styles.saveBtn}>Submit Review</button>
              </div>
            </div>
          </div>
        )}
      </main>

      <footer style={styles.footer}>
        <p>Built with ❤️ by Aashvath</p>
      </footer>
    </div>
  );
}

const ResultCard = ({ label, value, sub }) => (
  <div style={styles.card}>
    <div style={styles.cardLabel}>{label}</div>
    <div style={styles.cardValue}>{value}</div>
    <div style={styles.cardSub}>{sub}</div>
  </div>
);

const styles = {
  container: {
    minHeight: '100vh',
    backgroundColor: '#0f172a',
    color: '#f8fafc',
    fontFamily: "'Inter', sans-serif",
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    padding: '20px',
  },
  header: {
    textAlign: 'center',
    marginBottom: '40px',
    width: '100%',
  },
  badge: {
    backgroundColor: '#1e293b',
    padding: '8px 16px',
    borderRadius: '20px',
    fontSize: '0.8rem',
    color: '#38bdf8',
    display: 'inline-flex',
    alignItems: 'center',
    gap: '8px',
    marginBottom: '16px',
    border: '1px solid #334155',
  },
  badgeIcon: {
    fontSize: '0.9rem',
  },
  title: {
    fontSize: 'clamp(2.5rem, 8vw, 3.5rem)',
    fontWeight: '800',
    marginBottom: '8px',
    letterSpacing: '-0.05em',
    lineHeight: 1.1,
  },
  accent: {
    color: '#38bdf8',
  },
  subtitle: {
    color: '#94a3b8',
    fontSize: 'clamp(1rem, 4vw, 1.25rem)',
    maxWidth: '600px',
    margin: '0 auto',
    padding: '0 10px',
  },
  statsRow: {
    display: 'flex',
    justifyContent: 'center',
    gap: '20px',
    marginTop: '24px',
    flexWrap: 'wrap',
  },
  statChip: {
    backgroundColor: '#1e293b',
    padding: '8px 16px',
    borderRadius: '12px',
    fontSize: '0.85rem',
    color: '#94a3b8',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    border: '1px solid rgba(255,255,255,0.05)',
  },
  statDot: {
    width: '8px',
    height: '8px',
    borderRadius: '50%',
    display: 'inline-block',
    boxShadow: '0 0 8px currentColor',
  },
  main: {
    width: '100%',
    maxWidth: '850px',
    display: 'flex',
    flexDirection: 'column',
    gap: '40px',
  },
  form: {
    display: 'flex',
    flexDirection: 'row',
    gap: '12px',
    width: '100%',
    flexWrap: 'wrap',
  },
  inputWrapper: {
    flex: '1 1 400px',
    display: 'flex',
  },
  input: {
    width: '100%',
    padding: '16px 20px',
    borderRadius: '12px',
    border: '2px solid #1e293b',
    backgroundColor: '#1e293b',
    color: '#fff',
    fontSize: '1rem',
    outline: 'none',
    transition: 'border-color 0.2s',
  },
  button: {
    flex: '1 1 150px',
    padding: '16px 24px',
    borderRadius: '12px',
    border: 'none',
    backgroundColor: '#38bdf8',
    color: '#0f172a',
    fontWeight: '700',
    fontSize: '1rem',
    cursor: 'pointer',
    transition: 'transform 0.1s, opacity 0.2s',
    whiteSpace: 'nowrap',
  },
  errorCard: {
    backgroundColor: '#451a1a',
    color: '#fca5a5',
    padding: '20px',
    borderRadius: '12px',
    border: '1px solid #7f1d1d',
  },
  resultsContainer: {
    width: '100%',
  },
  gradeBadge: {
    width: '60px',
    height: '60px',
    borderRadius: '12px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '1.5rem',
    fontWeight: '900',
    color: '#0f172a',
    flexShrink: 0,
    boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
  },
  layoutGroup: {
    display: 'flex',
    gap: '30px',
    flexWrap: 'wrap',
    width: '100%',
  },
  mainContent: {
    flex: '1 1 500px',
  },
  sidebar: {
    flex: '1 1 250px',
    backgroundColor: '#1e293b',
    padding: '24px',
    borderRadius: '24px',
    border: '1px solid rgba(255,255,255,0.05)',
    height: 'fit-content',
  },
  sidebarTitle: {
    fontSize: '1rem',
    fontWeight: '700',
    marginBottom: '20px',
    color: '#38bdf8',
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
  },
  scansList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  },
  scanItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '10px',
    backgroundColor: 'rgba(15, 23, 42, 0.4)',
    borderRadius: '12px',
  },
  miniGrade: {
    width: '32px',
    height: '32px',
    borderRadius: '6px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '0.8rem',
    fontWeight: '800',
    color: '#0f172a',
  },
  scanInfo: {
    flex: 1,
    overflow: 'hidden',
  },
  scanUrl: {
    fontSize: '0.85rem',
    fontWeight: '600',
    color: '#f8fafc',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  },
  scanMeta: {
    fontSize: '0.7rem',
    color: '#64748b',
  },
  emptyScans: {
    fontSize: '0.85rem',
    color: '#475569',
    textAlign: 'center',
  },
  modalOverlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.85)',
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
    borderRadius: '32px',
    maxWidth: '500px',
    width: '100%',
    textAlign: 'center',
    border: '1px solid rgba(56, 189, 248, 0.2)',
    boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
  },
  modalIcon: {
    fontSize: '4rem',
    marginBottom: '20px',
  },
  modalTitle: {
    fontSize: '1.75rem',
    fontWeight: '800',
    marginBottom: '10px',
    color: '#fff',
  },
  modalSub: {
    fontSize: '1rem',
    color: '#94a3b8',
    marginBottom: '24px',
  },
  modalInput: {
    width: '100%',
    padding: '16px 20px',
    borderRadius: '16px',
    backgroundColor: '#0f172a',
    color: '#fff',
    border: '1px solid #334155',
    fontSize: '1rem',
    outline: 'none',
    marginBottom: '16px',
  },
  modalTextarea: {
    width: '100%',
    minHeight: '120px',
    padding: '20px',
    borderRadius: '16px',
    backgroundColor: '#0f172a',
    color: '#fff',
    border: '1px solid #334155',
    fontSize: '1rem',
    outline: 'none',
    resize: 'none',
    marginBottom: '24px',
  },
  modalActions: {
    display: 'flex',
    gap: '12px',
  },
  cancelBtn: {
    flex: 1,
    padding: '14px',
    borderRadius: '12px',
    border: '1px solid #334155',
    backgroundColor: 'transparent',
    color: '#94a3b8',
    fontWeight: '600',
    cursor: 'pointer',
  },
  saveBtn: {
    flex: 2,
    padding: '14px',
    borderRadius: '12px',
    border: 'none',
    backgroundColor: '#38bdf8',
    color: '#0f172a',
    fontWeight: '700',
    cursor: 'pointer',
  },
  resultGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))',
    gap: '16px',
  },
  card: {
    backgroundColor: '#1e293b',
    padding: '20px',
    borderRadius: '16px',
    textAlign: 'center',
    border: '1px solid rgba(255,255,255,0.05)',
  },
  cardLabel: {
    color: '#94a3b8',
    fontSize: '0.8rem',
    marginBottom: '6px',
    textTransform: 'uppercase',
  },
  cardValue: {
    fontSize: '1.5rem',
    fontWeight: '700',
    color: '#38bdf8',
  },
  cardSub: {
    fontSize: '0.75rem',
    color: '#64748b',
    marginTop: '4px',
  },
  bugsSection: {
    gridColumn: '1 / -1',
    backgroundColor: '#1e293b',
    padding: '20px',
    borderRadius: '16px',
    border: '1px solid rgba(255,165,165,0.05)',
  },
  sectionTitle: {
    fontSize: '1.1rem',
    fontWeight: '700',
    marginBottom: '12px',
    color: '#f8fafc',
  },
  bugList: {
    listStyle: 'none',
    padding: 0,
    margin: 0,
  },
  bugItem: {
    color: '#fca5a5',
    marginBottom: '8px',
    padding: '10px',
    backgroundColor: 'rgba(252, 165, 165, 0.05)',
    borderRadius: '8px',
    fontSize: '0.9rem',
  },
  successText: {
    color: '#4ade80',
    fontWeight: '600',
    fontSize: '0.9rem',
  },
  aboutSection: {
    padding: '30px',
    backgroundColor: 'rgba(30, 41, 59, 0.5)',
    borderRadius: '24px',
    border: '1px solid rgba(56, 189, 248, 0.1)',
    display: 'flex',
    flexDirection: 'column',
    gap: '24px',
  },
  aboutContent: {
    display: 'flex',
    alignItems: 'center',
    gap: '24px',
    flexWrap: 'wrap',
    justifyContent: 'center',
  },
  avatarPlaceholder: {
    width: '100px',
    height: '100px',
    borderRadius: '50%',
    overflow: 'hidden',
    border: '3px solid #38bdf8',
    backgroundColor: '#1e293b',
    flexShrink: 0,
  },
  avatarImg: {
    width: '100%',
    height: '100%',
    objectFit: 'cover',
  },
  bio: {
    flex: '1 1 250px',
    textAlign: 'left',
  },
  bioTitle: {
    fontSize: '1.25rem',
    fontWeight: '700',
    marginBottom: '8px',
    color: '#f8fafc',
  },
  bioText: {
    fontSize: '0.95rem',
    lineHeight: '1.5',
    color: '#94a3b8',
    margin: 0,
  },
  ratingBox: {
    textAlign: 'center',
    paddingTop: '24px',
    borderTop: '1px solid rgba(255, 255, 255, 0.05)',
  },
  ratingTitle: {
    fontSize: '0.85rem',
    fontWeight: '600',
    marginBottom: '12px',
    color: '#64748b',
    textTransform: 'uppercase',
  },
  stars: {
    fontSize: '2rem',
    display: 'flex',
    justifyContent: 'center',
    gap: '8px',
    cursor: 'pointer',
  },
  star: {
    transition: 'transform 0.1s',
  },
  ratingStats: {
    marginTop: '8px',
    color: '#475569',
    fontSize: '0.85rem',
  },
  feedbackContainer: {
    width: '100%',
    marginBottom: '15px',
  },
  feedbackInput: {
    width: '100%',
    minHeight: '80px',
    padding: '12px',
    borderRadius: '12px',
    backgroundColor: '#1e293b',
    color: '#fff',
    border: '1px solid #334155',
    fontSize: '0.9rem',
    outline: 'none',
    resize: 'vertical',
  },
  userComment: {
    marginTop: '15px',
    padding: '12px',
    backgroundColor: 'rgba(56, 189, 248, 0.05)',
    borderRadius: '12px',
    textAlign: 'left',
    borderLeft: '4px solid #38bdf8',
  },
  commentLabel: {
    fontSize: '0.75rem',
    color: '#64748b',
    fontWeight: '700',
    marginBottom: '4px',
    textTransform: 'uppercase',
  },
  commentText: {
    fontSize: '0.9rem',
    color: '#cbd5e1',
    fontStyle: 'italic',
    margin: 0,
  },
  resetButton: {
    marginTop: '15px',
    backgroundColor: 'transparent',
    color: '#64748b',
    border: '1px solid #334155',
    padding: '6px 12px',
    borderRadius: '8px',
    fontSize: '0.75rem',
    cursor: 'pointer',
    transition: 'all 0.2s',
  },
  footer: {
    marginTop: 'auto',
    paddingTop: '60px',
    textAlign: 'center',
    color: '#475569',
    fontSize: '0.85rem',
    width: '100%',
  }
};

export default App;
