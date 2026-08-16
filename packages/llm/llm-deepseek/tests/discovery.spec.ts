/**
 * The route's model listing, which doubles as the key probe the first-run page
 * runs before it stores anything: a key the endpoint refuses must be reported
 * as a refused key, never as a provider with no models.
 */

import { createServer } from 'node:http'
import type { IncomingMessage, Server, ServerResponse } from 'node:http'
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { Context } from '@deepseek-ai/cordis'
import LlmRuntime, { INVALID_CREDENTIAL_CODE, LlmError, userAgent } from '@deepseek-ai/dsh-llm'
import * as LlmDeepSeek from '@deepseek-ai/dsh-llm-deepseek'

const servers: Server[] = []
let testHome: string

beforeEach(() => {
  testHome = mkdtempSync(join(tmpdir(), 'dsh-llm-deepseek-discovery-'))
  vi.stubEnv('DSH_HOME', testHome)
})

afterEach(async () => {
  await Promise.all(servers.splice(0).map(server => new Promise(resolve => server.close(resolve))))
  vi.unstubAllEnvs()
  rmSync(testHome, { recursive: true, force: true })
})

/**
 * Assert a listing probe failed as an {@link LlmError} with this code and message.
 * @param promise - the listing call that must refuse.
 * @param code - expected `LlmError.code`.
 * @param message - substring of the refusal.
 */
async function expectLlmError(
  promise: Promise<unknown>,
  code: string,
  message: RegExp,
): Promise<void> {
  await promise.then(
    () => {
      throw new Error('expected LlmError')
    },
    (error: unknown) => {
      expect(error).toBeInstanceOf(LlmError)
      if (!(error instanceof LlmError)) throw new Error('unreachable')
      expect(error.code).toBe(code)
      expect(error.message).toMatch(message)
    },
  )
}

interface ListingServer {
  url: string
  paths: string[]
  headers: IncomingMessage['headers'][]
}

/** A stand-in DeepSeek endpoint answering one scripted `GET /models`. */
async function listingServer(behavior: {
  status?: number
  body?: string
  holdOpenMs?: number
} = {}): Promise<ListingServer> {
  const paths: string[] = []
  const headers: IncomingMessage['headers'][] = []
  const server = createServer((request: IncomingMessage, response: ServerResponse) => {
    paths.push(request.url ?? '')
    headers.push(request.headers)
    const body = behavior.body ?? JSON.stringify({ data: [{ id: 'deepseek-v4-pro' }] })
    response.writeHead(behavior.status ?? 200, { 'content-type': 'application/json' })
    if (behavior.holdOpenMs === undefined) { response.end(body); return }
    // Left open so a cancellation lands while the body is still being read.
    response.write(body.slice(0, 1))
    setTimeout(() => { response.end(body.slice(1)) }, behavior.holdOpenMs)
  })
  servers.push(server)
  await new Promise<void>(resolve => server.listen(0, '127.0.0.1', resolve))
  const address = server.address()
  if (address === null || typeof address === 'string') throw new Error('no port')
  return { url: `http://127.0.0.1:${address.port}`, paths, headers }
}

/** The plugin mounted over one endpoint, with the key in the environment. */
async function harness(baseURL: string, apiKey = 'stored-key'): Promise<Context> {
  vi.stubEnv('DEEPSEEK_API_KEY', apiKey)
  const ctx = new Context()
  await ctx.plugin(LlmRuntime)
  await ctx.plugin(LlmDeepSeek, { baseURL })
  return ctx
}

describe('the DeepSeek route\'s model discovery', () => {
  it('asks the route\'s own endpoint with the stored key', async () => {
    const server = await listingServer({
      body: JSON.stringify({
        data: [
          { id: 'deepseek-v4-pro', display_name: 'DeepSeek V4 Pro', context_length: 1_000_000 },
          { id: 'deepseek-v4-flash' },
        ],
      }),
    })
    const ctx = await harness(server.url)

    // What the surfaces send: the route, and no endpoint of their own — a
    // browser holds a redacted credential descriptor, never the key.
    const models = await ctx.llm.discoverModels('llm-deepseek', { provider: 'deepseek-official' })

    expect(models).toEqual([
      { id: 'deepseek-v4-pro', name: 'DeepSeek V4 Pro', contextWindow: 1_000_000 },
      { id: 'deepseek-v4-flash' },
    ])
    expect(server.paths).toEqual(['/models'])
    expect(server.headers[0]?.authorization).toBe('Bearer stored-key')
    expect(server.headers[0]?.['user-agent']).toBe(userAgent())
  })

  it('never answers from the configured catalog', async () => {
    const server = await listingServer({ body: JSON.stringify({ data: [{ id: 'from-the-endpoint' }] }) })
    const ctx = await harness(server.url)

    const models = await ctx.llm.discoverModels('llm-deepseek', { provider: 'deepseek-official' })

    // The advisory catalog is deployment configuration; reciting it would
    // report a rejected key as a working provider, which is exactly what the
    // first-run page calls this to rule out.
    expect(models.map(model => model.id)).toEqual(['from-the-endpoint'])
  })

  it('tests the typed key rather than the stored one', async () => {
    const server = await listingServer()
    const ctx = await harness(server.url)

    await ctx.llm.discoverModels('llm-deepseek', { provider: 'deepseek-official', apiKey: 'typed-key' })

    // The typed key may be the replacement for exactly the stored key that is
    // failing, so it is the one the probe has to exercise.
    expect(server.headers[0]?.authorization).toBe('Bearer typed-key')
  })

  it('asks a drafted endpoint instead of the route\'s own, and falls back when it is blank', async () => {
    const drafted = await listingServer()
    const configured = await listingServer()
    const ctx = await harness(configured.url)

    await ctx.llm.discoverModels('llm-deepseek', { provider: 'deepseek-official', baseURL: `${drafted.url}/v1/` })
    await ctx.llm.discoverModels('llm-deepseek', { provider: 'deepseek-official', baseURL: '' })

    // A deployment path keeps its segments; a cleared field is the same
    // request as one that never carried an endpoint.
    expect(drafted.paths).toEqual(['/v1/models'])
    expect(configured.paths).toEqual(['/models'])
  })

  it('reports a refused key apart from a failing endpoint', async () => {
    for (const status of [401, 403]) {
      const server = await listingServer({ status, body: '{"error":"no"}' })
      const ctx = await harness(server.url)

      await expectLlmError(
        ctx.llm.discoverModels('llm-deepseek', { provider: 'deepseek-official', apiKey: 'wrong' }),
        INVALID_CREDENTIAL_CODE,
        /refused this API key/,
      )
    }
  })

  it('reports a failing endpoint with its status', async () => {
    const server = await listingServer({ status: 503, body: 'busy' })
    const ctx = await harness(server.url)

    await expect(ctx.llm.discoverModels('llm-deepseek', { provider: 'deepseek-official' }))
      .rejects.toThrow(/answered 503/)
  })

  it('reports an endpoint it cannot reach', async () => {
    const ctx = await harness('http://127.0.0.1:1')

    await expect(ctx.llm.discoverModels('llm-deepseek', { provider: 'deepseek-official' }))
      .rejects.toThrow(/could not reach http:\/\/127\.0\.0\.1:1\/models/)
  })

  it('refuses an unusable key before it reaches a header', async () => {
    const server = await listingServer()
    const ctx = await harness(server.url)

    await expectLlmError(
      ctx.llm.discoverModels('llm-deepseek', { provider: 'deepseek-official', apiKey: '  ' }),
      INVALID_CREDENTIAL_CODE,
      /blank/,
    )
    await expectLlmError(
      ctx.llm.discoverModels('llm-deepseek', { provider: 'deepseek-official', apiKey: 'sk-\u00ff' }),
      INVALID_CREDENTIAL_CODE,
      /no HTTP header can carry/,
    )
    // Nothing was asked: a local, deterministic fault must not read as a
    // network or endpoint problem.
    expect(server.paths).toEqual([])
  })

  it('reports a cancellation as one, before and during the body read', async () => {
    const early = new AbortController()
    const server = await listingServer({ holdOpenMs: 50 })
    const ctx = await harness(server.url)
    early.abort()

    await expect(ctx.llm.discoverModels('llm-deepseek', {
      provider: 'deepseek-official', signal: early.signal,
    })).rejects.toMatchObject({ code: 'ABORTED' })

    const late = new AbortController()
    const pending = ctx.llm.discoverModels('llm-deepseek', {
      provider: 'deepseek-official', signal: late.signal,
    })
    await new Promise(resolve => setTimeout(resolve, 10))
    late.abort()

    await expect(pending).rejects.toMatchObject({ code: 'ABORTED' })
  })

  it('reports a reply that is not a model listing', async () => {
    const server = await listingServer({ body: 'not json at all' })
    const ctx = await harness(server.url)

    await expect(ctx.llm.discoverModels('llm-deepseek', { provider: 'deepseek-official' }))
      .rejects.toThrow(/did not answer with JSON/)

    const empty = await listingServer({ body: JSON.stringify({ object: 'list' }) })
    const other = await harness(empty.url)

    await expect(other.llm.discoverModels('llm-deepseek', { provider: 'deepseek-official' }))
      .rejects.toThrow(/no "data" array/)
  })

  it('fails the probe when the route has no key at all', async () => {
    const server = await listingServer()
    const ctx = await harness(server.url, '')

    // `resolveApiKey` is the same path a request takes, so the probe reports
    // the missing credential rather than asking unauthenticated.
    await expect(ctx.llm.discoverModels('llm-deepseek', { provider: 'deepseek-official' }))
      .rejects.toBeInstanceOf(LlmError)
    expect(server.paths).toEqual([])
  })
})
