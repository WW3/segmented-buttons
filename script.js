const ARIA_LABEL_MAX_LENGTH = 256;

/**
 * Sanitizes a string for use as aria-label. Removes control characters, strips tag-like content.
 * @param {string} str - Raw string input
 * @returns {string|null} - Sanitized string or null if invalid
 */
function sanitizeAriaLabel(str) {
  if (typeof str !== "string") return null;
  const trimmed = str.trim();
  if (trimmed.length === 0) return null;
  const noControlChars = trimmed.replace(/[\x00-\x1f\x7f]/g, "");
  const noTags = noControlChars.replace(/<[^>]*>/g, "");
  const sanitized = noTags.trim();
  if (sanitized.length === 0) return null;
  return sanitized.length > ARIA_LABEL_MAX_LENGTH
    ? sanitized.slice(0, ARIA_LABEL_MAX_LENGTH)
    : sanitized;
}

/**
 * Applies roving tabindex and radiogroup keyboard behavior to a container whose direct children are all buttons.
 * @param {string} selector - CSS selector for the container element
 * @param {number|null|undefined} [buttonIndex] - Index of the button to receive tabindex 0.
 *   If null, undefined, 0, or greater than buttons length, the first button gets tabindex 0.
 * @param {string|null|undefined} [ariaLabel] - Optional label for the radiogroup. Sanitized before being set.
 * @returns {boolean} - True if roving tabindex was applied, false if conditions weren't met
 */
function applyRovingTabindex(selector, buttonIndex, ariaLabel) {
  const container = document.querySelector(selector);
  if (!container) return false;

  const children = Array.from(container.children);
  if (children.length === 0) return false;

  const allButtons = children.every((el) => el.tagName === "BUTTON");
  if (!allButtons) return false;

  if (container.getAttribute("role") !== "radiogroup") {
    container.setAttribute("role", "radiogroup");
  }

  children.forEach((btn) => {
    if (btn.getAttribute("role") !== "radio") {
      btn.setAttribute("role", "radio");
    }
  });

  const label = sanitizeAriaLabel(ariaLabel);
  if (label) {
    container.setAttribute("aria-label", label);
  }

  let focusIndex = 0;
  if (
    typeof buttonIndex === "number" &&
    buttonIndex > 0 &&
    buttonIndex < children.length
  ) {
    focusIndex = buttonIndex;
  }

  function updateTabindex(index) {
    children.forEach((btn, i) => {
      btn.setAttribute("tabindex", i === index ? "0" : "-1");
    });
  }

  function setChecked(button) {
    children.forEach((btn) => {
      btn.setAttribute("aria-checked", btn === button ? "true" : "false");
    });
  }

  function selectButton(button) {
    const index = children.indexOf(button);
    if (index === -1) return;
    updateTabindex(index);
    button.focus();
    setChecked(button);
  }

  updateTabindex(focusIndex);
  setChecked(children[focusIndex]);

  children.forEach((btn) => {
    btn.addEventListener("click", () => {
      selectButton(btn);
    });
  });

  container.addEventListener("keydown", (e) => {
    if (e.target.tagName !== "BUTTON" || !container.contains(e.target) || e.target.parentElement !== container) {
      return;
    }

    const currentIndex = children.indexOf(e.target);
    if (currentIndex === -1) return;

    switch (e.key) {
      case "ArrowRight": {
        e.preventDefault();
        const nextIndex = currentIndex === children.length - 1 ? 0 : currentIndex + 1;
        updateTabindex(nextIndex);
        children[nextIndex].focus();
        break;
      }
      case "ArrowLeft": {
        e.preventDefault();
        const prevIndex = currentIndex === 0 ? children.length - 1 : currentIndex - 1;
        updateTabindex(prevIndex);
        children[prevIndex].focus();
        break;
      }
    }
  });

  return true;
}
