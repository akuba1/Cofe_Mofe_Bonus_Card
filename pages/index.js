// pages/index.js
import { useState, useEffect } from 'react'
import { useRouter } from 'next/router'

export default function Home() {
  const router = useRouter()
  const { clientId: urlClientId } = router.query

  // UI‐состояния
  const [phase, setPhase] = useState(
    urlClientId ? 'loadingClient' : 'initRegistration'
  )
  const [phone, setPhone]     = useState('')
  const [name, setName]       = useState('')
  const [client, setClient]   = useState(null)
  const [quantity, setQuantity] = useState(1)
  const [message, setMessage]   = useState('')
  const [error, setError]     = useState('')
  const [loading, setLoading]   = useState(false)

  // 1) Если URL содержит clientId, подгружаем данные клиента
  useEffect(() => {
    if (phase !== 'loadingClient' || !urlClientId) return

    fetch(`/api/client/${urlClientId}`)
      .then(r => r.json())
      .then(data => {
        if (data.error) throw new Error(data.error)
        setClient(data)           // { id, name, phone }
        setPhase('purchase')      // переходим к отметке покупки
      })
      .catch(err => {
        console.error(err)
        setError('Не удалось загрузить клиента')
        setPhase('initRegistration')
      })
  }, [phase, urlClientId])

  // 2) Регистрация или получение существующего клиента
  async function handleRegister(e) {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      // upsert клиент по телефону + имени
      const res = await fetch('/api/client', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone, name })
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      
      // мы получили { id, name, phone }
      setClient(data)
      // обновляем URL без перезагрузки, чтобы можно было шарить ссылку
      router.replace(`/?clientId=${data.id}`, undefined, { shallow: true })
      setPhase('purchase')
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  // 3) Отметка покупки
  async function handlePurchase(e) {
    e.preventDefault()
    setError('')
    setMessage('')
    setLoading(true)

    try {
      const res = await fetch('/api/purchase', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ clientId: client.id, quantity })
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error)

      setMessage(
        `Заявка принята: ${quantity} чашка(чашек). Ожидает подтверждения бариста.`
      )
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  // Визуализация состояний
  if (error) {
    return <p style={{ color: 'red', padding: 20 }}>Ошибка: {error}</p>
  }

  // Этап регистрации / ввода данных
  if (phase === 'initRegistration') {
    return (
      <main style={{ padding: 20, maxWidth: 400, margin: 'auto' }}>
        <h1>Добро пожаловать!</h1>
        <p>Введите номер телефона и имя для регистрации или поиска профиля.</p>

        <form onSubmit={handleRegister}>
          <label>
            Телефон
            <input
              type="tel"
              value={phone}
              onChange={e => setPhone(e.target.value)}
              required
              style={{ width: '100%', padding: 8, margin: '8px 0' }}
            />
          </label>

          <label>
            Имя (необязательно)
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              style={{ width: '100%', padding: 8, margin: '8px 0' }}
            />
          </label>

          <button type="submit" disabled={loading}>
            {loading ? 'Регистрация…' : 'Зарегистрироваться'}
          </button>
        </form>
      </main>
    )
  }

  // Этап загрузки клиента по URL
  if (phase === 'loadingClient') {
    return <p style={{ padding: 20 }}>Загрузка клиента…</p>
  }

  // Этап отметки покупки
  if (phase === 'purchase' && client) {
    return (
      <main style={{ padding: 20, maxWidth: 400, margin: 'auto' }}>
        <h1>Привет, {client.name || client.phone}!</h1>
        <p>Сколько чашек вы хотите отметить?</p>
        <form onSubmit={handlePurchase}>
          <input
            type="number"
            min="1"
            value={quantity}
            onChange={e => setQuantity(+e.target.value)}
            style={{ width: 60, marginRight: 12 }}
          />
          <button disabled={loading}>
            {loading ? 'Отправка…' : 'Отметить покупку'}
          </button>
        </form>

        {message && (
          <p style={{ color: 'green', marginTop: 12 }}>{message}</p>
        )}
      </main>
    )
  }

  // На всякий случай
  return null
}
