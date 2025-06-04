chrome.webRequest.onBeforeRequest.addListener(
  async (details) => {
    // Skip requests made by background itself
    if (details.initiator && details.initiator.startsWith("chrome-extension://")) {
      return;
    }

    const subtitleUrl = details.url;
    console.log("🟢 Intercepted subtitle request:", subtitleUrl);

    try {
      const response = await fetch(subtitleUrl + '&fmt=json3');  // this won't re-trigger
      const text = await response.text();

      chrome.storage.local.set({ subtitleData: text });

      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        if (tabs[0]) {
          chrome.tabs.sendMessage(tabs[0].id, {
            action: "subtitlesFetched",
            data: text,
          });
        }
      });
    } catch (error) {
      console.error("❌ Failed to fetch subtitles:", error);
    }
  },
  { urls: ["*://*.youtube.com/api/timedtext*"] },
  []
);
