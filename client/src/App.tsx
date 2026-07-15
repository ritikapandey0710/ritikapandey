import { useEffect, useState } from 'react';

function App() {
  const [message, setMessage] = useState<string>('');
  const [health, setHealth] = useState<string>('');

  useEffect(() => {
    // Fetch hello message
    fetch('/api/hello')
      .then((res) => res.json())
      .then((data) => {
        setMessage(data.message);
      })
      .catch((err) => {
        console.error('Error fetching message:', err);
        setMessage('Error loading message');
      });

    // Fetch health check
    fetch('/api/health')
      .then((res) => res.json())
      .then((data) => {
        setHealth(data.status);
      })
      .catch((err) => {
        console.error('Error fetching health:', err);
        setHealth('Error');
      });
  }, []);

  return (
    <div>
      <h1>Hello Desk</h1>
      <p>{message}</p>
      <p>Health check: {health}</p>
    </div>
  );
}

export default App;