import React, { useEffect, useState } from 'react';

function App() {
  const [apiStatus, setApiStatus] = useState('Loading...');

  useEffect(() => {
    fetch('/api/health')
      .then((res) => res.json())
      .then((data) => setApiStatus(data.message))
      .catch(() => setApiStatus('API not reachable'));
  }, []);

  return (
    <div style={{ textAlign: 'center', marginTop: '100px', fontFamily: 'sans-serif' }}>
      <h1>Fast - Web Performance Checker</h1>
      <p>Hello World!</p>
      <p style={{ color: '#666' }}>Backend: {apiStatus}</p>
    </div>
  );
}

export default App;
