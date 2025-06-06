const subtitleCache = new Map();
const CACHE_TTL = 45 * 60 * 1000; // entries expire after 45 minutes
let chorusModeActive = false;
let subtitleFetchInProgress = false;

function getCachedSubtitle(videoId) {
  const entry = subtitleCache.get(videoId);
  if (!entry) return null;

  if (Date.now() - entry.timestamp > CACHE_TTL) {
    subtitleCache.delete(videoId);
    return null;
  }

  return entry.data;
}

function setSubtitleCache(videoId, data) {
  subtitleCache.set(videoId, {
    data,
    timestamp: Date.now(),
  });
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === "startChorus") {
    chorusModeActive = true;
    subtitleFetchInProgress = true;
    sendResponse({ status: "Chorus mode activated for video" });
  }

  if (message.action === "stopChorus") {
    chorusModeActive = false;
    sendResponse({ status: "chorus disabled" });
  }
  if (message.action === "checkCache") {
    const entry = subtitleCache.get(message.videoId);

    if (entry && (Date.now() - entry.timestamp < CACHE_TTL)) {
      sendResponse({ cached: true, data: entry.data });
    } else {
      sendResponse({ cached: false });
    }

    return true; // keep sendResponse alive
  }
});


function parseSubtitleJSON(rawText) {
  const data = JSON.parse(rawText);
  if (!data.events || !Array.isArray(data.events)) return [];

  const isNoise = (text) => {
    const trimmed = text.trim();
    if (!trimmed) return true; // empty or whitespace only
    if (trimmed === "\n") return true;
    if (/^[\p{P}\p{S}\p{N}]+$/u.test(trimmed)) return true; // just punctuation/symbols/numbers
    return false;
  };

  const parsedSubtitles = [];

  for (const event of data.events) {
    if (!event.segs || !Array.isArray(event.segs)) continue;

    // Combine meaningful text segments
    const fragments = event.segs
      .map((seg) => seg.utf8 || "")
      .filter((text) => !isNoise(text));

    const text = fragments.join("");

    if (!text) continue; // skip if nothing useful

    const start = event.tStartMs ?? 0;
    const duration = event.dDurationMs ?? 0;
    const end = start + duration;

    parsedSubtitles.push({
      startTime: +(start / 1000).toFixed(3),
      endTime: +(end / 1000).toFixed(3),
      duration: +(duration / 1000).toFixed(3),
      text: text,
    });
  }

  return parsedSubtitles;
}



chrome.webRequest.onBeforeRequest.addListener(
  async (details) => {
    // Skip requests made by background itself
    if (details.initiator && details.initiator.startsWith("chrome-extension://")) {
        console.log("🔴Request Made By Background itself")
      return;
    }
     if (!chorusModeActive || !subtitleFetchInProgress) {
         console.log("🔴Chorus mode not active or Subtitle Fetch not in progress")
      return; // ignore subtitle fetches unless chorus mode is on
    }


    const subtitleUrl = details.url;
    const subtitleVideoId = new URL(subtitleUrl).searchParams.get("v");
    console.log("🟢 Intercepted subtitle request:", subtitleUrl);

    const cached = getCachedSubtitle(subtitleVideoId);
    if(cached){
        console.log("💵 returning cached subtitles");
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        if (tabs[0]) {
        chrome.tabs.sendMessage(tabs[0].id, {
            action: "subtitlesFetched",
            data: cached,
            cached: true,
        });
    }
    });
      subtitleFetchInProgress = false;
      return;
    }

    try {
      const response = await fetch(subtitleUrl + '&fmt=json3');  // this won't re-trigger
      const text = await response.text();
      const parsedSubtitles = parseSubtitleJSON(text);

      //chrome.storage.local.set({ subtitleData: text });
      setSubtitleCache(subtitleVideoId, parsedSubtitles);
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        if (tabs[0]) {
          chrome.tabs.sendMessage(tabs[0].id, {
            action: "subtitlesFetched",
            data: parsedSubtitles,
          });
        }
      });
    } catch (error) {
      console.error("❌ Failed to fetch subtitles:", error);
    } finally {
        subtitleFetchInProgress = false;
    }
  },
  { urls: ["*://*.youtube.com/api/timedtext*"] },
  []
);
