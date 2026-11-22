import { WatsonXAI } from '@ibm-cloud/watsonx-ai'

let client: WatsonXAI | undefined

/**
 * Created on first request rather than at module load: `next build` evaluates route modules
 * to collect page data, and the SDK throws there when no credentials are in the environment.
 */
export function getWatsonx(): WatsonXAI {
  const missing = ['WATSONX_AI_APIKEY', 'WATSONX_AI_URL', 'WATSONX_PROJECT_ID'].filter(
    (name) => !process.env[name],
  )
  if (missing.length > 0) {
    throw new Error(`Missing watsonx.ai environment variables: ${missing.join(', ')}`)
  }
  client ??= WatsonXAI.newInstance({
    version: '2024-05-31',
    serviceUrl: process.env.WATSONX_AI_URL!,
  })
  return client
}
