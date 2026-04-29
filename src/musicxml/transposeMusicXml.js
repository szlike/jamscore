import { builder, normalizeSemitone, parser, toArray } from './xmlHelpers'

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

export function transposeMusicXml(xmlText, semitoneDelta) {
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

export function getCurrentKeyInfo(xmlText, transposeSemitones) {
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
