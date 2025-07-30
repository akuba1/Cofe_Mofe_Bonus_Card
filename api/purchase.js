import 'dotenv/config'
import fetch, { Request, Response } from 'node-fetch'
import { createClient } from '@supabase/supabase-js'

// Подъём fetch в глобальный контекст (если Next.js не предоставляет его)
if (!global.fetch) {
  global.fetch   = fetch
  global.Request = Request
  global.Response = Response
}

// Проверка env-переменных один раз при старте
const {
  SUPABASE_URL,
  SUPABASE_ANON_KEY,
  TELEGRAM_BOT_TOKEN,
  TELEGRAM_CHAT_ID
} = process.env

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  throw new Error('Missing Supabase credentials in environment variables')
}

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

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
  // 1) Отдаём 405, если не POST
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' })
  }

  // 2) Берём тело запроса внутри try/catch
  let clientId
  try {
    ;({ clientId } = req.body)  // ; нужен, если предыдущий оператор не завершён
  } catch (err) {
    console.error('❌ Invalid JSON in request body:', err)
    return res.status(400).json({ error: 'Invalid JSON' })
  }

  if (!clientId) {
    return res.status(400).json({ error: 'clientId is required' })
  }

  // 3) Работа с Supabase и бонусная логика
  try {
    // 3.1) Пытаемся инкрементить поле purchases
    const { data: incRows, error: incErr } = await supabase
      .from('clients')
      .increment('purchases', 1)
      .eq('id', clientId)
      .select('*')

    if (incErr) throw incErr

    let purchases
    if (incRows.length > 0) {
      purchases = incRows[0].purchases
    } else {
      // 3.2) Если клиента нет — создаём с purchases = 1
      const { data: insRows, error: insErr } = await supabase
        .from('clients')
        .insert({ id: clientId, purchases: 1 })
        .select('*')

      if (insErr) throw insErr
      purchases = insRows[0].purchases
    }

    // 3.3) Бонус при 7-м кофе
    let bonus = false
    if (purchases === 7) {
      bonus = true
      await supabase.from('notifications').insert({
        client_id: clientId,
        type: 'bonus_awarded'
      })
      await sendTelegramMessage(
        `🎉 Клиент *${clientId}* получил 7-й кофе!`
      )
    }

    return res.status(200).json({
      purchases,
      remaining: bonus ? 0 : 7 - purchases,
      bonus
    })
  } catch (err) {
    console.error('API /purchase error:', err)
    return res.status(500).json({ error: err.message })
  }
}
