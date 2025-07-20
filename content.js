chrome.storage.local.get(["focusMode", "blockedSites"], ({ focusMode, blockedSites }) => {
  if (!focusMode) return;

  const currentUrl = window.location.href;

  const shouldBlock = blockedSites?.some(site =>
    new RegExp(`://(.*\\.)?${site.replace('.', '\\.')}`).test(currentUrl)
  );

  if (shouldBlock && !window.location.href.includes("blocked.html")) {
    window.location.href = chrome.runtime.getURL("blocked.html");
  }
});
