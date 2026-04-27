import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { XMLBuilder, XMLParser } from 'fast-xml-parser'
import './App.css'

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: '@_',
})

const builder = new XMLBuilder({
  ignoreAttributes: false,
  attributeNamePrefix: '@_',
  format: true,
})

const NOTE_TYPE_TO_DURATION = {
  whole: 'w',
  half: 'h',
  quarter: 'q',
  eighth: '8',
  '16th': '16',
  '32nd': '32',
}

const STEP_TO_SEMITONE = {
  C: 0,
  D: 2,
  E: 4,
  F: 5,
  G: 7,
  A: 9,
  B: 11,
}

const FIFTHS_TO_MAJOR_TONIC = {
  '-7': 11,
  '-6': 6,
  '-5': 1,
  '-4': 8,
  '-3': 3,
  '-2': 10,
  '-1': 5,
  0: 0,
  1: 7,
  2: 2,
  3: 9,
  4: 4,
  5: 11,
  6: 6,
  7: 1,
}

const SEMITONE_TO_FIFTHS_SHARP = {
  0: 0,
  1: 7,
  2: 2,
  3: -3,
  4: 4,
  5: -1,
  6: 6,
  7: 1,
  8: -4,
  9: 3,
  10: -2,
  11: 5,
}

const SEMITONE_TO_FIFTHS_FLAT = {
  0: 0,
  1: -5,
  2: 2,
  3: -3,
  4: 4,
  5: -1,
  6: -6,
  7: 1,
  8: -4,
  9: 3,
  10: -2,
  11: -7,
}

const MAJOR_KEY_BY_FIFTHS = {
  '-7': 'Cb',
  '-6': 'Gb',
  '-5': 'Db',
  '-4': 'Ab',
  '-3': 'Eb',
  '-2': 'Bb',
  '-1': 'F',
  0: 'C',
  1: 'G',
  2: 'D',
  3: 'A',
  4: 'E',
  5: 'B',
  6: 'F#',
  7: 'C#',
}

const MINOR_KEY_BY_FIFTHS = {
  '-7': 'Ab',
  '-6': 'Eb',
  '-5': 'Bb',
  '-4': 'F',
  '-3': 'C',
  '-2': 'G',
  '-1': 'D',
  0: 'A',
  1: 'E',
  2: 'B',
  3: 'F#',
  4: 'C#',
  5: 'G#',
  6: 'D#',
  7: 'A#',
}

function toArray(value) {
  if (value === undefined || value === null) return []
  return Array.isArray(value) ? value : [value]
}

function normalizeSemitone(value) {
  const normalized = value % 12
  return normalized < 0 ? normalized + 12 : normalized
}

function semitoneToPitch(targetSemitone, octave, preferSharps) {
  const sharpMap = {
    0: { step: 'C', alter: 0 },
    1: { step: 'C', alter: 1 },
    2: { step: 'D', alter: 0 },
    3: { step: 'D', alter: 1 },
    4: { step: 'E', alter: 0 },
    5: { step: 'F', alter: 0 },
    6: { step: 'F', alter: 1 },
    7: { step: 'G', alter: 0 },
    8: { step: 'G', alter: 1 },
    9: { step: 'A', alter: 0 },
    10: { step: 'A', alter: 1 },
    11: { step: 'B', alter: 0 },
  }

  const flatMap = {
    0: { step: 'C', alter: 0 },
    1: { step: 'D', alter: -1 },
    2: { step: 'D', alter: 0 },
    3: { step: 'E', alter: -1 },
    4: { step: 'E', alter: 0 },
    5: { step: 'F', alter: 0 },
    6: { step: 'G', alter: -1 },
    7: { step: 'G', alter: 0 },
    8: { step: 'A', alter: -1 },
    9: { step: 'A', alter: 0 },
    10: { step: 'B', alter: -1 },
    11: { step: 'B', alter: 0 },
  }

  const selected = (preferSharps ? sharpMap : flatMap)[targetSemitone]
  return {
    step: selected.step,
    alter: selected.alter,
    octave,
  }
}

function transposeKeySignature(key, semitoneDelta) {
  if (!key || key.fifths === undefined) return

  const originalFifths = Number(key.fifths)
  if (!Number.isFinite(originalFifths)) return

  const majorTonic = FIFTHS_TO_MAJOR_TONIC[String(originalFifths)]
  if (majorTonic === undefined) return

  const mode = String(key.mode || 'major').toLowerCase()
  const tonic = mode === 'minor'
    ? normalizeSemitone(majorTonic - 3)
    : majorTonic

  const transposedTonic = normalizeSemitone(tonic + semitoneDelta)
  const transposedMajor = mode === 'minor'
    ? normalizeSemitone(transposedTonic + 3)
    : transposedTonic

  const preferSharps = originalFifths >= 0
  const nextFifths = (preferSharps ? SEMITONE_TO_FIFTHS_SHARP : SEMITONE_TO_FIFTHS_FLAT)[
    transposedMajor
  ]

  if (Number.isFinite(nextFifths)) {
    key.fifths = String(nextFifths)
  }
}

function transposePitchNode(pitch, semitoneDelta, preferSharps) {
  if (!pitch || !pitch.step || pitch.octave === undefined || pitch.octave === null) return

  const step = String(pitch.step).toUpperCase()
  const base = STEP_TO_SEMITONE[step]
  if (base === undefined) return

  const alter = Number(pitch.alter || 0)
  const octave = Number(pitch.octave)
  if (!Number.isFinite(octave)) return

  const midi = (octave + 1) * 12 + base + alter + semitoneDelta
  const transposedOctave = Math.floor(midi / 12) - 1
  const transposedSemitone = normalizeSemitone(midi)
  const nextPitch = semitoneToPitch(transposedSemitone, transposedOctave, preferSharps)

  pitch.step = nextPitch.step
  pitch.octave = String(nextPitch.octave)
  if (nextPitch.alter === 0) {
    delete pitch.alter
  } else {
    pitch.alter = String(nextPitch.alter)
  }
}

function transposeStepAlterNode(node, stepKey, alterKey, semitoneDelta, preferSharps) {
  if (!node || !node[stepKey]) return

  const step = String(node[stepKey]).toUpperCase()
  const base = STEP_TO_SEMITONE[step]
  if (base === undefined) return

  const alter = Number(node[alterKey] || 0)
  const transposedSemitone = normalizeSemitone(base + alter + semitoneDelta)
  const nextPitch = semitoneToPitch(transposedSemitone, 4, preferSharps)

  node[stepKey] = nextPitch.step
  if (nextPitch.alter === 0) {
    delete node[alterKey]
  } else {
    node[alterKey] = String(nextPitch.alter)
  }
}

function transposeMusicXml(xmlText, semitoneDelta) {
  if (!semitoneDelta) return xmlText

  const doc = parser.parse(xmlText)
  const score = doc['score-partwise']
  if (!score) {
    throw new Error('Only MusicXML score-partwise can be transposed.')
  }

  const parts = toArray(score.part)
  parts.forEach((part) => {
    let currentFifths = 0

    toArray(part.measure).forEach((measure) => {
      const attributes = measure.attributes
      const keys = toArray(attributes?.key)
      if (keys.length > 0) {
        transposeKeySignature(keys[0], semitoneDelta)
        const nextFifths = Number(keys[0].fifths)
        if (Number.isFinite(nextFifths)) {
          currentFifths = nextFifths
        }
      }

      const preferSharps = currentFifths >= 0
      const notes = toArray(measure.note)
      notes.forEach((note) => {
        if (!note || note.rest !== undefined || !note.pitch) return
        transposePitchNode(note.pitch, semitoneDelta, preferSharps)
      })

      const harmonies = toArray(measure.harmony)
      harmonies.forEach((harmony) => {
        transposeStepAlterNode(harmony.root, 'root-step', 'root-alter', semitoneDelta, preferSharps)
        transposeStepAlterNode(harmony.bass, 'bass-step', 'bass-alter', semitoneDelta, preferSharps)
      })
    })
  })

  return builder.build(doc)
}

function formatKeyLabel(fifths, mode) {
  const normalizedMode = mode === 'minor' ? 'minor' : 'major'
  const keyMap = normalizedMode === 'minor' ? MINOR_KEY_BY_FIFTHS : MAJOR_KEY_BY_FIFTHS
  const tonic = keyMap[String(fifths)] || '?'
  return `${tonic} ${normalizedMode}`
}

function getCurrentKeyInfo(xmlText, transposeSemitones) {
  if (!xmlText) {
    return {
      currentLabel: 'No score loaded',
      originalLabel: 'No score loaded',
    }
  }

  try {
    const doc = parser.parse(xmlText)
    const score = doc['score-partwise']
    if (!score) {
      return { currentLabel: 'Unknown', originalLabel: 'Unknown' }
    }

    const parts = toArray(score.part)
    let foundKey = null

    for (const part of parts) {
      for (const measure of toArray(part.measure)) {
        const key = toArray(measure?.attributes?.key)[0]
        if (key && key.fifths !== undefined) {
          foundKey = {
            fifths: String(key.fifths),
            mode: String(key.mode || 'major').toLowerCase(),
          }
          break
        }
      }
      if (foundKey) break
    }

    if (!foundKey) {
      return {
        currentLabel: 'Key not specified',
        originalLabel: 'Key not specified',
      }
    }

    const originalLabel = formatKeyLabel(foundKey.fifths, foundKey.mode)

    if (transposeSemitones !== 0) {
      transposeKeySignature(foundKey, transposeSemitones)
    }

    const currentLabel = formatKeyLabel(foundKey.fifths, foundKey.mode)

    return {
      currentLabel,
      originalLabel,
    }
  } catch {
    return {
      currentLabel: 'Unknown',
      originalLabel: 'Unknown',
    }
  }
}

function getTimeSignature(attributes) {
  if (!attributes || !attributes.time) return null
  const time = Array.isArray(attributes.time) ? attributes.time[0] : attributes.time
  if (!time || !time.beats || !time['beat-type']) return null
  return `${time.beats}/${time['beat-type']}`
}

function getDuration(note) {
  const base = NOTE_TYPE_TO_DURATION[note.type] || 'q'
  const dotCount = toArray(note.dot).length
  return { base, dotCount }
}

function getPitchAndAccidental(note) {
  if (note.rest !== undefined) {
    return { key: 'b/4', accidental: null, isRest: true }
  }

  const pitch = note.pitch
  if (!pitch || !pitch.step || !pitch.octave) {
    throw new Error('A note is missing pitch.step or pitch.octave.')
  }

  const alter = Number(pitch.alter || 0)
  let accidental = null
  let accidentalSuffix = ''

  if (alter > 0) {
    accidental = '#'
    accidentalSuffix = '#'
  } else if (alter < 0) {
    accidental = 'b'
    accidentalSuffix = 'b'
  }

  const step = String(pitch.step).toLowerCase()
  return {
    key: `${step}${accidentalSuffix}/${pitch.octave}`,
    accidental,
    isRest: false,
  }
}

function parseMusicXml(xmlText) {
  const doc = parser.parse(xmlText)
  const score = doc['score-partwise']

  if (!score) {
    throw new Error('Only MusicXML score-partwise format is supported.')
  }

  const part = toArray(score.part)[0]
  if (!part) {
    throw new Error('No score part found in MusicXML.')
  }

  const measures = toArray(part.measure)
  if (measures.length === 0) {
    throw new Error('No measures found in MusicXML.')
  }

  let currentTimeSignature = '4/4'

  return measures.map((measure, measureIndex) => {
    const measureTime = getTimeSignature(measure.attributes)
    if (measureTime) currentTimeSignature = measureTime

    const notes = toArray(measure.note)
    const events = []

    notes.forEach((note) => {
      if (note.grace !== undefined) return

      const { base, dotCount } = getDuration(note)
      const { key, accidental, isRest } = getPitchAndAccidental(note)
      const duration = `${base}${isRest ? 'r' : ''}`
      const chordNote = note.chord !== undefined

      if (chordNote && events.length > 0) {
        const previous = events[events.length - 1]
        if (!previous.isRest && previous.duration === duration) {
          previous.keys.push(key)
          previous.accidentals.push(accidental)
          return
        }
      }

      events.push({
        keys: [key],
        accidentals: [accidental],
        duration,
        dots: dotCount,
        isRest,
      })
    })

    return {
      number: measure['@_number'] || String(measureIndex + 1),
      events,
      timeSignature: currentTimeSignature,
    }
  })
}

async function renderMusicXmlFallback(container, xmlText) {
  const { Accidental, Formatter, Renderer, Stave, StaveNote, Voice } = await import('vexflow')
  const measures = parseMusicXml(xmlText)
  if (measures.length === 0) {
    throw new Error('The score has no renderable notes.')
  }

  const containerWidth = Math.max(container.clientWidth, 700)
  const measureWidth = 280
  const measuresPerRow = Math.max(1, Math.floor(containerWidth / measureWidth))
  const staveWidth = Math.floor(containerWidth / measuresPerRow)
  const rowHeight = 180
  const totalRows = Math.ceil(measures.length / measuresPerRow)
  const canvasHeight = totalRows * rowHeight + 24

  container.innerHTML = ''

  const renderer = new Renderer(container, Renderer.Backends.SVG)
  renderer.resize(containerWidth, canvasHeight)
  const context = renderer.getContext()

  measures.forEach((measure, index) => {
    if (measure.events.length === 0) return

    const row = Math.floor(index / measuresPerRow)
    const col = index % measuresPerRow
    const x = col * staveWidth + 10
    const y = row * rowHeight + 20
    const width = staveWidth - 20

    const stave = new Stave(x, y, width)
    if (col === 0) {
      stave.addClef('treble').addTimeSignature(measure.timeSignature)
    }
    stave.setContext(context).draw()

    const [beats = 4, beatValue = 4] = measure.timeSignature
      .split('/')
      .map((value) => Number(value))

    const voice = new Voice({
      num_beats: Number.isFinite(beats) ? beats : 4,
      beat_value: Number.isFinite(beatValue) ? beatValue : 4,
    })
    voice.setStrict(false)

    const staveNotes = measure.events.map((event) => {
      const staveNote = new StaveNote({
        clef: 'treble',
        keys: event.keys,
        duration: event.duration,
      })

      event.accidentals.forEach((accidental, noteIndex) => {
        if (accidental) {
          staveNote.addModifier(new Accidental(accidental), noteIndex)
        }
      })

      for (let i = 0; i < event.dots; i += 1) {
        staveNote.addDotToAll()
      }

      return staveNote
    })

    voice.addTickables(staveNotes)
    new Formatter().joinVoices([voice]).format([voice], width - 40)
    voice.draw(context, stave)
  })
}

function App() {
  const [songName, setSongName] = useState('')
  const [xmlText, setXmlText] = useState('')
  const [availableFiles, setAvailableFiles] = useState([])
  const [selectedFile, setSelectedFile] = useState('')
  const [transposeSemitones, setTransposeSemitones] = useState(0)
  const [loading, setLoading] = useState(false)
  const [fileListError, setFileListError] = useState('')
  const [fetchError, setFetchError] = useState('')
  const [renderError, setRenderError] = useState('')
  const scoreRef = useRef(null)
  const osmdRef = useRef(null)

  const apiBase = import.meta.env.VITE_MUSICXML_API_URL || '/api/musicxml'
  const currentKeyInfo = useMemo(
    () => getCurrentKeyInfo(xmlText, transposeSemitones),
    [xmlText, transposeSemitones],
  )

function getPublicFileUrl(fileName) {
  return `${import.meta.env.BASE_URL || '/'}xml/${encodeURIComponent(fileName)}`
}

  const loadPublicFile = useCallback(async (fileName) => {
    const response = await fetch(getPublicFileUrl(fileName))
    if (!response.ok) {
      throw new Error(`Could not load ${fileName}.`)
    }

    const text = await response.text()
    setXmlText(text)
  }, [])

  useEffect(() => {
    if (!scoreRef.current) return
    if (!xmlText) {
      scoreRef.current.innerHTML = ''
      return
    }

    let cancelled = false

    async function renderOne(xmlForRender) {
      if (!scoreRef.current) return false

      try {
        scoreRef.current.innerHTML = ''

        const { OpenSheetMusicDisplay } = await import('opensheetmusicdisplay')
        if (!osmdRef.current) {
          if (!scoreRef.current) return
          osmdRef.current = new OpenSheetMusicDisplay(scoreRef.current, {
            autoResize: true,
            backend: 'svg',
            drawTitle: true,
          })
        }

        await osmdRef.current.load(xmlForRender)
        if (cancelled || !scoreRef.current) return

        osmdRef.current.render()
        return true
      } catch {
        try {
          if (!scoreRef.current) return
          await renderMusicXmlFallback(scoreRef.current, xmlForRender)
          return true
        } catch {
          return false
        }
      }
    }

    async function renderWithFallbackChain() {
      let transposedXml = xmlText

      if (transposeSemitones !== 0) {
        try {
          transposedXml = transposeMusicXml(xmlText, transposeSemitones)
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

      const renderedOriginal = await renderOne(xmlText)
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

    renderWithFallbackChain()

    return () => {
      cancelled = true
    }
  }, [xmlText, transposeSemitones])

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
        setFileListError('Unable to read XML files from /public.')
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
      const query = encodeURIComponent(songName.trim())
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

      setXmlText(text)
    } catch (error) {
      setFetchError(error instanceof Error ? error.message : 'Failed to fetch MusicXML.')
      setXmlText('')
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

  function createDownloadFileName() {
    const fallbackName = songName.trim() ? `${songName.trim()}.musicxml` : 'score.musicxml'
    const source = selectedFile || fallbackName
    const match = source.match(/^(.*?)(\.(musicxml|xml))$/i)

    let baseName = match ? match[1] : source
    const extension = match ? match[2] : '.musicxml'

    if (transposeSemitones !== 0) {
      const sign = transposeSemitones > 0 ? 'plus' : 'minus'
      baseName = `${baseName}_transposed_${sign}${Math.abs(transposeSemitones)}`
    }

    const safeBaseName = baseName
      .replace(/[<>:"/\\|?*]/g, '_')
      .split('')
      .map((char) => (char.charCodeAt(0) < 32 ? '_' : char))
      .join('')
      .trim()

    return `${safeBaseName || 'score'}${extension}`
  }

  function downloadCurrentXml() {
    if (!xmlText) {
      setFetchError('No MusicXML loaded to download.')
      return
    }

    setFetchError('')

    let outputXml = xmlText
    if (transposeSemitones !== 0) {
      try {
        outputXml = transposeMusicXml(xmlText, transposeSemitones)
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
    link.download = createDownloadFileName()
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }

  function shiftSemitone(delta) {
    setTransposeSemitones((current) => {
      const next = current + delta
      return Math.max(-24, Math.min(24, next))
    })
  }

  return (
    <main className="app-shell">
      <section className="panel">
        <h1>MusicXML Song Viewer</h1>
        <p className="subtext">Search by song name, fetch MusicXML, and render with VexFlow.</p>

        <form className="search-form" onSubmit={handleFetchScore}>
          <label htmlFor="songName">Song name</label>
          <div className="row">
            <input
              id="songName"
              type="text"
              value={songName}
              onChange={(event) => setSongName(event.target.value)}
              placeholder="Example: Fur Elise"
            />
            <button type="submit" disabled={loading}>
              {loading ? 'Loading...' : 'Fetch Score'}
            </button>
            <button
              type="button"
              className="secondary"
              onClick={loadSelectedFile}
              disabled={loading || !selectedFile}
            >
              Load File
            </button>
            <button
              type="button"
              className="secondary"
              onClick={downloadCurrentXml}
              disabled={loading || !xmlText}
            >
              Download MusicXML
            </button>
          </div>
        </form>

        <div className="file-picker">
          <label htmlFor="xmlFileSelect">Select file from public folder</label>
          <select
            id="xmlFileSelect"
            value={selectedFile}
            onChange={handleFileChange}
            disabled={loading || availableFiles.length === 0}
          >
            {availableFiles.length === 0 && <option value="">No XML files found</option>}
            {availableFiles.map((fileName) => (
              <option key={fileName} value={fileName}>
                {fileName}
              </option>
            ))}
          </select>
        </div>

        <div className="transpose-key-row">
          <div className="transpose-controls">
            <span>Transpose (semitones): {transposeSemitones > 0 ? `+${transposeSemitones}` : transposeSemitones}</span>
            <div className="row">
              <button
                type="button"
                className="secondary"
                onClick={() => shiftSemitone(-1)}
                disabled={loading || !xmlText}
              >
                Down 1/2 step
              </button>
              <button
                type="button"
                className="secondary"
                onClick={() => shiftSemitone(1)}
                disabled={loading || !xmlText}
              >
                Up 1/2 step
              </button>
            </div>
          </div>
          <div className="key-display">
            <span>Current key</span>
            <strong>{currentKeyInfo.currentLabel}</strong>
            <small>Original: {currentKeyInfo.originalLabel}</small>
          </div>
        </div>

        <p className="endpoint">Endpoint: {apiBase}</p>

        {(fetchError || renderError) && <p className="error">{fetchError || renderError}</p>}
        {fileListError && <p className="error">{fileListError}</p>}
      </section>

      <section className="score-panel">
        <div className="score-container" ref={scoreRef} />
        {!xmlText && <p className="placeholder">No score loaded yet.</p>}
      </section>
    </main>
  )
}

export default App
