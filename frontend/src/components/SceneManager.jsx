import React, { useState, useCallback } from 'react'
import { t } from '../lang'

function SceneManager({ 
  scenes, 
  activeSceneId, 
  onSwitchScene, 
  onCreateScene, 
  onDeleteScene, 
  onRenameScene,
  onDuplicateScene
}) {
  const [editingId, setEditingId] = useState(null)
  const [editingName, setEditingName] = useState('')
  const [isCreating, setIsCreating] = useState(false)
  const [newSceneName, setNewSceneName] = useState('')

  const handleStartRename = useCallback((scene) => {
    setEditingId(scene.id)
    setEditingName(scene.name)
  }, [])

  const handleFinishRename = useCallback(() => {
    if (editingId && editingName.trim()) {
      onRenameScene(editingId, editingName.trim())
    }
    setEditingId(null)
    setEditingName('')
  }, [editingId, editingName, onRenameScene])

  const handleKeyDown = useCallback((e) => {
    if (e.key === 'Enter') {
      handleFinishRename()
    } else if (e.key === 'Escape') {
      setEditingId(null)
      setEditingName('')
    }
  }, [handleFinishRename])

  const handleCreateScene = useCallback(() => {
    if (newSceneName.trim()) {
      onCreateScene(newSceneName.trim())
      setNewSceneName('')
      setIsCreating(false)
    }
  }, [newSceneName, onCreateScene])

  const handleCreateKeyDown = useCallback((e) => {
    if (e.key === 'Enter') {
      handleCreateScene()
    } else if (e.key === 'Escape') {
      setIsCreating(false)
      setNewSceneName('')
    }
  }, [handleCreateScene])

  return (
    <div className="scene-manager">
      <div className="scene-list">
        {scenes.map((scene, index) => (
          <div 
            key={scene.id} 
            className={`scene-item ${scene.id === activeSceneId ? 'active' : ''}`}
          >
            {editingId === scene.id ? (
              <input
                type="text"
                className="scene-name-input"
                value={editingName}
                onChange={(e) => setEditingName(e.target.value)}
                onBlur={handleFinishRename}
                onKeyDown={handleKeyDown}
                autoFocus
                maxLength={50}
              />
            ) : (
              <>
                <span 
                  className="scene-name"
                  onClick={() => scene.id !== activeSceneId && onSwitchScene(scene.id)}
                  title={scene.id === activeSceneId ? t('scenes.current') : t('scenes.switchTo')}
                >
                  <span className="scene-number">{index + 1}.</span>
                  {scene.name}
                </span>
                <div className="scene-actions">
                  <button
                    className="scene-action-btn"
                    onClick={() => handleStartRename(scene)}
                    title={t('scenes.rename')}
                  >
                    ✏️
                  </button>
                  <button
                    className="scene-action-btn"
                    onClick={() => onDuplicateScene(scene.id)}
                    title={t('scenes.duplicate')}
                  >
                    📋
                  </button>
                  {scenes.length > 1 && (
                    <button
                      className="scene-action-btn delete"
                      onClick={() => {
                        if (confirm(t('scenes.deleteConfirm', { name: scene.name }))) {
                          onDeleteScene(scene.id)
                        }
                      }}
                      title={t('scenes.delete')}
                    >
                      🗑️
                    </button>
                  )}
                </div>
              </>
            )}
          </div>
        ))}
      </div>

      {isCreating ? (
        <div className="scene-create-form">
          <input
            type="text"
            className="scene-name-input"
            placeholder={t('scenes.namePlaceholder')}
            value={newSceneName}
            onChange={(e) => setNewSceneName(e.target.value)}
            onKeyDown={handleCreateKeyDown}
            autoFocus
            maxLength={50}
          />
          <button className="scene-create-confirm" onClick={handleCreateScene}>
            ✓
          </button>
          <button 
            className="scene-create-cancel" 
            onClick={() => { setIsCreating(false); setNewSceneName('') }}
          >
            ✕
          </button>
        </div>
      ) : (
        <button 
          className="scene-add-btn"
          onClick={() => setIsCreating(true)}
        >
          + {t('scenes.add')}
        </button>
      )}
    </div>
  )
}

export default SceneManager