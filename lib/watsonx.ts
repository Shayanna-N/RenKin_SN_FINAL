import { WatsonXAI } from '@ibm-cloud/watsonx-ai'

let client: WatsonXAI | undefined

/**
 * Created on first request rather than at module load: `next build` evaluates route modules
 * to collect page data, and the SDK throws there when no credentials are in the environment.
 */
export function getWatsonx(): WatsonXAI {
  client ??= WatsonXAI.newInstance({
    version: '2024-05-31',
    serviceUrl: process.env.WATSONX_AI_URL!,
  })
  return client
}
