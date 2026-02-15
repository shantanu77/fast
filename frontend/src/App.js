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
  const [recentFeedback, setRecentFeedback] = useState([]);
  const [showModal, setShowModal] = useState(false);

  // Helper for plain language explanation
  const getScoreExplanation = (score) => {
    if (score >= 90) return "🚀 Excellent! Your site is fast and optimized.";
    if (score >= 75) return "✅ Good. Requires only minor tweaks.";
    if (score >= 50) return "⚠️ Fair. Several performance issues found.";
    return "❌ Poor. Critical optimization needed immediately.";
  };
  const [currentScanId, setCurrentScanId] = useState(() => {
    const saved = localStorage.getItem('fast_scanner_last_id');
    if (saved === 'null' || saved === 'undefined' || !saved) return null;
    return saved;
  });
  const [selectedStars, setSelectedStars] = useState(0);
  const [visitorName, setVisitorName] = useState('');
  const [stats, setStats] = useState({ live_users: 0, total_users: 0, total_reviews: 0 });
  const [captcha, setCaptcha] = useState({ id: null, question: '' });
  const [captchaAnswer, setCaptchaAnswer] = useState('');

  // Click sound feedback
  const playClick = () => {
    try {
      const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      const oscillator = audioCtx.createOscillator();
      const gainNode = audioCtx.createGain();

      oscillator.type = 'sine';
      oscillator.frequency.setValueAtTime(800, audioCtx.currentTime);
      oscillator.frequency.exponentialRampToValueAtTime(40, audioCtx.currentTime + 0.08);

      gainNode.gain.setValueAtTime(0.1, audioCtx.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.08);

      oscillator.connect(gainNode);
      gainNode.connect(audioCtx.destination);

      oscillator.start();
      oscillator.stop(audioCtx.currentTime + 0.08);
      // Close context to prevent too many open contexts
      setTimeout(() => audioCtx.close(), 200);
    } catch (e) {
      console.error("Audio failed", e);
    }
  };

  const playLaunchSound = () => {
    try {
      const audioCtx = new (window.AudioContext || window.webkitAudioContext)();

      // First high-pitched sharp ping
      const osc1 = audioCtx.createOscillator();
      const gain1 = audioCtx.createGain();

      osc1.type = 'sine';
      osc1.frequency.setValueAtTime(1200, audioCtx.currentTime);
      osc1.frequency.exponentialRampToValueAtTime(600, audioCtx.currentTime + 0.1);

      gain1.gain.setValueAtTime(0.2, audioCtx.currentTime);
      gain1.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.15);

      osc1.connect(gain1);
      gain1.connect(audioCtx.destination);

      // Secondary resonant "tail" for more impact
      const osc2 = audioCtx.createOscillator();
      const gain2 = audioCtx.createGain();

      osc2.type = 'triangle';
      osc2.frequency.setValueAtTime(400, audioCtx.currentTime + 0.05);
      osc2.frequency.exponentialRampToValueAtTime(20, audioCtx.currentTime + 0.25);

      gain2.gain.setValueAtTime(0, audioCtx.currentTime);
      gain2.gain.linearRampToValueAtTime(0.05, audioCtx.currentTime + 0.05);
      gain2.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.3);

      osc2.connect(gain2);
      gain2.connect(audioCtx.destination);

      osc1.start();
      osc1.stop(audioCtx.currentTime + 0.15);

      osc2.start(audioCtx.currentTime + 0.05);
      osc2.stop(audioCtx.currentTime + 0.3);

      setTimeout(() => audioCtx.close(), 400);
    } catch (e) {
      console.error("Launch audio failed", e);
    }
  };

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

  const fetchRecentFeedback = async () => {
    try {
      const response = await fetch('/api/recent-feedback');
      const data = await response.json();
      setRecentFeedback(data);
    } catch (err) {
      console.error("Failed to fetch recent feedback", err);
    }
  };

  const fetchStats = async () => {
    try {
      const response = await fetch('/api/stats');
      const data = await response.json();
      setStats(data);

      // Sync rating stats with global stats
      if (data.total_reviews !== undefined && data.average_rating !== undefined) {
        setRatingStats({
          average: data.average_rating,
          count: data.total_reviews
        });
      }
    } catch (err) {
      console.error("Failed to fetch stats", err);
    }
  };

  React.useEffect(() => {
    fetchRecentScans();
    fetchRecentFeedback();
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

  const formatRelativeTime = (timestamp) => {
    if (!timestamp) return '';
    const now = Date.now() / 1000;
    const diff = now - timestamp;

    if (diff < 60) return 'Just now';
    if (diff < 3600) return `${Math.floor(diff / 60)} minutes ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)} hours ago`;
    if (diff < 172800) return 'Yesterday'; // Less than 2 days
    if (diff < 604800) return `${Math.floor(diff / 86400)} days ago`; // Less than 7 days

    // For older dates, show actual date
    const date = new Date(timestamp * 1000);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
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

    // URL Sanitization
    let inputUrl = url.trim();
    // Remove protocol
    inputUrl = inputUrl.replace(/^https?:\/\//i, '');
    // Remove trailing slash
    inputUrl = inputUrl.replace(/\/$/, '');

    // Basic validation
    if (!inputUrl.includes('.') || inputUrl.includes(' ')) {
      setError('Please enter a valid website domain (e.g., google.com)');
      return;
    }

    const finalUrl = 'https://' + inputUrl;

    setLoading(true);
    setError(null);
    setResult(null);

    playLaunchSound();
    try {
      const response = await fetch('/api/scan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: finalUrl }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || `Server error: ${response.status}`);
      }
      setResult(data);
      setCurrentScanId(data.id);
      localStorage.setItem('fast_scanner_last_id', data.id);
      fetchRecentScans();
    } catch (err) {
      console.error("Scan request failed:", err);
      if (err.message === 'Failed to fetch') {
        setError('Failed to connect to the backend server. Please ensure the backend is running and you have a stable internet connection.');
      } else {
        setError(err.message);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleStarClick = async (stars) => {
    playClick();
    if (hasRated) return;

    // Fetch a new captcha whenever modal opens
    try {
      const response = await fetch('/api/captcha');
      const data = await response.json();
      setCaptcha(data);
    } catch (err) {
      console.error("Failed to fetch captcha", err);
    }

    setSelectedStars(stars);
    setVisitorName(generateRandomName());
    setShowModal(true);
  };

  const submitRating = async () => {
    playClick();
    // Check feedback word count
    const words = feedback.trim().split(/\s+/).filter(w => w.length > 0);
    if (words.length < 3) {
      alert("Please enter at least 3 words in your feedback!");
      return;
    }

    if (!captchaAnswer) {
      alert("Please solve the math challenge! 🤖");
      return;
    }

    try {
      const payload = {
        scan_id: currentScanId,
        rating: selectedStars,
        comment: feedback,
        visitor_name: visitorName.trim() || generateRandomName(),
        captcha_id: captcha.id,
        captcha_answer: captchaAnswer
      };
      console.log("DEBUG: Submitting rating with payload:", JSON.stringify(payload, null, 2));

      const response = await fetch('/api/rate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await response.json();
      if (data.success) {
        setRatingStats({ average: data.average_rating, count: data.total_ratings });
        setHasRated(true);
        setSubmittedFeedback(feedback);
        setShowModal(false);
        setCaptchaAnswer(''); // Clear for security
        fetchRecentFeedback(); // Update feedback list
        // Also update scans in case it was a scan rating
        if (currentScanId) fetchRecentScans();

        localStorage.setItem('fast_scanner_rated', 'true');
        localStorage.setItem('fast_scanner_feedback', feedback);
        window.scrollTo({ top: 0, behavior: 'smooth' });
      } else if (data.error) {
        alert(data.error);
        // Refresh captcha on error
        const capRes = await fetch('/api/captcha');
        const capData = await capRes.json();
        setCaptcha(capData);
        setCaptchaAnswer('');
      }
    } catch (err) {
      console.error("Failed to submit rating", err);
    }
  };

  return (
    <div style={styles.container}>
      <header style={styles.header}>
        <div style={styles.badge} className="animate-fade-in">
          <span style={styles.badgeIcon}>🛡️</span> Trusted by Ashwat Singh
        </div>
        <h1 style={styles.title} className="animate-fade-in">Fast <span style={styles.accent}>Scanner</span></h1>
        <p className="animate-fade-in" style={{ ...styles.subtitle, animationDelay: '0.1s' }}>High-performance website security and speed analysis.</p>

        <div className="animate-fade-in" style={{ ...styles.statsRow, animationDelay: '0.2s' }}>
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
        <form onSubmit={handleScan} className="animate-fade-in" style={{ ...styles.form, animationDelay: '0.3s' }}>
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
            {loading ? 'Analyzing...' : 'Launch Scan 🚀'}
          </button>
        </form>

        {error && <div style={styles.errorCard}>{error}</div>}

        {result && (
          <div style={styles.resultsContainer} className="glass-card animate-fade-in">
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
              <div style={styles.card} className="card-hover">
                <div style={styles.cardLabel}>Performance Score</div>
                <div style={styles.cardValue}>{Math.round(result.performance_score)}/100</div>
                <div style={styles.cardSub}>{getScoreExplanation(result.performance_score)}</div>
              </div>

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
                      onClick={() => { playClick(); handleStarClick(s); }}
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
                      playClick();
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
        </div>

        {recentScans.length > 0 && (
          <section style={styles.historySection}>
            <div style={styles.historyHeader}>
              <h3 style={styles.historyTitle}>Global Scan History</h3>
              <p style={styles.historySubtitle}>Real-time website security & speed analysis</p>
            </div>

            <div style={styles.tableWrapper} className="desktop-table">
              <table style={styles.table}>
                <thead>
                  <tr>
                    <th style={styles.th}>Website</th>
                    <th style={styles.th}>Grade</th>
                    <th style={styles.th}>Performance</th>
                    <th style={styles.th}>Time</th>
                  </tr>
                </thead>
                <tbody>
                  {recentScans.map((scan) => (
                    <tr key={scan.id} style={styles.tr}>
                      <td style={{ ...styles.td, fontWeight: '500' }}>
                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                          <span style={{ color: '#f8fafc' }}>
                            {scan.url === 'General Feedback' ? 'N/A' : new URL(scan.url).hostname}
                          </span>
                          {scan.visitor_name && (
                            <span style={{ fontSize: '0.8rem', color: '#94a3b8', marginTop: '2px' }}>
                              Ran by {scan.visitor_name}
                            </span>
                          )}
                        </div>
                      </td>
                      <td style={styles.td}>
                        {scan.grade && scan.grade !== 'N/A' ? (
                          <span style={{
                            ...styles.gradeTag,
                            backgroundColor: getGradeColor(scan.grade),
                            color: '#0f172a'
                          }}>
                            {scan.grade}
                          </span>
                        ) : (
                          <span style={{ color: '#64748b' }}>-</span>
                        )}
                      </td>
                      <td style={styles.td}>
                        {scan.score ? (
                          <span style={{ color: scan.score >= 90 ? '#4ade80' : scan.score >= 50 ? '#fbbf24' : '#f87171' }}>
                            {scan.score}
                          </span>
                        ) : '-'}
                      </td>
                      <td style={{ ...styles.td, color: '#64748b', fontSize: '0.85rem' }}>
                        {formatRelativeTime(scan.timestamp)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="mobile-cards">
              {recentScans.map((scan) => (
                <div key={scan.id} className="mobile-scan-card">
                  <div className="mobile-card-header">
                    <span style={{ color: '#f8fafc', fontWeight: '600' }}>
                      {scan.url === 'General Feedback' ? 'N/A' : new URL(scan.url).hostname}
                    </span>
                    {scan.grade && scan.grade !== 'N/A' ? (
                      <span style={{
                        ...styles.gradeTag,
                        backgroundColor: getGradeColor(scan.grade),
                        color: '#0f172a',
                        fontSize: '0.7rem',
                        padding: '2px 8px',
                        minWidth: 'auto'
                      }}>
                        {scan.grade}
                      </span>
                    ) : null}
                  </div>
                  <div className="mobile-card-row">
                    <span className="mobile-label">Performance</span>
                    <span style={{ color: scan.score >= 90 ? '#4ade80' : scan.score >= 50 ? '#fbbf24' : '#f87171' }}>
                      {scan.score ? scan.score : '-'}
                    </span>
                  </div>
                  <div className="mobile-card-row">
                    <span className="mobile-label">Visitor</span>
                    <span>{scan.visitor_name || 'Anonymous'}</span>
                  </div>
                  <div className="mobile-card-row">
                    <span className="mobile-label">Time</span>
                    <span>{formatRelativeTime(scan.timestamp)}</span>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {recentFeedback.length > 0 && (
          <section style={{ ...styles.historySection, marginTop: '40px' }}>
            <div style={styles.historyHeader}>
              <h3 style={styles.historyTitle}>Community Feedback</h3>
              <p style={styles.historySubtitle}>What people are saying about Fast Scanner</p>
            </div>

            <div style={styles.feedbackGrid}>
              {recentFeedback.map((item) => (
                <div key={item.id} style={styles.feedbackCard}>
                  <div style={styles.feedbackHeader}>
                    <div style={styles.feedbackUser}>
                      <div style={styles.feedbackAvatar}>{item.visitor_name.charAt(0)}</div>
                      <div>
                        <div style={styles.feedbackName}>{item.visitor_name}</div>
                        <div style={styles.feedbackTime}>{formatRelativeTime(item.timestamp)}</div>
                      </div>
                    </div>
                    <div style={styles.feedbackStars}>
                      {'★'.repeat(item.rating)}
                      <span style={{ color: '#334155' }}>{'★'.repeat(5 - item.rating)}</span>
                    </div>
                  </div>
                  <div style={styles.feedbackMsg}>"{item.comment}"</div>
                </div>
              ))}
            </div>
          </section>
        )}

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

              <div style={styles.captchaSection}>
                <p style={styles.captchaQuestion}>🔒 Security Check: {captcha.question || 'Loading...'}</p>
                <input
                  type="text"
                  placeholder="Your answer"
                  style={styles.captchaInput}
                  value={captchaAnswer}
                  onChange={(e) => setCaptchaAnswer(e.target.value)}
                />
              </div>

              <div style={styles.modalActions}>
                <button onClick={() => { playClick(); setShowModal(false); }} style={styles.cancelBtn}>Cancel</button>
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
  <div style={styles.card} className="card-hover">
    <div style={styles.cardLabel}>{label}</div>
    <div style={styles.cardValue}>{value}</div>
    <div style={styles.cardSub}>{sub}</div>
  </div>
);

const styles = {
  container: {
    minHeight: '100vh',
    color: '#f8fafc',
    fontFamily: "'Outfit', sans-serif",
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    padding: '40px 20px',
  },
  header: {
    textAlign: 'center',
    marginBottom: '60px',
    width: '100%',
  },
  badge: {
    background: 'rgba(30, 41, 59, 0.4)',
    backdropFilter: 'blur(10px)',
    padding: '10px 20px',
    borderRadius: '30px',
    fontSize: '0.85rem',
    color: '#38bdf8',
    display: 'inline-flex',
    alignItems: 'center',
    gap: '10px',
    marginBottom: '24px',
    border: '1px solid rgba(56, 189, 248, 0.2)',
    fontWeight: '600',
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
    padding: '20px 28px',
    borderRadius: '16px',
    border: '1px solid rgba(255, 255, 255, 0.1)',
    backgroundColor: 'rgba(30, 41, 59, 0.5)',
    backdropFilter: 'blur(10px)',
    color: '#fff',
    fontSize: '1.1rem',
    outline: 'none',
    transition: 'all 0.3s',
  },
  button: {
    flex: '1 1 150px',
    padding: '16px 24px',
    borderRadius: '12px',
    border: 'none',
    background: 'linear-gradient(135deg, #38bdf8 0%, #818cf8 100%)',
    color: '#0f172a',
    fontWeight: '800',
    fontSize: '1.05rem',
    cursor: 'pointer',
    boxShadow: '0 4px 14px 0 rgba(56, 189, 248, 0.39)',
    whiteSpace: 'nowrap',
    textTransform: 'uppercase',
    letterSpacing: '0.025em',
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
  historySection: {
    width: '100%',
    backgroundColor: '#1e293b',
    borderRadius: '24px',
    padding: 'clamp(16px, 4vw, 30px)',
    border: '1px solid rgba(255,255,255,0.05)',
    boxShadow: '0 10px 30px -10px rgba(0,0,0,0.5)',
  },
  historyHeader: {
    marginBottom: '24px',
  },
  historyTitle: {
    fontSize: '1.25rem',
    fontWeight: '800',
    color: '#f8fafc',
    marginBottom: '4px',
  },
  historySubtitle: {
    fontSize: '0.9rem',
    color: '#64748b',
    margin: 0,
  },
  tableWrapper: {
    overflowX: 'auto',
    borderRadius: '12px',
    backgroundColor: 'rgba(15, 23, 42, 0.4)',
    width: '100%',
    display: 'block',
    WebkitOverflowScrolling: 'touch',
    border: '1px solid rgba(255,255,255,0.05)',
    scrollbarWidth: 'thin', /* Firefox */
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse',
    textAlign: 'left',
    fontSize: '0.9rem',
  },
  th: {
    padding: '16px 20px',
    color: '#94a3b8',
    fontWeight: '600',
    borderBottom: '1px solid #334155',
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
    fontSize: '0.75rem',
  },
  tr: {
    borderBottom: '1px solid rgba(51, 65, 85, 0.5)',
    transition: 'background-color 0.2s',
  },
  td: {
    padding: '16px 20px',
    color: '#e2e8f0',
    fontSize: '0.95rem',
    whiteSpace: 'nowrap', // Prevent text wrapping breaking layout
  },
  feedbackGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
    gap: '20px',
  },
  feedbackCard: {
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
    borderRadius: '16px',
    padding: '20px',
    border: '1px solid rgba(255,255,255,0.05)',
  },
  feedbackHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: '12px',
  },
  feedbackUser: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
  },
  feedbackAvatar: {
    width: '32px',
    height: '32px',
    borderRadius: '50%',
    backgroundColor: '#38bdf8',
    color: '#0f172a',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontWeight: 'bold',
    fontSize: '0.9rem',
  },
  feedbackName: {
    fontSize: '0.95rem',
    fontWeight: '600',
    color: '#f8fafc',
  },
  feedbackTime: {
    fontSize: '0.75rem',
    color: '#64748b',
  },
  feedbackStars: {
    color: '#fbbf24',
    fontSize: '0.9rem',
  },
  feedbackMsg: {
    fontSize: '0.95rem',
    color: '#cbd5e1',
    lineHeight: '1.5',
    fontStyle: 'italic',
  },
  urlCell: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    fontWeight: '600',
    color: '#38bdf8',
    maxWidth: '300px',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  favicon: {
    width: '16px',
    height: '16px',
    borderRadius: '4px',
  },
  gradeTag: {
    display: 'inline-flex',
    padding: '4px 10px',
    borderRadius: '6px',
    fontSize: '0.75rem',
    fontWeight: '800',
    color: '#0f172a',
    minWidth: '35px',
    justifyContent: 'center',
  },
  scoreText: {
    fontWeight: '700',
    color: '#f8fafc',
  },
  emptyTable: {
    padding: '40px',
    textAlign: 'center',
    color: '#475569',
    fontSize: '0.9rem',
  },
  layoutGroup: {
    display: 'flex',
    gap: '30px',
    flexWrap: 'wrap',
    width: '100%',
  },
  mainContent: {
    flex: '1 1 100%',
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
  captchaSection: {
    backgroundColor: 'rgba(56, 189, 248, 0.05)',
    padding: '16px',
    borderRadius: '16px',
    marginBottom: '24px',
    border: '1px solid rgba(56, 189, 248, 0.1)',
    textAlign: 'left',
  },
  captchaQuestion: {
    fontSize: '0.9rem',
    color: '#38bdf8',
    fontWeight: '700',
    marginBottom: '8px',
    margin: 0,
  },
  captchaInput: {
    width: '100%',
    padding: '10px 14px',
    borderRadius: '8px',
    backgroundColor: '#0f172a',
    color: '#fff',
    border: '1px solid #334155',
    fontSize: '1rem',
    outline: 'none',
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
    background: 'rgba(30, 41, 59, 0.4)',
    backdropFilter: 'blur(8px)',
    WebkitBackdropFilter: 'blur(8px)',
    padding: '24px 20px',
    borderRadius: '20px',
    textAlign: 'center',
    border: '1px solid rgba(255, 255, 255, 0.08)',
    transition: 'transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)',
  },
  cardLabel: {
    color: '#94a3b8',
    fontSize: '0.75rem',
    fontWeight: '600',
    marginBottom: '8px',
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
  },
  cardValue: {
    fontSize: '1.75rem',
    fontWeight: '800',
    color: '#38bdf8',
    marginBottom: '4px',
  },
  cardSub: {
    fontSize: '0.8rem',
    color: '#64748b',
    lineHeight: '1.3',
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
