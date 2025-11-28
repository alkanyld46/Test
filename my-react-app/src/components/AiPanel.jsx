import MessageComposer from './MessageComposer'

const AiPanel = ({ messages, inputValue, onChangeInput, onSend, isVisible, isLoading }) => (
  <div className={`ai-card ${isVisible ? '' : 'mobile-hidden-card'}`}>
    <div className="card-head">
      <div>
        <p className="eyebrow">AI Chatbot</p>
        <h3>Ask anything</h3>
      </div>
      {isLoading && <span className="badge">Thinking...</span>}
    </div>
    <div className="ai-thread">
      {messages.map((msg, index) => (
        <div key={`${msg.role}-${index}`} className={`ai-row ${msg.role}`}>
          <div className="bubble">
            <p>{msg.content}</p>
          </div>
        </div>
      ))}
    </div>
    <MessageComposer
      placeholder="Message the AI"
      value={inputValue}
      onChange={onChangeInput}
      onSubmit={onSend}
      ctaLabel="Ask"
    />
  </div>
)

export default AiPanel
