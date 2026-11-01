// Remembers that this browser was signed in. Visitors then see the landing page
// straight away, even while a sleeping server takes a minute to answer the session check.
const KEY = "sponsorwise-signed-in";

export function wasSignedIn() {
  try {
    return localStorage.getItem(KEY) === "1";
  } catch {
    return false;
  }
}

export function rememberSignedIn(signedIn) {
  try {
    if (signedIn) localStorage.setItem(KEY, "1");
    else localStorage.removeItem(KEY);
  } catch {
    // Storage can be blocked; the page just shows the loading state instead
  }
}
