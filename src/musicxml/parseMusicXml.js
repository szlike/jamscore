import { parser, toArray } from './xmlHelpers'

const NOTE_TYPE_TO_DURATION = {
  whole: 'w',
  half: 'h',
  quarter: 'q',
  eighth: '8',
  '16th': '16',
  '32nd': '32',
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

export function parseMusicXml(xmlText) {
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
