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

  // Only notify content script if activating
  if (isActivating) {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      chrome.tabs.sendMessage(tabs[0].id, { action: "startChorus" }, (response) => {
        if (chrome.runtime.lastError) {
          console.warn("❌ Could not send message:", chrome.runtime.lastError.message);
        } else {
          console.log("✅ startChorus message sent");
        }
      });
    });
  }
});
