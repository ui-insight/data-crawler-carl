// Key manager: reads ?key= from URL, stores in sessionStorage
// sessionStorage is tab-scoped — cleared when the tab closes, never written to disk.

const STORAGE_KEY = 'dcc_gemini_key';

export function getKey() {
  return sessionStorage.getItem(STORAGE_KEY) || '';
}

export function setKey(k) {
  if (k) {
    sessionStorage.setItem(STORAGE_KEY, k);
  } else {
    sessionStorage.removeItem(STORAGE_KEY);
  }
}

export function readKeyFromURL() {
  // Wipe any previously stored key on page load — forces fresh start each reload
  sessionStorage.removeItem(STORAGE_KEY);

  var params = new URLSearchParams(window.location.search);
  var key = params.get('key');
  if (key) {
    setKey(key);
    var cleanUrl = new URL(window.location);
    cleanUrl.searchParams.delete('key');
    window.history.replaceState({}, '', cleanUrl);
  }
  return getKey();
}
