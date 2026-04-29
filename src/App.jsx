import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { ScorePanel } from './components/ScorePanel'
import { Toolbox } from './components/Toolbox'
import { useScoreRenderer } from './hooks/useScoreRenderer'
import { getCurrentKeyInfo, transposeMusicXml } from './musicxml/transposeMusicXml'
import {
  canDownloadMusicXml,
  canTransposeScoreFile,
  createMusicXmlDownloadFileName,
  getPublicScoreFileUrl,
  getScoreFileType,
} from './utils/scoreFiles'
import './App.css'

function getKeyInfoForScore(scoreFile, transposeSemitones) {
  if (!scoreFile) {
    return getCurrentKeyInfo('', transposeSemitones)
  }

  if (!canTransposeScoreFile(scoreFile)) {
    return getCurrentKeyInfo('', transposeSemitones)
  }

  if (scoreFile.type === 'alphatab') {
    const semitoneLabel = transposeSemitones > 0 ? `+${transposeSemitones}` : transposeSemitones
    return {
      currentLabel: transposeSemitones === 0 ? 'Original pitch' : `${semitoneLabel} semitones`,
      originalLabel: 'Guitar Pro file',
    }
  }

  return getCurrentKeyInfo(scoreFile.text, transposeSemitones)
}

function App() {
  const [songName, setSongName] = useState('')
  const [scoreFile, setScoreFile] = useState(null)
  const [availableFiles, setAvailableFiles] = useState([])
  const [selectedFile, setSelectedFile] = useState('')
  const [transposeSemitones, setTransposeSemitones] = useState(0)
  const [isScoreFullscreen, setIsScoreFullscreen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [fileListError, setFileListError] = useState('')
  const [fetchError, setFetchError] = useState('')
  const [renderError, setRenderError] = useState('')
  const scoreRef = useRef(null)
  const osmdRef = useRef(null)

  const apiBase = import.meta.env.VITE_MUSICXML_API_URL || '/api/musicxml'
  const canTransposeCurrentScore = canTransposeScoreFile(scoreFile)
  const canDownloadCurrentScore = canDownloadMusicXml(scoreFile)
  const currentKeyInfo = useMemo(
    () => getKeyInfoForScore(scoreFile, transposeSemitones),
    [scoreFile, transposeSemitones],
  )

  const loadPublicFile = useCallback(async (fileName) => {
    const fileType = getScoreFileType(fileName)
    if (fileType === 'unknown') {
      throw new Error('Only MusicXML and Guitar Pro files are supported.')
    }

    const response = await fetch(getPublicScoreFileUrl(fileName))
    if (!response.ok) {
      throw new Error(`Could not load ${fileName}.`)
    }

    if (fileType === 'musicxml') {
      const text = await response.text()
      setScoreFile({ name: fileName, type: fileType, text })
      return
    }

    const data = await response.arrayBuffer()
    setTransposeSemitones(0)
    setScoreFile({ name: fileName, type: fileType, data })
  }, [])

  useScoreRenderer({
    isScoreFullscreen,
    osmdRef,
    scoreFile,
    scoreRef,
    setRenderError,
    transposeSemitones,
  })

  useEffect(() => {
    let cancelled = false

    async function loadFileList() {
      try {
        const response = await fetch(`${import.meta.env.BASE_URL || '/'}xml/file-list.json`)
        if (!response.ok) {
          throw new Error('Unable to list files.')
        }

        const payload = await response.json()
        const files = Array.isArray(payload) ? payload : []
        if (cancelled) return

        setAvailableFiles(files)
        setFileListError('')

        if (files.length === 0) {
          return
        }

        const firstFile = files[0]
        setSelectedFile(firstFile)
        await loadPublicFile(firstFile)
      } catch {
        if (cancelled) return
        setFileListError('Unable to read score files from /public.')
        setAvailableFiles([])
      }
    }

    loadFileList()

    return () => {
      cancelled = true
    }
  }, [loadPublicFile])

  async function handleFetchScore(event) {
    event.preventDefault()
    if (!songName.trim()) {
      setFetchError('Enter a song name first.')
      return
    }

    setLoading(true)
    setFetchError('')
    setRenderError('')

    try {
      const trimmedSongName = songName.trim()
      const query = encodeURIComponent(trimmedSongName)
      const join = apiBase.includes('?') ? '&' : '?'
      const response = await fetch(`${apiBase}${join}song=${query}`, {
        headers: {
          Accept: 'application/vnd.recordare.musicxml+xml, application/xml, text/xml',
        },
      })

      if (!response.ok) {
        throw new Error(`Request failed with status ${response.status}.`)
      }

      const text = await response.text()
      if (!text.includes('<score-partwise')) {
        throw new Error('Response is not a MusicXML score-partwise document.')
      }

      setScoreFile({
        name: `${trimmedSongName}.musicxml`,
        type: 'musicxml',
        text,
      })
    } catch (error) {
      setFetchError(error instanceof Error ? error.message : 'Failed to fetch MusicXML.')
      setScoreFile(null)
    } finally {
      setLoading(false)
    }
  }

  async function loadSelectedFile() {
    if (!selectedFile) return

    setLoading(true)
    setFetchError('')
    setRenderError('')
    try {
      await loadPublicFile(selectedFile)
    } catch (error) {
      setFetchError(error instanceof Error ? error.message : 'Unable to load selected file.')
    } finally {
      setLoading(false)
    }
  }

  async function handleFileChange(event) {
    const fileName = event.target.value
    setSelectedFile(fileName)
    if (!fileName) return

    setLoading(true)
    setFetchError('')
    setRenderError('')
    try {
      await loadPublicFile(fileName)
    } catch (error) {
      setFetchError(error instanceof Error ? error.message : 'Unable to load selected file.')
    } finally {
      setLoading(false)
    }
  }

  function downloadCurrentXml() {
    if (!canDownloadCurrentScore) {
      setFetchError('No MusicXML loaded to download.')
      return
    }

    setFetchError('')

    let outputXml = scoreFile.text
    if (transposeSemitones !== 0) {
      try {
        outputXml = transposeMusicXml(scoreFile.text, transposeSemitones)
      } catch {
        setFetchError('Unable to export transposed MusicXML.')
        return
      }
    }

    const blob = new Blob([outputXml], {
      type: 'application/vnd.recordare.musicxml+xml;charset=utf-8',
    })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')

    link.href = url
    link.download = createMusicXmlDownloadFileName({
      scoreFileName: scoreFile.name,
      songName,
      transposeSemitones,
    })
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }

  function shiftSemitone(delta) {
    if (!canTransposeCurrentScore) return

    setTransposeSemitones((current) => {
      const next = current + delta
      return Math.max(-24, Math.min(24, next))
    })
  }

  return (
    <main className={`app-shell${isScoreFullscreen ? ' score-fullscreen' : ''}`}>
      {!isScoreFullscreen && (
        <Toolbox
          apiBase={apiBase}
          availableFiles={availableFiles}
          canDownloadMusicXml={canDownloadCurrentScore}
          currentKeyInfo={currentKeyInfo}
          fetchError={fetchError}
          fileListError={fileListError}
          loading={loading}
          onDownloadCurrentXml={downloadCurrentXml}
          onFetchScore={handleFetchScore}
          onFileChange={handleFileChange}
          onLoadSelectedFile={loadSelectedFile}
          onShiftSemitone={shiftSemitone}
          onSongNameChange={setSongName}
          renderError={renderError}
          selectedFile={selectedFile}
          songName={songName}
          transposeDisabled={!canTransposeCurrentScore}
          transposeSemitones={transposeSemitones}
        />
      )}

      <ScorePanel
        hasScore={Boolean(scoreFile)}
        isFullscreen={isScoreFullscreen}
        onToggleFullscreen={() => setIsScoreFullscreen((current) => !current)}
        scoreRef={scoreRef}
      />
    </main>
  )
}

export default App
