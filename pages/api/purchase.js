import 'dotenv/config'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

async function sendTelegramMessage(text) {
  if (!process.env.TELEGRAM_BOT_TOKEN || !process.env.TELEGRAM_CHAT_ID) return
  await fetch(
    `https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/sendMessage`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: process.env.TELEGRAM_CHAT_ID,
        text,
        parse_mode: 'Markdown'
      })
    }
  )
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST'])
    return res.status(405).end()
  }

  const { phone, name } = req.body
  if (!phone) {
    return res.status(400).json({ error: 'Phone is required' })
  }

  // 1) upsert: вставляем или обновляем клиента по phone и сразу получаем id
  const { data: client, error: upsertErr } = await supabase
    .from('clients')
    .upsert({ phone, name }, { onConflict: 'phone' })
    .select('id, name')
    .single()

  if (upsertErr) {
    console.error('Upsert client error:', upsertErr)
    return res.status(500).json({ error: upsertErr.message })
  }

  // Вставляем покупку
  const { error: purchaseErr } = await supabase
    .from('purchases')
    .insert({ client_id: client.id })

  if (purchaseErr) {
    console.error(purchaseErr)
    return res.status(500).json({ error: purchaseErr.message })
  }

  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()
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

  if (hasBonus) {
    await supabase.from('notifications').insert({
      client_id: client.id,
      type: 'bonus_ready'
    })
    await sendTelegramMessage(
      `🎉 Клиент ${phone} достиг ${THRESHOLD} покупок!`
    )
  }

  return res.status(200).json({ purchases, remaining, hasBonus, name: client.name })
}