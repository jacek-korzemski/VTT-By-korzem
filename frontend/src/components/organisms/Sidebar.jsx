import CollapsibleSection from '../atoms/CollapsibleSection'
import SceneManager from './SceneManager'
import SidebarHeader from '../atoms/SidebarHeader'
import BackgroundSection from './BackgroundSection'
import FogOfWarSection from './FogOfWarSection'
import AssetBrowser from './AssetBrowser'
import ZoomControls from '../atoms/ZoomControls'
import { useScrollToSection } from '../../hooks/useScrollToSection'
import { useBackgroundZoom } from '../../hooks/useBackgroundZoom'
import { t } from '../../lang'

function Sidebar({ 
  isOpen,
  isGameMaster = false,
  apiStatus = 'ok',
  apiFlashTrigger = 0,
  mapPath,
  mapFolders,
  mapFiles,
  mapListLoading,
  mapNavigationForwardRef,
  onMapPathChange,
  tokenPath,
  tokenFolders,
  tokenFiles,
  tokenListLoading,
  tokenNavigationForwardRef,
  onTokenPathChange,
  backgroundAssets,
  currentBackground,
  selectedAsset, 
  selectedType,
  isEraserActive,
  hasMapElements,
  fogOfWar,
  fogEditMode,
  fogRevealMode,
  fogBrushSize,
  fogGmOpacity,
  onToggleFog,
  onToggleFogEdit,
  onSetFogRevealMode,
  onSetFogBrushSize,
  onSetFogGmOpacity,
  onFogRevealAll,
  onFogHideAll,
  onSelectAsset,
  onToggleEraser,
  onSetBackground,
  onRemoveBackground,
  onNudgeBackground,
  onScaleBackground,
  onResetBackgroundPosition,
  onResetBackgroundScale,
  onResetBackgroundAll,
  onClear,
  basePath,
  zoomLevel,
  onZoomChange,
  scenes,
  activeSceneId,
  onSwitchScene,
  onCreateScene,
  onDeleteScene,
  onRenameScene,
  onDuplicateScene,
  pingMode,
  activePing,
  onTogglePing,
  onClearPing,
  onDeselectAsset,
}) {
  const mapSectionRef = useScrollToSection(mapListLoading, mapNavigationForwardRef)
  const tokenSectionRef = useScrollToSection(tokenListLoading, tokenNavigationForwardRef)
  const [bgZoomStep, setBgZoomStep] = useBackgroundZoom(1)

  return (
    <aside className={`sidebar ${isOpen ? 'open' : 'closed'}`}>
      <SidebarHeader isGameMaster={isGameMaster} onClear={onClear} apiStatus={apiStatus} apiFlashTrigger={apiFlashTrigger} />

      <div className="sidebar-sections">
        <div className="sidebar-sections-inner">
          <div className="sidebar-sections-content">
            {isGameMaster && (
              <CollapsibleSection 
                title={t('scenes.title')} 
                icon="🎬" 
                defaultOpen={false}
                badge={scenes.length}
                onToggle={onDeselectAsset}
              >
                <SceneManager
                  scenes={scenes}
                  activeSceneId={activeSceneId}
                  onSwitchScene={onSwitchScene}
                  onCreateScene={onCreateScene}
                  onDeleteScene={onDeleteScene}
                  onRenameScene={onRenameScene}
                  onDuplicateScene={onDuplicateScene}
                />
              </CollapsibleSection>
            )}

            {isGameMaster && (
              <BackgroundSection
                backgroundAssets={backgroundAssets}
                currentBackground={currentBackground}
                bgZoomStep={bgZoomStep}
                onBgZoomStepChange={setBgZoomStep}
                onSetBackground={onSetBackground}
                onRemoveBackground={onRemoveBackground}
                onNudgeBackground={onNudgeBackground}
                onScaleBackground={onScaleBackground}
                onResetBackgroundPosition={onResetBackgroundPosition}
                onResetBackgroundScale={onResetBackgroundScale}
                onResetBackgroundAll={onResetBackgroundAll}
                onDeselectAsset={onDeselectAsset}
              />
            )}

            {isGameMaster && (
              <FogOfWarSection
                fogOfWar={fogOfWar}
                fogEditMode={fogEditMode}
                fogRevealMode={fogRevealMode}
                fogBrushSize={fogBrushSize}
                fogGmOpacity={fogGmOpacity}
                isGameMaster={isGameMaster}
                onToggleFog={onToggleFog}
                onToggleFogEdit={onToggleFogEdit}
                onSetFogRevealMode={onSetFogRevealMode}
                onSetFogBrushSize={onSetFogBrushSize}
                onSetFogGmOpacity={onSetFogGmOpacity}
                onFogRevealAll={onFogRevealAll}
                onFogHideAll={onFogHideAll}
                onDeselectAsset={onDeselectAsset}
              />
            )}

            <CollapsibleSection 
              title={t('sidebar.mapElements')} 
              icon="🏠" 
              defaultOpen={false}
              badge={mapFolders.length + mapFiles.length || null}
              onToggle={onDeselectAsset}
            >
              <AssetBrowser
                path={mapPath}
                folders={mapFolders}
                files={mapFiles}
                isLoading={mapListLoading}
                sectionRef={mapSectionRef}
                selectedAsset={selectedAsset}
                selectedType={selectedType}
                basePath={basePath}
                onPathChange={onMapPathChange}
                onSelectAsset={onSelectAsset}
                assetType="map"
                rootIcon="🏠"
                rootTitle={t('sidebar.mapElementsRoot')}
                pingMode={pingMode}
                activePing={activePing}
                onTogglePing={onTogglePing}
                onClearPing={onClearPing}
                isEraserActive={isEraserActive}
                hasMapElements={hasMapElements}
                onToggleEraser={onToggleEraser}
              />
            </CollapsibleSection>

            <CollapsibleSection 
              title={t('sidebar.tokens')} 
              icon="🎭" 
              defaultOpen={false}
              badge={tokenFolders.length + tokenFiles.length || null}
              onToggle={onDeselectAsset}
            >
              <AssetBrowser
                path={tokenPath}
                folders={tokenFolders}
                files={tokenFiles}
                isLoading={tokenListLoading}
                sectionRef={tokenSectionRef}
                selectedAsset={selectedAsset}
                selectedType={selectedType}
                basePath={basePath}
                onPathChange={onTokenPathChange}
                onSelectAsset={onSelectAsset}
                assetType="token"
                rootIcon="🎭"
                rootTitle={t('sidebar.tokensRoot')}
              />
            </CollapsibleSection>
          </div>

          <ZoomControls zoomLevel={zoomLevel} onZoomChange={onZoomChange} />
        </div>
      </div>
    </aside>
  )
}

export default Sidebar
