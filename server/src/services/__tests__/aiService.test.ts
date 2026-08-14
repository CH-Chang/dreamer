import { describe, it, expect, vi, beforeEach } from 'vitest'
import { generateTitleSuggestions } from '../aiService'

describe('AI Service - generateTitleSuggestions', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn())
  })

  it('sends prompt instructing Gemini to match dream description language and returns 3 titles', async () => {
    vi.mocked(fetch).mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          candidates: [{ content: { parts: [{ text: '1. Soaring Peaks\n2. Crystal Wings\n3. Midnight Flight' }] } }],
        }),
        { status: 200 }
      )
    )

    const titles = await generateTitleSuggestions('I was soaring over crystal mountains at midnight')
    expect(titles).toEqual(['Soaring Peaks', 'Crystal Wings', 'Midnight Flight'])
    expect(fetch).toHaveBeenCalledTimes(1)

    const fetchCall = vi.mocked(fetch).mock.calls[0]
    const body = JSON.parse(fetchCall[1]?.body as string)
    expect(body.contents[0].parts[0].text).toContain('請根據以下夢境內容的語言，產生 3 個與該語言相同、簡短且富有詩意或吸引人的夢境標題')
    expect(body.contents[0].parts[0].text).toContain('I was soaring over crystal mountains at midnight')
    expect(body.system_instruction.parts[0].text).toBe('你是一個夢境解析與命名大師。請偵測夢境描述的語言，並以完全相同的語言輸出 3 行標題。')
  })

  it('passes custom token and gcpProjectId if provided', async () => {
    vi.mocked(fetch).mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          candidates: [{ content: { parts: [{ text: '標題一\n標題二\n標題三' }] } }],
        }),
        { status: 200 }
      )
    )

    const titles = await generateTitleSuggestions('在深海裡與鯨魚共舞', {
      gcpProjectId: 'custom-proj-999',
      token: 'custom-token-xyz',
    })

    expect(titles).toEqual(['標題一', '標題二', '標題三'])
    const fetchCall = vi.mocked(fetch).mock.calls[0]
    expect(fetchCall[0]).toContain('/projects/custom-proj-999/')
    expect((fetchCall[1]?.headers as Record<string, string>)['Authorization']).toBe('Bearer custom-token-xyz')
  })

  it('throws error when Gemini API response is not ok', async () => {
    vi.mocked(fetch).mockResolvedValueOnce(
      new Response('Internal Server Error', { status: 500 })
    )

    await expect(generateTitleSuggestions('Some dream')).rejects.toThrow('Gemini title generation failed: Internal Server Error')
  })
})
