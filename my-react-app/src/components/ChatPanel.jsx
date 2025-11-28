import MessageComposer from './MessageComposer'
import MessageThread from './MessageThread'

const ChatPanel = ({
  selectedUser,
  userDetails,
  messageSearch,
  onMessageSearchChange,
  messages,
  onSendMessage,
  newMessage,
  onNewMessageChange,
  isVisible,
  onOpenDetails,
  currentUserId,
}) => (
  <div className={`chat-window ${isVisible ? '' : 'mobile-hidden-card'}`}>
    <header className="chat-header">
      <button
        className="user-meta"
        type="button"
        onClick={onOpenDetails}
        disabled={!selectedUser}
      >
        {userDetails?.profileImage ? (
          <img
            src={userDetails.profileImage}
            alt={userDetails.username ?? 'User avatar'}
            className="avatar large"
          />
        ) : (
          <div className="avatar large" aria-hidden="true" />
        )}
        <div>
          <p className="title">{selectedUser?.username ?? 'Select a person'}</p>
          <p className="caption">{selectedUser?.phone ?? 'Waiting for selection'}</p>
        </div>
      </button>
      <div className="chat-header-actions">
        <input
          className="input"
          placeholder="Search message"
          value={messageSearch}
          onChange={(event) => onMessageSearchChange(event.target.value)}
        />
        <div className="icon-cluster">
          <span role="img" aria-label="phone">📞</span>
          <span role="img" aria-label="video">🎥</span>
          <span role="img" aria-label="more">⋯</span>
        </div>
      </div>
    </header>

    <MessageThread messages={messages} currentUserId={currentUserId} />

    <MessageComposer
      placeholder="Type a message"
      value={newMessage}
      onChange={onNewMessageChange}
      onSubmit={onSendMessage}
      disabled={!selectedUser}
    />
  </div>
)

export default ChatPanel
