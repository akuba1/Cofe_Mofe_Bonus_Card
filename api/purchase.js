// pages/api/purchase.js

import 'dotenv/config';
import fetch, { Request, Response } from 'node-fetch';  
if (!global.fetch) {
  global.fetch   = fetch;
  global.Request = Request;
  global.Response = Response;
}

import { createClient } from '@supabase/supabase-js';

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

    // 1) Атомарный increment
    const { data: incRows, error: incErr } = await supabase
      .from('clients')
      .increment('purchases', 1)
      .eq('id', clientId)
      .select();

    if (incErr) throw incErr;

    if (incRows.length > 0) {
      purchases = incRows[0].purchases;
    } else {
      // 2) Новая запись для первого кофейного клиента
      const { data: insRows, error: insErr } = await supabase
        .from('clients')
        .insert({ id: clientId, purchases: 1 })
        .select();

      if (insErr) throw insErr;
      purchases = insRows[0].purchases;
    }

    // 3) Бонусная логика
    let bonus = false;
    if (purchases === 7) {
      bonus = true;
      await supabase.from('notifications').insert({
        client_id: clientId,
        type: 'bonus_awarded'
      });
      await sendTelegramMessage(`🎉 Клиент *${clientId}* получил 7-й кофе!`);
    }

    return res.status(200).json({
      purchases,
      remaining: bonus ? 0 : 7 - purchases,
      bonus
    });

  } catch (err) {
    console.error('API /purchase error:', err);
    return res.status(500).json({ error: err.message });
  }
}
