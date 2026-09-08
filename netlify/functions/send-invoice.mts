import type { Config } from '@netlify/functions'
import nodemailer from 'nodemailer'

type NotificationResult = {
  success: boolean
  error?: string
  messageId?: string
}

type SendInvoiceBody = {
  to?: string
  subject?: string
  html?: string
  text?: string
  telegramMessage?: string
  sendTelegram?: boolean
}

const jsonResponse = (body: unknown, status = 200) =>
  Response.json(body, {
    status,
    headers: {
      'Cache-Control': 'no-store',
    },
  })

const errorMessage = (error: unknown) =>
  error instanceof Error ? error.message : 'Unknown notification error'

async function sendTelegramMessage(message: string) {
  const token = process.env.TELEGRAM_BOT_TOKEN?.trim()
  const chatId = process.env.TELEGRAM_CHAT_ID?.trim()

  if (!token || !chatId) {
    throw new Error('Telegram settings are missing in the Netlify environment.')
  }

  const response = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: chatId,
      text: message,
      parse_mode: 'HTML',
    }),
  })

  const result = await response.json().catch(() => null) as { ok?: boolean; description?: string } | null

  if (!response.ok || !result?.ok) {
    throw new Error(result?.description || `Telegram request failed with status ${response.status}.`)
  }
}

async function sendEmail(body: SendInvoiceBody): Promise<NotificationResult> {
  const smtpUser = process.env.SMTP_USER?.trim()
  const smtpPass = process.env.SMTP_PASS?.trim()

  if (!smtpUser || !smtpPass) {
    throw new Error('SMTP settings are missing in the Netlify environment.')
  }

  const secure =
    process.env.SMTP_USE_SSL?.trim().toLowerCase() === 'true' ||
    process.env.SMTP_SECURE?.trim().toLowerCase() === 'true'

  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST?.trim() || 'smtp.gmail.com',
    port: Number(process.env.SMTP_PORT || (secure ? 465 : 587)),
    secure,
    auth: {
      user: smtpUser,
      pass: smtpPass,
    },
  })

  const info = await transporter.sendMail({
    from: process.env.EMAIL_FROM?.trim() || `"Dara Pichmony Water Station" <${smtpUser}>`,
    to: body.to,
    subject: body.subject,
    text: body.text || 'Your Dara Pichmony invoice is ready.',
    html: body.html || '<p>Your Dara Pichmony invoice is ready.</p>',
  })

  return { success: true, messageId: info.messageId }
}

export default async (request: Request) => {
  if (request.method !== 'POST') {
    return jsonResponse({ success: false, message: 'Method not allowed.' }, 405)
  }

  let body: SendInvoiceBody

  try {
    body = await request.json() as SendInvoiceBody
  } catch {
    return jsonResponse({ success: false, message: 'Invalid JSON request body.' }, 400)
  }

  const results: { email: NotificationResult | null; telegram: NotificationResult | null } = {
    email: null,
    telegram: null,
  }
  const errors: string[] = []

  if (body.to && body.subject) {
    try {
      results.email = await sendEmail(body)
    } catch (error) {
      const message = errorMessage(error)
      console.error('Email notification failed:', message)
      errors.push(`Email: ${message}`)
      results.email = { success: false, error: message }
    }
  }

  if (body.sendTelegram !== false && body.telegramMessage) {
    try {
      await sendTelegramMessage(body.telegramMessage)
      results.telegram = { success: true }
    } catch (error) {
      const message = errorMessage(error)
      console.error('Telegram notification failed:', message)
      errors.push(`Telegram: ${message}`)
      results.telegram = { success: false, error: message }
    }
  }

  if (!results.email && !results.telegram) {
    return jsonResponse({ success: false, message: 'No notification was requested.', results }, 400)
  }

  const emailOk = !results.email || results.email.success
  const telegramOk = !results.telegram || results.telegram.success

  if (emailOk && telegramOk) {
    return jsonResponse({ success: true, message: 'Invoice sent successfully.', results })
  }

  if (!emailOk && !telegramOk) {
    return jsonResponse({ success: false, message: 'Both email and Telegram failed.', errors, results }, 500)
  }

  return jsonResponse({
    success: true,
    message: 'Invoice sent with partial success.',
    errors,
    results,
  })
}

export const config: Config = {
  path: '/api/send-invoice',
}
