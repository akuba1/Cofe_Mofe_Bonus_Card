// pages/index.js
import { useState } from 'react'

export default function Home() {
  const [phone, setPhone] = useState('')
  const [name, setName] = useState('')
  const [status, setStatus] = useState(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const submit = async e => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const res = await fetch('/api/purchase', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone, name })
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Unknown error')
      setStatus(json)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  // Если пришёл статус, показываем результат
  if (status) {
    return (
      <main style={{ padding: 20, maxWidth: 400, margin: 'auto' }}>
        <h1>Ваш бонус-статус</h1>
        <p>Вы купили <strong>{status.purchases}</strong> кофе</p>
        <p>До бонуса осталось <strong>{status.remaining}</strong></p>
        {status.hasBonus && (
          <div style={{ background: '#e0ffe0', padding: 12, margin: '16px 0' }}>
            🎉 Вы заработали бонусный кофе!
          </div>
        )}
        <button onClick={() => window.location.reload()}>
          Отметить ещё раз
        </button>
      </main>
    )
  }

  // Иначе — правила + форма
  return (
    <main style={{ padding: 20, maxWidth: 400, margin: 'auto' }}>
      <h1>Программа лояльности</h1>
      <ol>
        <li>В течение 30 дней совершите 6 покупок.</li>
        <li>Каждая покупка отмечается вводом номера и имени.</li>
        <li>За 6-ю покупку кофе вы получаете бонус.</li>
      </ol>
      <form onSubmit={submit} style={{ marginTop: 20 }}>
        <label>
          Телефон
          <input
            type="tel"
            value={phone}
            onChange={e => setPhone(e.target.value)}
            required
            style={{ width: '100%', padding: 8, marginTop: 6 }}
          />
        </label>
        <label style={{ display: 'block', marginTop: 12 }}>
          Имя (необязательно)
          <input
            type="text"
            value={name}
            onChange={e => setName(e.target.value)}
            style={{ width: '100%', padding: 8 }}
          />
        </label>
        <button
          type="submit"
          disabled={loading}
          style={{ marginTop: 16, padding: '8px 16px' }}
        >
          {loading ? 'Отмечаем…' : 'Отметить покупку'}
        </button>
        {error && (
          <p style={{ color: 'red', marginTop: 12 }}>Ошибка: {error}</p>
        )}
      </form>
    </main>
  )
}
