import { t } from '../../lang'
import { isSelected, getImageSrc, handleAssetDragStart } from '../../utils/sidebarHelpers'

function AssetGrid({ 
  assets, 
  selectedAsset, 
  selectedType, 
  basePath, 
  onSelectAsset, 
  assetType,
  showEmptyMessage = false
}) {
  return (
    <div className="asset-grid">
      {showEmptyMessage && assets.length === 0 && (
        <p className="no-assets">{t('sidebar.noAssets')}</p>
      )}
      {assets.map(asset => (
        <div
          key={asset.id}
          className={`asset-item ${isSelected(asset, assetType, selectedAsset, selectedType) ? 'selected' : ''}`}
          draggable
          onDragStart={(e) => handleAssetDragStart(asset, assetType, e)}
          onClick={() => onSelectAsset(asset, assetType)}
          title={asset.name}
        >
          <img src={getImageSrc(asset.src, basePath)} alt={asset.name} draggable={false} />
          <span>{asset.name}</span>
        </div>
      ))}
    </div>
  )
}

export default AssetGrid
