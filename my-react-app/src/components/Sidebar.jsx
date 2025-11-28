const Sidebar = ({ navItems, bottomNav }) => (
  <aside className="sider">
    <div className="brand">J.T.A</div>
    <div className="nav">
      {navItems.map((item) => (
        <button
          key={item.label}
          className={`nav-icon ${item.active ? 'active' : ''}`}
          title={item.label}
          type="button"
        >
          <span>{item.icon}</span>
        </button>
      ))}
    </div>
    <div className="nav nav-bottom">
      {bottomNav.map((item) => (
        <button key={item.label} className="nav-icon" title={item.label} type="button">
          <span>{item.icon}</span>
        </button>
      ))}
    </div>
  </aside>
)

export default Sidebar
