import GroupList from './GroupList'
import PeopleList from './PeopleList'

const PeoplePanel = ({
  groups,
  filteredUsers,
  userSearch,
  onUserSearchChange,
  selectedUser,
  onSelectUser,
  isPeopleVisible,
  isGroupsVisible,
}) => (
  <section className={`people-panel ${isPeopleVisible || isGroupsVisible ? '' : 'mobile-hidden'}`}>
    <div className={`${isGroupsVisible ? '' : 'mobile-hidden-card'}`}>
      <GroupList groups={groups} />
    </div>

    <div className={`${isPeopleVisible ? '' : 'mobile-hidden-card'}`}>
      <PeopleList
        users={filteredUsers}
        userSearch={userSearch}
        onSearchChange={onUserSearchChange}
        selectedUser={selectedUser}
        onSelectUser={onSelectUser}
      />
    </div>
  </section>
)

export default PeoplePanel
