import { useEffect, useState } from 'react'
import { useRouter } from 'next/router'

export default function Home() {
  const { query } = useRouter()
  const [client, setClient]     = useState(null)
  const [quantity, setQuantity] = useState(1)
  const [message, setMessage]   = useState('')
  const [error, setError]       = useState('')
  const [loading, setLoading]   = useState(false)

  // 1) При заходе из QR (…?clientId=xxx) — забираем клиента
  useEffect(() => {
    if (!query.clientId) return
    fetch(`/api/client/${query.clientId}`)
      .then(r => r.json())
      .then(data => {
        if (data.error) throw new Error(data.error)
        setClient(data)
      })
      .catch(err => setError(err.message))
  }, [query.clientId])

  // 2) Отправляем заявку
  async function handleSubmit(e) {
    e.preventDefault()
    setLoading(true)
    setError('')
    setMessage('')

    try {
      const res = await fetch('/api/purchase', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ clientId: client.id, quantity })
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error)
      setMessage(`Заявка принята: ${quantity} кофе. Ожидает подтверждения.`)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  if (error) return <p style={{ color: 'red' }}>Ошибка: {error}</p>
  if (!client) return <p>Загрузка клиента…</p>

  return (
    <main style={{ maxWidth: 400, margin: 'auto', padding: 20 }}>
      <h1>Привет, {client.name || client.id}!</h1>
      <form onSubmit={handleSubmit}>
        <label>
          Количество кофе:
          <input
            type="number"
            min="1"
            value={quantity}
            onChange={e => setQuantity(+e.target.value)}
            style={{ width: 60, marginLeft: 8 }}
          />
        </label>
        <button disabled={loading} style={{ marginLeft: 12 }}>
          {loading ? '…' : 'Отправить'}
        </button>
      </form>
      {message && <p style={{ color: 'green' }}>{message}</p>}
    </main>
  )
}

