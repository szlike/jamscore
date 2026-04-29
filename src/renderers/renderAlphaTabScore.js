function getTrackArray(trackSource) {
  if (!trackSource) return []
  if (Array.isArray(trackSource)) return trackSource
  if (typeof trackSource[Symbol.iterator] === 'function') return Array.from(trackSource)

  if (typeof trackSource.length === 'number') {
    return Array.from({ length: trackSource.length }, (_, index) => trackSource[index]).filter(Boolean)
  }

  return []
}

export function applyAlphaTabTransposition(api, semitones, { render = true } = {}) {
  const scoreTracks = getTrackArray(api.score?.tracks)
  const renderedTracks = getTrackArray(api.tracks)
  const tracks = scoreTracks.length > 0 ? scoreTracks : renderedTracks
  if (tracks.length === 0) return

  api.settings.notation.transpositionPitches = tracks.map(() => semitones)
  api.updateSettings()

  if (typeof api.changeTrackTranspositionPitch === 'function') {
    api.changeTrackTranspositionPitch(tracks, semitones)
  }

  if (render) {
    api.render()
  }
}

export async function renderAlphaTabScore(
  container,
  scoreData,
  onError,
  getTransposeSemitones = () => 0,
) {
  const alphaTab = await import('@coderline/alphatab')
  alphaTab.Environment.printEnvironmentInfo()
  const api = new alphaTab.AlphaTabApi(container, {
    core: {
      fontDirectory: `${import.meta.env.BASE_URL || '/'}font/`,
      // Keep rendering on the main thread so we don't depend on bundler worker plugins.
      useWorkers: false,
    },
    display: {
      layoutMode: 'page',
      systemsLayoutMode: 'automatic',
      stretchForce: 0.8,
      barsPerRow: -1,
    },
  })

  api.error.on((error) => {
    onError(error instanceof Error ? error.message : 'Failed to render Guitar Pro file.')
  })
  api.scoreLoaded.on(() => {
    applyAlphaTabTransposition(api, getTransposeSemitones(), { render: false })
  })

  const didStartLoading = api.load(scoreData)
  if (!didStartLoading) {
    api.destroy()
    throw new Error('This file format is not supported by alphaTab.')
  }

  return api
}
