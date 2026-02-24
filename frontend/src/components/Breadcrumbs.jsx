import { t } from '../lang'
import { getPathSegments } from '../utils/pathHelpers'

function Breadcrumbs({ path, onPathChange, rootIcon, rootTitle }) {
  const segments = getPathSegments(path)
  
  // If no path segments, only show root button
  if (segments.length === 0) {
    return (
      <div className="token-breadcrumbs">
        <button
          type="button"
          className="breadcrumb-btn"
          onClick={() => onPathChange('')}
          title={rootTitle}
        >
          {rootIcon}
        </button>
      </div>
    )
  }

  return (
    <div className="token-breadcrumbs">
      <button
        type="button"
        className="breadcrumb-btn"
        onClick={() => onPathChange('')}
        title={rootTitle}
      >
        {rootIcon}
      </button>
      {segments.map((segment, i) => {
        const pathUpToHere = segments.slice(0, i + 1).join('/')
        return (
          <span key={pathUpToHere} className="breadcrumb-segment">
            <span className="breadcrumb-sep">/</span>
            <button
              type="button"
              className="breadcrumb-btn"
              onClick={() => onPathChange(pathUpToHere)}
            >
              {segment}
            </button>
          </span>
        )
      })}
    </div>
  )
}

export default Breadcrumbs
