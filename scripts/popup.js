let chorusBtn = document.getElementById("chorusBtn");

document.getElementById("chorusBtn").addEventListener("click", () => {
  chorusBtn.textContent === "Activate Chorus Mode" ? 
  chorusBtn.textContent = "Deactivate Chorus Mode" :chorusBtn.textContent = "Activate Chorus Mode"

  chrome.tabs.query({active: true, currentWindow: true}, (tabs) => {
    chrome.tabs.sendMessage(tabs[0].id, { action: "startChorus" });
  });
});

