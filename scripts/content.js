// Complete YouTube Subtitle Extractor with Network Interception

let subtitleExtractor; // Declare at top level

// Listen for messages from popup/background
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === "startChorus") {
    console.log('YouTube Subtitle Extractor activated via message');
    
    // Create new instance
    subtitleExtractor = new YouTubeSubtitleExtractor();
    
    // Make it globally available
    window.subtitleExtractor = subtitleExtractor;
    
    // Send response back to confirm it worked
    sendResponse({success: true, message: "Subtitle extractor started"});
    
  } else {
    console.log("Received unknown message:", message);
    sendResponse({success: false, message: "Unknown action"});
  }
  
  // Important: return true to indicate we'll send response asynchronously
  return true;
});
