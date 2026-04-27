import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const MUSICXML_FILE_PATTERN = /\.(musicxml|xml)$/i

function listMusicXmlFiles(publicDir) {
  const entries = fs.readdirSync(publicDir, { withFileTypes: true })
  return entries
    .filter((entry) => entry.isFile() && MUSICXML_FILE_PATTERN.test(entry.name))
    .map((entry) => entry.name)
    .sort((a, b) => a.localeCompare(b))
}

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    {
      name: 'musicxml-mock-api',
      configureServer(server) {
        const dirname = path.dirname(fileURLToPath(import.meta.url))
        const samplePath = path.join(dirname, 'public', 'sample.musicxml')
        const publicDir = path.join(dirname, 'public')

        server.middlewares.use('/api/musicxml-files', (_req, res) => {
          const files = listMusicXmlFiles(publicDir)
          res.statusCode = 200
          res.setHeader('Content-Type', 'application/json; charset=utf-8')
          res.end(JSON.stringify({ files }))
        })

        server.middlewares.use('/api/musicxml', (req, res) => {
          const requestUrl = new URL(req.url || '', 'http://localhost')
          const song = (requestUrl.searchParams.get('song') || '').trim().toLowerCase()

          if (song === 'take five') {
            const xml = fs.readFileSync(samplePath, 'utf8')
            res.statusCode = 200
            res.setHeader('Content-Type', 'application/vnd.recordare.musicxml+xml; charset=utf-8')
            res.end(xml)
            return
          }

          res.statusCode = 404
          res.setHeader('Content-Type', 'application/json; charset=utf-8')
          res.end(
            JSON.stringify({
              error: 'Only Take Five is mocked locally. Query with ?song=Take Five.',
            }),
          )
        })
      },
    },
  ],
})
