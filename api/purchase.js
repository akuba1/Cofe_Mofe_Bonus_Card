import { createClient } from '@supabase/supabase-js';

console.log("ENV SUPABASE_URL:", process.env.SUPABASE_URL);
console.log(
  "ENV SUPABASE_ANON_KEY:",
  process.env.SUPABASE_ANON_KEY
    ? process.env.SUPABASE_ANON_KEY.slice(0, 10) + "..."
    : undefined
);

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

async function sendTelegramMessage(text) {
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
  );
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const { clientId } = req.body;
  if (!clientId) {
    return res.status(400).json({ error: 'clientId is required' });
  }

  try {
    const { data, error } = await supabase
      .from('clients')
      .upsert({ id: clientId }, { onConflict: 'id' })
      .increment('purchases', 1)
      .select()
      .single();
    if (error) throw error;

    const purchases = data.purchases;
    let bonus = false;

    if (purchases === 7) {
      bonus = true;
      await supabase.from('notifications').insert({
        client_id: clientId,
        type: 'bonus_awarded'
      });
      await sendTelegramMessage(
        `🎉 Клиент *${clientId}* получил 7-й кофе!`
      );
    }

    return res.status(200).json({
      purchases,
      remaining: bonus ? 0 : 7 - purchases,
      bonus
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: err.message });
  }
}
