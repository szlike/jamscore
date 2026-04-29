const MUSICXML_EXTENSIONS = new Set(['.musicxml', '.xml'])
const ALPHATAB_EXTENSIONS = new Set(['.gtp', '.gp', '.gp3', '.gp4', '.gp5', '.gpx'])

export function getPublicScoreFileUrl(fileName) {
  return `${import.meta.env.BASE_URL || '/'}xml/${encodeURIComponent(fileName)}`
}

export function getScoreFileExtension(fileName) {
  const dotIndex = fileName.lastIndexOf('.')
  return dotIndex === -1 ? '' : fileName.slice(dotIndex).toLowerCase()
}

export function getScoreFileType(fileName) {
  const extension = getScoreFileExtension(fileName)

  if (MUSICXML_EXTENSIONS.has(extension)) return 'musicxml'
  if (ALPHATAB_EXTENSIONS.has(extension)) return 'alphatab'
  return 'unknown'
}

export function canTransposeScoreFile(scoreFile) {
  return scoreFile?.type === 'musicxml'
}

export function createMusicXmlDownloadFileName({
  scoreFileName,
  songName,
  transposeSemitones,
}) {
  const fallbackName = songName.trim() ? `${songName.trim()}.musicxml` : 'score.musicxml'
  const source = scoreFileName || fallbackName
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
