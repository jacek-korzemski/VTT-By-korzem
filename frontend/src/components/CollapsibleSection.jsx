import React, { useState } from 'react'

function CollapsibleSection({ title, icon, defaultOpen = false, children, badge }) {
  const [isOpen, setIsOpen] = useState(defaultOpen)

  return (
    <section className={`sidebar-section collapsible ${isOpen ? 'open' : 'closed'}`}>
      <h2 onClick={() => setIsOpen(!isOpen)}>
        <span className="section-icon">{icon}</span>
        <span className="section-title">{title}</span>
        {badge && <span className="section-badge">{badge}</span>}
        <span className="section-arrow">{isOpen ? '▼' : '▶'}</span>
      </h2>
      {isOpen && <div className="section-content">{children}</div>}
    </section>
  )
}

export default CollapsibleSection