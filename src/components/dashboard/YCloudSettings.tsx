'use client'

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { CheckCircle2, XCircle, Loader2 } from 'lucide-react'

export function YCloudSettings() {
  const [apiKey, setApiKey] = useState('')
  const [businessPhone, setBusinessPhone] = useState('')
  const [inboundSecret, setInboundSecret] = useState('')
  const [saving, setSaving] = useState(false)
  const [testing, setTesting] = useState(false)
  const [testResult, setTestResult] = useState<{ ok: boolean; error?: string } | null>(null)
  const [saved, setSaved] = useState(false)

  const { data: config, refetch } = useQuery({
    queryKey: ['ycloud-settings'],
    queryFn: () => fetch('/api/settings/integrations/ycloud').then((r) => r.json()).then((r) => r.data),
  })

  async function save() {
    setSaving(true)
    try {
      const body: Record<string, unknown> = {}
      if (apiKey) body.ycloudApiKey = apiKey
      if (businessPhone) body.ycloudBusinessPhone = businessPhone
      if (inboundSecret) body.inboundSecret = inboundSecret

      const res = await fetch('/api/settings/integrations/ycloud', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      if (res.ok) {
        setSaved(true)
        setApiKey('')
        setInboundSecret('')
        refetch()
        setTimeout(() => setSaved(false), 3000)
      }
    } finally {
      setSaving(false)
    }
  }

  async function testConn() {
    setTesting(true)
    setTestResult(null)
    try {
      const res = await fetch('/api/settings/integrations/ycloud/test', { method: 'POST' })
      const json = await res.json()
      setTestResult({ ok: json.success, error: json.error })
    } finally {
      setTesting(false)
    }
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <Card>
        <CardHeader>
          <CardTitle>YCloud интеграция</CardTitle>
          <CardDescription>
            Настройте подключение к YCloud для получения заявок и отправки WhatsApp-сообщений.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          {config && (
            <div className="flex gap-3 flex-wrap text-sm">
              <span className={`flex items-center gap-1 ${config.hasApiKey ? 'text-green-600' : 'text-gray-400'}`}>
                {config.hasApiKey ? <CheckCircle2 className="h-4 w-4" /> : <XCircle className="h-4 w-4" />}
                API ключ {config.hasApiKey ? 'настроен' : 'не настроен'}
              </span>
              <span className={`flex items-center gap-1 ${config.hasInboundSecret ? 'text-green-600' : 'text-gray-400'}`}>
                {config.hasInboundSecret ? <CheckCircle2 className="h-4 w-4" /> : <XCircle className="h-4 w-4" />}
                Inbound secret {config.hasInboundSecret ? 'настроен' : 'не настроен'}
              </span>
              {config.ycloudBusinessPhone && (
                <span className="text-gray-600">Телефон: {config.ycloudBusinessPhone}</span>
              )}
            </div>
          )}

          <div className="space-y-4">
            <div>
              <Label>YCloud API Key</Label>
              <Input
                type="password"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder={config?.hasApiKey ? '••••••••••••• (оставьте пустым чтобы не менять)' : 'Введите API ключ'}
              />
            </div>
            <div>
              <Label>Номер телефона бизнеса (WhatsApp)</Label>
              <Input
                value={businessPhone}
                onChange={(e) => setBusinessPhone(e.target.value)}
                placeholder="+996XXXXXXXXX"
              />
            </div>
            <div>
              <Label>YCLOUD_INBOUND_SECRET</Label>
              <Input
                type="password"
                value={inboundSecret}
                onChange={(e) => setInboundSecret(e.target.value)}
                placeholder={config?.hasInboundSecret ? '••••••••••••• (оставьте пустым чтобы не менять)' : 'Секрет для Data Connector'}
              />
              <p className="text-xs text-gray-400 mt-1">
                Этот секрет нужно указать в заголовке Authorization в YCloud Data Connector.
              </p>
            </div>
          </div>

          <div className="flex gap-3">
            <Button onClick={save} disabled={saving}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              {saved ? 'Сохранено ✓' : 'Сохранить'}
            </Button>
            <Button variant="outline" onClick={testConn} disabled={testing || !config?.hasApiKey}>
              {testing ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Проверить подключение
            </Button>
          </div>

          {testResult && (
            <div className={`flex items-center gap-2 text-sm p-3 rounded-lg ${testResult.ok ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
              {testResult.ok ? <CheckCircle2 className="h-4 w-4" /> : <XCircle className="h-4 w-4" />}
              {testResult.ok ? 'Подключение успешно' : `Ошибка: ${testResult.error}`}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Data Connector URL</CardTitle>
          <CardDescription>Используйте этот URL в настройках YCloud Data Connector.</CardDescription>
        </CardHeader>
        <CardContent>
          <code className="block bg-gray-100 rounded-lg p-3 text-sm font-mono break-all">
            {typeof window !== 'undefined' ? window.location.origin : 'https://YOUR_DOMAIN'}
            /api/integrations/ycloud/consultation-requests
          </code>
          <p className="text-xs text-gray-500 mt-2">
            Метод: <strong>POST</strong> · Заголовок: <strong>Authorization: Bearer YOUR_INBOUND_SECRET</strong>
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
