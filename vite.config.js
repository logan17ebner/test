/* global process */
import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import fs from 'node:fs'
import path from 'node:path'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const webhookUrl = env.VITE_N8N_WEBHOOK_URL?.trim()

  /** Same-origin proxy so the browser does not hit CORS calling n8n.cloud directly. */
  const n8nProxy = {}
  if (webhookUrl) {
    try {
      const u = new URL(webhookUrl)
      const targetOrigin = `${u.protocol}//${u.host}`
      const forwardPath = `${u.pathname}${u.search || ''}`
      n8nProxy['/n8n-webhook'] = {
        target: targetOrigin,
        changeOrigin: true,
        secure: true,
        /** Long-running AI workflows can exceed default proxy timeouts. */
        timeout: 300_000,
        proxyTimeout: 300_000,
        // #region agent log b7feaf — selfHandleResponse lets us read AND forward the body
        selfHandleResponse: true,
        // #endregion
        rewrite: () => forwardPath,
        configure: (proxy) => {
          // #region agent log b7feaf
          proxy.on('proxyRes', (proxyRes, _req, res) => {
            const chunks = []
            proxyRes.on('data', (c) => chunks.push(c))
            proxyRes.on('end', () => {
              try {
                const body = Buffer.concat(chunks)
                const bodyStr = body.toString('utf8')
                const logPath = path.join(process.cwd(), '.cursor', 'debug-b7feaf.log')
                const entry = JSON.stringify({ ts: Date.now(), source: 'vite-proxy', status: proxyRes.statusCode, contentType: proxyRes.headers['content-type'], bodyLen: bodyStr.length, body: bodyStr.slice(0, 4000) }) + '\n'
                fs.mkdirSync(path.dirname(logPath), { recursive: true })
                fs.appendFileSync(logPath, entry)
                // Forward the response to the browser
                res.writeHead(proxyRes.statusCode, proxyRes.headers)
                res.end(body)
              } catch (e) {
                res.writeHead(502)
                res.end(String(e))
              }
            })
          })
          // #endregion
          proxy.on('error', (err, _req, res) => {
            const code = err?.code ? ` (${err.code})` : ''
            const msg = err?.message || String(err)
            console.error('[vite] n8n webhook proxy error:', msg, err?.code || '')
            if (!res || res.writableEnded) return
            try {
              if (!res.headersSent) {
                res.writeHead(502, {
                  'Content-Type': 'application/json; charset=utf-8',
                })
                res.end(
                  JSON.stringify({
                    message: `Could not reach n8n at ${targetOrigin}${code}: ${msg}`,
                    hint: 'Check the URL in VITE_N8N_WEBHOOK_URL, VPN/firewall, and that n8n is running.',
                  })
                )
              }
            } catch {
              /* ignore */
            }
          })
        },
      }
    } catch (e) {
      console.warn('[vite] Invalid VITE_N8N_WEBHOOK_URL (proxy disabled):', e.message)
    }
  }

  return {
    base: '/test/',
    plugins: [
      /**
       * Browsers send `Origin` on fetch POSTs. A Vite dev middleware path was
       * returning 500 HTML for `/n8n-webhook` when `Origin` was set; stripping
       * it for this proxied path restores normal proxy behavior (verified: curl
       * with Origin reproduced 500; without Origin → upstream JSON).
       */
      {
        name: 'strip-origin-n8n-webhook',
        enforce: 'pre',
        configureServer(server) {
          server.middlewares.use((req, _res, next) => {
            const pathOnly = req.url?.split('?')[0] ?? ''
            if (pathOnly === '/n8n-webhook') {
              delete req.headers.origin
            }
            next()
          })
        },
        configurePreviewServer(server) {
          server.middlewares.use((req, _res, next) => {
            const pathOnly = req.url?.split('?')[0] ?? ''
            if (pathOnly === '/n8n-webhook') {
              delete req.headers.origin
            }
            next()
          })
        },
      },
      react(),
    ],
    server: { proxy: n8nProxy },
    preview: { proxy: n8nProxy },
  }
})
