import { Fragment, useCallback, useEffect, useMemo, useState } from 'react'
import './App.css'

const CURRENT_USER_ID = 5
const API_BASE = import.meta.env.VITE_API_BASE ?? '/api/chatSystem'

const normalizeId = (value) => {
  const asNumber = Number(value)
  return Number.isNaN(asNumber) ? value : asNumber
}

const normalizeUser = (user) =>
  user
    ? {
      ...user,
      id: normalizeId(user.id),
    }
    : user

const normalizeMessage = (message) =>
  message
    ? {
      ...message,
      id: message.id ?? crypto.randomUUID(),
      fromUser: normalizeId(message.fromUser),
      toUser: normalizeId(message.toUser),
    }
    : message

const parseTimestamp = (timestamp) => {
  if (!timestamp) return null

  if (timestamp instanceof Date) return timestamp

  // If it's a number or numeric string, assume it's a Unix timestamp
  if (typeof timestamp === 'number' || /^\d+$/.test(timestamp)) {

    const tsNum = Number(timestamp)
    const millis = tsNum < 10_000_000_000 ? tsNum * 1000 : tsNum
    return new Date(millis)
  }

  const date = new Date(timestamp)
  return Number.isNaN(date.getTime()) ? null : date
}

const formatTimestamp = (timestamp) => {
  const date = parseTimestamp(timestamp)

  if (!date) return 'Just now'
  // Example: "09:22" in local time
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

const formatDateLabel = (timestamp) => {
  const date = parseTimestamp(timestamp)
  if (!date) return 'Unknown date'

  const today = new Date()
  const yesterday = new Date()
  yesterday.setDate(today.getDate() - 1)

  const isSameDay = (first, second) =>
    first.getFullYear() === second.getFullYear()
    && first.getMonth() === second.getMonth()
    && first.getDate() === second.getDate()

  if (isSameDay(date, today)) return 'Today'
  if (isSameDay(date, yesterday)) return 'Yesterday'

  return date.toLocaleDateString([], {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

const dateKey = (timestamp) => {
  const date = parseTimestamp(timestamp)
  if (!date) return 'unknown'

  const year = date.getFullYear()
  const month = `${date.getMonth() + 1}`.padStart(2, '0')
  const day = `${date.getDate()}`.padStart(2, '0')

  return `${year}-${month}-${day}`
}

const getMessageTimestamp = (message) => message?.timestamp ?? message?.createdAt

const navItems = [
  { label: 'Dashboard', icon: '🏠' },
  { label: 'Shipment', icon: '📦' },
  { label: 'Tracking', icon: '🛰️' },
  { label: 'Messages', icon: '💬', active: true },
  { label: 'Revenue', icon: '💰' },
  { label: 'Maps', icon: '🗺️' },
]

const bottomNav = [
  { label: 'Settings', icon: '⚙️' },
  { label: 'Logout', icon: '⏻' },
]

function App() {
  const [users, setUsers] = useState([])
  const [groups, setGroups] = useState([])
  const [selectedUser, setSelectedUser] = useState(null)
  const [userDetails, setUserDetails] = useState(null)
  const [chatMessages, setChatMessages] = useState([])
  const [userSearch, setUserSearch] = useState('')
  const [messageSearch, setMessageSearch] = useState('')
  const [newMessage, setNewMessage] = useState('')
  const [statusMessage, setStatusMessage] = useState('')
  const [aiMessages, setAiMessages] = useState([
    { role: 'assistant', content: 'Hi! Ask me anything about your projects.' },
  ])
  const [aiInput, setAiInput] = useState('')
  const [aiLoading, setAiLoading] = useState(false)

  useEffect(() => {
    fetchUsers()
    fetchGroups()
  }, [])

  useEffect(() => {
    if (users.length > 0 && !selectedUser) {
      setSelectedUser(users[0])
    }
  }, [users, selectedUser])

  const filteredMessages = useMemo(() => {
    const term = messageSearch.toLowerCase()
    return chatMessages.filter((chat) =>
      chat.message?.toLowerCase().includes(term),
    )
  }, [chatMessages, messageSearch])

  const fetchUsers = async () => {
    try {
      const response = await fetch(`${API_BASE}/users/list`)
      if (!response.ok) {
        throw new Error('Unable to load users')
      }
      const payload = await response.json()
      const incoming = payload?.data ?? payload ?? []
      setUsers(incoming)
    } catch (error) {
      console.error('fetchUsers failed', error)
      setStatusMessage('User list unavailable because the API could not be reached.')
      setUsers([])
    }
  }

  const fetchGroups = async () => {
    try {
      const response = await fetch(`${API_BASE}/groups/list`)
      if (!response.ok) {
        throw new Error('Unable to load groups')
      }
      const payload = await response.json()
      setGroups(payload?.data ?? payload ?? [])
    } catch (error) {
      console.error('fetchGroups failed', error)
      setStatusMessage('Group list unavailable because the API could not be reached.')
      setGroups([])
    }
  }

  const fetchUserDetails = useCallback(async (userId) => {
    try {
      const response = await fetch(`${API_BASE}/user/${userId}`)
      if (!response.ok) {
        throw new Error('Unable to load user details')
      }
      const payload = await response.json()
      const incoming = payload?.data ?? payload ?? null
      setUserDetails(normalizeUser(incoming))
    } catch (error) {
      console.error('fetchUserDetails failed', error)
      setUserDetails(null)
    }
  }, [])

  const fetchChatByUser = useCallback(async (userId) => {
    try {
      const response = await fetch(`${API_BASE}/chatByUserId/${userId}`)
      if (!response.ok) {
        throw new Error('Unable to load chat messages')
      }
      const payload = await response.json()
      const incoming = payload?.data ?? payload ?? []
      setChatMessages((incoming || []).map(normalizeMessage))
    } catch (error) {
      console.error('fetchChatByUser failed', error)
      setChatMessages([])
    }
  }, [])

  useEffect(() => {
    if (selectedUser) {
      fetchChatByUser(selectedUser.id)
      fetchUserDetails(selectedUser.id)
    }
  }, [fetchChatByUser, fetchUserDetails, selectedUser])

  const sendMessage = async () => {
    if (!newMessage.trim() || !selectedUser) {
      return
    }
    const nowIso = new Date().toISOString()

    const optimisticMessage = {
      id: crypto.randomUUID(),
      fromUser: CURRENT_USER_ID,
      toUser: selectedUser.id,
      message: newMessage.trim(),
      timestamp: nowIso,
      createdAt: nowIso,
    }

    setChatMessages((prev) => [...prev, optimisticMessage])
    setNewMessage('')

    try {
      const response = await fetch(`${API_BASE}/chat/add`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ fromUser: CURRENT_USER_ID, toUser: selectedUser.id, message: optimisticMessage.message }),
      })

      if (!response.ok) {
        throw new Error('Unable to send')
      }

      await fetchChatByUser(selectedUser.id)
      setStatusMessage('Message sent and synced with the server.')
    } catch (error) {
      console.error('sendMessage failed', error)
      setStatusMessage('Message sent locally. API unreachable so it might not persist.')
    }
  }

  const sendAiMessage = async () => {
    if (!aiInput.trim()) {
      return
    }

    const userMessage = { role: 'user', content: aiInput.trim() }
    const updatedMessages = [...aiMessages, userMessage]
    setAiMessages(updatedMessages)
    setAiInput('')

    const key = import.meta.env.VITE_OPENAI_API_KEY
    console.log('OpenAI key prefix:', key ? key.slice(0, 8) : 'MISSING')

    if (!key) {
      setAiMessages([
        ...updatedMessages,
        {
          role: 'assistant',
          content:
            'Add your AI API key to the VITE_OPENAI_API_KEY env variable to chat with AI.',
        },
      ])
      return
    }

    setAiLoading(true)
    try {
      // Build input in the format from the Responses API docs
      const inputMessages = [
        {
          role: 'developer',
          content:
            'You are a concise, friendly chat assistant inside a messaging app UI mock.',
        },
        ...updatedMessages.map((m) => ({
          role: m.role === 'assistant' ? 'assistant' : 'user',
          content: m.content,
        })),
      ]

      const res = await fetch('https://api.openai.com/v1/responses', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${key}`,
        },
        body: JSON.stringify({
          model: 'gpt-5-nano', // <– use a model from the docs you pasted
          input: inputMessages,
        }),
      })

      const text = await res.text()
      console.log('AI raw status:', res.status)
      console.log('AI raw body:', text)

      if (!res.ok) {
        throw new Error(`AI API request failed with status ${res.status}`)
      }

      const payload = JSON.parse(text)

      // Extract text from payload.output[]
      let reply = 'The AI did not return a response.'
      if (Array.isArray(payload.output)) {
        for (const item of payload.output) {
          if (item.type === 'message' && Array.isArray(item.content)) {
            const textPart = item.content.find(
              (part) => part.type === 'output_text',
            )
            if (textPart?.text) {
              reply = textPart.text
              break
            }
          }
        }
      }

      setAiMessages((prev) => [...prev, { role: 'assistant', content: reply }])
    } catch (error) {
      console.error('sendAiMessage failed:', error)
      setAiMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content:
            'Unable to reach the AI right now. Please check the console for details.',
        },
      ])
    } finally {
      setAiLoading(false)
    }
  }


  return (
    <div className="app-shell">
      <div className="dashboard">
        <aside className="sider">
          <div className="brand">UMN</div>
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

        <section className="people-panel">
          <div className="panel-header">
            <div>
              <p className="eyebrow">Current location</p>
              <h2>Chatting You</h2>
            </div>
            <div className="status">
              <span className="status-dot" />
              <span>Offline</span>
            </div>
          </div>

          <div className="group-card">
            <div className="card-head">
              <div>
                <p className="eyebrow">Group</p>
                <h3>Conversation</h3>
              </div>
              <button className="pill">+ Create</button>
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
                onChange={(event) => setUserSearch(event.target.value)}
              />
            </div>
            <div className="people-list">
              {users.map((user) => (
                <button
                  key={user.id}
                  type="button"
                  className={`person-row ${selectedUser?.id === user.id ? 'selected' : ''}`}
                  onClick={() => setSelectedUser(user)}
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
        </section>

        <section className="chat-panel">
          <header className="chat-header">
            <div className="user-meta">
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
            </div>
            <div className="chat-header-actions">
              <input
                className="input"
                placeholder="Search message"
                value={messageSearch}
                onChange={(event) => setMessageSearch(event.target.value)}
              />
              <div className="icon-cluster">
                <span role="img" aria-label="phone">
                  📞
                </span>
                <span role="img" aria-label="video">
                  🎥
                </span>
                <span role="img" aria-label="more">
                  ⋯
                </span>
              </div>
            </div>
          </header>

          <div className="message-thread">
            {filteredMessages.map((chat, index) => {
              const isMine = Number(chat.fromUser) === CURRENT_USER_ID
              const timestampValue = getMessageTimestamp(chat)

              const currentDateKey = dateKey(timestampValue)
              const previousTimestamp = getMessageTimestamp(filteredMessages[index - 1])
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
                      {/* Text message (if present) */}
                      {chat.message && <p>{chat.message}</p>}

                      {/* Image attachment (only if it exists) */}
                      {chat.image && (
                        <div className="chat-image-wrapper">
                          <img
                            src={chat.image}
                            alt="Chat attachment"
                            className="chat-image"
                          />
                        </div>
                      )}

                      <span className="caption">
                        {formatTimestamp(timestampValue)}
                      </span>
                    </div>
                  </div>
                </Fragment>
              )
            })}
          </div>


          <div className="message-composer">
            <div className="input-shell">
              <input
                className="input"
                placeholder="Type a message"
                value={newMessage}
                onChange={(event) => setNewMessage(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') {
                    sendMessage()
                  }
                }}
              />
              <div className="icons-inline">
                <span title="Attachments">📎</span>
                <span title="Emojis">😊</span>
              </div>
            </div>
            <button className="pill primary" type="button" onClick={sendMessage}>
              Send
            </button>
          </div>

          <div className="ai-card">
            <div className="card-head">
              <div>
                <p className="eyebrow">AI Chatbot</p>
                <h3>Ask anything</h3>
              </div>
              {aiLoading && <span className="badge">Thinking...</span>}
            </div>
            <div className="ai-thread">
              {aiMessages.map((msg, index) => (
                <div key={`${msg.role}-${index}`} className={`ai-row ${msg.role}`}>
                  <div className="bubble">
                    <p>{msg.content}</p>
                  </div>
                </div>
              ))}
            </div>
            <div className="message-composer">
              <input
                className="input"
                placeholder="Message the AI"
                value={aiInput}
                onChange={(event) => setAiInput(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') {
                    sendAiMessage()
                  }
                }}
              />
              <button className="pill primary" type="button" onClick={sendAiMessage}>
                Ask
              </button>
            </div>
          </div>
          {statusMessage && <p className="status-hint">{statusMessage}</p>}
        </section>

        <aside className="detail-panel">
          <div className="detail-card">
            <div className="detail-header">
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
                <p className="title">{userDetails?.username ?? 'User details'}</p>
                <p className="caption">
                  {userDetails?.position ?? 'Select a person to view more'}
                </p>
              </div>
            </div>

            <div className="detail-item">
              <p className="eyebrow">Phone</p>
              <p className="title">{userDetails?.phone ?? 'Not provided'}</p>
            </div>

            <div className="detail-item">
              <p className="eyebrow">Email</p>
              <p className="title">{userDetails?.email ?? 'Not provided'}</p>
            </div>

            <div className="detail-item">
              <p className="eyebrow">Address</p>
              <p className="title">{userDetails?.address ?? 'Not provided'}</p>
            </div>
          </div>
        </aside>
      </div>
    </div>
  )
}

export default App
