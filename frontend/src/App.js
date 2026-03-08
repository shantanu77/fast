import React, { useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import SearchPage from './SearchPage';
import DomainPage from './DomainPage';
import AboutPage from './AboutPage';

function App() {
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  // User rating tracking removed - now handled by backend IP tracking
  const [ratingStats, setRatingStats] = useState({ average: 0, count: 0 });
  const [hasRated, setHasRated] = useState(localStorage.getItem('fast_scanner_rated') === 'true');
  const [feedback, setFeedback] = useState('');
  const [submittedFeedback, setSubmittedFeedback] = useState(localStorage.getItem('fast_scanner_feedback') || '');
  const [recentScans, setRecentScans] = useState([]);
  const [recentFeedback, setRecentFeedback] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [expandedSite, setExpandedSite] = useState(null);

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
  const [stats, setStats] = useState({ live_users: 0, total_unique_visitors: 0, total_users: 0, total_reviews: 0 });
  const [captcha, setCaptcha] = useState({ id: null, question: '' });
  const [captchaAnswer, setCaptchaAnswer] = useState('');

  // PIN-based security system - everyone gets 1 free rating, then needs PIN (3 attempts)
  const [ratingStatus, setRatingStatus] = useState({
    can_rate: true,
    needs_pin: false,
    is_locked: false,
    rating_count: 0,
    pin_attempts: 0,
    pin_attempts_remaining: 3
  });

  // Kids Safe - 18+ Content Warning
  const [showKidsSafeModal, setShowKidsSafeModal] = useState(false);
  const [kidsSafeData, setKidsSafeData] = useState({
    is_adult_content: false,
    url: '',
    title: '',
    reasons: [],
    message: ''
  });
  const [pendingUrl, setPendingUrl] = useState('');
  const [showPinModal, setShowPinModal] = useState(false);
  const [pinInput, setPinInput] = useState('');
  const [isPinVerified, setIsPinVerified] = useState(false);
  const [lockMessage, setLockMessage] = useState('');
  const [pinError, setPinError] = useState('');

  // V2: Search Page
  const [showSearchPage, setShowSearchPage] = useState(false);

  // Device Selection V3
  const [showDeviceModal, setShowDeviceModal] = useState(false);
  const [userDevice, setUserDevice] = useState(localStorage.getItem('fast_scanner_device') || null);
  const [deviceStats, setDeviceStats] = useState({ laptop: 0, ipad: 0, phone: 0, no_change: 0, total: 0 });
  const [isChangingDevice, setIsChangingDevice] = useState(false);
  const [showDevicePinModal, setShowDevicePinModal] = useState(false);
  const [pendingDevice, setPendingDevice] = useState(null);

  // Visitor name for scan
  const [scanVisitorName, setScanVisitorName] = useState('');
  const [showNameModal, setShowNameModal] = useState(false);
  const [pendingScanUrl, setPendingScanUrl] = useState('');

  // Premium Click Sound - satisfying tech click
  const playClick = () => {
    try {
      const audioCtx = new (window.AudioContext || window.webkitAudioContext)();

      // Primary click - crisp high tone
      const osc1 = audioCtx.createOscillator();
      const gain1 = audioCtx.createGain();
      osc1.type = 'sine';
      osc1.frequency.setValueAtTime(1200, audioCtx.currentTime);
      osc1.frequency.exponentialRampToValueAtTime(600, audioCtx.currentTime + 0.05);
      gain1.gain.setValueAtTime(0.15, audioCtx.currentTime);
      gain1.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.08);
      osc1.connect(gain1);
      gain1.connect(audioCtx.destination);
      osc1.start();
      osc1.stop(audioCtx.currentTime + 0.08);

      // Secondary click - deeper confirmation
      const osc2 = audioCtx.createOscillator();
      const gain2 = audioCtx.createGain();
      osc2.type = 'triangle';
      osc2.frequency.setValueAtTime(400, audioCtx.currentTime + 0.02);
      osc2.frequency.exponentialRampToValueAtTime(200, audioCtx.currentTime + 0.06);
      gain2.gain.setValueAtTime(0, audioCtx.currentTime);
      gain2.gain.linearRampToValueAtTime(0.08, audioCtx.currentTime + 0.02);
      gain2.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.1);
      osc2.connect(gain2);
      gain2.connect(audioCtx.destination);
      osc2.start(audioCtx.currentTime + 0.02);
      osc2.stop(audioCtx.currentTime + 0.1);

      setTimeout(() => audioCtx.close(), 200);
    } catch (e) {
      console.error("Audio failed", e);
    }
  };

  // Premium Hover Sound - subtle feedback
  const playHoverSound = () => {
    try {
      const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      const oscillator = audioCtx.createOscillator();
      const gainNode = audioCtx.createGain();

      oscillator.type = 'sine';
      oscillator.frequency.setValueAtTime(600, audioCtx.currentTime);
      oscillator.frequency.exponentialRampToValueAtTime(800, audioCtx.currentTime + 0.03);

      gainNode.gain.setValueAtTime(0.03, audioCtx.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.03);

      oscillator.connect(gainNode);
      gainNode.connect(audioCtx.destination);

      oscillator.start();
      oscillator.stop(audioCtx.currentTime + 0.03);
      setTimeout(() => audioCtx.close(), 100);
    } catch (e) {
      // Silent fail for hover sounds
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

  // Check rating status from backend
  const checkRatingStatus = async () => {
    try {
      const response = await fetch('/api/check-rating-status');
      const data = await response.json();
      setRatingStatus(data);
      // If locked, show lock message
      if (data.is_locked) {
        setLockMessage(`Your rating privileges have been permanently locked after ${data.pin_attempts || 3} failed PIN attempts.`);
      }
    } catch (err) {
      console.error("Failed to check rating status", err);
    }
  };

  const fetchDeviceStats = async () => {
    try {
      const response = await fetch('/api/device-stats');
      const data = await response.json();
      setDeviceStats(data);
    } catch (err) {
      console.error("Failed to fetch device stats", err);
    }
  };

  const selectDevice = async (device, isChange = false, pin = '') => {
    try {
      const response = await fetch('/api/select-device', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ device, is_change: isChange, pin })
      });
      const data = await response.json();

      if (data.success) {
        localStorage.setItem('fast_scanner_device', device);
        setUserDevice(device);
        setShowDeviceModal(false);
        setShowDevicePinModal(false);
        setIsChangingDevice(false);
        setPinInput('');
        setDevicePinError('');
        fetchDeviceStats();
        if (isChange) alert(`✅ Device changed to ${device}!`);
      } else if (data.locked) {
        setDevicePinError('❌ Your privileges are permanently locked.');
        alert('❌ ' + data.error);
      } else {
        setDevicePinError(data.error || '❌ Incorrect PIN');
      }
    } catch (err) {
      console.error("Failed to select device", err);
    }
  };

  const [devicePinError, setDevicePinError] = useState('');

  const handleDeviceSelect = (device) => {
    // Automated - no more modal
    playClick();
  };

  React.useEffect(() => {
    fetchRecentScans();
    fetchRecentFeedback();
    fetchStats();
    checkRatingStatus(); // Check rating status on load
    fetchDeviceStats(); // Fetch device stats on load
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

  // Verify PIN with backend to allow additional rating (3 attempts allowed)
  const verifyPin = async () => {
    playClick();
    setPinError('');
    try {
      const response = await fetch('/api/verify-pin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pin: pinInput })
      });
      const data = await response.json();

      if (data.success) {
        // PIN correct - allow one more rating
        setIsPinVerified(true);
        setShowPinModal(false);
        setPinInput('');
        setPinError('');
        setRatingStatus({
          ...ratingStatus,
          can_rate: true,
          needs_pin: false,
          pin_attempts: 0,
          pin_attempts_remaining: 3
        });
        alert('✅ PIN verified! You can submit one more rating.');
        // Re-open the rating modal
        setShowModal(true);
      } else if (data.locked) {
        // PIN wrong - user is now permanently locked
        setRatingStatus({
          ...ratingStatus,
          is_locked: true,
          pin_attempts: data.attempts_used || 3,
          pin_attempts_remaining: 0
        });
        setLockMessage(data.error || 'Your rating privileges have been permanently locked.');
        setShowPinModal(false);
        setPinInput('');
        setPinError('');
        alert('❌ ' + (data.error || 'Incorrect PIN! Your account is now locked.'));
      } else {
        // Wrong PIN but still has attempts remaining
        setRatingStatus({
          ...ratingStatus,
          pin_attempts: data.attempts_used || 0,
          pin_attempts_remaining: data.attempts_remaining || 0
        });
        setPinError(`❌ ${data.error}`);
        setPinInput('');
      }
    } catch (err) {
      console.error("Failed to verify PIN", err);
      alert('❌ Verification failed. Please try again.');
    }
  };

  // Group scans by hostname
  const groupScansByHostname = (scans) => {
    const grouped = {};
    scans.forEach(scan => {
      try {
        const hostname = scan.url === 'General Feedback' ? 'N/A' : new URL(scan.url).hostname;
        if (!grouped[hostname]) {
          grouped[hostname] = [];
        }
        grouped[hostname].push(scan);
      } catch (e) {
        // Skip invalid URLs
      }
    });
    return grouped;
  };

  // Get best/latest grade for a group of scans
  const getBestGrade = (scans) => {
    const validScans = scans.filter(s => s.grade && s.grade !== 'N/A');
    if (validScans.length === 0) return '-';
    // Sort by timestamp desc, get latest grade
    return validScans.sort((a, b) => b.timestamp - a.timestamp)[0].grade;
  };

  // Get latest score for a group
  const getLatestScore = (scans) => {
    const validScans = scans.filter(s => s.score);
    if (validScans.length === 0) return null;
    return validScans.sort((a, b) => b.timestamp - a.timestamp)[0].score;
  };

  // V2: Get latest kids safety rating for a group
  const getLatestKidsSafety = (scans) => {
    const validScans = scans.filter(s => s.kids_safety_rating);
    if (validScans.length === 0) return null;
    return validScans.sort((a, b) => b.timestamp - a.timestamp)[0];
  };

  // V2: Get safety color
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

  // V2: Get safety emoji
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

  // Get latest scan time for a group
  const getLatestTime = (scans) => {
    if (scans.length === 0) return null;
    return Math.max(...scans.map(s => s.timestamp));
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

    // Show name modal first
    setPendingScanUrl(finalUrl);
    setScanVisitorName(generateRandomName());
    setShowNameModal(true);
  };

  const proceedWithNameAndScan = async () => {
    setShowNameModal(false);
    const finalUrl = pendingScanUrl;
    const visitorName = scanVisitorName.trim() || generateRandomName();

    // Kids Safe: Check content safety first
    setLoading(true);
    try {
      const safetyResponse = await fetch('/api/check-content-safety', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: finalUrl })
      });
      const safetyData = await safetyResponse.json();

      if (safetyData.warning) {
        // Show Kids Safe warning modal
        setKidsSafeData(safetyData);
        setPendingUrl(finalUrl);
        setPendingVisitorName(visitorName);
        setShowKidsSafeModal(true);
        setLoading(false);
        return;
      }
    } catch (err) {
      console.error("Failed to check content safety:", err);
    }

    // No warning, proceed with scan
    await proceedWithScan(finalUrl, visitorName);
  };

  // Store visitor name for kids safe modal continuation
  const [pendingVisitorName, setPendingVisitorName] = useState('');

  const proceedWithScan = async (finalUrl, visitorName = '') => {
    setLoading(true);
    setError(null);
    setResult(null);
    setShowKidsSafeModal(false);

    playLaunchSound();
    try {
      // V2: Use browser-based scan endpoint
      const response = await fetch('/api/scan-v2', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url: finalUrl,
          visitor_name: visitorName || generateRandomName()
        }),
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

    // Check if user is locked
    if (ratingStatus.is_locked) {
      alert('❌ Your rating privileges have been permanently locked.');
      return;
    }

    // If user needs PIN (already rated once), show PIN modal first
    if (ratingStatus.needs_pin && !isPinVerified) {
      setShowPinModal(true);
      return;
    }

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

        // Save to localStorage
        localStorage.setItem('fast_scanner_rated', 'true');
        localStorage.setItem('fast_scanner_feedback', feedback);

        // Reset PIN verification after successful rating (they'll need PIN again for next)
        setIsPinVerified(false);
        // Reset feedback
        setFeedback('');
        // Update rating status
        checkRatingStatus();
        window.scrollTo({ top: 0, behavior: 'smooth' });
      } else if (data.needs_pin) {
        // User needs to enter PIN
        setShowModal(false);
        setShowPinModal(true);
      } else if (data.locked) {
        // User is locked
        setRatingStatus({ ...ratingStatus, is_locked: true });
        setLockMessage(data.error);
        setShowModal(false);
        alert('❌ ' + data.error);
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
    <Router>
      <Routes>
        <Route path="/pages/:domain" element={<DomainPage />} />
        <Route path="/about" element={<AboutPage />} />
        <Route path="/" element={
          showSearchPage ? (
            <SearchPage onBack={() => setShowSearchPage(false)} />
          ) : (
            <div style={styles.container}>
              <header style={styles.header}>
                <Link to="/about" style={styles.badgeLink}>
                  <div style={styles.badge} className="animate-fade-in card-hover">
                    <div style={styles.badgeAvatarWrapper}>
                      <img src="/ashwat.jpg" alt="Aashvath Singh" style={styles.miniAvatar} onError={(e) => e.target.style.display='none'} />
                      <span style={styles.badgeIcon}>🛡️</span>
                    </div>
                    Trusted by Aashvath Singh
                  </div>
                </Link>
                <h1 style={styles.title} className="animate-fade-in">Fast <span style={styles.accent}>Scanner</span></h1>
                <p className="animate-fade-in" style={{ ...styles.subtitle, animationDelay: '0.1s' }}>High-performance website security and speed analysis.</p>

                <div className="animate-fade-in" style={{ ...styles.statsRow, animationDelay: '0.2s' }}>
                  <div style={styles.statChip}>
                    <span style={{ ...styles.statDot, backgroundColor: '#4ade80' }}></span>
                    <strong>{stats.live_users}</strong> Live Users
                  </div>
                  <div style={styles.statChip}>
                    <span style={{ ...styles.statDot, backgroundColor: '#a855f7' }}></span>
                    <strong>{stats.total_unique_visitors || 0}</strong> Unique Visitors
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
                {loading && (
                  <div style={styles.loadingOverlay}>
                    <div style={styles.loadingSpinner}></div>
                    <p style={styles.loadingText}>Scanning website...</p>
                  </div>
                )}

                <form onSubmit={handleScan} className="animate-fade-in" style={{ ...styles.form, animationDelay: '0.3s', opacity: loading ? 0.6 : 1, pointerEvents: loading ? 'none' : 'auto' }}>
                  <div style={styles.inputWrapper}>
                    <input
                      type="text"
                      placeholder="Enter website URL (e.g. google.com)"
                      value={url}
                      onChange={(e) => setUrl(e.target.value)}
                      disabled={loading}
                      style={{ ...styles.input, opacity: loading ? 0.7 : 1 }}
                    />
                  </div>
                  <button type="submit" disabled={loading} style={{ ...styles.button, cursor: loading ? 'not-allowed' : 'pointer' }}>
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
                        {result.safety_reasons.length > 0 && <p style={styles.statusSubline}>{result.safety_reasons.join(' | ')}</p>}
                      </div>
                    </div>

                    <div style={styles.resultGrid}>
                      {result.kids_safety && (
                        <div style={{ ...styles.card, borderColor: result.kids_safety.display?.color || '#6b7280', borderWidth: '2px' }} className="card-hover">
                          <div style={styles.cardLabel}>👶 Kids Safety</div>
                          <div style={{ ...styles.cardValue, color: result.kids_safety.display?.color || '#6b7280' }}>
                            {result.kids_safety.display?.emoji} {result.kids_safety.display?.label}
                          </div>
                          <div style={styles.cardSub}>Confidence: {result.kids_safety.confidence}</div>
                        </div>
                      )}
                      <ResultCard label="Performance" value={`${Math.round(result.performance_score)}/100`} sub={getScoreExplanation(result.performance_score)} />
                      <ResultCard label="Load Time" value={`${result.load_time_ms} ms`} sub="Total response" />
                      
                      <Link to={`/pages/${new URL(result.url).hostname.replace('www.', '')}`} style={{ ...styles.card, textDecoration: 'none', border: '1px solid #38bdf8' }} className="card-hover">
                        <div style={{ ...styles.cardLabel, color: '#38bdf8' }}>Full Analysis</div>
                        <div style={{ ...styles.cardValue, color: '#38bdf8', fontSize: '1.2rem' }}>Detailed History →</div>
                      </Link>
                    </div>

                    {result.bugs && result.bugs.length > 0 && (
                      <div style={styles.bugsSection}>
                        <h3 style={styles.sectionTitle}>Detected Issues</h3>
                        <ul style={styles.bugList}>
                          {result.bugs.map((bug, i) => <li key={i} style={styles.bugItem}>⚠️ {bug}</li>)}
                        </ul>
                      </div>
                    )}
                  </div>
                )}


                {recentScans.length > 0 && (
                  <section style={styles.historySection}>
                    <div style={styles.historyHeaderRow}>
                      <h3 style={styles.historyTitle}>Recent Intelligence</h3>
                      <button onClick={() => setShowSearchPage(true)} style={styles.moreButton}>Search More →</button>
                    </div>
                    <div style={styles.tableWrapper}>
                      <table style={styles.table}>
                        <thead>
                          <tr>
                            <th>Website</th>
                            <th>Grade</th>
                            <th>Score</th>
                            <th>Action</th>
                          </tr>
                        </thead>
                        <tbody>
                          {Object.entries(groupScansByHostname(recentScans)).slice(0, 10).map(([hostname, scans]) => (
                            <tr key={hostname} style={styles.tr}>
                              <td style={styles.td}>{hostname}</td>
                              <td style={styles.td}>
                                <span style={{ ...styles.gradeTag, backgroundColor: getGradeColor(getBestGrade(scans)) }}>
                                  {getBestGrade(scans)}
                                </span>
                              </td>
                              <td style={styles.td}>{getLatestScore(scans) || '-'}</td>
                              <td style={styles.td}>
                                <Link to={`/pages/${hostname}`} style={styles.viewBtn}>View Page</Link>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </section>
                )}

                <section style={{ ...styles.historySection, padding: '30px' }}>
                  <h3 style={styles.historyTitle}>Device Intelligence</h3>
                  <div style={styles.chartContainer}>
                    <DeviceBar label="Desktop" count={deviceStats.laptop} total={deviceStats.total} color="#38bdf8" />
                    <DeviceBar label="Mobile" count={deviceStats.phone} total={deviceStats.total} color="#4ade80" />
                    <DeviceBar label="Tablet" count={deviceStats.ipad} total={deviceStats.total} color="#a855f7" />
                  </div>
                </section>

                <section style={styles.communitySection}>
                  <div style={styles.communityGrid}>
                    <div style={styles.feedbackFormWrapper}>
                      <h3 style={styles.communityTitle}>❤️ Love Fast Scanner?</h3>
                      <p style={styles.communitySub}>Help us improve by sharing your experience!</p>
                      
                      <div style={styles.quickStars}>
                        {[1, 2, 3, 4, 5].map(star => (
                          <span 
                            key={star} 
                            onClick={() => handleStarClick(star)}
                            style={{ 
                              ...styles.star, 
                              fontSize: '2rem',
                              filter: selectedStars >= star ? 'grayscale(0)' : 'grayscale(1)',
                              cursor: 'pointer'
                            }}
                          >
                            ⭐
                          </span>
                        ))}
                      </div>

                      <div style={styles.formEmbed}>
                        <textarea 
                          placeholder="What do you think about the platform? (Min 3 words)"
                          value={feedback}
                          onChange={(e) => setFeedback(e.target.value)}
                          style={styles.mainFeedbackInput}
                        />
                        <div style={styles.miniCaptcha}>
                          <span>Solve: {captcha.question}</span>
                          <input 
                            type="text" 
                            placeholder="Ans"
                            value={captchaAnswer}
                            onChange={(e) => setCaptchaAnswer(e.target.value)}
                            style={styles.miniCaptchaInput}
                          />
                        </div>
                        <button 
                          onClick={submitRating} 
                          style={styles.submitExperienceBtn}
                        >
                          Share Experience →
                        </button>
                      </div>
                    </div>

                    <div style={styles.experienceWall}>
                      <h3 style={styles.communityTitle}>Experience Wall</h3>
                      <div style={styles.wallContent}>
                        {recentFeedback.length === 0 ? (
                          <p style={styles.noFeedback}>No stories shared yet. Be the first!</p>
                        ) : (
                          recentFeedback.slice(0, 6).map(f => (
                            <div key={f.id} style={styles.experienceCard}>
                              <div style={styles.experienceHeader}>
                                <span style={styles.experienceName}>{f.visitor_name || 'Explorer'}</span>
                                <span style={styles.experienceRating}>{'⭐'.repeat(f.rating)}</span>
                              </div>
                              <p style={styles.experienceText}>{f.comment}</p>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  </div>
                </section>
              </main>

              <footer style={styles.footer}>
                <p>Built with ❤️ by Aashvath Singh</p>
              </footer>
            </div>
          )
        } />
      </Routes>
      
      {/* Shared Modals */}
      {showModal && (
        <div style={styles.modalOverlay}>
          <div style={styles.modal}>
            <h2>Rate Website</h2>
            <textarea value={feedback} onChange={(e) => setFeedback(e.target.value)} style={styles.modalInput} />
            <div style={styles.modalActions}>
              <button onClick={() => setShowModal(false)}>Cancel</button>
              <button onClick={submitRating}>Submit</button>
            </div>
          </div>
        </div>
      )}
      
      {showKidsSafeModal && (
        <div style={styles.modalOverlay}>
          <div style={styles.modal}>
            <h2 style={{ color: '#ef4444' }}>⚠️ Content Warning</h2>
            <p>{kidsSafeData.message}</p>
            <div style={styles.modalActions}>
              <button onClick={() => setShowKidsSafeModal(false)}>Exit</button>
              <button onClick={() => proceedWithScan(pendingUrl, pendingVisitorName)} style={{ backgroundColor: '#ef4444' }}>Proceed</button>
            </div>
          </div>
        </div>
      )}

      {showNameModal && (
        <div style={styles.modalOverlay}>
          <div style={styles.modal}>
            <h2>Scanner Name</h2>
            <input type="text" value={scanVisitorName} onChange={(e) => setScanVisitorName(e.target.value)} style={styles.modalInput} />
            <button onClick={proceedWithNameAndScan}>Start Scan</button>
          </div>
        </div>
      )}
    </Router>
  );
}

const DeviceBar = ({ label, count, total, color }) => {
  const percentage = total > 0 ? (count / total) * 100 : 0;
  return (
    <div style={styles.deviceBarWrapper}>
      <div style={styles.deviceBarInfo}>
        <span style={styles.deviceBarLabel}>{label}</span>
        <span style={styles.deviceBarCount}>{count} users ({percentage.toFixed(1)}%)</span>
      </div>
      <div style={styles.deviceBarTrack}>
        <div style={{
          ...styles.deviceBarFill,
          width: `${percentage}%`,
          backgroundColor: color,
          boxShadow: `0 0 15px ${color}50`
        }} />
      </div>
    </div>
  );
};

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
    cursor: 'pointer',
    transition: 'all 0.3s ease',
  },
  badgeLink: {
    textDecoration: 'none',
    color: 'inherit',
    display: 'inline-block',
  },
  badgeIcon: {
    fontSize: '0.9rem',
    position: 'absolute',
    bottom: '-2px',
    right: '-4px',
    background: '#1e293b',
    borderRadius: '50%',
    padding: '2px',
    lineHeight: '1',
  },
  badgeAvatarWrapper: {
    position: 'relative',
    width: '32px',
    height: '32px',
  },
  miniAvatar: {
    width: '100%',
    height: '100%',
    borderRadius: '50%',
    objectFit: 'cover',
    border: '1px solid #38bdf8',
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
  // Loading Overlay Styles
  loadingOverlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(2, 6, 23, 0.85)',
    backdropFilter: 'blur(8px)',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 9999,
    animation: 'fadeIn 0.3s ease-out',
  },
  loadingSpinner: {
    width: '60px',
    height: '60px',
    border: '4px solid rgba(56, 189, 248, 0.1)',
    borderTop: '4px solid #38bdf8',
    borderRadius: '50%',
    animation: 'spin 1s linear infinite',
    marginBottom: '20px',
  },
  loadingText: {
    color: '#f8fafc',
    fontSize: '1.2rem',
    fontWeight: '600',
    animation: 'pulse 1.5s ease-in-out infinite',
  },
  buttonSpinner: {
    display: 'inline-block',
    width: '16px',
    height: '16px',
    border: '2px solid rgba(15, 23, 42, 0.3)',
    borderTop: '2px solid #0f172a',
    borderRadius: '50%',
    animation: 'spin 0.8s linear infinite',
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
  historyHeaderRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: '24px',
  },
  moreButton: {
    padding: '10px 20px',
    borderRadius: '12px',
    border: '1px solid rgba(56, 189, 248, 0.3)',
    backgroundColor: 'rgba(56, 189, 248, 0.1)',
    color: '#38bdf8',
    fontWeight: '600',
    fontSize: '0.9rem',
    cursor: 'pointer',
    transition: 'all 0.2s',
    ':hover': {
      backgroundColor: 'rgba(56, 189, 248, 0.2)',
      transform: 'translateY(-2px)',
    }
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
  scanCount: {
    backgroundColor: 'rgba(56, 189, 248, 0.2)',
    color: '#38bdf8',
    padding: '4px 12px',
    borderRadius: '12px',
    fontSize: '0.85rem',
    fontWeight: '600',
  },
  scanHistoryPanel: {
    backgroundColor: 'rgba(15, 23, 42, 0.8)',
    borderLeft: '3px solid #38bdf8',
    padding: '20px',
  },
  scanHistoryHeader: {
    fontSize: '0.9rem',
    fontWeight: '700',
    color: '#38bdf8',
    marginBottom: '12px',
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
  },
  historyTable: {
    width: '100%',
    borderCollapse: 'collapse',
    fontSize: '0.85rem',
  },
  historyTh: {
    padding: '10px 12px',
    color: '#64748b',
    fontWeight: '600',
    borderBottom: '1px solid #334155',
    textAlign: 'left',
    fontSize: '0.7rem',
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
  },
  historyTr: {
    borderBottom: '1px solid rgba(51, 65, 85, 0.3)',
  },
  historyTd: {
    padding: '10px 12px',
    color: '#e2e8f0',
  },
  mobileHistoryPanel: {
    backgroundColor: 'rgba(15, 23, 42, 0.8)',
    borderRadius: '0 0 12px 12px',
    overflow: 'hidden',
    marginBottom: '12px',
    border: '1px solid rgba(255,255,255,0.05)',
    borderTop: 'none',
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
    padding: '14px 20px',
    borderRadius: '12px',
    border: '2px solid rgba(148, 163, 184, 0.3)',
    background: 'linear-gradient(145deg, rgba(30, 41, 59, 0.8) 0%, rgba(15, 23, 42, 0.9) 100%)',
    color: '#94a3b8',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.3), 0 2px 4px -1px rgba(0, 0, 0, 0.2), inset 0 1px 0 rgba(255, 255, 255, 0.05)',
    textTransform: 'uppercase',
    letterSpacing: '0.025em',
    fontSize: '0.9rem',
    ':hover': {
      borderColor: 'rgba(148, 163, 184, 0.5)',
      background: 'linear-gradient(145deg, rgba(51, 65, 85, 0.8) 0%, rgba(30, 41, 59, 0.9) 100%)',
      color: '#e2e8f0',
      transform: 'translateY(-2px)',
      boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.4), 0 4px 6px -2px rgba(0, 0, 0, 0.3)',
    },
  },
  saveBtn: {
    flex: 2,
    padding: '14px 20px',
    borderRadius: '12px',
    border: 'none',
    background: 'linear-gradient(135deg, #38bdf8 0%, #0ea5e9 50%, #0284c7 100%)',
    color: '#fff',
    fontWeight: '700',
    cursor: 'pointer',
    transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
    boxShadow: '0 4px 14px 0 rgba(56, 189, 248, 0.4), 0 0 0 1px rgba(56, 189, 248, 0.2), inset 0 1px 0 rgba(255, 255, 255, 0.2)',
    textTransform: 'uppercase',
    letterSpacing: '0.025em',
    fontSize: '0.9rem',
    textShadow: '0 1px 2px rgba(0, 0, 0, 0.2)',
    ':hover': {
      background: 'linear-gradient(135deg, #7dd3fc 0%, #38bdf8 50%, #0ea5e9 100%)',
      transform: 'translateY(-2px) scale(1.02)',
      boxShadow: '0 8px 25px -5px rgba(56, 189, 248, 0.5), 0 0 0 1px rgba(56, 189, 248, 0.3)',
    },
  },
  resultGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))',
    gap: '16px',
  },
  chartContainer: {
    display: 'flex',
    flexDirection: 'column',
    gap: '20px',
    marginTop: '10px',
  },
  deviceBarWrapper: {
    width: '100%',
  },
  deviceBarInfo: {
    display: 'flex',
    justifyContent: 'space-between',
    marginBottom: '8px',
    fontSize: '0.9rem',
  },
  deviceBarLabel: {
    fontWeight: '600',
    color: '#f8fafc',
  },
  deviceBarCount: {
    color: '#94a3b8',
  },
  deviceBarTrack: {
    width: '100%',
    height: '12px',
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: '10px',
    overflow: 'hidden',
  },
  deviceBarFill: {
    height: '100%',
    borderRadius: '10px',
    transition: 'width 1s cubic-bezier(0.34, 1.56, 0.64, 1)',
  },
  deviceOverlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(2, 6, 23, 0.95)',
    zIndex: 10000,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '20px',
    backdropFilter: 'blur(20px)',
  },
  deviceModal: {
    backgroundColor: '#1e293b',
    padding: '40px',
    borderRadius: '32px',
    maxWidth: '600px',
    width: '100%',
    textAlign: 'center',
    border: '1px solid rgba(56, 189, 248, 0.2)',
    boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 1)',
  },
  deviceHeader: {
    marginBottom: '32px',
  },
  deviceIcon: {
    fontSize: '3rem',
    marginBottom: '16px',
  },
  deviceTitle: {
    fontSize: '2.2rem',
    fontWeight: '800',
    color: '#fff',
    marginBottom: '10px',
    letterSpacing: '-0.02em',
  },
  deviceSub: {
    color: '#94a3b8',
    fontSize: '1.1rem',
  },
  deviceGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, 1fr)',
    gap: '20px',
    marginBottom: '30px',
  },
  deviceBtn: {
    backgroundColor: 'rgba(30, 41, 59, 0.5)',
    border: '2px solid rgba(255,255,255,0.1)',
    borderRadius: '24px',
    padding: '30px 20px',
    cursor: 'pointer',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '12px',
    transition: 'all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)',
  },
  deviceEmoji: {
    fontSize: '3rem',
  },
  deviceLabel: {
    fontWeight: '700',
    fontSize: '1.1rem',
    color: '#f8fafc',
  },
  deviceNote: {
    color: '#64748b',
    fontSize: '0.85rem',
    marginTop: '20px',
  },
  noChangeBtn: {
    backgroundColor: 'transparent',
    border: '1px solid rgba(255,255,255,0.1)',
    color: '#64748b',
    padding: '10px 20px',
    borderRadius: '12px',
    cursor: 'pointer',
    fontSize: '0.9rem',
    transition: 'all 0.2s',
  },
  changeDeviceBtn: {
    backgroundColor: 'rgba(56, 189, 248, 0.1)',
    border: '1px solid rgba(56, 189, 248, 0.3)',
    color: '#38bdf8',
    padding: '12px 24px',
    borderRadius: '16px',
    cursor: 'pointer',
    fontWeight: '700',
    transition: 'all 0.2s',
  },
  closeModalBtn: {
    backgroundColor: '#334155',
    color: '#fff',
    border: 'none',
    padding: '12px 24px',
    borderRadius: '16px',
    cursor: 'pointer',
    marginTop: '20px',
    fontWeight: '600',
  },
  pinModalOverlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.9)',
    zIndex: 11000,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    backdropFilter: 'blur(10px)',
  },
  pinModal: {
    backgroundColor: '#1e293b',
    padding: '40px',
    borderRadius: '24px',
    maxWidth: '450px',
    width: '100%',
    textAlign: 'center',
    border: '1px solid rgba(239, 68, 68, 0.2)',
  },
  pinIcon: {
    fontSize: '3rem',
    marginBottom: '16px',
  },
  pinTitle: {
    fontSize: '1.5rem',
    fontWeight: '800',
    color: '#fff',
    marginBottom: '12px',
  },
  pinSub: {
    color: '#94a3b8',
    fontSize: '1rem',
    marginBottom: '24px',
  },
  pinErrorBox: {
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    color: '#ef4444',
    padding: '12px',
    borderRadius: '10px',
    marginBottom: '20px',
    fontSize: '0.9rem',
    border: '1px solid rgba(239, 68, 68, 0.2)',
  },
  pinInput: {
    width: '100%',
    padding: '16px',
    borderRadius: '12px',
    backgroundColor: '#0f172a',
    border: '1px solid #334155',
    color: '#fff',
    fontSize: '1.5rem',
    textAlign: 'center',
    letterSpacing: '0.5em',
    marginBottom: '24px',
    outline: 'none',
  },
  pinActions: {
    display: 'flex',
    gap: '12px',
  },
  pinCancelBtn: {
    flex: 1,
    padding: '12px',
    borderRadius: '10px',
    border: '1px solid #334155',
    backgroundColor: 'transparent',
    color: '#94a3b8',
    cursor: 'pointer',
  },
  pinVerifyBtn: {
    flex: 2,
    padding: '12px',
    borderRadius: '10px',
    border: 'none',
    backgroundColor: '#38bdf8',
    color: '#0f172a',
    fontWeight: '800',
    cursor: 'pointer',
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
  },
  // PIN Modal Styles - Security Theme (Red/Warning)
  pinModalOverlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(69, 26, 26, 0.95)', // Red-tinted dark overlay
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 2000, // Higher than regular modal
    padding: '20px',
    backdropFilter: 'blur(12px)',
  },
  pinModal: {
    backgroundColor: '#1a0f0f', // Dark red background
    padding: '40px',
    borderRadius: '24px',
    maxWidth: '450px',
    width: '100%',
    textAlign: 'center',
    border: '2px solid #ef4444', // Red border
    boxShadow: '0 0 40px rgba(239, 68, 68, 0.3), 0 25px 50px -12px rgba(0, 0, 0, 0.8)',
  },
  pinIcon: {
    fontSize: '3.5rem',
    marginBottom: '16px',
  },
  pinTitle: {
    fontSize: '1.5rem',
    fontWeight: '800',
    marginBottom: '20px',
    color: '#fca5a5', // Light red text
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
  },
  pinWarningBox: {
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    border: '1px solid rgba(239, 68, 68, 0.3)',
    borderRadius: '16px',
    padding: '20px',
    marginBottom: '24px',
  },
  pinWarningText: {
    fontSize: '0.95rem',
    color: '#fecaca',
    margin: 0,
    lineHeight: '1.6',
  },
  pinAttemptsBox: {
    backgroundColor: 'rgba(251, 191, 36, 0.1)',
    border: '1px solid rgba(251, 191, 36, 0.3)',
    borderRadius: '12px',
    padding: '12px',
    marginBottom: '16px',
    textAlign: 'center',
  },
  pinErrorBox: {
    backgroundColor: 'rgba(239, 68, 68, 0.2)',
    border: '1px solid rgba(239, 68, 68, 0.4)',
    borderRadius: '12px',
    padding: '12px',
    marginBottom: '16px',
    color: '#fca5a5',
    fontSize: '0.9rem',
    textAlign: 'center',
  },
  pinInput: {
    width: '100%',
    padding: '20px 24px',
    borderRadius: '16px',
    backgroundColor: '#0f0a0a', // Very dark red background
    color: '#fca5a5', // Light red text
    border: '2px solid #7f1d1d', // Dark red border
    fontSize: '1.2rem',
    fontWeight: '600',
    outline: 'none',
    marginBottom: '24px',
    textAlign: 'center',
    letterSpacing: '0.1em',
  },
  pinActions: {
    display: 'flex',
    gap: '12px',
  },
  pinCancelBtn: {
    flex: 1,
    padding: '16px 20px',
    borderRadius: '12px',
    border: '2px solid rgba(248, 113, 113, 0.3)',
    background: 'linear-gradient(145deg, rgba(69, 26, 26, 0.6) 0%, rgba(31, 10, 10, 0.8) 100%)',
    color: '#fca5a5',
    fontWeight: '600',
    cursor: 'pointer',
    fontSize: '0.95rem',
    transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.05)',
    textTransform: 'uppercase',
    letterSpacing: '0.025em',
    ':hover': {
      borderColor: 'rgba(248, 113, 113, 0.5)',
      background: 'linear-gradient(145deg, rgba(127, 29, 29, 0.6) 0%, rgba(69, 26, 26, 0.8) 100%)',
      transform: 'translateY(-2px)',
      boxShadow: '0 8px 15px -3px rgba(220, 38, 38, 0.3)',
    },
  },
  pinVerifyBtn: {
    flex: 2,
    padding: '16px 20px',
    borderRadius: '12px',
    border: 'none',
    background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 50%, #b91c1c 100%)',
    color: '#fff',
    fontWeight: '700',
    cursor: 'pointer',
    fontSize: '0.95rem',
    textTransform: 'uppercase',
    letterSpacing: '0.025em',
    transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
    boxShadow: '0 4px 14px 0 rgba(220, 38, 38, 0.5), 0 0 0 1px rgba(220, 38, 38, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.2)',
    textShadow: '0 1px 2px rgba(0, 0, 0, 0.3)',
    ':hover': {
      background: 'linear-gradient(135deg, #f87171 0%, #ef4444 50%, #dc2626 100%)',
      transform: 'translateY(-2px) scale(1.02)',
      boxShadow: '0 8px 25px -5px rgba(220, 38, 38, 0.6), 0 0 0 1px rgba(220, 38, 38, 0.4)',
    },
  },
  // Kids Safe - 18+ Content Warning Modal Styles
  kidsSafeOverlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(88, 28, 135, 0.95)', // Purple-tinted overlay
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 3000, // Highest priority
    padding: '20px',
    backdropFilter: 'blur(12px)',
  },
  kidsSafeModal: {
    backgroundColor: '#1a0f1a', // Dark purple background
    padding: '40px',
    borderRadius: '24px',
    maxWidth: '500px',
    width: '100%',
    textAlign: 'center',
    border: '3px solid #a855f7', // Purple border
    boxShadow: '0 0 50px rgba(168, 85, 247, 0.4), 0 25px 50px -12px rgba(0, 0, 0, 0.8)',
  },
  kidsSafeIcon: {
    fontSize: '4rem',
    marginBottom: '16px',
  },
  kidsSafeTitle: {
    fontSize: '1.75rem',
    fontWeight: '800',
    marginBottom: '20px',
    color: '#e9d5ff', // Light purple text
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
  },
  kidsSafeAlert: {
    backgroundColor: 'rgba(168, 85, 247, 0.2)',
    border: '2px solid rgba(168, 85, 247, 0.5)',
    borderRadius: '16px',
    padding: '20px',
    marginBottom: '20px',
    color: '#f3e8ff',
  },
  kidsSafeDetails: {
    backgroundColor: 'rgba(30, 41, 59, 0.6)',
    border: '1px solid rgba(255, 255, 255, 0.1)',
    borderRadius: '12px',
    padding: '16px',
    marginBottom: '20px',
    textAlign: 'left',
    fontSize: '0.9rem',
  },
  kidsSafeMessage: {
    backgroundColor: 'rgba(251, 191, 36, 0.1)',
    border: '1px solid rgba(251, 191, 36, 0.3)',
    borderRadius: '12px',
    padding: '16px',
    marginBottom: '20px',
    color: '#fde68a',
    fontSize: '0.95rem',
    lineHeight: '1.5',
  },
  kidsSafeQuestion: {
    fontSize: '1.1rem',
    fontWeight: '600',
    color: '#f8fafc',
    marginBottom: '24px',
  },
  kidsSafeActions: {
    display: 'flex',
    gap: '12px',
    flexDirection: 'column',
  },
  kidsSafeCancelBtn: {
    padding: '16px 24px',
    borderRadius: '12px',
    border: '2px solid rgba(34, 197, 94, 0.4)',
    background: 'linear-gradient(145deg, rgba(20, 83, 45, 0.4) 0%, rgba(6, 78, 59, 0.6) 100%)',
    color: '#86efac',
    fontWeight: '700',
    cursor: 'pointer',
    fontSize: '1rem',
    transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.1)',
    textTransform: 'uppercase',
    letterSpacing: '0.025em',
    textShadow: '0 1px 2px rgba(0, 0, 0, 0.3)',
    ':hover': {
      borderColor: 'rgba(34, 197, 94, 0.6)',
      background: 'linear-gradient(145deg, rgba(22, 163, 74, 0.5) 0%, rgba(5, 150, 105, 0.7) 100%)',
      transform: 'translateY(-2px) scale(1.01)',
      boxShadow: '0 8px 20px -5px rgba(34, 197, 94, 0.4)',
    },
  },
  kidsSafeProceedBtn: {
    padding: '16px 24px',
    borderRadius: '12px',
    border: '2px solid rgba(239, 68, 68, 0.4)',
    background: 'linear-gradient(145deg, rgba(127, 29, 29, 0.4) 0%, rgba(153, 27, 27, 0.6) 100%)',
    color: '#fca5a5',
    fontWeight: '700',
    cursor: 'pointer',
    fontSize: '1rem',
    transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.05)',
    textTransform: 'uppercase',
    letterSpacing: '0.025em',
    textShadow: '0 1px 2px rgba(0, 0, 0, 0.3)',
    ':hover': {
      borderColor: 'rgba(239, 68, 68, 0.6)',
      background: 'linear-gradient(145deg, rgba(185, 28, 28, 0.5) 0%, rgba(220, 38, 38, 0.7) 100%)',
      transform: 'translateY(-2px) scale(1.01)',
      boxShadow: '0 8px 20px -5px rgba(239, 68, 68, 0.4)',
    },
  },
  // Name Modal Styles
  nameModalOverlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(2, 6, 23, 0.9)',
    backdropFilter: 'blur(8px)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 2500,
    padding: '20px',
  },
  nameModal: {
    backgroundColor: '#1e293b',
    padding: '40px',
    borderRadius: '24px',
    maxWidth: '450px',
    width: '100%',
    textAlign: 'center',
    border: '1px solid rgba(56, 189, 248, 0.3)',
    boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
  },
  nameModalIcon: {
    fontSize: '3.5rem',
    marginBottom: '16px',
  },
  nameModalTitle: {
    fontSize: '1.5rem',
    fontWeight: '800',
    marginBottom: '12px',
    color: '#f8fafc',
  },
  nameModalText: {
    color: '#94a3b8',
    marginBottom: '24px',
    fontSize: '1rem',
  },
  nameModalInput: {
    width: '100%',
    padding: '16px 20px',
    borderRadius: '12px',
    border: '1px solid rgba(56, 189, 248, 0.3)',
    backgroundColor: '#0f172a',
    color: '#f8fafc',
    fontSize: '1rem',
    marginBottom: '12px',
    outline: 'none',
    textAlign: 'center',
    boxSizing: 'border-box',
  },
  nameModalHint: {
    color: '#64748b',
    fontSize: '0.8rem',
    marginBottom: '24px',
    fontStyle: 'italic',
  },
  nameModalActions: {
    display: 'flex',
    gap: '12px',
  },
  nameModalCancel: {
    flex: 1,
    padding: '14px 20px',
    borderRadius: '12px',
    border: '1px solid rgba(255, 255, 255, 0.1)',
    backgroundColor: 'transparent',
    color: '#94a3b8',
    cursor: 'pointer',
    fontSize: '0.95rem',
    transition: 'all 0.2s',
  },
  nameModalConfirm: {
    flex: 1,
    padding: '14px 20px',
    borderRadius: '12px',
    border: 'none',
    background: 'linear-gradient(135deg, #38bdf8 0%, #818cf8 100%)',
    color: '#0f172a',
    fontWeight: '700',
    cursor: 'pointer',
    fontSize: '0.95rem',
    transition: 'all 0.2s',
  },
  // Device Selector Styles
  deviceOverlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(2, 6, 23, 0.95)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 5000,
    padding: '20px',
    backdropFilter: 'blur(15px)',
  },
  deviceTypeCount: {
    width: '40px',
    fontSize: '1rem',
    fontWeight: '800',
    color: '#38bdf8',
    textAlign: 'right',
  },
  communitySection: {
    width: '100%',
    padding: '40px',
    backgroundColor: 'rgba(15, 23, 42, 0.4)',
    borderRadius: '32px',
    border: '1px solid rgba(255,255,255,0.05)',
    backdropFilter: 'blur(10px)',
  },
  communityGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))',
    gap: '40px',
  },
  feedbackFormWrapper: {
    display: 'flex',
    flexDirection: 'column',
    gap: '15px',
  },
  communityTitle: {
    fontSize: '1.5rem',
    fontWeight: '800',
    margin: 0,
    color: '#fff',
  },
  communitySub: {
    color: '#94a3b8',
    fontSize: '0.95rem',
    margin: 0,
  },
  quickStars: {
    display: 'flex',
    gap: '8px',
    margin: '10px 0',
  },
  formEmbed: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
    backgroundColor: 'rgba(0,0,0,0.2)',
    padding: '20px',
    borderRadius: '20px',
  },
  mainFeedbackInput: {
    backgroundColor: '#0f172a',
    border: '1px solid #334155',
    borderRadius: '12px',
    padding: '12px',
    color: '#fff',
    minHeight: '80px',
    outline: 'none',
    fontSize: '0.9rem',
  },
  miniCaptcha: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    fontSize: '0.85rem',
    color: '#38bdf8',
    fontWeight: '600',
  },
  miniCaptchaInput: {
    width: '60px',
    padding: '8px',
    borderRadius: '8px',
    border: '1px solid #334155',
    backgroundColor: '#0f172a',
    color: '#fff',
    textAlign: 'center',
  },
  submitExperienceBtn: {
    backgroundColor: '#38bdf8',
    color: '#0f172a',
    border: 'none',
    borderRadius: '12px',
    padding: '12px',
    fontWeight: '800',
    cursor: 'pointer',
    transition: 'all 0.2s',
    marginTop: '5px',
  },
  experienceWall: {
    display: 'flex',
    flexDirection: 'column',
    gap: '20px',
  },
  wallContent: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '15px',
    overflowY: 'auto',
    maxHeight: '400px',
    paddingRight: '10px',
  },
  experienceCard: {
    backgroundColor: 'rgba(30, 41, 59, 0.4)',
    padding: '15px',
    borderRadius: '16px',
    border: '1px solid rgba(255,255,255,0.03)',
  },
  experienceHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    marginBottom: '8px',
  },
  experienceName: {
    fontSize: '0.85rem',
    fontWeight: '700',
    color: '#38bdf8',
  },
  experienceRating: {
    fontSize: '0.75rem',
  },
  experienceText: {
    fontSize: '0.85rem',
    color: '#cbd5e1',
    lineHeight: '1.4',
    margin: 0,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    display: '-webkit-box',
    WebkitLineClamp: 3,
    WebkitBoxOrient: 'vertical',
  },
  noFeedback: {
    gridColumn: '1 / -1',
    color: '#64748b',
    textAlign: 'center',
    padding: '40px',
  }
};

export default App;
