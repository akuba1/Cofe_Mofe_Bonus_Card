// pages/index.js
import { useState } from 'react';

export default function Home() {
  const [clientId, setClientId] = useState('');
  const [result, setResult] = useState('');

  async function handleSubmit(e) {
    e.preventDefault();
    if (!clientId.trim()) {
      setResult('Введите clientId');
      return;
    }

    setResult('⏳ Обработка...');

    try {
      const res = await fetch('/api/purchase', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ clientId: clientId.trim() }),
      });
      const data = await res.json();

      if (res.ok) {
        setResult(`
🛍️ Покупок: ${data.purchases}
🎯 До бонуса: ${data.remaining}
${data.bonus ? '🎉 Бонус выдан!' : ''}
        `);
      } else {
        setResult(`Ошибка: ${data.error}`);
      }
    } catch (err) {
      console.error(err);
      setResult('Сервер недоступен');
    }
  }

  return (
    <div style={styles.container}>
      <h1>☕️ Кофейная бонусная карта</h1>
      <form onSubmit={handleSubmit} style={styles.form}>
        <input
          type="text"
          placeholder="Введите clientId"
          value={clientId}
          onChange={e => setClientId(e.target.value)}
          style={styles.input}
          required
        />
        <button type="submit" style={styles.button}>
          Записать покупку
        </button>
      </form>
      <pre style={styles.result}>{result}</pre>
    </div>
  );
}

const styles = {
  container: {
    fontFamily: 'sans-serif',
    padding: 40,
    background: '#f8f8f8',
    height: '100vh',
  },
  form: { marginBottom: 20 },
  input: { padding: 8, fontSize: 16, width: 300 },
  button: { padding: '8px 16px', fontSize: 16, marginLeft: 10 },
  result: { fontSize: 18, whiteSpace: 'pre-wrap' },
};
