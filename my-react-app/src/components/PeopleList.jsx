const PeopleList = ({ users, userSearch, onSearchChange, selectedUser, onSelectUser }) => (
  <div className="people-card">
    <div className="card-head">
      <div>
        <p className="eyebrow">Person</p>
        <h3>All ({users.length})</h3>
      </div>
      <input
        className="input"
        placeholder="Search person"
        value={userSearch}
        onChange={(event) => onSearchChange(event.target.value)}
      />
    </div>
    <div className="people-list">
      {users.map((user) => (
        <button
          key={user.id}
          type="button"
          className={`person-row ${selectedUser?.id === user.id ? 'selected' : ''}`}
          onClick={() => onSelectUser(user)}
        >
          {user?.profileImage ? (
            <img
              src={user.profileImage}
              alt={user.username ?? 'User avatar'}
              className="avatar large"
            />
          ) : (
            <div className="avatar large" aria-hidden="true" />
          )}
          <div>
            <p className="title">{user.username}</p>
            <p className="caption">{user.position}</p>
          </div>
        </button>
      ))}
    </div>
  </div>
)

export default PeopleList
