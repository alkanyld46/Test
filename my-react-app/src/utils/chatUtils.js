const randomValuesUuid = () => {
  if (typeof crypto === 'undefined' || !crypto.getRandomValues) return null
  const bytes = crypto.getRandomValues(new Uint8Array(16))
  bytes[6] = (bytes[6] & 0x0f) | 0x40
  bytes[8] = (bytes[8] & 0x3f) | 0x80

  const toHex = (num) => num.toString(16).padStart(2, '0')
  const segments = [
    Array.from(bytes.slice(0, 4)).map(toHex).join(''),
    Array.from(bytes.slice(4, 6)).map(toHex).join(''),
    Array.from(bytes.slice(6, 8)).map(toHex).join(''),
    Array.from(bytes.slice(8, 10)).map(toHex).join(''),
    Array.from(bytes.slice(10, 16)).map(toHex).join(''),
  ]

  return segments.join('-')
}

export const generateUuid = () => {
  try {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) {
      return crypto.randomUUID()
    }
    const fallback = randomValuesUuid()
    if (fallback) return fallback
  } catch {
    // ignore
  }
  return `uuid-${Date.now()}-${Math.random().toString(16).slice(2, 10)}`
}

export const normalizeId = (value) => {
  const asNumber = Number(value)
  return Number.isNaN(asNumber) ? value : asNumber
}

export const normalizeUser = (user) =>
  user
    ? {
      ...user,
      id: normalizeId(user.id),
    }
    : user

export const normalizeMessage = (message, uuidFactory) => {
  const makeUuid = uuidFactory || generateUuid
  return message
    ? {
      ...message,
      id: message.id ?? makeUuid?.(),
      fromUser: normalizeId(message.fromUser),
      toUser: normalizeId(message.toUser),
    }
    : message
}

export const parseTimestamp = (timestamp) => {
  if (!timestamp) return null

  if (timestamp instanceof Date) return timestamp

  if (typeof timestamp === 'number' || /^\d+$/.test(timestamp)) {
    const tsNum = Number(timestamp)
    const millis = tsNum < 10_000_000_000 ? tsNum * 1000 : tsNum
    return new Date(millis)
  }

  const date = new Date(timestamp)
  return Number.isNaN(date.getTime()) ? null : date
}

export const formatTimestamp = (timestamp) => {
  const date = parseTimestamp(timestamp)

  if (!date) return 'Just now'
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

export const formatDateLabel = (timestamp) => {
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

export const dateKey = (timestamp) => {
  const date = parseTimestamp(timestamp)
  if (!date) return 'unknown'

  const year = date.getFullYear()
  const month = `${date.getMonth() + 1}`.padStart(2, '0')
  const day = `${date.getDate()}`.padStart(2, '0')

  return `${year}-${month}-${day}`
}

export const getMessageTimestamp = (message) => message?.timestamp ?? message?.createdAt
