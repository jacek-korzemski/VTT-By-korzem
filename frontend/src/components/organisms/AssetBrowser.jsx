import { t } from '../../lang'
import Breadcrumbs from '../atoms/Breadcrumbs'
import FolderList from '../molecules/FolderList'
import AssetGrid from '../molecules/AssetGrid'
import PingTool from '../atoms/PingTool'
import EraserTool from '../atoms/EraserTool'

function AssetBrowser({
  path,
  folders,
  files,
  isLoading,
  sectionRef,
  selectedAsset,
  selectedType,
  basePath,
  onPathChange,
  onSelectAsset,
  assetType,
  rootIcon,
  rootTitle,
  pingMode,
  activePing,
  onTogglePing,
  onClearPing,
  isEraserActive,
  hasMapElements,
  onToggleEraser,
}) {
  const showPingTool = assetType === 'map'
  const showEraser = assetType === 'map'

  return (
    <div ref={sectionRef} className="sidebar-section-assets">
      {isLoading && (
        <div className="sidebar-asset-loading-overlay" aria-hidden>
          {t('app.loading')}
        </div>
      )}

      {showPingTool && (
        <PingTool
          pingMode={pingMode}
          activePing={activePing}
          onTogglePing={onTogglePing}
          onClearPing={onClearPing}
        />
      )}

      {showEraser && (
        <EraserTool
          isEraserActive={isEraserActive}
          hasMapElements={hasMapElements}
          onToggleEraser={onToggleEraser}
        />
      )}

      {(path || folders.length > 0) && (
        <Breadcrumbs
          path={path}
          onPathChange={onPathChange}
          rootIcon={rootIcon}
          rootTitle={rootTitle}
        />
      )}

      <FolderList
        path={path}
        folders={folders}
        onPathChange={onPathChange}
      />

      <AssetGrid
        assets={files}
        selectedAsset={selectedAsset}
        selectedType={selectedType}
        basePath={basePath}
        onSelectAsset={onSelectAsset}
        assetType={assetType}
        showEmptyMessage={files.length === 0 && folders.length === 0}
      />
    </div>
  )
}

export default AssetBrowser
