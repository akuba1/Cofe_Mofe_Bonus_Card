import { useEffect, useState } from 'react'

export default function Admin() {
  const [requests, setRequests] = useState([])
  const [error, setError]       = useState('')

  useEffect(() => {
    fetch('/api/admin/purchases')
      .then(r => r.json())
      .then(setRequests)
      .catch(e => setError(e.message))
  }, [])

  async function confirm(id) {
    await fetch('/api/admin/purchases', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id })
    })
    setRequests(r => r.filter(x => x.id !== id))
  }

  if (error) return <p style={{ color: 'red' }}>Ошибка: {error}</p>

  return (
    <main style={{ padding: 20 }}>
      <h1>Панель баристы</h1>
      {requests.length === 0 && <p>Заявок нет</p>}
      <ul>
        {requests.map(r => (
          <li key={r.id} style={{ margin: '12px 0' }}>
            Клиент: {r.client_id}, чашек: {r.quantity}, 
            запрос: {new Date(r.requested_at).toLocaleString()}
            <button onClick={() => confirm(r.id)} style={{ marginLeft: 12 }}>
              Подтвердить
            </button>
          </li>
        ))}
      </ul>
    </main>
  )
}
