import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

export default async function handler(req, res) {
  if (req.method === 'GET') {
    // Вернуть список всех заявок pending
    const { data, error } = await supabase
      .from('purchases')
      .select('id, client_id, quantity, requested_at')
      .eq('status', 'pending')
      .order('requested_at', { ascending: false })
    if (error) return res.status(500).json({ error: error.message })
    return res.status(200).json(data)
  }

  if (req.method === 'POST') {
    const { id } = req.body
    // 1) Обновить статус заявки
    const { error: updateErr } = await supabase
      .from('purchases')
      .update({ status: 'confirmed', confirmed_at: new Date().toISOString() })
      .eq('id', id)
    if (updateErr) {
      console.error('Confirm purchase error:', updateErr)
      return res.status(500).json({ error: updateErr.message })
    }

    // 2) Прокинуть бонусную логику
    //    (подсчёт подтверждённых покупок и уведомление, если порог)
    await processConfirmedPurchase(id)

    return res.status(200).json({ success: true })
  }

  res.setHeader('Allow', ['GET','POST'])
  res.status(405).end()
}
