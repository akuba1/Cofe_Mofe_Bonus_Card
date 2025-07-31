import { useState } from 'react'

export default function Home() {
  const [phone, setPhone] = useState('')
  const [name, setName]   = useState('')
  const [status, setStatus] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError]   = useState('')

  const handleSubmit = async e => {
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
      if (!res.ok) throw new Error(json.error || 'Error')
      setStatus(json)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  if (status) {
    return (
      <main style={{ padding: 16 }}>
        <h1>Ваш бонус-статус</h1>
        <p>Клиент: {status.name || status.phone}</p>
        <p>Покупок: {status.purchases}</p>
        <p>До бонуса осталось: {status.remaining}</p>
        {status.hasBonus && <p>🎉 Бонусный кофе готов!</p>}
        <button onClick={() => window.location.reload()}>Новая отметка</button>
      </main>
    )
  }

  return (
    <main style={{ padding: 16 }}>
      <h1>Программа лояльности</h1>
      <p>Совершите 6 покупок в течение 30 дней и получите бонусный кофе.</p>
      <form onSubmit={handleSubmit}>
        <input
          type="tel"
          placeholder="Введите телефон"
          value={phone}
          onChange={e => setPhone(e.target.value)}
          required
        />
        <input
          type="text"
          placeholder="Введите имя (необязательно)"
          value={name}
          onChange={e => setName(e.target.value)}
        />
        <button type="submit" disabled={loading}>
          {loading ? 'Отмечаем…' : 'Отметить покупку'}
        </button>
      </form>
      {error && <p style={{ color: 'red' }}>{error}</p>}
    </main>
)
}
