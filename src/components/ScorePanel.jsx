/* eslint-disable react/prop-types */

export function ScorePanel({
  hasScore,
  isFullscreen,
  onToggleFullscreen,
  scoreRef,
}) {
  const label = isFullscreen ? 'Show toolbox' : 'Show score full screen'

  return (
    <section className="score-panel">
      <button
        type="button"
        className={`score-toggle${isFullscreen ? ' is-active' : ''}`}
        onClick={onToggleFullscreen}
        aria-pressed={isFullscreen}
        aria-label={label}
        title={isFullscreen ? 'Show toolbox' : 'Full screen score'}
      >
        <span className="score-toggle-icon" aria-hidden="true" />
        <span className="score-toggle-label">{label}</span>
      </button>
      <div className="score-container" ref={scoreRef} />
      {!hasScore && <p className="placeholder">No score loaded yet.</p>}
    </section>
  )
}
