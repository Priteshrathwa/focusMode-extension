const timerDisplay = document.getElementById("timerDisplay");
const quotes = [
  "Focus is a matter of deciding what things you're not going to do.",
  "The successful warrior is the average man, with laser-like focus.",
  "You can do anything, but not everything.",
  "Concentrate all your thoughts upon the work at hand.",
  "Where focus goes, energy flows.s",
  "The key to success is to focus our conscious mind on things we desire not things we fear",
  "Lack of direction, not lack of time, is the problem. We all have twenty-four hour days.",
  "Success in life is a matter not so much of talent or opportunity as of concentration and perseverance."
];

function showRandomQuote() {
  const quoteElem = document.getElementById("quote");
  const randomIndex = Math.floor(Math.random() * quotes.length);
  quoteElem.textContent = quotes[randomIndex];
}
function stopFocusMode() {
  if (focusTimeout) clearTimeout(focusTimeout);
  if (timerInterval) clearInterval(timerInterval);
  timerDisplay.textContent = "Time left: --:--";

  chrome.storage.local.set({ focusMode: false, timerStart: null, timerDuration: null });

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

function updateTimerDisplay() {
  chrome.storage.local.get(["timerStart", "timerDuration"], data => {
    if (data.timerStart && data.timerDuration) {
      const timerEnd = data.timerStart + data.timerDuration;
      const interval = setInterval(() => {
        const now = Date.now();
        let msLeft = timerEnd - now;
        if (msLeft < 0) msLeft = 0;
        const min = Math.floor(msLeft / 60000);
        const sec = Math.floor((msLeft % 60000) / 1000);
        timerDisplay.textContent = `Time left: ${min.toString().padStart(2, "0")}:${sec.toString().padStart(2, "0")}`;
        if (msLeft <= 0) {
          clearInterval(interval);
          timerDisplay.textContent = "Time left: 00:00";
          // Do NOT call stopFocusMode() here!
        }
      }, 1000);
    } else {
      timerDisplay.textContent = "Time left: --:--";
    }
  });
}

showRandomQuote();
updateTimerDisplay();