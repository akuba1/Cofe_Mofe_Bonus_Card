// pages/index.js
import { useState, useEffect } from 'react'
import { useRouter } from 'next/router'

export default function Home() {
  const router = useRouter()
  const { clientId: urlClientId } = router.query

  const [phase, setPhase] = useState('initRegistration')
  const [phone, setPhone] = useState('')
  const [name, setName] = useState('')
  const [client, setClient] = useState(null)
  const [quantity, setQuantity] = useState(1)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  // Определяем фазу при готовности роутера
  useEffect(() => {
    if (!router.isReady) return
    setPhase(urlClientId ? 'loadingClient' : 'initRegistration')
  }, [router.isReady, urlClientId])

  // Загрузка профиля клиента по clientId из URL
  useEffect(() => {
    if (phase !== 'loadingClient' || !urlClientId) return
    fetch(`/api/client/${urlClientId}`)
      .then(res => res.json())
      .then(data => {
        if (data.error) throw new Error(data.error)
        setClient(data)
        setPhase('purchase')
      })
      .catch(() => {
        setError('Не удалось загрузить клиента')
        setPhase('initRegistration')
      })
  }, [phase, urlClientId])

  // Регистрация/поиск клиента
  async function handleRegister(e) {
    e.preventDefault()
    setError(''); setLoading(true)
    try {
      const res = await fetch('/api/client', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone, name })
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setClient(data)
      setPhase('purchase')
      router.replace(`/?clientId=${data.id}`, undefined, { shallow: true })
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  // Создание заявки на покупку
  async function handlePurchase(e) {
    e.preventDefault()
    setError(''); setMessage(''); setLoading(true)
    try {
      const res = await fetch('/api/purchase', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ clientId: client.id, quantity })
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error)
      setMessage(`Заявка принята: ${quantity} чашек.`)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  // Рендер по фазе
  if (error) return <p style={{ color: 'red' }}>Ошибка: {error}</p>
  if (phase === 'initRegistration') {
    return (
      <main style={{ padding: 20 }}>
        <h1>Регистрация клиента</h1>
        <form onSubmit={handleRegister}>
          <input
            type="tel"
            placeholder="Телефон"
            value={phone}
            onChange={e => setPhone(e.target.value)}
            required
          />
          <input
            type="text"
            placeholder="Имя (необязательно)"
            value={name}
            onChange={e => setName(e.target.value)}
          />
          <button disabled={loading}>
            {loading ? '...' : 'Зарегистрироваться'}
          </button>
        </form>
      </main>
    )
  }
  if (phase === 'loadingClient') {
    return <p>Загрузка клиента…</p>
  }
  if (phase === 'purchase' && client) {
    return (
      <main style={{ padding: 20 }}>
        <h1>Привет, {client.name || client.phone}!</h1>
        <form onSubmit={handlePurchase}>
          <input
            type="number"
            min="1"
            value={quantity}
            onChange={e => setQuantity(+e.target.value)}
          />
          <button disabled={loading}>
            {loading ? '...' : 'Отметить покупку'}
          </button>
        </form>
        {message && <p style={{ color: 'green' }}>{message}</p>}
      </main>
    )
  }
  return null
}
