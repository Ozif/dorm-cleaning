export function parseDateOnly(value: string): Date {
  const [rawYear, rawMonth, rawDay] = value.split('-').map(Number)
  const year = typeof rawYear === 'number' && Number.isFinite(rawYear) ? rawYear : 1970
  const month = typeof rawMonth === 'number' && Number.isFinite(rawMonth) ? rawMonth : 1
  const day = typeof rawDay === 'number' && Number.isFinite(rawDay) ? rawDay : 1
  return new Date(year, (month || 1) - 1, day || 1)
}

export function formatDateOnly(value: Date | string | null | undefined): string {
  if (!value) return ''
  if (typeof value === 'string') return value.slice(0, 10)

  const year = value.getFullYear()
  const month = String(value.getMonth() + 1).padStart(2, '0')
  const day = String(value.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}
