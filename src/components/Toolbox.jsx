/* eslint-disable react/prop-types */

export function Toolbox({
  apiBase,
  availableFiles,
  currentKeyInfo,
  fetchError,
  fileListError,
  canDownloadMusicXml,
  loading,
  onDownloadCurrentXml,
  onFetchScore,
  onFileChange,
  onLoadSelectedFile,
  onShiftSemitone,
  onSongNameChange,
  renderError,
  selectedFile,
  songName,
  transposeDisabled,
  transposeSemitones,
}) {
  const transposeLabel = transposeSemitones > 0 ? `+${transposeSemitones}` : transposeSemitones

  return (
    <section className="panel">
      <h1>Music Score Viewer</h1>
      <p className="subtext">Search by song name, fetch MusicXML, or load MusicXML and Guitar Pro files.</p>

      <form className="search-form" onSubmit={onFetchScore}>
        <label htmlFor="songName">Song name</label>
        <div className="row">
          <input
            id="songName"
            type="text"
            value={songName}
            onChange={(event) => onSongNameChange(event.target.value)}
            placeholder="Example: Fur Elise"
          />
          <button type="submit" disabled={loading}>
            {loading ? 'Loading...' : 'Fetch Score'}
          </button>
          <button
            type="button"
            className="secondary"
            onClick={onLoadSelectedFile}
            disabled={loading || !selectedFile}
          >
            Load File
          </button>
          <button
            type="button"
            className="secondary"
            onClick={onDownloadCurrentXml}
            disabled={loading || !canDownloadMusicXml}
          >
            Download MusicXML
          </button>
        </div>
      </form>

      <div className="file-picker">
        <label htmlFor="xmlFileSelect">Select score file from public folder</label>
        <select
          id="xmlFileSelect"
          value={selectedFile}
          onChange={onFileChange}
          disabled={loading || availableFiles.length === 0}
        >
          {availableFiles.length === 0 && <option value="">No score files found</option>}
          {availableFiles.map((fileName) => (
            <option key={fileName} value={fileName}>
              {fileName}
            </option>
          ))}
        </select>
      </div>

      <div className="transpose-key-row">
        <div className="transpose-controls">
          <span>Transpose (semitones): {transposeLabel}</span>
          <div className="row">
            <button
              type="button"
              className="secondary"
              onClick={() => onShiftSemitone(-1)}
              disabled={loading || transposeDisabled}
            >
              Down 1/2 step
            </button>
            <button
              type="button"
              className="secondary"
              onClick={() => onShiftSemitone(1)}
              disabled={loading || transposeDisabled}
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
  )
}
