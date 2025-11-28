const GroupList = ({ groups }) => (
  <div className="group-card">
    <div className="card-head">
      <div>
        <p className="eyebrow">Group</p>
        <h3>Conversation</h3>
      </div>
      <button className="pill" type="button">+ Create</button>
    </div>
    <div className="group-list">
      {groups.map((group) => {
        const memberCount = group.users?.length ?? 0

        return (
          <div className="group-row" key={group.id}>
            <div className="avatar" aria-hidden="true" />
            <div>
              <p className="title">{group.name}</p>
              <p className="caption">
                {memberCount} member{memberCount === 1 ? '' : 's'}
              </p>
            </div>
          </div>
        )
      })}
    </div>
  </div>
)

export default GroupList
