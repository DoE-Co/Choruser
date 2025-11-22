let chorusBtn = document.getElementById("chorusBtn");

chorusBtn.addEventListener("click", () => {
  const isActivating = chorusBtn.textContent === "Activate Chorus Mode";

  // Update button text
  chorusBtn.textContent = isActivating
    ? "Deactivate Chorus Mode"
    : "Activate Chorus Mode";

  // Notify background regardless of state
  chrome.runtime.sendMessage(
    { action: isActivating ? "startChorus" : "stopChorus" },
    (res) => {
      console.log("🎛️ Background says:", res?.status);
    }
  );

  // Notify content script for both start and stop
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    if (!tabs[0]?.id) return;

    const action = isActivating ? "startChorus" : "stopChorus";
    chrome.tabs.sendMessage(tabs[0].id, { action: action }, (response) => {
      if (chrome.runtime.lastError) {
        console.warn("❌ Could not send message:", chrome.runtime.lastError.message);
      } else {
        console.log(`✅ ${action} message sent`);
      }
    });
  });
});
