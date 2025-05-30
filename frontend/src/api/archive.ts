export interface ArchiveRow {
  symbol: string
  profit: number
  profitPercentage: number
  trades: number
  archivedAt: string
}

export async function getArchive(
  symbol: string
): Promise<{ rows: ArchiveRow[]; stats: any }> {
  const res = await fetch('/api/archive', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      authToken: '',
      type: 'symbol',
      symbol,
      page: 1,
      limit: 50
    })
  })

  const json = await res.json()
  return json?.data ?? { rows: [], stats: {} }
}

export async function deleteArchive(query: object): Promise<void> {
  await fetch('/api/archive/delete', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(query)
  })
}
