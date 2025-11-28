const MessageComposer = ({ placeholder, value, onChange, onSubmit, ctaLabel = 'Send', disabled }) => (
  <div className="message-composer">
    <div className="input-row">
      <input
        className="input"
        placeholder={placeholder}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === 'Enter') {
            onSubmit()
          }
        }}
        disabled={disabled}
      />
      <div className="icons-inline" />
    </div>
    <button className="pill primary" type="button" onClick={onSubmit} disabled={disabled}>
      {ctaLabel}
    </button>
  </div>
)

export default MessageComposer
