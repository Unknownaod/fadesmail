import Logo from "./Logo";
import { getRecipientName, normalizeRecipient } from "../lib/recipients";

const PLACEHOLDERS = {
  cc: "Add Cc recipient...",
  bcc: "Add Bcc recipient...",
};

// One recipient row in the composer. type = "to" | "cc" | "bcc". `compose` is useCompose().
// Only the "To" row has the Cc/Bcc links and the autocomplete dropdown.
export default function RecipientField({ type, compose }) {
  const {
    recipientInputRef,
    recipientType,
    setRecipientType,
    recipientQuery,
    setRecipientQuery,
    recipientSuggestions,
    recipientSuggestionsOpen,
    setRecipientSuggestionsOpen,
    recipientLoading,
    recipientActiveIndex,
    showCc,
    showBcc,
    enableField,
    disableField,
    getRecipientList,
    addRecipient,
    removeRecipient,
    handleRecipientKeyDown,
  } = compose;

  const isTo = type === "to";
  const chips = getRecipientList(type);
  const label = type === "to" ? "To" : type === "cc" ? "Cc" : "Bcc";

  function handleFocus() {
    setRecipientType(type);

    if (isTo) {
      if (recipientQuery.trim()) {
        setRecipientSuggestionsOpen(true);
      }
    } else {
      setRecipientQuery("");
    }
  }

  function handleChange(event) {
    setRecipientType(type);
    setRecipientQuery(event.target.value);
    setRecipientSuggestionsOpen(true);
  }

  const placeholder = isTo
    ? chips.length
      ? "Add recipient..."
      : "Search people or enter an email"
    : PLACEHOLDERS[type];

  return (
    <div className="compose-field recipient-field">
      <div className="recipient-label">
        <span>{label}</span>

        {isTo ? (
          <div className="recipient-options">
            {!showCc && (
              <button
                className="recipient-option"
                type="button"
                onClick={() => enableField("cc")}
              >
                Cc
              </button>
            )}

            {!showBcc && (
              <button
                className="recipient-option"
                type="button"
                onClick={() => enableField("bcc")}
              >
                Bcc
              </button>
            )}
          </div>
        ) : (
          <button
            className="recipient-remove-field"
            type="button"
            onClick={() => disableField(type)}
          >
            Remove
          </button>
        )}
      </div>

      <div
        className={`recipient-composer ${
          isTo && recipientSuggestionsOpen ? "suggestions-open" : ""
        }`}
      >
        {chips.map((recipient) => (
          <span className="recipient-chip" key={recipient}>
            <span>{recipient}</span>

            <button
              type="button"
              onClick={() => removeRecipient(recipient, type)}
              aria-label={`Remove ${recipient}`}
            >
              ×
            </button>
          </span>
        ))}

        <input
          ref={isTo ? recipientInputRef : undefined}
          className="recipient-input"
          value={recipientType === type ? recipientQuery : ""}
          onFocus={handleFocus}
          onChange={handleChange}
          onKeyDown={(event) => handleRecipientKeyDown(event, type)}
          placeholder={placeholder}
          autoFocus={isTo}
          autoComplete="off"
        />

        {isTo &&
          recipientSuggestionsOpen &&
          (recipientLoading || recipientSuggestions.length > 0) && (
            <div className="recipient-suggestions">
              {recipientLoading && (
                <div className="recipient-search-status">Searching...</div>
              )}

              {!recipientLoading &&
                recipientSuggestions.map((recipient, index) => {
                  const recipientEmail = normalizeRecipient(recipient);
                  const recipientName = getRecipientName(recipient);

                  if (!recipientEmail) {
                    return null;
                  }

                  return (
                    <button
                      type="button"
                      className={`recipient-suggestion ${
                        index === recipientActiveIndex ? "active" : ""
                      }`}
                      key={`${recipientEmail}-${index}`}
                      onMouseDown={(event) => event.preventDefault()}
                      onClick={() => addRecipient(recipientEmail, "to")}
                    >
                      <Logo size={22} />

                      <div>
                        <strong>{recipientName}</strong>

                        <span>{recipientEmail}</span>
                      </div>
                    </button>
                  );
                })}
            </div>
          )}
      </div>
    </div>
  );
}
