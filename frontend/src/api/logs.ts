export type LogItem = {
  action: 'buy' | 'sell'
  price: number
  timestamp: string
}

export async function getLogs(symbol: string): Promise<LogItem[]> {
  const res = await fetch(`/api/logs?symbol=${symbol}`)
  const json = await res.json()
  return json?.data?.rows ?? []
}

export async function exportLogs(symbol: string): Promise<Blob> {
  const res = await fetch(`/api/logs/export?symbol=${symbol}`)
  const blob = await res.blob()
  return blob
}