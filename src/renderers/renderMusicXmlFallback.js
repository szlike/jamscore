import { parseMusicXml } from '../musicxml/parseMusicXml'

export async function renderMusicXmlFallback(container, xmlText) {
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
