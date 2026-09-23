'use strict';

const STORAGE_KEY = 'sisatihPdfCurrent';

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (!message || typeof message !== 'object') return false;

  if (message.type === 'SISATIH_SESSION_GET') {
    chrome.storage.session.get(STORAGE_KEY)
      .then((result) => sendResponse({ ok: true, value: result[STORAGE_KEY] || null }))
      .catch((error) => sendResponse({ ok: false, error: String(error && error.message || error) }));
    return true;
  }

  if (message.type === 'SISATIH_SESSION_SET') {
    chrome.storage.session.set({ [STORAGE_KEY]: message.value || null })
      .then(() => sendResponse({ ok: true }))
      .catch((error) => sendResponse({ ok: false, error: String(error && error.message || error) }));
    return true;
  }

  if (message.type === 'SISATIH_SESSION_CLEAR') {
    chrome.storage.session.remove(STORAGE_KEY)
      .then(() => sendResponse({ ok: true }))
      .catch((error) => sendResponse({ ok: false, error: String(error && error.message || error) }));
    return true;
  }

  return false;
});
