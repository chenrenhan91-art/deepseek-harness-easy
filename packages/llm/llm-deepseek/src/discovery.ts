/**
 * Answering "does this key work, and what can it call?" for the configuration
 * and first-run surfaces.
 *
 * The route has exactly one endpoint — the one this plugin resolved from its
 * config, its environment layer, or the public default — so the listing is
 * always asked over the wire rather than answered from the advisory catalog:
 * that catalog is deployment configuration, and reciting it back would report
 * a rejected key as a working provider. That is the whole point of the call
 * for the first-run surface, which uses it as a key probe before storing
 * anything.
 *
 * Nothing here reads or writes settings: the request carries the key being
 * tested, and only a later `credentials.set` decides what the route uses.
 * @module @deepseek-ai/dsh-llm-deepseek/discovery
 */

import {
  attributionHeaders, INVALID_CREDENTIAL_CODE, LlmError, modelListingUrl, normalizeApiKey,
  readModelListing,
} from '@deepseek-ai/dsh-llm'
import type { LlmDiscoveredModel, LlmModelDiscoveryRequest } from '@deepseek-ai/dsh-llm'

/**
 * Accept one probe key, or refuse it before the header is built. Without this
 * `fetch` throws a ByteString `TypeError` that the catch below would report as
 * an unreachable endpoint — blaming the network for a local, deterministic
 * fault.
 */
function usableProbeKey(raw: string): string {
  const checked = normalizeApiKey(raw)
  if (checked.ok) return checked.value
  throw new LlmError(
    checked.reason === 'empty'
      ? 'this API key is blank; paste the key from the DeepSeek console'
      : 'this API key contains characters no HTTP header can carry; paste the raw key only',
    INVALID_CREDENTIAL_CODE,
  )
}

/**
 * Ask the route's endpoint which models it serves for one key.
 * @param request - the draft: an endpoint overriding the route's own, and the
 *   key to authenticate with.
 * @param endpoint - the route's resolved base URL, used when the draft names none.
 * @param storedApiKey - the credential the route already resolves, asked for
 *   only when the draft carries none: a configuration surface holds a redacted
 *   descriptor, never the secret, so without this an already-configured route
 *   would be interrogated unauthenticated and answer 401.
 * @returns the advertised models in endpoint order.
 * @throws LlmError when the key is unusable, the endpoint refuses or cannot be
 *   reached, or the reply is not a model listing.
 */
export async function discoverDeepSeekModels(
  request: LlmModelDiscoveryRequest,
  endpoint: () => string,
  storedApiKey: () => Promise<string>,
): Promise<readonly LlmDiscoveredModel[]> {
  const url = modelListingUrl(
    request.baseURL === undefined || request.baseURL.length === 0 ? endpoint() : request.baseURL,
  )
  const apiKey = usableProbeKey(request.apiKey ?? await storedApiKey())
  let response: Response
  try {
    response = await fetch(url, {
      method: 'GET',
      headers: {
        accept: 'application/json',
        authorization: `Bearer ${apiKey}`,
        ...attributionHeaders(),
      },
      ...request.signal === undefined ? {} : { signal: request.signal },
    })
  } catch (error: unknown) {
    if (request.signal?.aborted) {
      throw new LlmError('model discovery aborted by caller', 'ABORTED', { cause: error })
    }
    throw new LlmError(`could not reach ${url}`, 'DISCOVERY_FAILED', { cause: error })
  }
  // A refused key is its own answer, coded apart from an endpoint that is
  // simply failing: a probe reports "this key does not work" only for this.
  if (response.status === 401 || response.status === 403) {
    throw new LlmError(`${url} refused this API key (${response.status})`, INVALID_CREDENTIAL_CODE)
  }
  if (!response.ok) throw new LlmError(`${url} answered ${response.status}`, 'DISCOVERY_FAILED')
  try {
    return await readModelListing(response, url)
  } catch (error: unknown) {
    if (request.signal?.aborted) {
      throw new LlmError('model discovery aborted by caller', 'ABORTED', { cause: error })
    }
    throw error
  }
}
