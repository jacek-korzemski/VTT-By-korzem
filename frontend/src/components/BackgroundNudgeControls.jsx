import { t } from '../lang'

function BackgroundNudgeControls({ currentBackground, onNudgeBackground, onResetBackgroundPosition }) {
  return (
    <div className="background-adjust-section">
      <span className="bg-adjust-label">{t('sidebar.backgroundPosition')}</span>
      <div className="bg-nudge-grid">
        <div className="bg-nudge-row bg-nudge-row-top">
          <button
            type="button"
            className="bg-nudge-btn"
            onClick={() => onNudgeBackground(0, -1)}
          >
            ↑ 1
          </button>
          <button
            type="button"
            className="bg-nudge-btn"
            onClick={() => onNudgeBackground(0, -5)}
          >
            ↑ 5
          </button>
          <button
            type="button"
            className="bg-nudge-btn"
            onClick={() => onNudgeBackground(0, -10)}
          >
            ↑ 10
          </button>
        </div>
        <div className="bg-nudge-row bg-nudge-row-middle">
          <button
            type="button"
            className="bg-nudge-btn"
            onClick={() => onNudgeBackground(-1, 0)}
          >
            ← 1
          </button>
          <button type="button" className="bg-nudge-btn" disabled>
            {/* center empty cell */}
          </button>
          <button
            type="button"
            className="bg-nudge-btn"
            onClick={() => onNudgeBackground(1, 0)}
          >
            1 →
          </button>
        </div>
        <div className="bg-nudge-row bg-nudge-row-middle">
          <button
            type="button"
            className="bg-nudge-btn"
            onClick={() => onNudgeBackground(-5, 0)}
          >
            ← 5
          </button>
          <button type="button" className="bg-nudge-btn" disabled></button>
          <button
            type="button"
            className="bg-nudge-btn"
            onClick={() => onNudgeBackground(5, 0)}
          >
            5 →
          </button>
        </div>
        <div className="bg-nudge-row bg-nudge-row-middle">
          <button
            type="button"
            className="bg-nudge-btn"
            onClick={() => onNudgeBackground(-10, 0)}
          >
            ← 10
          </button>
          <button type="button" className="bg-nudge-btn" disabled></button>
          <button
            type="button"
            className="bg-nudge-btn"
            onClick={() => onNudgeBackground(10, 0)}
          >
            10 →
          </button>
        </div>
        <div className="bg-nudge-row bg-nudge-row-bottom">
          <button
            type="button"
            className="bg-nudge-btn"
            onClick={() => onNudgeBackground(0, 1)}
          >
            1 ↓
          </button>
          <button
            type="button"
            className="bg-nudge-btn"
            onClick={() => onNudgeBackground(0, 5)}
          >
            5 ↓
          </button>
          <button
            type="button"
            className="bg-nudge-btn"
            onClick={() => onNudgeBackground(0, 10)}
          >
            10 ↓
          </button>
        </div>
        <div className="bg-nudge-row bg-nudge-offset-row">
          <span className="bg-nudge-center">
            {t('sidebar.backgroundOffsetShort', {
              x: currentBackground.offsetX ?? 0,
              y: currentBackground.offsetY ?? 0,
            })}
          </span>
          <button
            type="button"
            className="bg-nudge-reset-btn"
            onClick={onResetBackgroundPosition}
          >
            {t('sidebar.backgroundResetPosition') || 'Reset position'}
          </button>
        </div>
      </div>
    </div>
  )
}

export default BackgroundNudgeControls
