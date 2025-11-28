const DetailModal = ({ isOpen, onClose, userDetails }) => {
  if (!isOpen) return null

  return (
    <div className="modal-backdrop" role="presentation" onClick={onClose}>
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
            onClick={onClose}
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
  )
}

export default DetailModal
