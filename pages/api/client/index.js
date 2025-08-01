// pages/api/client/index.js
import 'dotenv/config'
import { createClient } from '@supabase/supabase-js'

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST'])
    return res.status(405).json({ error: `Method ${req.method} Not Allowed` })
  }

  const { phone, name } = req.body

  if (!phone) {
    return res.status(400).json({ error: 'Поле "phone" обязательно' })
  }

  // Ищем существующего клиента
  const { data: existingClient, error: fetchErr } = await supabase
    .from('clients')
    .select('id, phone, name')
    .eq('phone', phone)
    .maybeSingle()

  if (fetchErr) {
    console.error('Ошибка выборки клиента:', fetchErr)
    return res
      .status(500)
      .json({ error: 'Не удалось получить данные клиента' })
  }

  if (existingClient) {
    return res.status(200).json(existingClient)
  }

  // Создаём нового
  const { data: newClient, error: insertErr } = await supabase
    .from('clients')
    .insert({ phone, name })
    .select('id, phone, name')
    .maybeSingle()

  if (insertErr) {
    console.error('Ошибка создания клиента:', insertErr)
    return res
      .status(500)
      .json({ error: 'Не удалось создать клиента' })
  }

  return res.status(200).json(newClient)
}
