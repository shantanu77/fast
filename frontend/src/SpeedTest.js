import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';

function SpeedTest() {
  const [status, setStatus] = useState('ready'); // ready, testing-ping, testing-download, testing-upload, finished
  const [ping, setPing] = useState(null);
  const [downloadSpeed, setDownloadSpeed] = useState(null);
  const [uploadSpeed, setUploadSpeed] = useState(null);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState(null);

  const API_BASE = process.env.REACT_APP_API_URL || '';

  const runTest = async () => {
    try {
      setError(null);
      setStatus('testing-ping');
      setProgress(10);
      
      // 1. Measure Ping
      const pings = [];
      for(let i=0; i<3; i++) {
        const start = performance.now();
        const res = await fetch(`${API_BASE}/api/speedtest/ping?t=${Date.now()}`);
        if (!res.ok) throw new Error(`Ping failed with status ${res.status}`);
        pings.push(performance.now() - start);
      }
      const avgPing = pings.reduce((a,b) => a+b, 0) / pings.length;
      setPing(Math.round(avgPing));
      setProgress(30);

      // 2. Measure Download Speed
      setStatus('testing-download');
      const dlStart = performance.now();
      const dlRes = await fetch(`${API_BASE}/api/speedtest/download?size=3&t=${Date.now()}`);
      if (!dlRes.ok) throw new Error(`Download failed with status ${dlRes.status}`);
      const dlData = await dlRes.text();
      const dlEnd = performance.now();
      const dlDuration = (dlEnd - dlStart) / 1000; // seconds
      const dlSizeBits = dlData.length * 8;
      const dlMbps = (dlSizeBits / (dlDuration * 1024 * 1024));
      setDownloadSpeed(dlMbps.toFixed(2));
      setProgress(70);

      // 3. Measure Upload Speed
      setStatus('testing-upload');
      const uploadData = "U".repeat(256 * 1024); // 256KB for safe payload through proxies
      const ulRes = await fetch(`${API_BASE}/api/speedtest/upload`, {
        method: 'POST',
        body: uploadData
      });
      if (!ulRes.ok) throw new Error(`Upload failed with status ${ulRes.status}`);
      const ulJson = await ulRes.json();
      setUploadSpeed(ulJson.mbps.toFixed(2));
      
      setProgress(100);
      setStatus('finished');
    } catch (err) {
      console.error("Speedtest failed", err);
      let context = `Stage: ${status}`;
      let detail = err.message || "Unknown error";
      
      setError(`${context} | Details: ${detail}`);
      setStatus('ready');
    }
  };

  return (
    <div style={styles.container}>
      <header style={styles.header}>
        <Link to="/" style={styles.backLink}>← Back to Scanner</Link>
        <h1 style={styles.title}>WiFi <span style={styles.accent}>Speed Intelligence</span></h1>
        <p style={styles.subtitle}>Analyze your network performance in real-time.</p>
      </header>

      <main style={styles.main}>
        <div style={styles.testCard} className="glass-card animate-fade-in">
          {status === 'ready' && (
            <div style={styles.readyContent}>
              <div style={styles.testIcon}>📡</div>
              <h2>Ready to analyze?</h2>
              <p>We'll measure your latency, download and upload speeds using our nearby high-speed clusters.</p>
              <button onClick={runTest} style={styles.startBtn}>Begin Network Audit →</button>
            </div>
          )}

          {(status.startsWith('testing') || status === 'finished') && (
            <div style={styles.testingContent}>
              <div style={styles.gaugeGrid}>
                <StatGauge label="Latency" value={ping ? `${ping} ms` : '--'} active={status === 'testing-ping'} unit="PING" color="#fbbf24" />
                <StatGauge label="Download" value={downloadSpeed ? `${downloadSpeed}` : '--'} active={status === 'testing-download'} unit="MBPS" color="#4ade80" />
                <StatGauge label="Upload" value={uploadSpeed ? `${uploadSpeed}` : '--'} active={status === 'testing-upload'} unit="MBPS" color="#38bdf8" />
              </div>

              <div style={styles.progressContainer}>
                <div style={styles.progressLabel}>
                  <span>{status === 'finished' ? 'Test Complete' : `Analyzing Network: ${status.split('-')[1]}...`}</span>
                  <span>{Math.round(progress)}%</span>
                </div>
                <div style={styles.progressBar}>
                  <div style={{...styles.progressFill, width: `${progress}%`, backgroundColor: progress === 100 ? '#4ade80' : '#38bdf8'}} />
                </div>
              </div>

              {status === 'finished' && (
                <div style={styles.resultSummary} className="animate-fade-in">
                  <div style={styles.qualityBadge}>
                    {downloadSpeed > 50 ? '💎 Premium Connection' : downloadSpeed > 20 ? '✅ Stable Network' : '⚠️ Limited Bandwidth'}
                  </div>
                  <button onClick={() => { setPing(null); setDownloadSpeed(null); setUploadSpeed(null); setStatus('ready'); setProgress(0); }} style={styles.resetBtn}>Run Again 🔄</button>
                </div>
              )}
            </div>
          )}

          {error && <div style={styles.errorBox}>{error}</div>}
        </div>

        <section style={styles.infoSection} className="animate-fade-in">
          <h3 style={styles.infoTitle}>Why run a speed test?</h3>
          <div style={styles.infoGrid}>
            <div style={styles.infoItem}>
              <h4>Latency (Ping)</h4>
              <p>Measures how long it takes for a data packet to travel from your device to our server and back. Lower is better for gaming and VR.</p>
            </div>
            <div style={styles.infoItem}>
              <h4>Download</h4>
              <p>How much data your connection can pull per second. Essential for high-quality video streaming and large software updates.</p>
            </div>
            <div style={styles.infoItem}>
              <h4>Upload</h4>
              <p>How much data you can send. Crucial for video calls, uploading your work, and hosting online sessions.</p>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}

const StatGauge = ({ label, value, active, unit, color }) => (
  <div style={{...styles.statGauge, border: active ? `2px solid ${color}` : '1px solid rgba(255,255,255,0.05)'}}>
    <span style={styles.gaugeLabel}>{label}</span>
    <div style={{...styles.gaugeValue, color: value === '--' ? '#475569' : color}}>
      {value}
    </div>
    <span style={styles.gaugeUnit}>{unit}</span>
    {active && <div style={{...styles.activeIndicator, backgroundColor: color}} />}
  </div>
);

const styles = {
  container: {
    minHeight: '100vh',
    color: '#f8fafc',
    padding: '40px 20px',
    maxWidth: '1200px',
    margin: '0 auto',
    fontFamily: "'Outfit', sans-serif",
  },
  header: {
    textAlign: 'center',
    marginBottom: '60px',
  },
  backLink: {
    color: '#64748b',
    textDecoration: 'none',
    fontSize: '0.9rem',
    fontWeight: '600',
    display: 'block',
    marginBottom: '20px',
    transition: 'color 0.2s',
  },
  title: {
    fontSize: '3rem',
    margin: 0,
    fontWeight: '900',
    letterSpacing: '-2px',
  },
  accent: {
    color: '#38bdf8',
  },
  subtitle: {
    color: '#94a3b8',
    fontSize: '1.2rem',
    marginTop: '10px',
  },
  main: {
    display: 'flex',
    flexDirection: 'column',
    gap: '40px',
    alignItems: 'center',
  },
  testCard: {
    width: '100%',
    maxWidth: '800px',
    backgroundColor: 'rgba(30, 41, 59, 0.4)',
    padding: '60px',
    borderRadius: '40px',
    border: '1px solid rgba(255,255,255,0.05)',
    textAlign: 'center',
    position: 'relative',
    overflow: 'hidden',
  },
  readyContent: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '24px',
  },
  testIcon: {
    fontSize: '5rem',
    animation: 'pulse 2s infinite',
  },
  startBtn: {
    backgroundColor: '#38bdf8',
    color: '#0f172a',
    border: 'none',
    padding: '20px 40px',
    borderRadius: '20px',
    fontSize: '1.2rem',
    fontWeight: '800',
    cursor: 'pointer',
    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
    marginTop: '20px',
  },
  testingContent: {
    display: 'flex',
    flexDirection: 'column',
    gap: '40px',
  },
  gaugeGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, 1fr)',
    gap: '20px',
    '@media (maxWidth: 600px)': {
      gridTemplateColumns: '1fr',
    },
  },
  statGauge: {
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
    padding: '30px',
    borderRadius: '32px',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '8px',
    position: 'relative',
  },
  gaugeLabel: {
    fontSize: '0.8rem',
    fontWeight: '700',
    color: '#64748b',
    textTransform: 'uppercase',
    letterSpacing: '1px',
  },
  gaugeValue: {
    fontSize: '2.5rem',
    fontWeight: '900',
  },
  gaugeUnit: {
    fontSize: '0.75rem',
    fontWeight: '800',
    color: '#475569',
  },
  activeIndicator: {
    position: 'absolute',
    top: '12px',
    right: '12px',
    width: '8px',
    height: '8px',
    borderRadius: '50%',
    boxShadow: '0 0 10px currentColor',
  },
  progressContainer: {
    width: '100%',
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  },
  progressLabel: {
    display: 'flex',
    justifyContent: 'space-between',
    fontSize: '0.9rem',
    color: '#94a3b8',
    fontWeight: '600',
  },
  progressBar: {
    width: '100%',
    height: '12px',
    backgroundColor: 'rgba(30, 41, 59, 0.8)',
    borderRadius: '6px',
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    transition: 'width 0.4s cubic-bezier(0.4, 0, 0.2, 1), background-color 0.4s',
  },
  resultSummary: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '20px',
  },
  qualityBadge: {
    backgroundColor: 'rgba(56, 189, 248, 0.1)',
    color: '#38bdf8',
    padding: '12px 24px',
    borderRadius: '16px',
    fontSize: '1.2rem',
    fontWeight: '800',
    border: '1px solid rgba(56, 189, 248, 0.2)',
  },
  resetBtn: {
    background: 'none',
    border: '1px solid #334155',
    color: '#64748b',
    padding: '10px 24px',
    borderRadius: '12px',
    cursor: 'pointer',
    fontWeight: '600',
    transition: 'all 0.2s',
  },
  errorBox: {
    marginTop: '20px',
    padding: '16px',
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    color: '#f87171',
    borderRadius: '12px',
    border: '1px solid rgba(239, 68, 68, 0.2)',
  },
  infoSection: {
    width: '100%',
    maxWidth: '1000px',
    marginTop: '40px',
  },
  infoTitle: {
    fontSize: '1.5rem',
    marginBottom: '30px',
    textAlign: 'center',
  },
  infoGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, 1fr)',
    gap: '30px',
    '@media (maxWidth: 800px)': {
      gridTemplateColumns: '1fr',
    },
  },
  infoItem: {
    backgroundColor: 'rgba(15, 23, 42, 0.3)',
    padding: '30px',
    borderRadius: '24px',
    border: '1px solid rgba(255,255,255,0.03)',
  }
};

export default SpeedTest;
