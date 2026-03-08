import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area 
} from 'recharts';

function DomainPage() {
  const { domain } = useParams();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [comment, setComment] = useState('');
  const [visitorName, setVisitorName] = useState('');
  const [captcha, setCaptcha] = useState({ id: '', question: '' });
  const [captchaAnswer, setCaptchaAnswer] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');

  const API_BASE = process.env.REACT_APP_API_URL || '';

  useEffect(() => {
    fetchDomainData();
    fetchCaptcha();
  }, [domain]);

  const fetchDomainData = async () => {
    try {
      setLoading(true);
      const res = await fetch(`${API_BASE}/api/domain/${domain}`);
      if (!res.ok) throw new Error('Domain not found or no scan history.');
      const json = await res.json();
      setData(json);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchCaptcha = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/captcha`);
      const json = await res.json();
      setCaptcha(json);
    } catch (err) {
      console.error('Failed to fetch captcha', err);
    }
  };

  const handleCommentSubmit = async (e) => {
    e.preventDefault();
    if (!comment.trim()) return;
    
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch(`${API_BASE}/api/domain/${domain}/comment`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          visitor_name: visitorName,
          comment,
          captcha_id: captcha.id,
          captcha_answer: captchaAnswer
        })
      });
      
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Failed to post comment');
      
      setSuccessMsg('Comment posted successfully!');
      setComment('');
      setCaptchaAnswer('');
      fetchCaptcha();
      fetchDomainData(); // Refresh comments
      setTimeout(() => setSuccessMsg(''), 3000);
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return (
    <div style={styles.loadingContainer}>
      <div style={styles.spinner}></div>
      <p>Loading intelligence for {domain}...</p>
    </div>
  );

  if (error && !data) return (
    <div style={styles.errorContainer}>
      <h2>Domain Not Scanned Yet</h2>
      <p>{error}</p>
      <Link to="/" style={styles.backLink}>← Back to Scanner</Link>
    </div>
  );

  const chartData = data?.history.map(h => ({
    time: new Date(h.timestamp * 1000).toLocaleDateString(),
    score: Math.round(h.score)
  }));

  const getGradeColor = (grade) => {
    if (!grade) return '#475569';
    if (grade.startsWith('A')) return '#4ade80';
    if (grade.startsWith('B')) return '#fbbf24';
    if (grade.startsWith('C')) return '#f97316';
    return '#f87171';
  };

  return (
    <div style={styles.container}>
      <header style={styles.header}>
        <Link to="/" style={styles.homeLink}>← Back</Link>
        <div style={styles.domainHeader}>
          <img 
            src={`https://www.google.com/s2/favicons?domain=${domain}&sz=64`} 
            alt="" 
            style={styles.favicon} 
          />
          <div>
            <h1 style={styles.title}>{domain}</h1>
            <p style={styles.subtitle}>Historical Performance & Security Audit</p>
          </div>
        </div>
      </header>

      <div style={styles.mainGrid}>
        {/* Left Column: Latest Status */}
        <div style={styles.statusCol}>
          <div style={styles.statusCard}>
            <div style={{ ...styles.gradeBadge, backgroundColor: getGradeColor(data.latest.grade) }}>
              {data.latest.grade}
            </div>
            <div style={styles.scoreInfo}>
              <h2 style={styles.scoreValue}>{Math.round(data.latest.score)}/100</h2>
              <p style={styles.scoreLabel}>Performance Intelligence</p>
            </div>
          </div>

          <div style={styles.metricsList}>
            <div style={styles.metricItem}>
              <span>Latest Load Time</span>
              <span style={styles.metricValue}>{Math.round(data.latest.load_time)} ms</span>
            </div>
            <div style={styles.metricItem}>
              <span>Safety Rating</span>
              <span style={{ 
                ...styles.metricValue, 
                color: data.latest.kids_safety_rating === 'SAFE_FOR_ALL' ? '#4ade80' : '#fbbf24' 
              }}>
                {data.latest.kids_safety_rating?.replace('_', ' ') || 'Unknown'}
              </span>
            </div>
            <div style={styles.metricItem}>
              <span>Total Scans</span>
              <span style={styles.metricValue}>{data.history.length}</span>
            </div>
          </div>
        </div>

        {/* Right Column: Chart */}
        <div style={styles.chartCol}>
          <div style={styles.cardHeader}>
            <h3 style={styles.cardTitle}>Performance Trend</h3>
            <p style={styles.cardSub}>Score variations over time</p>
          </div>
          <div style={styles.chartWrapper}>
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="colorScore" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#38bdf8" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#38bdf8" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                <XAxis 
                  dataKey="time" 
                  stroke="#64748b" 
                  fontSize={12} 
                  tickLine={false} 
                  axisLine={false} 
                />
                <YAxis 
                  domain={[0, 100]} 
                  stroke="#64748b" 
                  fontSize={12} 
                  tickLine={false} 
                  axisLine={false} 
                />
                <Tooltip 
                  contentStyle={styles.tooltip} 
                  itemStyle={{ color: '#38bdf8' }}
                  cursor={{ stroke: '#38bdf820', strokeWidth: 2 }}
                />
                <Area 
                  type="monotone" 
                  dataKey="score" 
                  stroke="#38bdf8" 
                  strokeWidth={3}
                  fillOpacity={1} 
                  fill="url(#colorScore)" 
                  animationDuration={1500}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Bottom Section: Comments */}
      <div style={styles.commentsSection}>
        <div style={styles.commentGrid}>
          <div style={styles.newCommentBox}>
            <h3 style={styles.sectionTitle}>Join the Community</h3>
            <p style={styles.sectionSub}>Share your insights about this website</p>
            
            <form onSubmit={handleCommentSubmit} style={styles.form}>
              <input 
                type="text" 
                placeholder="Your Name (optional)" 
                value={visitorName}
                onChange={(e) => setVisitorName(e.target.value)}
                style={styles.input}
              />
              <textarea 
                placeholder="Write your observation..." 
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                style={styles.textarea}
                required
              />
              
              <div style={styles.captchaBox}>
                <div style={styles.captchaQuestion}>
                  <span>🔒 Security: {captcha.question}</span>
                </div>
                <input 
                  type="text" 
                  placeholder="Answer" 
                  value={captchaAnswer}
                  onChange={(e) => setCaptchaAnswer(e.target.value)}
                  style={styles.captchaInput}
                  required
                />
                <button 
                  type="button" 
                  onClick={fetchCaptcha} 
                  style={styles.refreshBtn}
                  title="New Captcha"
                >
                  🔄
                </button>
              </div>

              {error && <p style={styles.errorMsg}>{error}</p>}
              {successMsg && <p style={styles.successMsg}>{successMsg}</p>}

              <button 
                type="submit" 
                disabled={submitting} 
                style={styles.submitBtn}
              >
                {submitting ? 'Posting...' : 'Post Security Note →'}
              </button>
            </form>
          </div>

          <div style={styles.commentsList}>
            <h3 style={styles.sectionTitle}>Observations ({data.comments.length})</h3>
            {data.comments.length === 0 ? (
              <p style={styles.noComments}>No observations yet. Be the first to share!</p>
            ) : (
              data.comments.map(c => (
                <div key={c.id} style={styles.commentCard} className="glass-card">
                  <div style={styles.commentHeader}>
                    <span style={styles.commentUser}>{c.visitor_name || 'Anonymous'}</span>
                    <span style={styles.commentDate}>{new Date(c.timestamp * 1000).toLocaleDateString()}</span>
                  </div>
                  <p style={styles.commentText}>{c.comment}</p>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

const styles = {
  container: {
    maxWidth: '1200px',
    margin: '0 auto',
    padding: '40px 20px',
    color: '#f8fafc',
    minHeight: '100vh',
    display: 'flex',
    flexDirection: 'column',
    gap: '30px',
  },
  loadingContainer: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    height: '80vh',
    color: '#38bdf8',
    gap: '20px'
  },
  spinner: {
    width: '40px',
    height: '40px',
    border: '3px solid rgba(56, 189, 248, 0.1)',
    borderTopColor: '#38bdf8',
    borderRadius: '50%',
    animation: 'spin 1s linear infinite'
  },
  errorContainer: {
    textAlign: 'center',
    padding: '80px 20px'
  },
  backLink: {
    color: '#38bdf8',
    textDecoration: 'none',
    display: 'inline-block',
    marginTop: '20px'
  },
  header: {
    display: 'flex',
    flexDirection: 'column',
    gap: '20px'
  },
  homeLink: {
    color: '#64748b',
    textDecoration: 'none',
    fontSize: '0.9rem',
    fontWeight: '600',
    transition: 'color 0.2s'
  },
  domainHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '20px',
    backgroundColor: 'rgba(30, 41, 59, 0.4)',
    padding: '30px',
    borderRadius: '24px',
    border: '1px solid rgba(255,255,255,0.05)',
    backdropFilter: 'blur(10px)'
  },
  favicon: {
    width: '64px',
    height: '64px',
    borderRadius: '16px',
    boxShadow: '0 8px 30px rgba(0,0,0,0.3)'
  },
  title: {
    fontSize: '2.5rem',
    margin: 0,
    fontWeight: '800',
    letterSpacing: '-1px'
  },
  subtitle: {
    color: '#38bdf8',
    margin: 0,
    fontWeight: '500',
    fontSize: '1rem',
    opacity: 0.8
  },
  mainGrid: {
    display: 'grid',
    gridTemplateColumns: '1fr 2fr',
    gap: '30px',
    '@media (maxWidth: 900px)': {
      gridTemplateColumns: '1fr'
    }
  },
  statusCol: {
    display: 'flex',
    flexDirection: 'column',
    gap: '20px'
  },
  statusCard: {
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
    padding: '40px',
    borderRadius: '24px',
    border: '1px solid rgba(255,255,255,0.05)',
    textAlign: 'center',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '20px'
  },
  gradeBadge: {
    width: '80px',
    height: '80px',
    borderRadius: '24px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '2rem',
    fontWeight: '900',
    color: '#0f172a',
    boxShadow: '0 10px 40px rgba(0,0,0,0.2)'
  },
  scoreInfo: {
    display: 'flex',
    flexDirection: 'column',
    gap: '4px'
  },
  scoreValue: {
    fontSize: '2.5rem',
    margin: 0,
    fontWeight: '800'
  },
  scoreLabel: {
    color: '#64748b',
    fontSize: '0.9rem',
    margin: 0
  },
  metricsList: {
    backgroundColor: 'rgba(15, 23, 42, 0.3)',
    borderRadius: '24px',
    padding: '20px',
    display: 'flex',
    flexDirection: 'column',
    gap: '12px'
  },
  metricItem: {
    display: 'flex',
    justifyContent: 'space-between',
    padding: '12px',
    borderBottom: '1px solid rgba(255,255,255,0.05)',
    fontSize: '0.95rem',
    color: '#94a3b8'
  },
  metricValue: {
    color: '#f8fafc',
    fontWeight: '600'
  },
  chartCol: {
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
    padding: '30px',
    borderRadius: '24px',
    border: '1px solid rgba(255,255,255,0.05)',
    display: 'flex',
    flexDirection: 'column',
    gap: '20px'
  },
  cardHeader: {
    marginBottom: '10px'
  },
  cardTitle: {
    margin: 0,
    fontSize: '1.25rem',
    fontWeight: '700'
  },
  cardSub: {
    color: '#64748b',
    margin: 0,
    fontSize: '0.85rem'
  },
  chartWrapper: {
    width: '100%',
    padding: '20px 0'
  },
  tooltip: {
    backgroundColor: '#0f172a',
    border: '1px solid rgba(56, 189, 248, 0.2)',
    borderRadius: '12px',
    padding: '12px'
  },
  commentsSection: {
    marginTop: '20px'
  },
  commentGrid: {
    display: 'grid',
    gridTemplateColumns: '1fr 1.5fr',
    gap: '40px',
    '@media (maxWidth: 900px)': {
      gridTemplateColumns: '1fr'
    }
  },
  sectionTitle: {
    margin: '0 0 8px 0',
    fontSize: '1.5rem',
    fontWeight: '700'
  },
  sectionSub: {
    color: '#64748b',
    margin: '0 0 24px 0',
    fontSize: '0.95rem'
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: '15px',
    backgroundColor: 'rgba(15, 23, 42, 0.4)',
    padding: '30px',
    borderRadius: '24px',
    border: '1px solid rgba(255,255,255,0.05)'
  },
  input: {
    backgroundColor: 'rgba(2, 6, 23, 0.5)',
    border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: '12px',
    padding: '12px 16px',
    color: '#f8fafc',
    outline: 'none',
    transition: 'border-color 0.2s',
    '&:focus': {
      borderColor: '#38bdf8'
    }
  },
  textarea: {
    backgroundColor: 'rgba(2, 6, 23, 0.5)',
    border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: '12px',
    padding: '12px 16px',
    color: '#f8fafc',
    minHeight: '120px',
    resize: 'vertical',
    outline: 'none',
    '&:focus': {
      borderColor: '#38bdf8'
    }
  },
  captchaBox: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    backgroundColor: 'rgba(56, 189, 248, 0.05)',
    padding: '12px',
    borderRadius: '12px',
    border: '1px solid rgba(56, 189, 248, 0.1)'
  },
  captchaQuestion: {
    flex: 1,
    fontSize: '0.9rem',
    color: '#38bdf8',
    fontWeight: '600'
  },
  captchaInput: {
    width: '80px',
    backgroundColor: 'rgba(2, 6, 23, 0.8)',
    border: '1px solid rgba(56, 189, 248, 0.2)',
    borderRadius: '8px',
    padding: '8px',
    color: '#f8fafc',
    textAlign: 'center'
  },
  refreshBtn: {
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    fontSize: '1.2rem',
    padding: '4px'
  },
  submitBtn: {
    backgroundColor: '#38bdf8',
    color: '#0f172a',
    border: 'none',
    borderRadius: '12px',
    padding: '16px',
    fontWeight: '700',
    cursor: 'pointer',
    transition: 'transform 0.2s, background-color 0.2s',
    '&:hover': {
      backgroundColor: '#7dd3fc',
      transform: 'translateY(-2px)'
    },
    '&:disabled': {
      opacity: 0.5,
      cursor: 'not-allowed'
    }
  },
  errorMsg: {
    color: '#f87171',
    fontSize: '0.85rem',
    margin: 0
  },
  successMsg: {
    color: '#4ade80',
    fontSize: '0.85rem',
    margin: 0
  },
  commentsList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '20px'
  },
  commentCard: {
    backgroundColor: 'rgba(15, 23, 42, 0.3)',
    padding: '24px',
    borderRadius: '20px',
    border: '1px solid rgba(255,255,255,0.03)'
  },
  commentHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    marginBottom: '12px'
  },
  commentUser: {
    fontWeight: '700',
    color: '#38bdf8'
  },
  commentDate: {
    fontSize: '0.8rem',
    color: '#64748b'
  },
  commentText: {
    margin: 0,
    lineHeight: '1.6',
    color: '#cbd5e1'
  },
  noComments: {
    color: '#64748b',
    fontStyle: 'italic',
    textAlign: 'center',
    padding: '40px'
  }
};

export default DomainPage;
