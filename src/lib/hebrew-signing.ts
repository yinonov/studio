/**
 * Hebrew localization utilities for Dropbox Sign embedded interface
 * Since there's no official Hebrew support, these utilities provide workarounds
 */

interface TranslationMapping {
  [key: string]: string;
}

const HEBREW_TRANSLATIONS: TranslationMapping = {
  // Common buttons
  Sign: "חתום",
  Continue: "המשך",
  Cancel: "ביטול",
  Done: "סיום",
  Next: "הבא",
  Previous: "הקודם",
  Submit: "שלח",
  Confirm: "אשר",
  Close: "סגור",
  Save: "שמור",
  Download: "הורד",
  Print: "הדפס",

  // Form elements
  Name: "שם",
  Email: "אימייל",
  Date: "תאריך",
  Signature: "חתימה",
  Initial: "ראשי תיבות",
  Required: "חובה",
  Optional: "אופציונלי",

  // Messages
  "Please sign here": "אנא חתום כאן",
  "Click to sign": "לחץ כדי לחתום",
  "Signature required": "חתימה נדרשת",
  "Document signed successfully": "המסמך נחתם בהצלחה",
  "Please review and sign": "אנא עיין וחתום",

  // Status messages
  "Waiting for signature": "ממתין לחתימה",
  Completed: "הושלם",
  "In progress": "בתהליך",
  Pending: "ממתין",
};

/**
 * Creates a CSS injection that translates common UI elements
 */
export function createHebrewCSSInjection(): string {
  let css = `
    /* Base RTL support */
    body { direction: rtl !important; }
    
    /* Hide original text and show Hebrew translations */
  `;

  Object.entries(HEBREW_TRANSLATIONS).forEach(([english, hebrew]) => {
    css += `
    /* Translate "${english}" to "${hebrew}" */
    button:contains("${english}"):not([data-hebrew-translated]),
    [data-test*="${english.toLowerCase()}"]:not([data-hebrew-translated]),
    .btn:contains("${english}"):not([data-hebrew-translated]) {
      position: relative !important;
      color: transparent !important;
    }
    
    button:contains("${english}"):not([data-hebrew-translated])::after,
    [data-test*="${english.toLowerCase()}"]:not([data-hebrew-translated])::after,
    .btn:contains("${english}"):not([data-hebrew-translated])::after {
      content: "${hebrew}";
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      display: flex;
      align-items: center;
      justify-content: center;
      color: inherit;
      background: inherit;
      pointer-events: none;
    }
    `;
  });

  css += `
    /* Additional Hebrew styling */
    .signature-container {
      direction: rtl;
      text-align: right;
    }
    
    /* Form field labels in Hebrew */
    label[for*="signature"]::after {
      content: " (חתימה)";
      color: #666;
    }
    
    label[for*="name"]::after {
      content: " (שם)";
      color: #666;
    }
    
    label[for*="email"]::after {
      content: " (אימייל)";
      color: #666;
    }
    
    /* Add Hebrew watermark */
    .document-container::before {
      content: "מסמך לחתימה - Document for Signature";
      position: fixed;
      top: 10px;
      right: 10px;
      background: rgba(30, 64, 175, 0.9);
      color: white;
      padding: 5px 10px;
      border-radius: 4px;
      font-size: 12px;
      z-index: 1000;
      direction: rtl;
    }
  `;

  return css;
}

/**
 * Attempts to inject Hebrew CSS into a Dropbox Sign iframe
 */
export function injectHebrewStyles(iframe: HTMLIFrameElement): boolean {
  try {
    if (!iframe.contentDocument) {
      console.warn("Cannot access iframe content - likely CORS restricted");
      return false;
    }

    const existingStyle = iframe.contentDocument.querySelector(
      "#hebrew-translations"
    );
    if (existingStyle) {
      return true; // Already injected
    }

    const styleElement = iframe.contentDocument.createElement("style");
    styleElement.id = "hebrew-translations";
    styleElement.textContent = createHebrewCSSInjection();

    iframe.contentDocument.head.appendChild(styleElement);

    // Mark elements as translated to avoid double translation
    const elements = iframe.contentDocument.querySelectorAll(
      "button, [data-test], .btn"
    );
    elements.forEach((el) => {
      (el as HTMLElement).setAttribute("data-hebrew-translated", "true");
    });

    console.log("Hebrew styles injected successfully");
    return true;
  } catch (error) {
    console.warn("Failed to inject Hebrew styles:", error);
    return false;
  }
}

/**
 * Creates a mutation observer to inject styles when new elements are added
 */
export function setupHebrewObserver(
  iframe: HTMLIFrameElement
): MutationObserver | null {
  try {
    if (!iframe.contentDocument) return null;

    const observer = new MutationObserver((mutations) => {
      let needsUpdate = false;

      mutations.forEach((mutation) => {
        if (mutation.type === "childList" && mutation.addedNodes.length > 0) {
          needsUpdate = true;
        }
      });

      if (needsUpdate) {
        setTimeout(() => injectHebrewStyles(iframe), 100);
      }
    });

    observer.observe(iframe.contentDocument.body, {
      childList: true,
      subtree: true,
    });

    return observer;
  } catch (error) {
    console.warn("Failed to setup Hebrew observer:", error);
    return null;
  }
}

/**
 * Enhanced Hebrew signing setup with multiple retry attempts
 */
export function setupHebrewSigning(
  retryInterval = 1000,
  maxRetries = 10
): void {
  let attempts = 0;

  const tryInjectStyles = () => {
    attempts++;

    const iframe = document.querySelector(
      'iframe[src*="hellosign"], iframe[src*="dropboxsign"]'
    ) as HTMLIFrameElement;

    if (iframe) {
      const success = injectHebrewStyles(iframe);

      if (success) {
        setupHebrewObserver(iframe);
        console.log("Hebrew localization setup completed");
        return;
      }
    }

    if (attempts < maxRetries) {
      setTimeout(tryInjectStyles, retryInterval);
    } else {
      console.warn(
        "Failed to setup Hebrew localization after",
        maxRetries,
        "attempts"
      );
    }
  };

  // Start trying immediately
  tryInjectStyles();
}
