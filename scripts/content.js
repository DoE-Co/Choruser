// window.onload = function()
// {
// const ccButton = document.querySelector('.ytp-subtitles-button');
// if (ccButton && ccButton.getAttribute('aria-pressed') === 'false') {
//   ccButton.click(); // Turn subtitles on
//   ccButton.click();// Turn subtitles off
// }
// }


// == Auto Subtitle Fetcher and Interceptor for YouTube ==

// Store current URL to detect SPA navigation
let lastUrl = location.href;
// Run once to set up everything

chrome.runtime.onMessage.addListener((message, sender, sendResponse) =>{
    if(message.action === "startChorus") {
        init();
    }
    if (message.action === "subtitlesFetched") {
    const subtitleText = message.data;
    console.log("📥 Subtitles received in content script:");
    console.log(subtitleText);

    // Optionally parse and display them
    // Example: const xml = new DOMParser().parseFromString(subtitleText, "text/xml");
  }
    sendResponse({status: "ok"})
});


function checkCached() {
  return new Promise((resolve) => {
    const videoId = new URL(window.location.href).searchParams.get("v");
    chrome.runtime.sendMessage({ action: "checkCache", videoId }, (response) => {
      if (chrome.runtime.lastError) {
        console.warn("Background unreachable:", chrome.runtime.lastError.message);
        resolve(false);
        return;
      }

      if (response && response.cached) {
        console.log("💵 Subtitles from cache:", response.data);
        // Do something with cached subtitles here if needed
        resolve(true);
      } else {
        console.log("❌ No cache, clicking subtitle button...");
        resolve(false);
      }
    });
  });
}





// Monitor SPA URL changes on YouTube
new MutationObserver(() => {
  const currentUrl = location.href;
  if (currentUrl !== lastUrl) {
    lastUrl = currentUrl;
    console.log('🔄 URL changed:', currentUrl);
    handleVideoChange();
  }
}).observe(document, { childList: true, subtree: true });

// ⏳ Utility: Wait for an element to appear
async function waitForElement(selector, timeout = 5000) {
  return new Promise((resolve, reject) => {
    const interval = 100;
    let elapsed = 0;
    const check = () => {
      const el = document.querySelector(selector);
      if (el) return resolve(el);
      elapsed += interval;
      if (elapsed >= timeout) reject(`Timeout: ${selector} not found`);
      else setTimeout(check, interval);
    };
    check();
  });
}

// ▶️ Click the subtitles/CC button if needed
async function clickSubtitlesButton() {
  try {
    const ccButton = await waitForElement('.ytp-subtitles-button');
    if (ccButton.getAttribute('aria-pressed') === 'false') {
      ccButton.click();
      ccButton.click();
      console.log('✅ Subtitles toggled ON and then Off');
    } else {
      console.log('🟡 Subtitles already ON, should automatically get the data');
    }
  } catch (e) {
    console.warn('⚠️ Subtitle button error:', e);
  }
}

// 🚀 Handle when a new video is loaded
function handleVideoChange() {

        // Only trigger on actual YouTube video pages
    if (!currentUrl.includes("/watch")) {
        console.log("⏩ Skipping non-video page:", currentUrl);
        return;
    }

    console.log("🎥 New video detected:", currentUrl);
    chrome.runtime.sendMessage({ action: "startChorus" }, (response) => {
    console.log("📣 Notified background of new video:", response?.status);
  });
  // Wait a bit for player UI to settle
  setTimeout(() => {
    clickSubtitlesButton();
  }, 1000);
}

// chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  
// });


// 🧩 Init everything once per content script load
async function init() {
  console.log('🎬 YouTube subtitle interceptor loaded');
  const isCached = await checkCached();
   if (!isCached) {
    clickSubtitlesButton();
  }
  //handleVideoChange();
}
