let timerCheckInterval = null;

function checkFocusTimer() {
  chrome.storage.local.get(["focusMode", "timerStart", "timerDuration", "strictMode"], data => {
    if (data.focusMode && data.timerStart && data.timerDuration) {
      const timerEnd = data.timerStart + data.timerDuration;
      if (Date.now() >= timerEnd) {
        // Stop focus mode
        chrome.storage.local.set({ focusMode: false, timerStart: null, timerDuration: null, strictMode: false });
        chrome.declarativeNetRequest.getDynamicRules(existing => {
          chrome.declarativeNetRequest.updateDynamicRules({
            removeRuleIds: existing.map(r => r.id)
          });
          // Restore original URLs
          chrome.tabs.query({}, tabs => {
            tabs.forEach(tab => {
              if (tab.url.includes("blocked.html")) {
                chrome.storage.local.get("original_" + tab.id, data => {
                  const url = data["original_" + tab.id];
                  if (url) {
                    chrome.tabs.update(tab.id, { url: url });
                    chrome.storage.local.remove("original_" + tab.id);
                  }
                });
              }
            });
          });
        });
      }
    }
  });
}

// Start interval when extension loads
chrome.runtime.onStartup.addListener(() => {
  chrome.storage.local.set({ focusMode: false, timerStart: null, timerDuration: null, strictMode: false });
  chrome.declarativeNetRequest.getDynamicRules(existing => {
    chrome.declarativeNetRequest.updateDynamicRules({
      removeRuleIds: existing.map(r => r.id)
    });
    // Restore original URLs
    chrome.tabs.query({}, tabs => {
      tabs.forEach(tab => {
        if (tab.url.includes("blocked.html")) {
          chrome.storage.local.get("original_" + tab.id, data => {
            const url = data["original_" + tab.id];
            if (url) {
              chrome.tabs.update(tab.id, { url: url });
              chrome.storage.local.remove("original_" + tab.id);
            }
          });
        }
      });
    });
  });
  if (timerCheckInterval) clearInterval(timerCheckInterval);
  timerCheckInterval = setInterval(checkFocusTimer, 1000);
});

// Also start interval when extension is installed or reloaded
chrome.runtime.onInstalled.addListener(() => {
  if (timerCheckInterval) clearInterval(timerCheckInterval);
  timerCheckInterval = setInterval(checkFocusTimer, 1000);
});

