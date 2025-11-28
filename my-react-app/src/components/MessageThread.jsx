import { Fragment } from 'react'
import { dateKey, formatDateLabel, formatTimestamp, getMessageTimestamp } from '../utils/chatUtils'

const MessageThread = ({ messages, currentUserId }) => (
  <div className="message-thread" style={{ paddingBottom: '0px' }}>
    {messages.map((chat, index) => {
      const isMine = Number(chat.fromUser) === currentUserId
      const timestampValue = getMessageTimestamp(chat)

      const currentDateKey = dateKey(timestampValue)
      const previousTimestamp = getMessageTimestamp(messages[index - 1])
      const previousDateKey = index > 0 ? dateKey(previousTimestamp) : null
      const showDivider = currentDateKey !== previousDateKey

      return (
        <Fragment key={chat.id}>
          {showDivider && (
            <div className="date-separator" aria-label={`Messages from ${formatDateLabel(timestampValue)}`}>
              <span>{formatDateLabel(timestampValue)}</span>
            </div>
          )}
          <div className={`message-row ${isMine ? 'mine' : ''}`}>
            {!isMine && <div className="avatar tiny" aria-hidden="true" />}

            <div className="bubble">
              {chat.message && <p>{chat.message}</p>}

              {chat.image && (
                <div className="chat-image-wrapper">
                  <img
                    src={chat.image}
                    alt="Chat attachment"
                    className="chat-image"
                  />
                </div>
              )}

              <span className="caption">{formatTimestamp(timestampValue)}</span>
            </div>
          </div>
        </Fragment>
      )
    })}
  </div>
)

export default MessageThread
