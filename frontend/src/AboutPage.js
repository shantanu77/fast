import React from 'react';
import { Link } from 'react-router-dom';

function AboutPage() {
  return (
    <div style={styles.container}>
      <header style={styles.header}>
        <Link to="/" style={styles.backLink}>← Back to Scanner</Link>
      </header>

      <main style={styles.main}>
        <section style={styles.heroSection} className="animate-fade-in">
          <div style={styles.avatarWrapper}>
            <img src="/ashwat.jpg" alt="Aashvath Singh" style={styles.avatar} onError={(e) => e.target.style.display='none'} />
            <div style={styles.statusBadge}>🚀 Online</div>
          </div>
          <h1 style={styles.name}>Aashvath Singh</h1>
          <p style={styles.title}>10-Year-Old Developer & Tech Visionary</p>
          <div style={styles.tagline}>Building the future, one line of code at a time.</div>
        </section>

        <section style={styles.contentGrid}>
          <div 
            style={{...styles.bioCard, animationDelay: '0.1s'}} 
            className="glass-card animate-fade-in"
          >
            <h2 style={styles.sectionTitle}>About Me</h2>
            <p style={styles.text}>
              Hi! I'm Aashvath, a student at <strong>Heritage Experiential School, Gurgaon</strong>. 
              While most people see my age, I see possibilities. I started Fast Scanner because 
              I wanted to make the internet a safer and faster place for everyone.
            </p>
            <p style={styles.text}>
              I love exploring complex systems and turning them into simple, beautiful experiences. 
              When I'm not coding, you'll probably find me on the basketball court or diving 
              into virtual worlds.
            </p>
          </div>

          <div style={styles.hobbiesGrid}>
            <HobbyCard 
              emoji="💻" 
              title="Coding" 
              desc="Building high-performance security tools and modern web applications." 
              color="#38bdf8"
              delay="0.2s"
            />
            <HobbyCard 
              emoji="🏀" 
              title="Basketball" 
              desc="I love the strategy and energy of the game. Always hitting the court!" 
              color="#f97316"
              delay="0.3s"
            />
            <HobbyCard 
              emoji="🥽" 
              title="VR Gaming" 
              desc="Exploring virtual realities and the future of immersive tech." 
              color="#a855f7"
              delay="0.4s"
            />
            <HobbyCard 
              emoji="🎵" 
              title="Music" 
              desc="Music keeps me focused while coding. I love hearing new beats." 
              color="#4ade80"
              delay="0.5s"
            />
            <HobbyCard 
              emoji="📺" 
              title="My Channel" 
              desc="Sharing my journey and tech tutorials with the world. Check it out!" 
              color="#ef4444"
              delay="0.6s"
            />
          </div>
        </section>

        <footer style={styles.footer}>
          <p>© 2026 Aashvath Singh. Built with passion and curiosity.</p>
        </footer>
      </main>
    </div>
  );
}

const HobbyCard = ({ emoji, title, desc, color, delay }) => (
  <div 
    style={{...styles.hobbyCard, borderLeft: `4px solid ${color}`, animationDelay: delay}} 
    className="glass-card animate-fade-in card-hover"
  >
    <div style={styles.hobbyEmoji}>{emoji}</div>
    <div style={styles.hobbyContent}>
      <h3 style={styles.hobbyTitle}>{title}</h3>
      <p style={styles.hobbyDesc}>{desc}</p>
    </div>
  </div>
);

const styles = {
  container: {
    minHeight: '100vh',
    color: '#f8fafc',
    padding: '40px 20px',
    maxWidth: '1000px',
    margin: '0 auto',
    fontFamily: "'Outfit', sans-serif",
  },
  header: {
    marginBottom: '40px',
  },
  backLink: {
    color: '#38bdf8',
    textDecoration: 'none',
    fontWeight: '600',
    fontSize: '0.95rem',
    transition: 'opacity 0.2s',
  },
  main: {
    display: 'flex',
    flexDirection: 'column',
    gap: '60px',
  },
  heroSection: {
    textAlign: 'center',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '20px',
  },
  avatarWrapper: {
    position: 'relative',
    padding: '8px',
    background: 'linear-gradient(135deg, #38bdf8 0%, #818cf8 100%)',
    borderRadius: '50%',
    boxShadow: '0 20px 40px rgba(56, 189, 248, 0.3)',
  },
  avatar: {
    width: '180px',
    height: '180px',
    borderRadius: '50%',
    objectFit: 'cover',
    display: 'block',
    border: '4px solid #0f172a',
  },
  statusBadge: {
    position: 'absolute',
    bottom: '10px',
    right: '10px',
    backgroundColor: '#065f46',
    color: '#4ade80',
    padding: '6px 14px',
    borderRadius: '20px',
    fontSize: '0.8rem',
    fontWeight: '700',
    border: '2px solid #0f172a',
  },
  name: {
    fontSize: '3.5rem',
    margin: 0,
    fontWeight: '900',
    letterSpacing: '-2px',
    background: 'linear-gradient(to right, #fff, #94a3b8)',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
  },
  title: {
    fontSize: '1.2rem',
    color: '#38bdf8',
    margin: 0,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: '2px',
  },
  tagline: {
    fontSize: '1.1rem',
    color: '#64748b',
    fontStyle: 'italic',
  },
  contentGrid: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '40px',
    '@media (maxWidth: 800px)': {
      gridTemplateColumns: '1fr',
    },
  },
  bioCard: {
    backgroundColor: 'rgba(30, 41, 59, 0.4)',
    padding: '40px',
    borderRadius: '32px',
    border: '1px solid rgba(255,255,255,0.05)',
  },
  sectionTitle: {
    fontSize: '2rem',
    marginBottom: '24px',
    color: '#fff',
  },
  text: {
    fontSize: '1.1rem',
    lineHeight: '1.7',
    color: '#cbd5e1',
    marginBottom: '20px',
  },
  hobbiesGrid: {
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
  },
  hobbyCard: {
    backgroundColor: 'rgba(30, 41, 59, 0.2)',
    padding: '20px',
    borderRadius: '20px',
    display: 'flex',
    alignItems: 'center',
    gap: '20px',
    transition: 'transform 0.2s',
  },
  hobbyEmoji: {
    fontSize: '2rem',
  },
  hobbyContent: {
    flex: 1,
  },
  hobbyTitle: {
    fontSize: '1.1rem',
    margin: '0 0 4px 0',
    color: '#fff',
  },
  hobbyDesc: {
    fontSize: '0.9rem',
    margin: 0,
    color: '#94a3b8',
    lineHeight: '1.4',
  },
  footer: {
    textAlign: 'center',
    paddingTop: '60px',
    borderTop: '1px solid rgba(255,255,255,0.05)',
    color: '#64748b',
    fontSize: '0.9rem',
  }
};

export default AboutPage;
