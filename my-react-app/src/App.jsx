import { useCallback, useEffect, useMemo, useState } from 'react'
import './App.css'

const CURRENT_USER_ID = 5
const API_BASE = import.meta.env.VITE_API_BASE ?? '/api/chatSystem'

const normalizeUsers = (payload) =>
  (payload?.data ?? payload ?? [])
    .filter((user) => user && user.id)
    .map((user) => ({
      id: user.id,
      name: user.name ?? user.username ?? 'Unknown',
      job: user.job ?? user.position ?? '—',
      phone: user.phone,
      address: user.address,
      email: user.email,
      profileImage: user.profileImage,
    }))

const normalizeGroups = (payload) =>
  (payload?.data ?? payload ?? [])
    .filter((group) => group && group.id)
    .map((group) => ({
      id: group.id,
      name: group.name ?? 'Group',
      unread: group.unread ?? 0,
      users: group.users ?? [],
    }))

const formatTimestamp = (timestamp) => {
  if (!timestamp) return 'Just now'
  const numeric = Number(timestamp)
  const millis = numeric > 10_000_000_000 ? numeric : numeric * 1000
  return new Date(millis).toLocaleString()
}

const normalizeChats = (payload) =>
  (payload?.data ?? payload ?? [])
    .filter((chat) => chat && chat.id)
    .map((chat) => ({
      id: chat.id,
      fromUser: chat.fromUser,
      toUser: chat.toUser,
      message: chat.message,
      createdAt: chat.createdAt ?? formatTimestamp(chat.timestamp),
      image: chat.image,
    }))

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

const attachmentSamples = [
  { name: 'trackingid.pdf', size: '424 KB' },
  { name: 'trackingimage.pdf', size: '424 KB' },
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

  useEffect(() => {
    if (selectedUser) {
      fetchChatByUser(selectedUser.id)
      fetchUserDetails(selectedUser.id)
    }
  }, [fetchChatByUser, fetchUserDetails, selectedUser])

  const filteredUsers = useMemo(() => {
    const term = userSearch.toLowerCase()
    return users.filter(
      (user) =>
        (user.name ?? '').toLowerCase().includes(term) ||
        (user.job && user.job.toLowerCase().includes(term)),
    )
  }, [users, userSearch])

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
      setUsers(normalizeUsers(payload))
    } catch (error) {
      console.error('fetchUsers failed', error)
      setStatusMessage('Unable to load users from the API.')
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
      setGroups(normalizeGroups(payload))
    } catch (error) {
      console.error('fetchGroups failed', error)
      setStatusMessage('Unable to load groups from the API.')
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
      setUserDetails(normalizeUsers(payload)[0] ?? null)
    } catch (error) {
      console.error('fetchUserDetails failed', error)
      setStatusMessage('Unable to load user details from the API.')
      setUserDetails(null)
    }
  }, [users])

  const fetchChatByUser = useCallback(async (userId) => {
    try {
      const response = await fetch(`${API_BASE}/chatByUserId/${userId}`)
      if (!response.ok) {
        throw new Error('Unable to load chat messages')
      }
      const payload = await response.json()
      setChatMessages(normalizeChats(payload))
    } catch (error) {
      console.error('fetchChatByUser failed', error)
      setStatusMessage('Unable to load chat messages from the API.')
      setChatMessages([])
    }
  }, [])

  const sendMessage = async () => {
    if (!newMessage.trim() || !selectedUser) {
      return
    }

    const optimisticMessage = {
      id: crypto.randomUUID(),
      fromUser: CURRENT_USER_ID,
      toUser: selectedUser.id,
      message: newMessage.trim(),
      createdAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
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

    if (!key) {
      setAiMessages([
        ...updatedMessages,
        { role: 'assistant', content: 'Add your AI API key to the VITE_OPENAI_API_KEY env variable to chat with AI.' },
      ])
      return
    }

    setAiLoading(true)
    try {
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${key}`,
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          messages: [
            { role: 'system', content: 'You are a concise, friendly chat assistant inside a messaging app UI mock.' },
            ...updatedMessages,
          ],
        }),
      })

      if (!response.ok) {
        throw new Error('Unable to reach AI model')
      }

      const payload = await response.json()
      const reply = payload?.choices?.[0]?.message?.content ?? 'The AI did not return a response.'
      setAiMessages((prev) => [...prev, { role: 'assistant', content: reply }])
    } catch (error) {
      console.error('sendAiMessage failed', error)
      setAiMessages((prev) => [
        ...prev,
        { role: 'assistant', content: 'Unable to reach the AI right now. Please try again later.' },
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
              {groups.map((group) => (
                <div className="group-row" key={group.id}>
                  <div className="avatar" aria-hidden="true" />
                  <div>
                    <p className="title">{group.name}</p>
                    <p className="caption">{group.unread} unread</p>
                  </div>
                  {group.unread > 0 && <span className="badge">{group.unread}</span>}
                </div>
              ))}
            </div>
          </div>

          <div className="people-card">
            <div className="card-head">
              <div>
                <p className="eyebrow">Person</p>
                <h3>All (32)</h3>
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
                  onClick={() => setSelectedUser(user)}
                >
                  <div className="avatar" aria-hidden="true" />
                  <div>
                    <p className="title">{user.name}</p>
                    <p className="caption">{user.job}</p>
                  </div>
                  <span className="time-stamp">12:55</span>
                </button>
              ))}
            </div>
          </div>
        </section>

        <section className="chat-panel">
          <header className="chat-header">
            <div className="user-meta">
              <div className="avatar large" aria-hidden="true" />
              <div>
                <p className="title">{selectedUser?.name ?? 'Select a person'}</p>
                <p className="caption">{selectedUser?.job ?? 'Waiting for selection'}</p>
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
            {filteredMessages.map((chat) => {
              const isMine = chat.fromUser === CURRENT_USER_ID
              return (
                <div key={chat.id} className={`message-row ${isMine ? 'mine' : ''}`}>
                  {!isMine && <div className="avatar tiny" aria-hidden="true" />}
                  <div className="bubble">
                    <p>{chat.message}</p>
                    <span className="caption">{chat.createdAt ?? 'Just now'}</span>
                  </div>
                </div>
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
              <div className="avatar large" aria-hidden="true" />
              <div>
                <p className="title">{userDetails?.name ?? 'User details'}</p>
                <p className="caption">{userDetails?.job ?? 'Select a person to view more'}</p>
              </div>
            </div>
            <div className="detail-item">
              <p className="eyebrow">Phone</p>
              <p className="title">{userDetails?.phone ?? 'Not available'}</p>
            </div>
            <div className="detail-item">
              <p className="eyebrow">Address</p>
              <p className="title">{userDetails?.address ?? 'Not available'}</p>
            </div>
          </div>

          <div className="detail-card">
            <div className="card-head">
              <h3>Attachments</h3>
              <span className="eyebrow">+ add new</span>
            </div>
            <div className="attachment-list">
              {attachmentSamples.map((file) => (
                <div className="attachment-row" key={file.name}>
                  <span>📎</span>
                  <div>
                    <p className="title">{file.name}</p>
                    <p className="caption">{file.size}</p>
                  </div>
                  <span className="time-stamp">Download</span>
                </div>
              ))}
            </div>
          </div>
        </aside>
      </div>
    </div>
  )
}

export default App
