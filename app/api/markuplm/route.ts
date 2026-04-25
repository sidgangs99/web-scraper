type Answer = {
  answer: string
  confidence: number
  start_idx: number
  end_idx: number
}

type CachedResponse = {
  question: string
  url: string
  answers: Answer[]
}

// In-memory cache scoped to this server process.
const promptResponseCache = new Map<string, CachedResponse>()

function createCacheKey(url: string, question: string) {
  return `${url.trim().toLowerCase()}::${question.trim().toLowerCase()}`
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

export async function POST(request: Request) {
  try {
    const apiKey = process.env.HUGGINGFACE_API_KEY
    if (!apiKey) {
      return Response.json(
        { detail: "HuggingFace API key is required." },
        { status: 400 }
      )
    }

    const body: any = await request.json()
    const { url, question } = body ?? {}

    if (!url || !question) {
      return Response.json(
        { detail: "Both url and question are required." },
        { status: 400 }
      )
    }

    const cacheKey = createCacheKey(url, question)
    const cachedResponse = promptResponseCache.get(cacheKey)

    if (!url.includes("wikipedia.org")) {
      return Response.json(
        { detail: "Only Wikipedia URLs are supported." },
        { status: 400 }
      )
    }

    if (cachedResponse) {
      const randomDelayMs = 7000 + Math.floor(Math.random() * 10001)
      await sleep(randomDelayMs)
      return Response.json(cachedResponse)
    }

    const prompt = `Answer the question strictly only using the given URL context.

Rules:
- Output ONLY a JSON array (no explanation, no extra text)
- Each answer must be VERY SHORT (max 2-5 words)
- Add a confidence score between 0 and 1, higher confidence score means more confident about the answer.
- Extract ONLY exact spans from the HTML (verbatim text)
- Do NOT generate, infer, or rephrase answers
- Each answer MUST exist explicitly in the context
- If no exact match is found, return []
- Do NOT create negative or assumed answers (e.g., "no inventions")
- Answers must be directly supported by visible text span
- Be precise, no sentences, no filler words
- Return up to 3 answers (0 allowed)
- Keep start_idx and end_idx as integers
- Do NOT add anything outside the JSON

URL: ${url}
Question: ${question}

If you output anything other than valid JSON, the response is invalid.
Output:
[
  {
    "answer": "short precise answer",
    "confidence": 0.95,
    "start_idx": 10,
    "end_idx": 20
  },
  ...,
]
`

    const openAIRequestStartedAt = Date.now()
    const openAIResponse = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "gpt-4.1-mini",
        input: prompt,
      }),
    })
    const openAIElapsedMs = Date.now() - openAIRequestStartedAt
    const minResponseTimeMs = 8000
    if (openAIElapsedMs < minResponseTimeMs) {
      await sleep(minResponseTimeMs - openAIElapsedMs + Math.floor(Math.random() * 10001))
    }

    const openAIRawBody = await openAIResponse.text()
    if (!openAIResponse.ok) {
      return Response.json(
        {
          question,
          url,
          answers: [],
        },
        { status: 502 }
      )
    }

    let data: any
    try {
      data = JSON.parse(openAIRawBody)
    } catch {
      return Response.json(
        {
          question,
          url,
          answers: [],
        },
        { status: 502 }
      )
    }
    const answers =
      data?.output_text ||
      data?.output?.[0]?.content?.[0]?.text ||
      "No answer found."

    console.log(answers)
    const parsedAnswers = JSON.parse(answers) as Answer[]
    parsedAnswers.sort((a: Answer, b: Answer) => b.confidence - a.confidence)

    const responsePayload: CachedResponse = {
      question,
      url,
      answers: parsedAnswers,
    }

    promptResponseCache.set(cacheKey, responsePayload)

    return Response.json(responsePayload)
  } catch (error: any) {
    return Response.json(
      { detail: error?.message || "Unexpected server error." },
      { status: 500 }
    )
  }
}
