import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react'
import './App.css'
import AiPanel from './components/AiPanel'
import ChatPanel from './components/ChatPanel'
import DetailModal from './components/DetailModal'
import MobileTabBar from './components/MobileTabBar'
import PeoplePanel from './components/PeoplePanel'
import Sidebar from './components/Sidebar'
import {
  generateUuid,
  normalizeMessage,
  normalizeUser,
} from './utils/chatUtils'

const CURRENT_USER_ID = 5
const API_BASE = import.meta.env.VITE_API_BASE ?? '/api/chatSystem'
const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY
const GEMINI_MODEL = 'gemini-2.5-flash'

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

  const createUuid = useCallback(() => generateUuid(), [])

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
      setChatMessages((incoming || []).map((message) => normalizeMessage(message, createUuid)))
    } catch (error) {
      setChatMessages([])
    }
  }, [createUuid])

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
      id: createUuid(),
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
      const history = updatedMessages.map((m) => ({
        role: m.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: m.content }],
      }))

      const body = {
        model: GEMINI_MODEL,
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

      if (!res.ok) {
        let apiMsg = ''
        try {
          const json = JSON.parse(text)
          apiMsg = json?.error?.message || ''
        } catch {
          apiMsg = ''
        }
        throw new Error(apiMsg || `Gemini API failed with status ${res.status}`)
      }

      const payload = JSON.parse(text)

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
        <Sidebar navItems={navItems} bottomNav={bottomNav} />

        {isMobile && (
          <MobileTabBar activeTab={activeMobileTab} onChange={setActiveMobileTab} />
        )}

        <PeoplePanel
          groups={groups}
          filteredUsers={filteredUsers}
          userSearch={userSearch}
          onUserSearchChange={setUserSearch}
          selectedUser={selectedUser}
          onSelectUser={(user) => {
            setSelectedUser(user)
            setActiveMobileTab('chat')
          }}
          isPeopleVisible={isTabActive('people')}
          isGroupsVisible={isTabActive('groups')}
        />

        <section className={`chat-panel ${isTabActive('chat') || isTabActive('ai') ? '' : 'mobile-hidden'}`}>
          <ChatPanel
            selectedUser={selectedUser}
            userDetails={userDetails}
            messageSearch={messageSearch}
            onMessageSearchChange={setMessageSearch}
            messages={filteredMessages}
            onSendMessage={sendMessage}
            newMessage={newMessage}
            onNewMessageChange={setNewMessage}
            isVisible={isTabActive('chat')}
            onOpenDetails={() => selectedUser && setIsDetailOpen(true)}
            currentUserId={CURRENT_USER_ID}
          />

          <AiPanel
            messages={aiMessages}
            inputValue={aiInput}
            onChangeInput={setAiInput}
            onSend={sendAiMessage}
            isVisible={isTabActive('ai')}
            isLoading={aiLoading}
          />
          {statusMessage && <p className="status-hint">{statusMessage}</p>}
        </section>

        <DetailModal
          isOpen={isDetailOpen}
          onClose={() => setIsDetailOpen(false)}
          userDetails={userDetails}
        />
      </div>
    </div>
  )
}

export default App
