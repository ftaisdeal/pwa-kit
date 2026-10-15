// Single source of truth for the site's security headers.
//
// - Emits a `_headers` file (honoured by Netlify and Cloudflare Pages; translate
//   it for other hosts, e.g. vercel.json, nginx or Apache)
// - Serves the same headers from `vite preview` so violations show up locally
// - Adds the CSP as a <meta> tag in production builds as a fallback for hosts
//   that cannot set headers (meta CSP cannot express frame-ancestors)
//
// The policy is deliberately strict: no inline scripts or styles. If you add a
// third-party origin (API, analytics, CDN), add it to the matching directive.
// The dev server is not covered: Vite's HMR needs inline styles and websockets.

const directives = {
  'default-src': ["'self'"],
  'script-src': ["'self'"],
  'style-src': ["'self'"],
  'font-src': ["'self'"],
  'img-src': ["'self'", 'data:'],
  // The connectivity check in src/network.ts pings these hosts
  'connect-src': ["'self'", 'https://www.gstatic.com', 'https://httpbin.org'],
  'manifest-src': ["'self'"],
  'worker-src': ["'self'"],
  'object-src': ["'none'"],
  'base-uri': ["'self'"],
  'form-action': ["'self'"],
  'frame-ancestors': ["'none'"],
};

const toPolicy = (omit = []) =>
  Object.entries(directives)
    .filter(([name]) => !omit.includes(name))
    .map(([name, values]) => `${name} ${values.join(' ')}`)
    .join('; ');

const headers = {
  'Content-Security-Policy': toPolicy(),
  'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
};

export function securityHeaders() {
  return {
    name: 'security-headers',
    configurePreviewServer(server) {
      server.middlewares.use((req, res, next) => {
        for (const [name, value] of Object.entries(headers)) {
          res.setHeader(name, value);
        }
        next();
      });
    },
    transformIndexHtml(_html, ctx) {
      if (ctx.server) return undefined; // dev server
      return [
        {
          tag: 'meta',
          attrs: {
            'http-equiv': 'Content-Security-Policy',
            content: toPolicy(['frame-ancestors']),
          },
          injectTo: 'head-prepend',
        },
      ];
    },
    generateBundle() {
      const lines = Object.entries(headers).map(
        ([name, value]) => `  ${name}: ${value}`
      );
      this.emitFile({
        type: 'asset',
        fileName: '_headers',
        source: `/*\n${lines.join('\n')}\n`,
      });
    },
  };
}
