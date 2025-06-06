let lastUrl = location.href;
let subtitleOverlay = null;
let currentSubtitles = [];
let currentSubtitleIndex = -1;
let selectedSubtitles = new Set();
let isCombinedView = false;
let isShowOnlySelected = false;


/*------------------- Additional STYLES------------------------*/
const additionalStyles = `
  .chorus-subtitle-item.current.selected {
    background: rgba(33, 150, 243, 0.4) !important;
    border-color: #2196F3 !important;
    box-shadow: 0 0 0 1px #4CAF50;
  }
  
  .chorus-subtitle-text {
    pointer-events: none;
  }
  
  .chorus-subtitle-time {
    cursor: pointer;
    padding: 2px 4px;
    border-radius: 3px;
    transition: all 0.2s;
    display: inline-block;
    pointer-events: auto;
  }
  
  .chorus-subtitle-time:hover {
    background: rgba(255, 255, 255, 0.1);
    opacity: 1;
    transform: scale(1.05);
  }
  
  .chorus-btn.toggle-active {
    background: rgba(76, 175, 80, 0.8) !important;
    border-color: #4CAF50 !important;
  }
  
  .chorus-subtitle-item.hidden {
    display: none !important;
  }
`;

// Add the styles to the page
function addSubtitleStyles() {
  const styleElement = document.createElement('style');
  styleElement.textContent = additionalStyles;
  document.head.appendChild(styleElement);
}


/* ------------------ UTILITY FUNCTIONS -----------------------*/
// Utility function to format time - MUST be defined before displaySubtitles
function formatTime(seconds) {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}
/* ------------------ HOTKEY FUNCTIONALITY -----------------------*/
// Global hotkey handler for toggling subtitle browser
function setupHotkeyListener() {
  document.addEventListener('keydown', (e) => {
    // Check if 'h' key is pressed
    if (e.key.toLowerCase() === 'h') {
      // Don't trigger if user is typing in an input field
      const activeElement = document.activeElement;
      const isTyping = activeElement && (
        activeElement.tagName === 'INPUT' ||
        activeElement.tagName === 'TEXTAREA' ||
        activeElement.contentEditable === 'true' ||
        activeElement.isContentEditable
      );
      
      // Don't trigger if modifier keys are pressed (Ctrl+H, Alt+H, etc.)
      if (isTyping || e.ctrlKey || e.altKey || e.metaKey || e.shiftKey) {
        return;
      }
      
      // Only trigger on YouTube video pages
      if (!window.location.href.includes('/watch')) {
        return;
      }
      
      // Prevent default behavior and stop propagation
      e.preventDefault();
      e.stopPropagation();
      
      // Toggle subtitle browser visibility
      toggleSubtitleBrowser();
    }
  }, true); // Use capture phase to intercept before YouTube's handlers
}

function toggleSubtitleBrowser() {
  if (!subtitleOverlay) {
    // First time opening - initialize and show
    showSubtitleOverlay();
    init();
  } else if (subtitleOverlay.style.display === 'none') {
    // Show the overlay
    showSubtitleOverlay();
  } else {
    // Hide the overlay
    hideSubtitleOverlay();
  }
  
  console.log('🎵 Subtitle browser toggled via hotkey');
}
/* ------------------ SUBTITLE UI LOGIC -----------------------*/
// Create the subtitle overlay UI
function createSubtitleOverlay() {
  if (subtitleOverlay) return; // Already exists
  
  addSubtitleStyles();
  const overlay = document.createElement('div');
  overlay.id = 'chorus-subtitle-overlay';
  overlay.innerHTML = `
    <div class="chorus-header" id="chorus-header">
      <div class="chorus-title">
        <span class="chorus-icon">🎵</span>
        Chorus Mode
        <span class="chorus-hotkey-hint">(Press 'H' to toggle)</span>
      </div>
      <div class="chorus-header-controls">
        <button class="chorus-control-btn" id="chorus-popout-btn" title="Pop out / Dock">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
            <path d="M19,7 L19,14 L17,14 L17,9 L12,9 L12,7 L19,7 Z M12,12 L17,17 L15,17 L15,21 L9,21 L9,17 L7,17 L12,12 Z"/>
          </svg>
        </button>
        <button class="chorus-control-btn" id="chorus-close-btn" title="Close">×</button>
      </div>
    </div>
    <div class="chorus-subtitle-container" id="chorus-subtitle-container">
      <div class="chorus-loading">Loading subtitles...</div>
    </div>
    <div class="chorus-controls">
      <button class="chorus-btn" id="combine-selected" disabled>
        ☐ Combine selected
      </button>
      <button class="chorus-btn" id="show-only-selected" disabled>
        ☐ Show only selected
      </button>
      <button class="chorus-btn clear" id="clear-selection">
        CLEAR SELECTION
      </button>
      <button class="chorus-btn primary" id="create-practice" disabled>
        CREATE
      </button>
    </div>
    <div class="chorus-resize-handle" id="chorus-resize-handle"></div>
  `;
  
  document.body.appendChild(overlay);
  subtitleOverlay = overlay;
  
  // Add event listeners
  setupOverlayEventListeners();
  
  // Position overlay
  positionOverlay();
}

// Update your setupOverlayEventListeners function to include these changes:
function setupOverlayEventListeners() {
  // Close button
  document.getElementById('chorus-close-btn').addEventListener('click', () => {
    hideSubtitleOverlay();
  });
  
  // Popout button
  document.getElementById('chorus-popout-btn').addEventListener('click', togglePopout);
  
  // Control buttons
  document.getElementById('combine-selected').addEventListener('click', toggleCombineSelected);
  document.getElementById('show-only-selected').addEventListener('click', toggleShowOnlySelected);
  document.getElementById('clear-selection').addEventListener('click', clearSelection);
  document.getElementById('create-practice').addEventListener('click', createPractice);
  
  // Handle subtitle item clicks (for selection) - UPDATED
  document.addEventListener('click', (e) => {
    if (e.target.classList.contains('chorus-subtitle-item')) {
      toggleSubtitleSelection(e.target);
    }
  });
  
  // Handle timestamp clicks (for seeking) - NEW
  document.addEventListener('click', (e) => {
    if (e.target.classList.contains('chorus-subtitle-time')) {
      const subtitleItem = e.target.closest('.chorus-subtitle-item');
      if (subtitleItem) {
        const startTime = parseFloat(subtitleItem.dataset.startTime);
        seekToTime(startTime);
      }
    }
  });
  
  // Handle video time updates to highlight current subtitle
  const video = document.querySelector('video');
  if (video) {
    video.addEventListener('timeupdate', updateCurrentSubtitle);
  }
  
  // Dragging functionality
  const header = document.getElementById('chorus-header');
  header.addEventListener('mousedown', startDrag);
  
  // Resizing functionality
  const resizeHandle = document.getElementById('chorus-resize-handle');
  resizeHandle.addEventListener('mousedown', startResize);
  
  // Global mouse events
  document.addEventListener('mousemove', handleMouseMove);
  document.addEventListener('mouseup', stopDragResize);
}

// Add this new function for seeking - NEW
function seekToTime(seconds) {
  const video = document.querySelector('video');
  if (video) {
    video.currentTime = seconds;
    console.log(`🎯 Seeking to ${formatTime(seconds)}`);
  }
}

function toggleCombineSelected() {
  isCombinedView = !isCombinedView;
  const btn = document.getElementById('combine-selected');
  
  if (isCombinedView) {
    btn.classList.add('toggle-active');
    btn.innerHTML = '☑ Combine selected';
  } else {
    btn.classList.remove('toggle-active');
    btn.innerHTML = '☐ Combine selected';
    
  }
}

function toggleShowOnlySelected() {
  isShowOnlySelected = !isShowOnlySelected;
  const btn = document.getElementById('show-only-selected');
  
  if (isShowOnlySelected) {
    btn.classList.add('toggle-active');
    btn.innerHTML = '☑ Show only selected';
    showOnlySelectedSubtitles();
  } else {
    btn.classList.remove('toggle-active');
    btn.innerHTML = '☐ Show only selected';
    showAllSubtitles();
  }
}




// Only implement the show/hide functionality
function showOnlySelectedSubtitles() {
  document.querySelectorAll('.chorus-subtitle-item').forEach(item => {
    const index = parseInt(item.dataset.index);
    if (!selectedSubtitles.has(index)) {
      item.classList.add('hidden');
    }
  });
  
  console.log('👁 Showing only selected subtitles');
}

function showAllSubtitles() {
  document.querySelectorAll('.chorus-subtitle-item').forEach(item => {
    item.classList.remove('hidden');
  });
  
  console.log('👁 Showing all subtitles');
}

let isPopout = false;
let isDragging = false;
let isResizing = false;
let dragOffset = { x: 0, y: 0 };

function positionOverlay() {
  if (!subtitleOverlay) return;
  
  if (isPopout) {
    // Don't auto-position if in popout mode
    return;
  }
  
  // Get viewport and player dimensions
  const viewportWidth = window.innerWidth;
  const viewportHeight = window.innerHeight;
  const player = document.querySelector('#movie_player, .html5-video-player');
  
  if (player) {
    const playerRect = player.getBoundingClientRect();
    
    // Calculate overlay width based on screen size (like Migaku)
    let overlayWidth;
    if (viewportWidth >= 2500) {
      // Ultra-wide monitors: larger subtitle browser
      overlayWidth = Math.min(450, viewportWidth * 0.15);
    } else if (viewportWidth >= 1920) {
      // Standard wide screens: medium size
      overlayWidth = Math.min(400, viewportWidth * 0.18);
    } else {
      // Smaller screens: compact size
      overlayWidth = Math.min(350, viewportWidth * 0.22);
    }
    
    // Minimum overlay width for usability
    overlayWidth = Math.max(300, overlayWidth);
    
    // Determine positioning strategy - PRIORITIZE LEFT SIDE
    const spaceOnLeft = playerRect.left;
    const spaceOnRight = viewportWidth - (playerRect.right);
    const minVideoWidth = 800; // Don't make video smaller than this
    
    if (spaceOnLeft >= overlayWidth + 20) {
      // Position to the LEFT of video (preferred)
      subtitleOverlay.style.position = 'fixed';
      subtitleOverlay.style.left = `${playerRect.left - overlayWidth - 10}px`;
      subtitleOverlay.style.top = `${Math.max(10, playerRect.top)}px`;
      subtitleOverlay.style.width = `${overlayWidth}px`;
      subtitleOverlay.style.height = `${Math.min(playerRect.height - 20, viewportHeight - 60)}px`;
      subtitleOverlay.style.zIndex = '2000';
      
    } else if (playerRect.width - overlayWidth > minVideoWidth) {
      // Position inside player on the LEFT
      subtitleOverlay.style.position = 'fixed';
      subtitleOverlay.style.left = `${playerRect.left + 15}px`;
      subtitleOverlay.style.top = `${playerRect.top + 10}px`;
      subtitleOverlay.style.width = `${overlayWidth}px`;
      subtitleOverlay.style.height = `${playerRect.height - 80}px`; // Leave space for controls
      subtitleOverlay.style.zIndex = '2000';
      
    } else if (spaceOnRight >= overlayWidth + 20) {
      // Fallback: Position to the right of video
      subtitleOverlay.style.position = 'fixed';
      subtitleOverlay.style.left = `${playerRect.right + 10}px`;
      subtitleOverlay.style.top = `${Math.max(10, playerRect.top)}px`;
      subtitleOverlay.style.width = `${overlayWidth}px`;
      subtitleOverlay.style.height = `${Math.min(playerRect.height - 20, viewportHeight - 60)}px`;
      subtitleOverlay.style.zIndex = '2000';
      
    } else {
      // Last resort: position inside on left with reduced width
      const maxWidth = Math.min(overlayWidth, playerRect.width * 0.35);
      subtitleOverlay.style.position = 'fixed';
      subtitleOverlay.style.left = `${playerRect.left + 10}px`;
      subtitleOverlay.style.top = `${playerRect.top + 10}px`;
      subtitleOverlay.style.width = `${maxWidth}px`;
      subtitleOverlay.style.height = `${playerRect.height - 80}px`;
      subtitleOverlay.style.zIndex = '2000';
    }
    
    // Ensure it's attached to body for fixed positioning
    if (subtitleOverlay.parentNode !== document.body) {
      document.body.appendChild(subtitleOverlay);
    }
    
  } else {
    console.warn('Player not found for positioning');
  }
}

function displaySubtitles(subtitles) {
  currentSubtitles = subtitles;
  const container = document.getElementById('chorus-subtitle-container');
  
  if (!subtitles || subtitles.length === 0) {
    container.innerHTML = '<div class="chorus-loading">No subtitles available</div>';
    return;
  }
  
  container.innerHTML = '';
  
  subtitles.forEach((subtitle, index) => {
    const item = document.createElement('div');
    item.className = 'chorus-subtitle-item';
    item.dataset.index = index;
    item.dataset.startTime = subtitle.startTime;
    item.dataset.endTime = subtitle.endTime; // Use the corrected endTime from background
    
    item.innerHTML = `
      <div class="chorus-subtitle-text">${subtitle.text}</div>
      <div class="chorus-subtitle-time">
        ${formatTime(subtitle.startTime)} - ${formatTime(subtitle.endTime)}
      </div>
    `;
    
    container.appendChild(item);
  });
}

function updateCurrentSubtitle() {
  const video = document.querySelector('video');
  if (!video || !currentSubtitles.length) return;
  
  const currentTime = video.currentTime;
  
  // Find the active subtitle: the one whose startTime has passed but next subtitle hasn't started yet
  let newIndex = -1;
  
  for (let i = 0; i < currentSubtitles.length; i++) {
    const currentSub = currentSubtitles[i];
    const nextSub = currentSubtitles[i + 1];
    
    // Check if current time is at or after this subtitle's start time
    if (currentTime >= currentSub.startTime) {
      // If there's a next subtitle, check if we haven't reached its start time yet
      if (nextSub) {
        if (currentTime < nextSub.startTime) {
          newIndex = i;
          break;
        }
      } else {
        // This is the last subtitle, so it stays active if we're past its start time
        newIndex = i;
        break;
      }
    } else {
      // We haven't reached this subtitle's start time yet, so no subtitle is active
      break;
    }
  }
  
  if (newIndex !== currentSubtitleIndex) {
    // Remove previous highlight
    if (currentSubtitleIndex >= 0) {
      const prevItem = document.querySelector(`[data-index="${currentSubtitleIndex}"]`);
      if (prevItem) prevItem.classList.remove('current');
    }
    
    // Add new highlight
    currentSubtitleIndex = newIndex;
    if (currentSubtitleIndex >= 0) {
      const currentItem = document.querySelector(`[data-index="${currentSubtitleIndex}"]`);
      if (currentItem) {
        currentItem.classList.add('current');
        // Auto-scroll to current subtitle
        currentItem.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }
  }
}

function toggleSubtitleSelection(item) {
  const index = parseInt(item.dataset.index);
  
  if (selectedSubtitles.has(index)) {
    selectedSubtitles.delete(index);
    item.classList.remove('selected');
  } else {
    selectedSubtitles.add(index);
    item.classList.add('selected');
  }
  
  updateControlButtons();
}



function updateControlButtons() {
  const hasSelection = selectedSubtitles.size > 0;
  const hasMultipleSelection = selectedSubtitles.size > 1;
  
  const combineBtn = document.getElementById('combine-selected');
  const showOnlyBtn = document.getElementById('show-only-selected');
  const createBtn = document.getElementById('create-practice');
  
  // Only disable if elements exist (they might not during initialization)
  if (combineBtn) combineBtn.disabled = !hasMultipleSelection;
  if (showOnlyBtn) showOnlyBtn.disabled = !hasSelection;
  if (createBtn) createBtn.disabled = !hasSelection;
  
  // Reset toggle states if no valid selection
  if (!hasMultipleSelection && isCombinedView) {
    toggleCombineSelected();
  }
  if (!hasSelection && isShowOnlySelected) {
    toggleShowOnlySelected();
  }
}


function clearSelection() {
  selectedSubtitles.clear();
  
  // Reset toggles if active
  if (isCombinedView) {
    toggleCombineSelected();
  }
  if (isShowOnlySelected) {
    toggleShowOnlySelected();
  }
  
  document.querySelectorAll('.chorus-subtitle-item.selected').forEach(item => {
    item.classList.remove('selected');
  });
  updateControlButtons();
}

// UPDATED createPractice function to use correct timing
function createPractice() {
  const selectedIndices = Array.from(selectedSubtitles).sort((a, b) => a - b);
  
  if (isCombinedView) {
    const firstSubtitle = currentSubtitles[selectedIndices[0]];
    const lastSubtitle = currentSubtitles[selectedIndices[selectedIndices.length - 1]];
    
    console.log('🎯 Creating COMBINED practice session with subtitles:', selectedIndices);
    console.log('📝 Record from', formatTime(firstSubtitle.startTime), 
                'to', formatTime(lastSubtitle.endTime)); // Now uses correct endTime!
    // TODO: Start recording mode for the entire time range
  } else {
    console.log('🎯 Creating SEPARATE practice sessions for each subtitle:', selectedIndices);
    selectedIndices.forEach(index => {
      const subtitle = currentSubtitles[index];
      console.log('📝 Individual recording for:', formatTime(subtitle.startTime), '-', formatTime(subtitle.endTime));
    });
    // TODO: Start recording mode for each subtitle individually
  }
}


function showSubtitleOverlay() {
  if (!subtitleOverlay) {
    createSubtitleOverlay();
  }
  subtitleOverlay.style.display = 'block';
  positionOverlay(); // Reposition in case window was resized
  startMonitoringChanges(); // Start monitoring for monitor changes
}

function hideSubtitleOverlay() {
  if (subtitleOverlay) {
    subtitleOverlay.style.display = 'none';
    stopMonitoringChanges(); // Stop monitoring when hidden
  }
}

function togglePopout() {
  isPopout = !isPopout;
  const popoutBtn = document.getElementById('chorus-popout-btn');
  
  if (isPopout) {
    // Switch to popout mode
    subtitleOverlay.classList.add('popout');
    
    // Move to body and position freely (no video layout changes needed)
    document.body.appendChild(subtitleOverlay);
    subtitleOverlay.style.position = 'fixed';
    subtitleOverlay.style.zIndex = '10001';
    subtitleOverlay.style.width = '400px';
    subtitleOverlay.style.height = '500px';
    subtitleOverlay.style.left = '50px';
    subtitleOverlay.style.top = '50px';
    
    popoutBtn.innerHTML = `
      <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
        <path d="M5,17 L5,10 L7,10 L7,15 L12,15 L12,17 L5,17 Z M12,12 L7,7 L9,7 L9,3 L15,3 L15,7 L17,7 L12,12 Z"/>
      </svg>
    `;
    popoutBtn.title = "Dock to video";
  } else {
    // Switch back to docked mode
    subtitleOverlay.classList.remove('popout');
    subtitleOverlay.style.zIndex = '2000';
    positionOverlay(); // Reposition using Migaku-style positioning
    popoutBtn.innerHTML = `
      <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
        <path d="M19,7 L19,14 L17,14 L17,9 L12,9 L12,7 L19,7 Z M12,12 L17,17 L15,17 L15,21 L9,21 L9,17 L7,17 L12,12 Z"/>
      </svg>
    `;
    popoutBtn.title = "Pop out";
  }
}

function resetVideoLayout() {
  // No longer needed since we're not modifying video layout
  // Keeping function for compatibility but it's now empty
}

function startDrag(e) {
  if (!isPopout) return; // Only allow dragging in popout mode
  
  isDragging = true;
  const rect = subtitleOverlay.getBoundingClientRect();
  dragOffset.x = e.clientX - rect.left;
  dragOffset.y = e.clientY - rect.top;
  
  subtitleOverlay.style.cursor = 'grabbing';
  e.preventDefault();
}

function startResize(e) {
  if (!isPopout) return; // Only allow resizing in popout mode
  
  isResizing = true;
  e.preventDefault();
  e.stopPropagation();
}

function handleMouseMove(e) {
  if (isDragging && isPopout) {
    const newLeft = e.clientX - dragOffset.x;
    const newTop = e.clientY - dragOffset.y;
    
    subtitleOverlay.style.left = `${Math.max(0, newLeft)}px`;
    subtitleOverlay.style.top = `${Math.max(0, newTop)}px`;
  }
  
  if (isResizing && isPopout) {
    const rect = subtitleOverlay.getBoundingClientRect();
    const newWidth = Math.max(300, e.clientX - rect.left);
    const newHeight = Math.max(400, e.clientY - rect.top);
    
    subtitleOverlay.style.width = `${newWidth}px`;
    subtitleOverlay.style.height = `${newHeight}px`;
  }
}

function stopDragResize() {
  if (isDragging) {
    isDragging = false;
    subtitleOverlay.style.cursor = '';
  }
  if (isResizing) {
    isResizing = false;
  }
}



// Enhanced window resize and monitor change handling
let resizeTimeout;
let lastScreenX = window.screenX;
let lastScreenY = window.screenY;
let lastViewportWidth = window.innerWidth;
let lastViewportHeight = window.innerHeight;

function handlePositionUpdate() {
  if (!isPopout && subtitleOverlay && subtitleOverlay.style.display !== 'none') {
    positionOverlay();
  }
}

function debouncedPositionUpdate() {
  clearTimeout(resizeTimeout);
  resizeTimeout = setTimeout(handlePositionUpdate, 100);
}

// Handle window resize
window.addEventListener('resize', () => {
  const currentViewportWidth = window.innerWidth;
  const currentViewportHeight = window.innerHeight;
  
  // Only reposition if viewport actually changed significantly
  if (Math.abs(currentViewportWidth - lastViewportWidth) > 50 || 
      Math.abs(currentViewportHeight - lastViewportHeight) > 50) {
    lastViewportWidth = currentViewportWidth;
    lastViewportHeight = currentViewportHeight;
    debouncedPositionUpdate();
  }
});

// Handle monitor changes (window being dragged between monitors)
function detectMonitorChange() {
  const currentScreenX = window.screenX;
  const currentScreenY = window.screenY;
  
  // Detect significant position changes (likely monitor change)
  if (Math.abs(currentScreenX - lastScreenX) > 100 || 
      Math.abs(currentScreenY - lastScreenY) > 100) {
    lastScreenX = currentScreenX;
    lastScreenY = currentScreenY;
    
    // Force reposition after a short delay to let the window settle
    setTimeout(handlePositionUpdate, 200);
  }
  
  lastScreenX = currentScreenX;
  lastScreenY = currentScreenY;
}

// Check for monitor changes periodically when overlay is active
let monitorCheckInterval;

function startMonitoringChanges() {
  if (monitorCheckInterval) return;
  monitorCheckInterval = setInterval(detectMonitorChange, 500);
}

function stopMonitoringChanges() {
  if (monitorCheckInterval) {
    clearInterval(monitorCheckInterval);
    monitorCheckInterval = null;
  }
}
/* ------------------ SUBTITLE UI LOGIC END -----------------------*/
/* ------------------ ORIGINAL SUBTITLE FUNCTIONS -----------------------*/

chrome.runtime.onMessage.addListener((message, sender, sendResponse) =>{
    if(message.action === "startChorus") {
        showSubtitleOverlay();
        init();
    }
    if (message.action === "subtitlesFetched") {
    const subtitleText = message.data;
    console.log("📥 Subtitles received in content script:");
    console.log(subtitleText);

    // Optionally parse and display them
    // Example: const xml = new DOMParser().parseFromString(subtitleText, "text/xml");
    displaySubtitles(subtitleText);
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
        displaySubtitles(response.data);
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
    handleVideoChange(currentUrl);
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
function handleVideoChange(currentUrl) {
  // Only trigger on actual YouTube video pages
  if (!currentUrl.includes("/watch")) {
    console.log("⏩ Skipping non-video page:", currentUrl);
    return;
  }

  console.log("🎥 New video detected:", currentUrl);

  // Reset subtitle state for new video
  currentSubtitles = [];
  currentSubtitleIndex = -1;
  selectedSubtitles.clear();
  
  // Reset toggle states for new video
  if (isCombinedView) {
    isCombinedView = false;
    const combineBtn = document.getElementById('combine-selected');
    if (combineBtn) {
      combineBtn.classList.remove('toggle-active');
      combineBtn.innerHTML = '☐ Combine selected';
    }
  }
  
  if (isShowOnlySelected) {
    isShowOnlySelected = false;
    const showOnlyBtn = document.getElementById('show-only-selected');
    if (showOnlyBtn) {
      showOnlyBtn.classList.remove('toggle-active');
      showOnlyBtn.innerHTML = '☐ Show only selected';
    }
  }
  
  // Show loading state if subtitle overlay is visible
  if (subtitleOverlay && subtitleOverlay.style.display !== 'none') {
    const container = document.getElementById('chorus-subtitle-container');
    if (container) {
      container.innerHTML = '<div class="chorus-loading">Loading subtitles...</div>';
    }
    updateControlButtons(); // Disable buttons while loading
  }

  chrome.runtime.sendMessage({ action: "startChorus" }, (response) => {
    console.log("📣 Notified background of new video:", response?.status);
  });
  
  // Wait a bit for player UI to settle
  setTimeout(() => {
    clickSubtitlesButton();
  }, 1000);
}



// 🧩 Init everything once per content script load
async function init() {
  console.log('🎬 YouTube subtitle interceptor loaded');
  // Initialize hotkey listener when the script loads
    setupHotkeyListener();
  const isCached = await checkCached();
   if (!isCached) {
    clickSubtitlesButton();
  }
  //handleVideoChange();
}