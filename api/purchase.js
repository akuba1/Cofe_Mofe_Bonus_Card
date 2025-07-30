import 'dotenv/config'
import fetch, { Request, Response } from 'node-fetch';

// Polyfill для версальных функций
if (!global.fetch) {
  global.fetch   = fetch;
  global.Request = Request;
  global.Response = Response;
}

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
    let purchases;

    // 1) Пытаемся обновить существующую запись
    const { data: updatedRows, error: updateError } = await supabase
      .from('clients')
      .update({ /* при необходимости поля, например last_seen: new Date().toISOString() */ })
      .increment('purchases', 1)
      .eq('id', clientId)
      .select();

    if (updateError) throw updateError;

    if (updatedRows && updatedRows.length > 0) {
      // если запись есть — берем новое значение
      purchases = updatedRows[0].purchases;
    } else {
      // 2) иначе вставляем новую строку с purchases = 1
      const { data: insertedRows, error: insertError } = await supabase
        .from('clients')
        .insert({ id: clientId, purchases: 1 })
        .select();

      if (insertError) throw insertError;
      purchases = insertedRows[0].purchases;
    }
    // Бонусная логика
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