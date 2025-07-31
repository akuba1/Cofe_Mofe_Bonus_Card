import 'dotenv/config'
import { createClient } from '@supabase/supabase-js'

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
  // 1) Разрешаем только POST
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST'])
    return res
      .status(405)
      .json({ error: `Method ${req.method} Not Allowed` })
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
    // 3.1) Читаем текущие покупки клиента
const { data: existing, error: selectErr } = await supabase
  .from('clients')
  .select('purchases')
  .eq('id', clientId)
  .maybeSingle()

if (selectErr) {
  console.error('DB read error:', selectErr)
  throw selectErr
}

let purchases

if (existing) {
  // 3.2) Обновляем счётчик на +1
  purchases = existing.purchases + 1
  const { error: updateErr } = await supabase
    .from('clients')
    .update({ purchases })
    .eq('id', clientId)

  if (updateErr) {
    console.error('DB update error:', updateErr)
    throw updateErr
  }

} else {
  // 3.3) Создаём новую запись с purchases = 1
  purchases = 1
  const { error: insertErr } = await supabase
    .from('clients')
    .insert({ id: clientId, purchases })

  if (insertErr) {
    console.error('DB insert error:', insertErr)
    throw insertErr
  }
}

// 3.4) Бонусная логика
const bonus    = purchases === 7
const remaining = bonus ? 0 : 7 - purchases

if (bonus) {
  await supabase.from('notifications').insert({
    client_id: clientId,
    type: 'bonus_awarded'
  })
  await sendTelegramMessage(
    `🎉 Клиент *${clientId}* заработал 7-й бонусный кофе!`
  )
}

// 3.5) Возвращаем ответ
return res.status(200).json({ purchases, remaining, bonus })

  } catch (err) {
    console.error('API /purchase error:', err)
    return res.status(500).json({ error: err.message })
  }
}
