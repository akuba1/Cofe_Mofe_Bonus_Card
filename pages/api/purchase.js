import 'dotenv/config'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

async function sendTelegramMessage(text) {
  if (!process.env.TELEGRAM_BOT_TOKEN) return
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

  const { clientId, quantity = 1 } = req.body
  if (!clientId) {
    return res.status(400).json({ error: 'clientId is required' })
  }

  // 1) Вставляем заявку в статусе pending
  const { data: purchase, error } = await supabase
    .from('purchases')
    .insert([
      { client_id: clientId, quantity, status: 'pending' }
    ])
    .single()

  if (error) {
    console.error('Insert purchase error:', error)
    return res.status(500).json({ error: error.message })
  }

  // 2) Оповещаем бариста через Telegram
  await sendTelegramMessage(
    `🆕 Новая заявка: клиент ${clientId} запросил ${quantity} кофе.`
  )

  res.status(200).json({ purchaseRequest: purchase })
}
