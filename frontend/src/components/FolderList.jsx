import { t } from '../lang'
import { getPathSegments, getParentPath } from '../utils/pathHelpers'

function FolderList({ path, folders, onPathChange }) {
  const pathSegments = getPathSegments(path)
  const parentPath = getParentPath(path)

  if (pathSegments.length === 0 && folders.length === 0) return null

  return (
    <div className="token-folders">
      {pathSegments.length > 0 && (
        <div
          className="asset-item token-folder"
          onClick={() => onPathChange(parentPath)}
          title={t('sidebar.folderBack')}
        >
          <span className="folder-icon">📁</span>
          <span>{t('sidebar.folderBack')}</span>
        </div>
      )}
      {folders.map(folder => (
        <div
          key={folder.path}
          className="asset-item token-folder"
          onClick={() => onPathChange(folder.path)}
          title={folder.name}
        >
          <span className="folder-icon">📁</span>
          <span>{folder.name}</span>
        </div>
      ))}
    </div>
  )
}

export default FolderList
