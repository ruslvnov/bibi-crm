import { logger } from './logger'
import { decrypt } from './encryption'
import { prisma } from './db'
import type { YCloudMessageResult } from '@/types'

const YCLOUD_API_BASE = 'https://api.ycloud.com/v2'
const DEFAULT_TIMEOUT_MS = 10_000
const MAX_RETRIES = 3

interface SendTextOptions {
  to: string
  text: string
  externalId?: string
}

interface SendResult extends YCloudMessageResult {}

async function getApiKey(): Promise<string> {
  const config = await prisma.integrationConfig.findUnique({
    where: { provider: 'ycloud' },
  })
  if (!config?.ycloudApiKeyEncrypted) {
    throw new Error('YCloud API key not configured')
  }
  return decrypt(config.ycloudApiKeyEncrypted)
}

async function getBusinessPhone(): Promise<string> {
  const config = await prisma.integrationConfig.findUnique({
    where: { provider: 'ycloud' },
  })
  if (!config?.ycloudBusinessPhone) {
    throw new Error('YCloud business phone not configured')
  }
  return config.ycloudBusinessPhone
}

async function fetchWithRetry(
  url: string,
  options: RequestInit,
  retries = MAX_RETRIES,
): Promise<Response> {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), DEFAULT_TIMEOUT_MS)

  try {
    const res = await fetch(url, { ...options, signal: controller.signal })
    clearTimeout(timeout)

    // Don't retry on 4xx (client errors)
    if (res.status >= 400 && res.status < 500) return res

    if (!res.ok && retries > 0) {
      const delay = Math.pow(2, MAX_RETRIES - retries) * 500
      logger.warn('YCloud request failed, retrying', { status: res.status, retriesLeft: retries - 1, delay })
      await new Promise((r) => setTimeout(r, delay))
      return fetchWithRetry(url, options, retries - 1)
    }

    return res
  } catch (err) {
    clearTimeout(timeout)
    if (retries > 0 && (err as Error).name !== 'AbortError') {
      const delay = Math.pow(2, MAX_RETRIES - retries) * 500
      logger.warn('YCloud fetch error, retrying', { error: (err as Error).message, retriesLeft: retries - 1 })
      await new Promise((r) => setTimeout(r, delay))
      return fetchWithRetry(url, options, retries - 1)
    }
    throw err
  }
}

export async function sendTextMessage(opts: SendTextOptions): Promise<SendResult> {
  const apiKey = await getApiKey()
  const from = await getBusinessPhone()

  const payload = {
    from,
    to: opts.to,
    type: 'text',
    text: { body: opts.text },
    ...(opts.externalId ? { externalId: opts.externalId } : {}),
  }

  logger.info('Sending YCloud WhatsApp message', {
    to: opts.to,
    externalId: opts.externalId,
    textLength: opts.text.length,
  })

  let rawResponse: unknown
  try {
    const res = await fetchWithRetry(`${YCLOUD_API_BASE}/whatsapp/messages/sendDirectly`, {
      method: 'POST',
      headers: {
        'X-API-Key': apiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    })

    rawResponse = await res.json().catch(() => null)

    if (!res.ok) {
      const errMsg = (rawResponse as { message?: string })?.message ?? 'Unknown YCloud error'
      logger.error('YCloud message send failed', { status: res.status, error: errMsg })
      return {
        success: false,
        errorCode: String(res.status),
        errorMessage: errMsg,
        rawResponse,
      }
    }

    const data = rawResponse as { id?: string; externalId?: string }
    logger.info('YCloud message sent successfully', { ycloudMessageId: data?.id })
    return {
      success: true,
      ycloudMessageId: data?.id,
      externalId: data?.externalId,
      rawResponse,
    }
  } catch (err) {
    const msg = (err as Error).message
    logger.error('YCloud message send threw exception', { error: msg })
    return {
      success: false,
      errorCode: 'NETWORK_ERROR',
      errorMessage: msg,
      rawResponse,
    }
  }
}

export async function sendConfirmationMessage(to: string, text: string, requestId: string): Promise<SendResult> {
  return sendTextMessage({ to, text, externalId: `consultation-confirmation-${requestId}` })
}

export async function sendRescheduleMessage(to: string, text: string, requestId: string): Promise<SendResult> {
  return sendTextMessage({ to, text, externalId: `consultation-reschedule-${requestId}` })
}

export async function sendRejectionMessage(to: string, text: string, requestId: string): Promise<SendResult> {
  return sendTextMessage({ to, text, externalId: `consultation-rejection-${requestId}` })
}

export async function testConnection(): Promise<{ ok: boolean; error?: string }> {
  try {
    const apiKey = await getApiKey()
    const res = await fetchWithRetry(`${YCLOUD_API_BASE}/whatsapp/phoneNumbers`, {
      method: 'GET',
      headers: { 'X-API-Key': apiKey },
    })
    if (!res.ok) return { ok: false, error: `HTTP ${res.status}` }
    return { ok: true }
  } catch (err) {
    return { ok: false, error: (err as Error).message }
  }
}
