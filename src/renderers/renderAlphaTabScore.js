export async function renderAlphaTabScore(container, scoreData, onError) {
  const alphaTab = await import('@coderline/alphatab')
  const api = new alphaTab.AlphaTabApi(container, {
    core: {
      fontDirectory: `${import.meta.env.BASE_URL || '/'}font/`,
      useWorkers: true,
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

  const didStartLoading = api.load(scoreData)
  if (!didStartLoading) {
    api.destroy()
    throw new Error('This file format is not supported by alphaTab.')
  }

  return api
}
