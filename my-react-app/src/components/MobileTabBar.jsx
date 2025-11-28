const MobileTabBar = ({ activeTab, onChange }) => (
  <div className="mobile-tab-bar" role="tablist" aria-label="Mobile navigation">
    {[
      { key: 'chat', label: 'Chat', icon: '💬' },
      { key: 'people', label: 'People', icon: '👥' },
      { key: 'groups', label: 'Groups', icon: '🗂️' },
      { key: 'ai', label: 'AI', icon: '🤖' },
    ].map((tab) => (
      <button
        key={tab.key}
        type="button"
        className={`mobile-tab ${activeTab === tab.key ? 'active' : ''}`}
        onClick={() => onChange(tab.key)}
        role="tab"
        aria-selected={activeTab === tab.key}
      >
        {tab.icon} {tab.label}
      </button>
    ))}
  </div>
)

export default MobileTabBar
