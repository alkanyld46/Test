import {
  Fragment,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react'
import './App.css'

const CURRENT_USER_ID = 5
const API_BASE = import.meta.env.VITE_API_BASE ?? '/api/chatSystem'
const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY
const GEMINI_MODEL = 'gemini-2.5-flash' // good, cheap, has free tier

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
  const [isDetailOpen, setIsDetailOpen] = useState(false)
  const [isMobile, setIsMobile] = useState(false)
  const [activeMobileTab, setActiveMobileTab] = useState('chat')

  useEffect(() => {
    fetchUsers()
    fetchGroups()
  }, [])

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.matchMedia('(max-width: 720px)').matches)
    }

    handleResize()
    window.addEventListener('resize', handleResize)

    return () => window.removeEventListener('resize', handleResize)
  }, [])

  useEffect(() => {
    if (!isMobile) {
      setActiveMobileTab('chat')
    }
  }, [isMobile])

  useEffect(() => {
    if (users.length > 0 && !selectedUser) {
      setSelectedUser(users[0])
    }
  }, [users, selectedUser])

  const filteredUsers = useMemo(() => {
    const term = userSearch.trim().toLowerCase()

    if (!term) return users

    return users.filter((user) => {
      const username = user.username?.toLowerCase() ?? ''
      const position = user.position?.toLowerCase() ?? ''

      return username.includes(term) || position.includes(term)
    })
  }, [userSearch, users])

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

  useEffect(() => {
    setIsDetailOpen(false)
  }, [selectedUser])

  const isTabActive = useCallback((tab) => !isMobile || activeMobileTab === tab, [activeMobileTab, isMobile])

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

    if (!GEMINI_API_KEY) {
      setAiMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content:
            'Add your Gemini API key to the VITE_GEMINI_API_KEY env variable to chat with AI.',
        },
      ])
      return
    }

    setAiLoading(true)

    try {
      // Convert our chat history into Gemini's "contents" format
      const history = updatedMessages.map((m) => ({
        role: m.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: m.content }],
      }))

      const body = {
        // Model name
        model: GEMINI_MODEL,
        // Simple system-style instruction as first message
        contents: [
          {
            role: 'user',
            parts: [
              {
                text:
                  'You are a concise, friendly chat assistant inside a messaging app UI mock.',
              },
            ],
          },
          ...history,
        ],
      }

      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(body),
        },
      )

      const text = await res.text()
      console.log('Gemini status:', res.status)
      console.log('Gemini body:', text)

      if (!res.ok) {
        let apiMsg = ''
        try {
          const json = JSON.parse(text)
          apiMsg = json?.error?.message || ''
        } catch {
          // ignore parse error
        }
        throw new Error(apiMsg || `Gemini API failed with status ${res.status}`)
      }

      const payload = JSON.parse(text)

      // Extract the model's reply: candidates[0].content.parts[].text
      let reply = 'The AI did not return a response.'
      const candidate = payload?.candidates?.[0]
      const parts = candidate?.content?.parts || candidate?.content?.[0]?.parts

      if (Array.isArray(parts)) {
        const textPart = parts.find((p) => typeof p.text === 'string')
        if (textPart?.text) {
          reply = textPart.text
        }
      }

      setAiMessages((prev) => [...prev, { role: 'assistant', content: reply }])
    } catch (error) {
      console.error('sendAiMessage (Gemini) failed:', error)
      setAiMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: `Gemini error: ${error.message}`,
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
          <div className="brand">Joseph's Test App</div>
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

        {isMobile && (
          <div className="mobile-tab-bar" role="tablist" aria-label="Mobile navigation">
            <button
              type="button"
              className={`mobile-tab ${activeMobileTab === 'chat' ? 'active' : ''}`}
              onClick={() => setActiveMobileTab('chat')}
              role="tab"
              aria-selected={activeMobileTab === 'chat'}
            >
              💬 Chat
            </button>
            <button
              type="button"
              className={`mobile-tab ${activeMobileTab === 'people' ? 'active' : ''}`}
              onClick={() => setActiveMobileTab('people')}
              role="tab"
              aria-selected={activeMobileTab === 'people'}
            >
              👥 People
            </button>
            <button
              type="button"
              className={`mobile-tab ${activeMobileTab === 'groups' ? 'active' : ''}`}
              onClick={() => setActiveMobileTab('groups')}
              role="tab"
              aria-selected={activeMobileTab === 'groups'}
            >
              🗂️ Groups
            </button>
            <button
              type="button"
              className={`mobile-tab ${activeMobileTab === 'ai' ? 'active' : ''}`}
              onClick={() => setActiveMobileTab('ai')}
              role="tab"
              aria-selected={activeMobileTab === 'ai'}
            >
              🤖 AI
            </button>
          </div>
        )}

        <section className={`people-panel ${isTabActive('people') || isTabActive('groups') ? '' : 'mobile-hidden'}`}>

          <div className={`group-card ${isTabActive('groups') ? '' : 'mobile-hidden-card'}`}>
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

          <div className={`people-card ${isTabActive('people') ? '' : 'mobile-hidden-card'}`}>
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
              {filteredUsers.map((user) => (
                <button
                  key={user.id}
                  type="button"
                  className={`person-row ${selectedUser?.id === user.id ? 'selected' : ''}`}
                  onClick={() => {
                    setSelectedUser(user)
                    setActiveMobileTab('chat')
                  }}                >

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

        <section className={`chat-panel ${isTabActive('chat') || isTabActive('ai') ? '' : 'mobile-hidden'}`}>
          <div className={`chat-window ${isTabActive('chat') ? '' : 'mobile-hidden-card'}`}>
            <header className="chat-header">
              <button
                className="user-meta"
                type="button"
                onClick={() => selectedUser && setIsDetailOpen(true)}
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

          </div>

          <div className={`ai-card ${isTabActive('ai') ? '' : 'mobile-hidden-card'}`}>
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

        {isDetailOpen && (
          <div
            className="modal-backdrop"
            role="presentation"
            onClick={() => setIsDetailOpen(false)}
          >
            <div
              className="detail-card detail-modal"
              role="dialog"
              aria-modal="true"
              aria-label="User details"
              onClick={(event) => event.stopPropagation()}
            >
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

                <button
                  className="close-btn"
                  type="button"
                  aria-label="Close details"
                  onClick={() => setIsDetailOpen(false)}
                >
                  ×
                </button>
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
          </div>
        )}
      </div>
    </div>
  )
}

export default App
