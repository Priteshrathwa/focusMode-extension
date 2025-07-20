const siteInput = document.getElementById("site");
const addBtn = document.getElementById("add");
const list = document.getElementById("list");
const startBtn = document.getElementById("start");
const stopBtn = document.getElementById("stop");
const timerInput = document.getElementById("timer");
const timerDisplay = document.getElementById("timerDisplay");
const timerHoursInput = document.getElementById("timerHours");
const timerMinutesInput = document.getElementById("timerMinutes");
const blockSocialBtn = document.getElementById("blockSocial");
const strictModeCheckbox = document.getElementById("strictMode");
const progressBar = document.getElementById("timerprogress");

let blockedSites = [];
let ruleIdStart = 1000;
let focusTimeout = null;
let timerInterval = null;

const socialSites = [
  "facebook.com", "x.com", "instagram.com", "tiktok.com",
  "snapchat.com", "reddit.com", "pinterest.com", "linkedin.com","discord.com"
];

function refreshList() {
  list.innerHTML = "";
  blockedSites.forEach((site, idx) => {
    const li = document.createElement("li");
    li.textContent = site;

    const removeBtn = document.createElement("button");
    removeBtn.textContent = "remove" // Correct Unicode character
    removeBtn.className = "remove-btn";
    removeBtn.onclick = () => {
      blockedSites.splice(idx, 1);
      chrome.storage.local.set({ blockedSites });
      refreshList();
    };

    li.appendChild(removeBtn);
    list.appendChild(li);
  });
}

chrome.storage.local.get("blockedSites", data => {
  if (data.blockedSites) {
    blockedSites = data.blockedSites;
    refreshList();
  }
});

addBtn.onclick = () => {
  const site = siteInput.value.trim();
  if (!site) return;
  if (!site.startsWith("http")) siteInput.value = "https://" + site;

  let cleanSite = site.replace("https://", "").replace("http://", "").split("/")[0];
  blockedSites.push(cleanSite);
  chrome.storage.local.set({ blockedSites });
  refreshList();
  siteInput.value = "";
};

blockSocialBtn.onclick = () => {
  socialSites.forEach(site => {
    if (!blockedSites.includes(site)) blockedSites.push(site);
  });
  chrome.storage.local.set({ blockedSites });
  refreshList();
};

const timerText = document.getElementById("timerText");
const timerProgress = document.getElementById("timerProgress");
const circleLength = 2 * Math.PI * 45; // r=45


function updateCircularTimerDisplay(endTime, totalDuration) {
  if (timerInterval) clearInterval(timerInterval);
  timerInterval = setInterval(() => {
    const now = Date.now();
    let msLeft = endTime - now;
    if (msLeft < 0) msLeft = 0;
    const min = Math.floor(msLeft / 60000);
    const sec = Math.floor((msLeft % 60000) / 1000);
    timerText.textContent = `${min.toString().padStart(2, "0")}:${sec.toString().padStart(2, "0")}`;

    // Circular progress calculation (fills as time passes)
    let percent = (totalDuration - msLeft) / totalDuration;
    let offset = circleLength * (1 - percent);
    timerProgress.style.strokeDashoffset = offset;

    if (msLeft <= 0) {
      clearInterval(timerInterval);
      timerText.textContent = "00:00";
      timerProgress.setAttribute("stroke-dashoffset", circleLength);
      stopFocusMode();
    }
  }, 1000);

}

startBtn.onclick = () => {
  chrome.storage.local.get(["focusMode", "timerStart", "timerDuration"], data => {
    if (data.focusMode && data.timerStart && data.timerDuration) {
      alert("Focus Mode is already running. Please wait for it to finish or stop it before starting a new session.");
      return;
    }

    let hours = parseInt(timerHoursInput.value, 10) || 0;
    let minutes = parseInt(timerMinutesInput.value, 10) || 0;
    let duration = (hours * 60 + minutes);
    if (duration <= 0) duration = 25; // Default 25 min

    const timerStart = Date.now();
    const timerDuration = duration * 60 * 1000; // ms
    const timerEnd = timerStart + timerDuration;
    const strictMode = strictModeCheckbox.checked;

    chrome.storage.local.set({ focusMode: true, timerStart, timerDuration, strictMode });

    chrome.declarativeNetRequest.getDynamicRules(existing => {
      let rules = blockedSites.map((site, index) => ({
        id: ruleIdStart + index,
        priority: 1,
        action: {
          type: "redirect",
          redirect: { extensionPath: "/blocked.html" }
        },
        condition: {
          urlFilter: `*://${site}/*`,
          resourceTypes: ["main_frame"]
        }
      }));

      chrome.declarativeNetRequest.updateDynamicRules({
        removeRuleIds: existing.map(r => r.id),
        addRules: rules
      });

      // Redirect already opened tabs that match
      chrome.tabs.query({}, tabs => {
        tabs.forEach(tab => {
          blockedSites.forEach(site => {
            if (tab.url.includes(site)) {
              chrome.storage.local.set({ ["original_" + tab.id]: tab.url }, () => {
                chrome.tabs.update(tab.id, { url: chrome.runtime.getURL("blocked.html") });
              });
            }
          });
        });
      });
    });

    updateCircularTimerDisplay(timerEnd, timerDuration);
  });
};

function stopFocusMode() {
  if (focusTimeout) clearTimeout(focusTimeout);
  if (timerInterval) clearInterval(timerInterval);
  timerDisplay.textContent = "Time left: --:--";

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

stopBtn.onclick = () => {
  chrome.storage.local.get("strictMode", data => {
    if (data.strictMode) {
      alert("Strict Mode is enabled. You cannot stop Focus Mode early.");
      return;
    }
    if (!confirm("Are you sure you want to stop Focus Mode?")) return;
    stopFocusMode();
  });
};

document.addEventListener("DOMContentLoaded", () => {
  chrome.storage.local.get(["focusMode", "timerStart", "timerDuration"], data => {
    if (data.focusMode && data.timerStart && data.timerDuration) {
      const timerEnd = data.timerStart + data.timerDuration;
      updateCircularTimerDisplay(timerEnd, data.timerDuration);
    } else {
      timerDisplay.textContent = "Time left: --:--";
    }
  });
});
