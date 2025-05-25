// Fixed content script with proper message handling

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

class YouTubeSubtitleExtractor {
  constructor() {
    console.log('YouTubeSubtitleExtractor constructor called');
    this.init();
  }

  init() {
    console.log('Initializing subtitle extractor...');
    
    // Wait for YouTube to load, then try to extract subtitles
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => this.extractSubtitles());
    } else {
      this.extractSubtitles();
    }

    // Also listen for navigation changes (YouTube is a single-page app)
    this.observeUrlChanges();
  }

  // Method 1: Get subtitle tracks from ytInitialPlayerResponse
  getSubtitlesFromPlayerResponse() {
    console.log('Checking for ytInitialPlayerResponse...');
    
    if (window.ytInitialPlayerResponse) {
      console.log('Found ytInitialPlayerResponse');
      
      const captions = window.ytInitialPlayerResponse.captions;
      if (captions && captions.playerCaptionsTracklistRenderer) {
        const tracks = captions.playerCaptionsTracklistRenderer.captionTracks;
        console.log('All available tracks:', tracks);
        
        // Filter for Japanese subtitles (check multiple possible language codes)
        const japaneseTracks = tracks.filter(track => 
          track.languageCode === 'ja' || 
          track.languageCode === 'ja-JP' ||
          track.languageCode.startsWith('ja')
        );
        console.log('Japanese tracks found:', japaneseTracks);
        
        return japaneseTracks;
      }
    }
    
    console.log('No subtitle data found in ytInitialPlayerResponse');
    return null;
  }

  async extractSubtitles() {
    console.log('Starting subtitle extraction...');
    
    // Try Method 1 first
    const tracks = this.getSubtitlesFromPlayerResponse();
    
    if (tracks && tracks.length > 0) {
      console.log('Found Japanese subtitle tracks:', tracks);
      
      // Get the first Japanese track
      const track = tracks[0];
      console.log('Using track:', track);
      
      // Fetch the actual subtitle content
      try {
        const subtitles = await this.fetchSubtitleContent(track.baseUrl);
        console.log('Fetched subtitles:', subtitles);
        
        // Now you have the subtitle data!
        this.processSubtitles(subtitles);
        
      } catch (error) {
        console.error('Error fetching subtitles:', error);
      }
    } else {
      console.log('No Japanese subtitles found');
      
      // Try whisper as fallback
      this.tryWhisper();
    }
  }

  async fetchSubtitleContent(baseUrl) {
    const url = baseUrl + '&fmt=json3';
    console.log('Fetching from:', url);
    
    const response = await fetch(url);
    const data = await response.json();
    
    // Parse the subtitle events with improved filtering
    const subtitles = data.events
      .filter(event => {
        // Only include events with text segments
        if (!event.segs) return false;
        
        // Get the combined text
        const text = event.segs.map(seg => seg.utf8).join('').trim();
        
        // Filter out empty entries, newlines, and pure whitespace
        return text.length > 0 && text !== '\n' && text !== ' ';
      })
      .map(event => ({
        startTime: event.tStartMs / 1000, // Start time in seconds
        duration: event.dDurationMs ? event.dDurationMs / 1000 : 0, // Handle NaN duration
        endTime: event.tStartMs / 1000 + (event.dDurationMs ? event.dDurationMs / 1000 : 0),
        text: event.segs.map(seg => seg.utf8).join('').trim() // Combined and trimmed text
      }));
    
    return subtitles;
  }

  processSubtitles(subtitles) {
    console.log('Processing subtitles...');
    console.log(`Found ${subtitles.length} valid Japanese subtitle segments`);
    
    // Example: Display first few subtitles with better formatting
    console.log('First 10 subtitle segments:');
    subtitles.slice(0, 10).forEach((subtitle, index) => {
      console.log(`${index + 1}. [${subtitle.startTime.toFixed(1)}s - ${subtitle.endTime.toFixed(1)}s] ${subtitle.text}`);
    });
    
    // Create a simple UI element to show success
    this.createSubtitleUI(subtitles);
    
    // Store subtitles for later use
    this.currentSubtitles = subtitles;
  }

  createSubtitleUI(subtitles) {
    console.log('Creating subtitle UI...');
    
    // Remove existing UI if it exists
    const existingUI = document.getElementById('subtitle-extractor-ui');
    if (existingUI) {
      console.log('Removing existing UI');
      existingUI.remove();
    }
    
    // Create a simple UI element
    const ui = document.createElement('div');
    ui.id = 'subtitle-extractor-ui';
    ui.style.cssText = `
      position: fixed;
      top: 80px;
      right: 20px;
      background: #00ff00;
      color: black;
      padding: 10px 15px;
      border-radius: 5px;
      z-index: 99999;
      font-family: Arial, sans-serif;
      font-size: 14px;
      box-shadow: 0 2px 10px rgba(0,0,0,0.3);
      border: 2px solid black;
      cursor: pointer;
    `;
    ui.innerHTML = `🎌 Found ${subtitles.length} Japanese subtitles`;
    
    console.log('UI element created, adding to page...');
    
    // Add click handler to show subtitle list
    ui.addEventListener('click', () => {
      console.log('Subtitle UI clicked');
      this.showSubtitleList(subtitles);
    });
    
    // Add to page
    document.body.appendChild(ui);
    console.log('UI element added to page');
    
    // Auto-hide after 10 seconds (longer for testing)
    setTimeout(() => {
      if (ui.parentNode) {
        ui.remove();
        console.log('UI auto-removed after 10 seconds');
      }
    }, 10000);
  }

  showSubtitleList(subtitles) {
    console.log('Showing subtitle list modal');
    
    // Create a modal to show subtitle list
    const modal = document.createElement('div');
    modal.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(0,0,0,0.8);
      z-index: 99998;
      display: flex;
      align-items: center;
      justify-content: center;
    `;
    
    const content = document.createElement('div');
    content.style.cssText = `
      background: white;
      padding: 20px;
      border-radius: 10px;
      max-width: 800px;
      max-height: 600px;
      overflow-y: auto;
      font-family: Arial, sans-serif;
    `;
    
    let html = `
      <h3>Japanese Subtitles (${subtitles.length} segments)</h3>
      <p>Click on any subtitle to see timestamp:</p>
      <div style="max-height: 400px; overflow-y: auto; border: 1px solid #ccc; padding: 10px;">
    `;
    
    subtitles.slice(0, 50).forEach((subtitle, index) => {
      html += `
        <div style="margin-bottom: 8px; padding: 5px; border-bottom: 1px solid #eee;">
          <small style="color: #666;">${subtitle.startTime.toFixed(1)}s - ${subtitle.endTime.toFixed(1)}s</small><br>
          ${subtitle.text}
        </div>
      `;
    });
    
    if (subtitles.length > 50) {
      html += `<p><em>... and ${subtitles.length - 50} more segments</em></p>`;
    }
    
    html += `
      </div>
      <button onclick="this.parentElement.parentElement.remove()" style="margin-top: 10px; padding: 5px 15px;">Close</button>
    `;
    
    content.innerHTML = html;
    modal.appendChild(content);
    document.body.appendChild(modal);
    
    // Close on background click
    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        modal.remove();
        console.log('Modal closed by background click');
      }
    });
  }

  // whisper fallback
  tryWhisper() {
   //add whisper logic 
  }

  // Handle YouTube's single-page app navigation
  observeUrlChanges() {
    let currentUrl = location.href;
    
    const observer = new MutationObserver(() => {
      if (location.href !== currentUrl) {
        currentUrl = location.href;
        if (currentUrl.includes('/watch?v=')) {
          console.log('New video detected, extracting subtitles...');
          // Wait a bit for YouTube to load the new video data
          setTimeout(() => this.extractSubtitles(), 2000);
        }
      }
    });
    
    observer.observe(document.body, {
      childList: true,
      subtree: true
    });
  }

  // Helper method to get subtitles for external use
  getCurrentSubtitles() {
    return this.currentSubtitles || [];
  }

  // Helper method to find subtitles in a time range
  getSubtitlesInRange(startTime, endTime) {
    if (!this.currentSubtitles) return [];
    
    return this.currentSubtitles.filter(subtitle => 
      subtitle.startTime >= startTime && subtitle.endTime <= endTime
    );
  }
}

// Add debugging helper
console.log('Content script loaded, waiting for startChorus message...');

// For manual testing - you can call this in console
window.testSubtitleExtractor = function() {
  console.log('Manual test triggered');
  const extractor = new YouTubeSubtitleExtractor();
  window.subtitleExtractor = extractor;
  return extractor;
};