import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join, relative } from 'node:path'

// Replaces %SITE_URL% and %SITE_HOST% in index.html and in the files under
// `site/` (robots.txt, sitemap.xml, .well-known/security.txt), which are
// emitted to the site root. Set VITE_SITE_URL (e.g. in .env.production) to
// your real origin; it defaults to the reserved example.com.
export function siteUrl({ dir = 'site', fallback = 'https://example.com' } = {}) {
  const site = { url: fallback, host: new URL(fallback).host }

  const fill = (text) => text.replaceAll('%SITE_URL%', site.url).replaceAll('%SITE_HOST%', site.host)

  const listFiles = (root) =>
    readdirSync(root).flatMap((name) => {
      const path = join(root, name)
      return statSync(path).isDirectory() ? listFiles(path) : [path]
    })

  return {
    name: 'site-url',
    configResolved(config) {
      const env = config.env.VITE_SITE_URL || process.env.VITE_SITE_URL
      if (env) {
        site.url = env.replace(/\/+$/, '')
        site.host = new URL(site.url).host
      } else if (config.command === 'build') {
        config.logger.warn(
          `VITE_SITE_URL is not set; using placeholder ${fallback} for canonical URLs, sitemap and robots.txt`
        )
      }
    },
    // 'pre' so the URLs are filled in before Vite parses index.html
    transformIndexHtml: { order: 'pre', handler: (html) => fill(html) },
    generateBundle() {
      for (const file of listFiles(dir)) {
        this.emitFile({
          type: 'asset',
          fileName: relative(dir, file),
          source: fill(readFileSync(file, 'utf8'))
        })
      }
    },
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        const path = (req.url || '').split('?')[0].replace(/^\//, '')
        try {
          const file = join(dir, path)
          if (path && !path.includes('..') && statSync(file).isFile()) {
            res.setHeader('Content-Type', path.endsWith('.xml') ? 'application/xml' : 'text/plain')
            res.end(fill(readFileSync(file, 'utf8')))
            return
          }
        } catch {
          // not a site file
        }
        next()
      })
    }
  }
}
