document.getElementById('startLoop').onclick = () => {
  chrome.tabs.query({active: true, currentWindow: true}, (tabs) => {
    chrome.scripting.executeScript({
      target: {tabId: tabs[0].id},
      func: () => alert("Start looping subtitles!")
    });
  });
};
