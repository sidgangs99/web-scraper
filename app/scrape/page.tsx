// @ts-ignore
// @ts-nocheck
"use client"

import { useState } from "react"
import { Button } from "components/Button/Button"
import axios from "axios"

interface Answer {
  answer: string
  confidence: number
  start_idx: number
  end_idx: number
}

interface QueryResponse {
  question: string
  url: string
  answers: Answer[]
}

export default function Scraper() {
  const [url, setUrl] = useState("")
  const [question, setQuestion] = useState("")

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<QueryResponse | null>(null)

  const handleAsk = async () => {
    if (!url || !question) return

    setLoading(true)
    setError(null)
    setResult(null)

    try {
        console.log("Fetching...")
      const res = await axios.post("https://web-scraping-markuplm-production.up.railway.app/query", {
        url,
        question,
        min_confidence: 0.1,
      })

      setResult(res.data)
    } catch (err: any) {
      setError(err?.response?.data?.detail || err.message || "Request failed")
    } finally {
      setLoading(false)
    }
  }

  return (
    <section className="bg-white dark:bg-gray-900 min-h-[60vh]">
      <div className="mx-auto grid max-w-screen-xl px-4 py-8 text-center lg:py-16">
        <div className="mx-auto place-self-center w-full max-w-3xl">
          <h1 className="mb-4 text-4xl font-extrabold tracking-tight dark:text-white md:text-5xl xl:text-6xl">
            MarkupLM <span className="text-blue-600">Web QA</span>
          </h1>
          <p className="mb-8 font-light text-gray-500 dark:text-gray-400 md:text-lg lg:text-xl">
            Enter a URL and ask a question. Our AI will scrape the page and find the answer.
          </p>

          {/* Form */}
          <div className="bg-gray-50 dark:bg-gray-800 p-8 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 space-y-6 text-left">

            <div>
              <label className="block mb-2 text-sm font-medium text-gray-900 dark:text-white">
                Target Website URL
              </label>
              <input
                type="url"
                className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg 
                focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5 
                dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                placeholder="https://en.wikipedia.org/wiki/FastAPI"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                required
              />
            </div>

            <div>
              <label className="block mb-2 text-sm font-medium text-gray-900 dark:text-white">
                Your Question
              </label>
              <input
                type="text"
                className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg 
                focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5 
                dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                placeholder="When was the first version released?"
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                required
              />
            </div>

            <div className="flex justify-center pt-2">
              <Button
                onClick={handleAsk}
                className="w-full md:w-auto min-w-[200px]"
                disabled={loading}
              >
                {loading ? "Scanning Page..." : "Ask Question"}
              </Button>
            </div>
          </div>

          {/* Error */}
          {error && (
            <div className="mt-6 p-4 text-sm text-red-800 rounded-lg bg-red-50 
            dark:bg-gray-800 dark:text-red-400">
              <span className="font-medium">Error:</span> {error}
            </div>
          )}

          {/* Result */}
          {result && result.answers.length > 0 && (
            <div className="mt-8 text-left">
              <h3 className="text-2xl font-bold dark:text-white mb-4 text-center">
                Top Answer
              </h3>

              <div className="p-6 bg-white border border-gray-200 rounded-lg shadow 
              dark:bg-gray-800 dark:border-gray-700">
                <h5 className="mb-2 text-2xl font-bold text-gray-900 dark:text-white">
                  {result.answers[0].answer}
                </h5>
                <div className="flex items-center mt-4 space-x-4">
                  <span className="bg-blue-100 text-blue-800 text-xs font-medium px-2.5 py-0.5 
                  rounded dark:bg-blue-900 dark:text-blue-300">
                    Confidence: {(result.answers[0].confidence * 100).toFixed(2)}%
                  </span>
                  <a
                    href={result.url}
                    target="_blank"
                    rel="noreferrer"
                    className="text-sm text-gray-500 hover:underline dark:text-gray-400"
                  >
                    View Source URL
                  </a>
                </div>
              </div>

              {/* Other Answers */}
              {result.answers.length > 1 && (
                <div className="mt-6">
                  <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">
                    Other answers:
                  </p>
                  <ul className="space-y-2">
                    {result.answers.slice(1, 3).map((ans, i) => (
                      <li
                        key={i}
                        className="p-3 bg-gray-50 rounded dark:bg-gray-800 border 
                        dark:border-gray-700 text-sm text-gray-700 dark:text-gray-300 
                        flex justify-between"
                      >
                        <span>{ans.answer}</span>
                        <span className="text-xs text-gray-500">
                          {(ans.confidence * 100).toFixed(1)}%
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}

          {/* No answer */}
          {result && result.answers.length === 0 && !loading && (
            <div className="mt-8 text-gray-500">
              No answers found with high confidence.
            </div>
          )}
        </div>
      </div>
    </section>
  )
}
