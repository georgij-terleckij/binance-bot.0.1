export async function getPrice(symbol: string): Promise<number> {
  const res = await fetch(`/api/price?symbol=${symbol}`)
  const json = await res.json()
  return parseFloat(json?.price ?? 0)
}

export async function getGridStatus(symbol: string): Promise<string> {
  const res = await fetch(`/api/grid-trade?symbol=${symbol}`)
  const json = await res.json()
  return json?.gridTrade?.length > 0 ? 'active' : 'inactive'
}

export async function getGrid(symbol: string): Promise<any[]> {
  const res = await fetch(`/api/grid-trade?symbol=${symbol}`)
  const json = await res.json()
  return json?.gridTrade ?? []
}

export async function startGrid(symbol: string): Promise<void> {
  await fetch(`/api/grid-trade/start?symbol=${symbol}`, {
    method: 'POST',
  })
}

export async function stopGrid(symbol: string): Promise<void> {
  await fetch(`/api/grid-trade/stop?symbol=${symbol}`, {
    method: 'POST',
  })
}