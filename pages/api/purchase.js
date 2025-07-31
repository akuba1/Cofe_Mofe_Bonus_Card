import 'dotenv/config'
import { createClient } from '@supabase/supabase-js'

 const supabase = createClient(
   process.env.NEXT_PUBLIC_SUPABASE_URL,
   process.env.SUPABASE_SERVICE_ROLE_KEY)

async function sendTelegramMessage(text) {
  if (!TELEGRAM_BOT_TOKEN || !TELEGRAM_CHAT_ID) return
  
  await fetch(
    `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: TELEGRAM_CHAT_ID,
        text,
        parse_mode: 'Markdown'
      })
    }
  )
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST'])
    return res
      .status(405)
      .json({ error: `Method ${req.method} Not Allowed` })
  }

  const { phone, name } = req.body
  if (!phone || !/^\d{7,15}$/.test(phone)) {
    return res.status(400).json({ error: 'Invalid phone' })
  }

  // 1) Найти или создать клиента
  let { data: client, error: clientErr } = await supabase
    .from('clients')
    .select('id, name')
    .eq('phone', phone)
    .maybeSingle()

  if (clientErr) return res.status(500).json({ error: clientErr.message })

  if (!client) {
    const { data, error: insertErr } = await supabase
      .from('clients')
      .insert({ phone, name })
      .single()
    if (insertErr) return res.status(500).json({ error: insertErr.message })
    client = data
  } else if (name && client.name !== name) {
    // Обновим имя, если передано новое
    await supabase
      .from('clients')
      .update({ name })
      .eq('id', client.id)
  }

  // 2) Вставить новую запись о покупке
  const { error: purchaseErr } = await supabase
    .from('purchases')
    .insert({ client_id: client.id })
  if (purchaseErr) return res.status(500).json({ error: purchaseErr.message })

  // 3) Считать покупки за последние 30 дней
  const thirtyDaysAgo = new Date(Date.now() - 30*24*60*60*1000).toISOString()
  const { count, error: countErr } = await supabase
    .from('purchases')
    .select('id', { count: 'exact' })
    .eq('client_id', client.id)
    .gte('created_at', thirtyDaysAgo)
  if (countErr) return res.status(500).json({ error: countErr.message })

  const purchases = count
  const THRESHOLD = 6
  const hasBonus = purchases >= THRESHOLD
  const remaining = hasBonus ? 0 : THRESHOLD - purchases

  // 4) При достижении порога отправка Telegram-уведомления
  if (hasBonus) {
    // вставляем уведомление, сброса не делаем: клиент может продолжить копить
    await supabase.from('notifications').insert({
      client_id: client.id,
      type: 'bonus_ready'
    })
    await sendTelegramMessage(
      `🛎 Клиент "${client.phone}" (${client.name || 'no name'}) достиг ${THRESHOLD} покупок!`
    )
  }

  // 5) Отдаём результат клиенту
  return res.status(200).json({ purchases, remaining, hasBonus })
}
