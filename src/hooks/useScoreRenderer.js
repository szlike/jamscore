import { useEffect, useRef } from 'react'
import { transposeMusicXml } from '../musicxml/transposeMusicXml'
import { renderAlphaTabScore } from '../renderers/renderAlphaTabScore'
import { renderMusicXmlFallback } from '../renderers/renderMusicXmlFallback'

export function useScoreRenderer({
  isScoreFullscreen,
  osmdRef,
  scoreFile,
  scoreRef,
  setRenderError,
  transposeSemitones,
}) {
  const alphaTabApiRef = useRef(null)

  useEffect(() => {
    if (!scoreRef.current) return

    function destroyAlphaTabApi() {
      if (alphaTabApiRef.current) {
        alphaTabApiRef.current.destroy()
        alphaTabApiRef.current = null
      }

      scoreRef.current?.classList.remove('score-container--alphatab')
    }

    if (!scoreFile) {
      destroyAlphaTabApi()
      osmdRef.current = null
      scoreRef.current.innerHTML = ''
      return
    }

    let cancelled = false

    async function renderAlphaTab() {
      if (!scoreRef.current || !scoreFile.data) return

      destroyAlphaTabApi()
      osmdRef.current = null
      scoreRef.current.innerHTML = ''
      scoreRef.current.classList.add('score-container--alphatab')

      const alphaTabHost = document.createElement('div')
      alphaTabHost.className = 'alphatab-host'
      scoreRef.current.appendChild(alphaTabHost)

      try {
        const api = await renderAlphaTabScore(alphaTabHost, scoreFile.data, (message) => {
          if (!cancelled) setRenderError(message)
        })

        if (cancelled) {
          api.destroy()
          return
        }

        alphaTabApiRef.current = api
        setRenderError('')
      } catch (error) {
        if (cancelled) return
        scoreRef.current.innerHTML = ''
        scoreRef.current.classList.remove('score-container--alphatab')
        setRenderError(
          error instanceof Error ? error.message : 'Failed to render Guitar Pro file.',
        )
      }
    }

    async function renderOne(xmlForRender) {
      if (!scoreRef.current) return false

      try {
        scoreRef.current.innerHTML = ''

        const { OpenSheetMusicDisplay } = await import('opensheetmusicdisplay')
        if (!osmdRef.current) {
          if (!scoreRef.current) return false
          osmdRef.current = new OpenSheetMusicDisplay(scoreRef.current, {
            autoResize: true,
            backend: 'svg',
            drawTitle: true,
          })
        }

        await osmdRef.current.load(xmlForRender)
        if (cancelled || !scoreRef.current) return false

        osmdRef.current.render()
        return true
      } catch {
        try {
          if (!scoreRef.current) return false
          await renderMusicXmlFallback(scoreRef.current, xmlForRender)
          return true
        } catch {
          return false
        }
      }
    }

    async function renderWithFallbackChain() {
      if (!scoreFile.text) return

      destroyAlphaTabApi()
      osmdRef.current = null

      let transposedXml = scoreFile.text

      if (transposeSemitones !== 0) {
        try {
          transposedXml = transposeMusicXml(scoreFile.text, transposeSemitones)
        } catch (error) {
          setRenderError(
            error instanceof Error ? error.message : 'Unable to transpose MusicXML.',
          )
          return
        }
      }

      const renderedTransposed = await renderOne(transposedXml)
      if (cancelled) return

      if (renderedTransposed) {
        setRenderError('')
        return
      }

      const renderedOriginal = await renderOne(scoreFile.text)
      if (cancelled) return

      if (renderedOriginal) {
        if (transposeSemitones !== 0) {
          setRenderError('This file could not be transposed, showing original key.')
        } else {
          setRenderError('')
        }
        return
      }

      if (scoreRef.current) {
        scoreRef.current.innerHTML = ''
      }
      setRenderError('Failed to render MusicXML.')
    }

    if (scoreFile.type === 'alphatab') {
      renderAlphaTab()
    } else {
      renderWithFallbackChain()
    }

    return () => {
      cancelled = true
      if (scoreFile.type === 'alphatab') {
        destroyAlphaTabApi()
      }
    }
  }, [isScoreFullscreen, osmdRef, scoreFile, scoreRef, setRenderError, transposeSemitones])
}
