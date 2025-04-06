async function setWebhook(env) {
  try {
    const res = await fetch(`https://api.telegram.org/bot${env.TELEGRAM_TOKEN}/setWebhook`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ url: env.WORKER_URL }),
    });
    const data = await res.json();
    if (!data.ok) throw new Error(data.description);
    console.log('✅ Webhook set:', data);
  } catch (err) {
    console.error('❌ Webhook error:', err.message);
  }
}

setWebhook(process.env);
