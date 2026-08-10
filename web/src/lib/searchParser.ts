export interface SearchQuery {
  tags: string[]
  since: string
  to: string
  text: string
}

export function parseSearchQuery(input: string): SearchQuery {
  const tokens = input.trim().split(/\s+/).filter(Boolean)
  const tags: string[] = []
  let since = ''
  let to = ''

  const textTokens: string[] = []

  for (const token of tokens) {
    if (token.startsWith('#')) {
      const name = token.slice(1)
      if (name) tags.push(name)
    } else if (token.startsWith('since:')) {
      since = normalizeDate(token.slice(6), 'start')
    } else if (token.startsWith('to:')) {
      to = normalizeDate(token.slice(3), 'end')
    } else {
      textTokens.push(token)
    }
  }

  return { tags, since, to, text: textTokens.join(' ') }
}

function normalizeDate(value: string, bound: 'start' | 'end'): string {
  const parts = value.split('-').map(Number)
  if (parts.length === 1 && parts[0]) {
    return bound === 'start' ? `${value}-01-01` : `${value}-12-31`
  }
  if (parts.length === 2 && parts[0] && parts[1]) {
    const month = String(parts[1]).padStart(2, '0')
    if (bound === 'start') return `${parts[0]}-${month}-01`
    const lastDay = new Date(parts[0], parts[1], 0).getDate()
    return `${parts[0]}-${month}-${String(lastDay).padStart(2, '0')}`
  }
  if (parts.length === 3 && parts[0] && parts[1] && parts[2]) {
    const month = String(parts[1]).padStart(2, '0')
    const day = String(parts[2]).padStart(2, '0')
    return `${parts[0]}-${month}-${day}`
  }
  return ''
}
