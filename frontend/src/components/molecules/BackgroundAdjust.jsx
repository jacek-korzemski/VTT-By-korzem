import BackgroundNudgeControls from '../atoms/BackgroundNudgeControls'
import BackgroundZoomControls from '../atoms/BackgroundZoomControls'

function BackgroundAdjust({
  currentBackground,
  bgZoomStep,
  onBgZoomStepChange,
  onNudgeBackground,
  onScaleBackground,
  onResetBackgroundPosition,
  onResetBackgroundScale,
}) {
  return (
    <div className="background-adjust">
      <BackgroundNudgeControls
        currentBackground={currentBackground}
        onNudgeBackground={onNudgeBackground}
        onResetBackgroundPosition={onResetBackgroundPosition}
      />
      <BackgroundZoomControls
        currentBackground={currentBackground}
        bgZoomStep={bgZoomStep}
        onBgZoomStepChange={onBgZoomStepChange}
        onScaleBackground={onScaleBackground}
        onResetBackgroundScale={onResetBackgroundScale}
      />
    </div>
  )
}

export default BackgroundAdjust
