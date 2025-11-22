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
  
  .chorus-loading-overlay {
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0,0,0,0.85);
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    z-index: 100;
    color: white;
  }

  .spinner {
    width: 40px;
    height: 40px;
    border: 4px solid #f3f3f3;
    border-top: 4px solid #3498db;
    border-radius: 50%;
    animation: spin 1s linear infinite;
    margin-bottom: 15px;
  }

  @keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }

  /* Studio Mode Styles */
  .chorus-studio-container {
    display: flex;
    flex-direction: column;
    height: 100%;
    background: #121212;
    color: #e0e0e0;
  }

  .studio-header {
    padding: 10px;
    background: #1e1e1e;
    border-bottom: 1px solid #333;
    display: flex;
    align-items: center;
    gap: 10px;
    justify-content: space-between; /* Space for toggle */
  }

  .view-toggle {
    display: flex;
    background: #333;
    border-radius: 4px;
    padding: 2px;
  }

  .toggle-btn {
    background: none;
    border: none;
    color: #888;
    padding: 4px 8px;
    cursor: pointer;
    border-radius: 2px;
  }

  .toggle-btn.active {
    background: #555;
    color: white;
  }

  .studio-tracks {
    flex: 1;
    padding: 10px;
    overflow-y: auto;
    display: flex;
    flex-direction: column;
    gap: 10px;
  }

  .track-container {
    background: #1e1e1e;
    border-radius: 6px;
    padding: 10px;
    border: 1px solid #333;
  }

  .track-label {
    font-size: 11px;
    text-transform: uppercase;
    color: #888;
    margin-bottom: 5px;
  }

  .track-container.original .track-label { color: #4CAF50; }
  .track-container.user .track-label { color: #2196F3; }

  .waveform-display {
    height: 60px;
    background: #000;
    border-radius: 4px;
    position: relative;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .waveform-line {
    width: 100%;
    height: 2px;
    background: #4CAF50;
    opacity: 0.5;
  }
  
  .waveform-line.user-recorded {
    background: #2196F3;
  }

  .track-controls {
    margin-top: 5px;
    display: flex;
    justify-content: flex-end;
  }

  .icon-btn {
    background: none;
    border: none;
    color: #fff;
    cursor: pointer;
    padding: 4px 8px;
    border-radius: 4px;
  }
  .icon-btn:hover { background: rgba(255,255,255,0.1); }
  .icon-btn:disabled { opacity: 0.3; cursor: not-allowed; }

  .studio-main-controls {
    padding: 20px;
    background: #1e1e1e;
    border-top: 1px solid #333;
    display: flex;
    flex-direction: column;
    align-items: center;
  }

  .record-btn-large {
    width: 64px;
    height: 64px;
    border-radius: 50%;
    background: #fff;
    border: 4px solid #ccc;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    transition: all 0.2s;
  }

  .record-btn-large .inner-circle {
    width: 24px;
    height: 24px;
    background: #ff4444;
    border-radius: 50%;
    transition: all 0.2s;
  }

  .record-btn-large:hover { border-color: #fff; }
  
  .record-btn-large.recording {
    border-color: #ff4444;
  }
  .record-btn-large.recording .inner-circle {
    border-radius: 4px; /* Square */
    transform: scale(0.8);
  }

  .control-label {
    margin-top: 8px;
    font-size: 10px;
    color: #888;
    letter-spacing: 1px;
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

  /* Floating Studio Window Styles */
  #chorus-studio-window {
    position: fixed;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    width: 700px;
    height: 550px;
    background: #1e1e1e;
    border-radius: 12px;
    box-shadow: 0 20px 60px rgba(0, 0, 0, 0.6), 0 0 0 1px rgba(255, 255, 255, 0.1);
    z-index: 10001;
    display: none;
    flex-direction: column;
    overflow: hidden;
  }

  .studio-window-header {
    background: #2a2a2a;
    padding: 12px 16px;
    display: flex;
    justify-content: space-between;
    align-items: center;
    cursor: move;
    border-bottom: 1px solid #333;
    user-select: none;
  }

  .studio-window-header span {
    color: #fff;
    font-weight: 600;
    font-size: 14px;
  }

  .studio-close-btn {
    background: none;
    border: none;
    color: #aaa;
    font-size: 24px;
    cursor: pointer;
    padding: 0;
    width: 24px;
    height: 24px;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 4px;
    transition: all 0.2s;
  }

  .studio-close-btn:hover {
    background: rgba(255, 255, 255, 0.1);
    color: #fff;
  }

  .studio-window-content {
    flex: 1;
    overflow: hidden;
    display: flex;
    flex-direction: column;
  }


  /* Practice Mode Styles */
  .chorus-practice-container {
    padding: 15px;
    background: #1a1a1a;
    color: white;
    height: 100%;
    display: flex;
    flex-direction: column;
    gap: 15px;
  }

  .practice-header {
    display: flex;
    align-items: center;
    gap: 10px;
    font-size: 14px;
    border-bottom: 1px solid #333;
    padding-bottom: 10px;
  }

  .chorus-record-btn {
    width: 60px;
    height: 60px;
    border-radius: 50%;
    background: #ff4444;
    border: none;
    color: white;
    font-weight: bold;
    cursor: pointer;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    transition: all 0.2s;
    margin: 0 auto;
  }

  .chorus-record-btn:hover {
    transform: scale(1.1);
    background: #ff2222;
  }

  .chorus-record-btn.recording {
    animation: pulse 1.5s infinite;
    background: #cc0000;
    border-radius: 10px; /* Square shape when stop */
  }

  @keyframes pulse {
    0% { box-shadow: 0 0 0 0 rgba(255, 68, 68, 0.7); }
    70% { box-shadow: 0 0 0 15px rgba(255, 68, 68, 0); }
    100% { box-shadow: 0 0 0 0 rgba(255, 68, 68, 0); }
  }

  .practice-controls {
    display: flex;
    flex-direction: column;
    gap: 15px;
    align-items: center;
  }

  .control-row {
    display: flex;
    gap: 10px;
    width: 100%;
    justify-content: center;
  }

  .status-text {
    text-align: center;
    font-size: 12px;
    color: #aaa;
    margin-top: 5px;
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
  if (!subtitleOverlay || subtitleOverlay.style.display === 'none') {
    // Show
    toggleChorusMode(true);
    init();
  } else {
    // Hide
    toggleChorusMode(false);
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
      <button id="chorus-clear-btn" class="chorus-btn clear" disabled>Clear</button>
      <button id="chorus-create-btn" class="chorus-btn primary" disabled>Create</button>
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
    toggleChorusMode(false);
  });

  // Popout button
  document.getElementById('chorus-popout-btn').addEventListener('click', togglePopout);

  // Control buttons
  // Removed combine-selected and show-only-selected
  document.getElementById('chorus-clear-btn').addEventListener('click', clearSelection);
  document.getElementById('chorus-create-btn').addEventListener('click', createPractice);

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

/* ------------------ POSITIONING LOGIC -----------------------*/

/* ------------------ POSITIONING LOGIC -----------------------*/

function positionOverlay() {
  if (!subtitleOverlay) return;

  if (isPopout) {
    resetVideoLayout();
    return;
  }

  // DOCKED MODE: Left side INSIDE the video player
  const player = document.querySelector('#movie_player') || document.querySelector('.html5-video-player');
  const videoElement = document.querySelector('.html5-main-video');
  const controlsHeight = 54; // Height of YouTube bottom control bar

  if (player) {
    // Ensure overlay is a child of the player
    if (subtitleOverlay.parentNode !== player) {
      player.appendChild(subtitleOverlay);
    }

    // 1. Position Overlay
    subtitleOverlay.style.position = 'absolute';
    subtitleOverlay.style.top = '0';
    subtitleOverlay.style.left = '0';
    subtitleOverlay.style.bottom = `${controlsHeight}px`; // Stop above controls
    subtitleOverlay.style.right = 'auto';
    subtitleOverlay.style.width = '350px';
    subtitleOverlay.style.height = 'auto'; // Let top/bottom define height
    subtitleOverlay.style.zIndex = '60';
    subtitleOverlay.style.borderRight = '1px solid rgba(255,255,255,0.1)';
    subtitleOverlay.style.background = 'rgba(18, 18, 18, 0.95)';
    subtitleOverlay.style.boxShadow = 'none';

    // 2. Resize Video (Side-by-Side)
    if (videoElement) {
      videoElement.style.width = 'calc(100% - 350px)';
      videoElement.style.left = '350px';
      videoElement.style.top = '0';
      videoElement.style.objectFit = 'contain'; // Prevent clipping
      // YouTube uses 'left' for positioning, so this shifts it.
      // 'width' ensures it fits the remaining space.
    }

  } else {
    // Fallback
    subtitleOverlay.style.position = 'fixed';
    subtitleOverlay.style.left = '0';
    subtitleOverlay.style.top = '56px';
    subtitleOverlay.style.bottom = '0';
    subtitleOverlay.style.width = '350px';
  }
}

function resetVideoLayout() {
  console.log('🔄 Resetting video layout...');
  const videoElement = document.querySelector('.html5-main-video');
  if (videoElement) {
    videoElement.style.removeProperty('width');
    videoElement.style.removeProperty('left');
    videoElement.style.removeProperty('top');
    videoElement.style.removeProperty('object-fit');
    console.log('✅ Video layout reset complete');
  } else {
    console.warn('⚠️ Video element not found during reset');
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

  // Removed combineBtn and showOnlyBtn
  const clearBtn = document.getElementById('chorus-clear-btn');
  const createBtn = document.getElementById('chorus-create-btn');

  // Only disable if elements exist (they might not during initialization)
  if (clearBtn) clearBtn.disabled = !hasSelection; // Clear button enabled if any selection
  if (createBtn) createBtn.disabled = !hasSelection;

  // Reset toggle states if no valid selection
  // Removed logic for combine and show only toggles
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

// UPDATED createPractice function
async function createPractice() {
  const selectedIndices = Array.from(selectedSubtitles).sort((a, b) => a - b);
  if (selectedIndices.length === 0) return;

  let startTime, endTime;

  if (isCombinedView) {
    const firstSubtitle = currentSubtitles[selectedIndices[0]];
    const lastSubtitle = currentSubtitles[selectedIndices[selectedIndices.length - 1]];
    startTime = firstSubtitle.startTime;
    endTime = lastSubtitle.endTime;
  } else {
    const firstSubtitle = currentSubtitles[selectedIndices[0]];
    const lastSubtitle = currentSubtitles[selectedIndices[selectedIndices.length - 1]];
    startTime = firstSubtitle.startTime;
    endTime = lastSubtitle.endTime;
  }

  console.log(`🎯 Preparing Practice: ${formatTime(startTime)} - ${formatTime(endTime)}`);

  // 1. Hide Selection UI
  document.getElementById('chorus-subtitle-container').style.display = 'none';
  document.querySelector('.chorus-controls').style.display = 'none';

  // 2. Show "Capturing" State
  showCapturingState();

  // 3. Capture the Audio
  try {
    const originalAudioBlob = await captureOriginalAudio(startTime, endTime);
    // 4. Launch Studio Mode with the captured audio
    launchStudioMode(originalAudioBlob, startTime, endTime);
  } catch (err) {
    console.error("Capture failed:", err);
    alert("Failed to capture audio. Please try again.");
    // Restore UI
    document.getElementById('chorus-subtitle-container').style.display = 'block';
    document.querySelector('.chorus-controls').style.display = 'flex';
  }
}

function showCapturingState() {
  const overlay = document.getElementById('chorus-subtitle-overlay');
  let loader = document.getElementById('chorus-loader');
  if (!loader) {
    loader = document.createElement('div');
    loader.id = 'chorus-loader';
    loader.className = 'chorus-loading-overlay';
    overlay.appendChild(loader);
  }
  loader.innerHTML = `
    <div class="spinner"></div>
    <div class="loading-text">Extracting Audio...</div>
    <div class="loading-subtext">Please wait while we capture the segment</div>
  `;
  loader.style.display = 'flex';
}

function hideCapturingState() {
  const loader = document.getElementById('chorus-loader');
  if (loader) loader.style.display = 'none';
}

async function captureOriginalAudio(startTime, endTime) {
  const video = document.querySelector('video');
  const duration = (endTime - startTime) * 1000;

  // Seek to start
  video.currentTime = startTime;

  // Wait for seek to complete
  await new Promise(resolve => {
    const onSeek = () => {
      video.removeEventListener('seeked', onSeek);
      resolve();
    };
    video.addEventListener('seeked', onSeek);
  });

  // Capture stream
  // NOTE: captureStream() might be vendor prefixed or require specific handling
  let stream;
  if (video.captureStream) {
    stream = video.captureStream();
  } else if (video.mozCaptureStream) {
    stream = video.mozCaptureStream();
  } else {
    throw new Error("captureStream not supported");
  }

  const mediaRecorder = new MediaRecorder(stream);
  const chunks = [];

  return new Promise((resolve, reject) => {
    mediaRecorder.ondataavailable = (e) => {
      if (e.data.size > 0) chunks.push(e.data);
    };

    mediaRecorder.onstop = () => {
      const blob = new Blob(chunks, { type: 'video/webm' }); // Usually video/webm even if just audio
      resolve(blob);
    };

    mediaRecorder.start();
    video.play();

    // Stop after duration
    setTimeout(() => {
      mediaRecorder.stop();
      video.pause();
    }, duration + 200); // Add small buffer
  });
}

/* ------------------ STUDIO MODE LOGIC -----------------------*/

let studioState = {
  originalBlob: null,
  originalUrl: null,
  userBlob: null,
  userUrl: null,
  isPlaying: false
};

/* ------------------ SPECTROGRAM VISUALIZATION -----------------------*/

// Simple FFT implementation for Spectrogram
// Note: For production, a WebAssembly FFT or optimized library is better.
// This is a basic JS implementation for demonstration.

function getSpectrogramData(audioBuffer, fftSize = 2048) {
  const channelData = audioBuffer.getChannelData(0);
  const sampleRate = audioBuffer.sampleRate;
  const stepSize = fftSize / 2; // Overlap
  const iterations = Math.floor((channelData.length - fftSize) / stepSize);
  const spectrogram = [];

  // Pre-calculate Hamming window
  const window = new Float32Array(fftSize);
  for (let i = 0; i < fftSize; i++) {
    window[i] = 0.54 - 0.46 * Math.cos((2 * Math.PI * i) / (fftSize - 1));
  }

  for (let i = 0; i < iterations; i++) {
    const offset = i * stepSize;
    const buffer = new Float32Array(fftSize);

    // Apply window function
    for (let j = 0; j < fftSize; j++) {
      buffer[j] = channelData[offset + j] * window[j];
    }

    // Perform FFT (Magnitude only)
    // Since we don't have a complex FFT lib, we'll use a simplified DFT for key frequencies
    // OR better: Use OfflineAudioContext to get frequency data!
    // Let's use OfflineAudioContext as it's native and fast.
  }
  return spectrogram;
}

// Optimized approach using OfflineAudioContext
async function renderSpectrogram(blob, canvasId) {
  const container = document.getElementById(canvasId);
  if (!container) return;

  container.innerHTML = '';
  const canvas = document.createElement('canvas');
  canvas.width = container.clientWidth;
  canvas.height = container.clientHeight;
  container.appendChild(canvas);
  const ctx = canvas.getContext('2d');

  const arrayBuffer = await blob.arrayBuffer();
  const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);

  // We need to process the audio to get frequency data over time.
  // We can't easily do this with OfflineContext for *visualization* of the whole file at once
  // without playing it.
  // Actually, we can just compute it manually.

  drawSpectrogramOnCanvas(audioBuffer, ctx, canvas.width, canvas.height);
}

function drawSpectrogramOnCanvas(audioBuffer, ctx, width, height) {
  const data = audioBuffer.getChannelData(0);
  const fftSize = 512; // Lower resolution for performance
  const step = Math.floor(data.length / width); // One column per pixel width

  // Create a temporary Float32Array for the FFT
  const real = new Float32Array(fftSize);
  const imag = new Float32Array(fftSize);

  // Draw column by column
  for (let x = 0; x < width; x++) {
    const offset = x * step;
    if (offset + fftSize >= data.length) break;

    // Fill buffer
    for (let i = 0; i < fftSize; i++) {
      real[i] = data[offset + i];
      imag[i] = 0;
    }

    // Perform simple FFT (or just a few frequency bins for visual effect if full FFT is too slow)
    // For a true spectrogram in JS without libs, we need a real FFT function.
    // Let's implement a very basic visualization that LOOKS like a spectrogram
    // by mapping amplitude to brightness and doing a rough frequency estimation (Zero Crossing Rate?)
    // No, let's do a mini DFT for low/mid/high bands to fake it efficiently if we can't afford full FFT.

    // Actually, let's try to implement a small, unoptimized FFT here. It's fine for short clips.
    performFFT(real, imag, fftSize);

    // Draw the column
    for (let y = 0; y < height; y++) {
      // Map y to frequency bin (0 to fftSize/2)
      // Logarithmic scale is better for speech
      const bin = Math.floor((height - y) / height * (fftSize / 2));
      const magnitude = Math.sqrt(real[bin] * real[bin] + imag[bin] * imag[bin]);

      // Color map (Black -> Blue -> Red -> Yellow -> White)
      const intensity = Math.min(1, Math.log(1 + magnitude) * 5); // Boost contrast

      if (intensity > 0.1) {
        ctx.fillStyle = getHeatmapColor(intensity);
        ctx.fillRect(x, y, 1, 1);
      }
    }
  }
}

// Basic Cooley-Tukey FFT (In-place)
function performFFT(re, im, n) {
  if (n <= 1) return;

  const h = n / 2;
  const evenRe = new Float32Array(h);
  const evenIm = new Float32Array(h);
  const oddRe = new Float32Array(h);
  const oddIm = new Float32Array(h);

  for (let i = 0; i < h; i++) {
    evenRe[i] = re[2 * i];
    evenIm[i] = im[2 * i];
    oddRe[i] = re[2 * i + 1];
    oddIm[i] = im[2 * i + 1];
  }

  performFFT(evenRe, evenIm, h);
  performFFT(oddRe, oddIm, h);

  for (let k = 0; k < h; k++) {
    const t = -2 * Math.PI * k / n;
    const cosT = Math.cos(t);
    const sinT = Math.sin(t);

    const reT = cosT * oddRe[k] - sinT * oddIm[k];
    const imT = cosT * oddIm[k] + sinT * oddRe[k];

    re[k] = evenRe[k] + reT;
    im[k] = evenIm[k] + imT;
    re[k + h] = evenRe[k] - reT;
    im[k + h] = evenIm[k] - imT;
  }
}

function getHeatmapColor(value) {
  // value 0 to 1
  const h = (1 - value) * 240; // Blue (240) to Red (0)
  return `hsl(${h}, 100%, 50%)`;
}

/* ------------------ WAVEFORM VISUALIZATION -----------------------*/

const audioContext = new (window.AudioContext || window.webkitAudioContext)();
let animationFrameId;

async function renderWaveform(blob, canvasId, color = '#4CAF50', audioDuration = 0) {
  const container = document.getElementById(canvasId);
  if (!container) return;

  container.innerHTML = '';
  const canvas = document.createElement('canvas');
  canvas.width = container.clientWidth;
  canvas.height = container.clientHeight;
  container.appendChild(canvas);

  const ctx = canvas.getContext('2d');

  const arrayBuffer = await blob.arrayBuffer();
  const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);

  // Store buffer for redrawing during animation
  canvas.audioBuffer = audioBuffer;
  canvas.waveformColor = color;

  drawWaveformOnCanvas(audioBuffer, ctx, canvas.width, canvas.height, color, 0); // Initial draw at 0s
}

function drawWaveformOnCanvas(audioBuffer, ctx, width, height, color, currentTime) {
  ctx.clearRect(0, 0, width, height);

  // Background
  ctx.fillStyle = '#000';
  ctx.fillRect(0, 0, width, height);

  // Draw Axes
  drawAxes(ctx, width, height, audioBuffer.duration);

  const rawData = audioBuffer.getChannelData(0);
  const samples = width; // One bar per pixel roughly
  const blockSize = Math.floor(rawData.length / samples);
  const filteredData = [];

  for (let i = 0; i < samples; i++) {
    let blockStart = blockSize * i;
    let sum = 0;
    for (let j = 0; j < blockSize; j++) {
      sum = sum + Math.abs(rawData[blockStart + j]);
    }
    filteredData.push(sum / blockSize);
  }

  const multiplier = Math.pow(Math.max(...filteredData), -1);

  ctx.lineWidth = 1;
  ctx.strokeStyle = color;
  ctx.beginPath();

  for (let i = 0; i < samples; i++) {
    const v = filteredData[i] * multiplier;
    const barHeight = v * (height - 20); // Leave space for axis labels
    const x = i;

    ctx.moveTo(x, (height - barHeight) / 2);
    ctx.lineTo(x, (height + barHeight) / 2);
  }
  ctx.stroke();

  // Draw Playback Cursor
  if (currentTime >= 0) {
    const x = (currentTime / audioBuffer.duration) * width;
    ctx.strokeStyle = '#FF0000';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, height);
    ctx.stroke();
  }
}

function drawAxes(ctx, width, height, duration) {
  ctx.fillStyle = '#444';
  ctx.font = '10px Arial';

  // X-Axis (Time)
  const timeSteps = 5; // Draw 5 timestamps
  for (let i = 0; i <= timeSteps; i++) {
    const x = (width / timeSteps) * i;
    const time = (duration / timeSteps) * i;
    ctx.fillText(time.toFixed(1) + 's', x + 2, height - 2);

    // Grid line
    ctx.strokeStyle = '#222';
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, height);
    ctx.stroke();
  }

  // Y-Axis (Amplitude) - Just 0 line
  ctx.strokeStyle = '#333';
  ctx.beginPath();
  ctx.moveTo(0, height / 2);
  ctx.lineTo(width, height / 2);
  ctx.stroke();
}

function startPlaybackAnimation(audioElement, canvasId) {
  const container = document.getElementById(canvasId);
  if (!container) return;
  const canvas = container.querySelector('canvas');
  if (!canvas || !canvas.audioBuffer) return;

  const ctx = canvas.getContext('2d');

  function loop() {
    if (audioElement.paused || audioElement.ended) {
      // Draw final state (or reset)
      drawWaveformOnCanvas(canvas.audioBuffer, ctx, canvas.width, canvas.height, canvas.waveformColor, audioElement.currentTime);
      return;
    }

    drawWaveformOnCanvas(canvas.audioBuffer, ctx, canvas.width, canvas.height, canvas.waveformColor, audioElement.currentTime);
    animationFrameId = requestAnimationFrame(loop);
  }

  loop();
}

/* ------------------ STUDIO WINDOW CREATION -----------------------*/

let studioWindow = null;
let isStudioDragging = false;
let studioDragOffset = { x: 0, y: 0 };

function createStudioWindow() {
  if (studioWindow) return studioWindow;

  const window = document.createElement('div');
  window.id = 'chorus-studio-window';
  window.innerHTML = `
    <div class="studio-window-header" id="studio-window-header">
      <span>Studio Mode</span>
      <button class="studio-close-btn" id="studio-close-btn">×</button>
    </div>
    <div class="studio-window-content" id="studio-window-content">
      <!-- Content will be inserted here -->
    </div>
  `;

  document.body.appendChild(window);
  studioWindow = window;

  // Make draggable
  const header = document.getElementById('studio-window-header');
  header.addEventListener('mousedown', startStudioDrag);
  document.addEventListener('mousemove', handleStudioDrag);
  document.addEventListener('mouseup', stopStudioDrag);

  return window;
}

function startStudioDrag(e) {
  if (e.target.classList.contains('studio-close-btn')) return;

  isStudioDragging = true;
  const rect = studioWindow.getBoundingClientRect();
  studioDragOffset.x = e.clientX - rect.left;
  studioDragOffset.y = e.clientY - rect.top;

  // Remove transform to allow absolute positioning
  studioWindow.style.transform = 'none';
  studioWindow.style.left = rect.left + 'px';
  studioWindow.style.top = rect.top + 'px';

  e.preventDefault();
}

function handleStudioDrag(e) {
  if (!isStudioDragging) return;

  const newLeft = e.clientX - studioDragOffset.x;
  const newTop = e.clientY - studioDragOffset.y;

  studioWindow.style.left = `${Math.max(0, newLeft)}px`;
  studioWindow.style.top = `${Math.max(0, newTop)}px`;
}

function stopStudioDrag() {
  isStudioDragging = false;
}

function removeStudioWindow() {
  if (studioWindow) {
    studioWindow.remove();
    studioWindow = null;
  }
}

/* ------------------ STUDIO MODE LOGIC -----------------------*/

let currentViewMode = 'waveform'; // 'waveform' or 'spectrogram'

function launchStudioMode(originalBlob, startTime, endTime) {
  hideCapturingState();
  studioState.originalBlob = originalBlob;
  studioState.originalUrl = URL.createObjectURL(originalBlob);

  // Create floating window
  const window = createStudioWindow();
  const content = document.getElementById('studio-window-content');

  content.innerHTML = `
    <div class="chorus-studio-container">
      <div class="studio-header">
        <button id="exit-studio" class="chorus-btn small">← Back</button>
        <span>Practice Audio</span>
        <div class="view-toggle">
          <button id="view-waveform" class="toggle-btn active" title="Waveform">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M2,9 L2,15 L5,15 L5,9 L2,9 Z M7,5 L7,19 L10,19 L10,5 L7,5 Z M12,2 L12,22 L15,22 L15,2 L12,2 Z M17,7 L17,17 L20,17 L20,7 L17,7 Z"/></svg>
          </button>
          <button id="view-spectrogram" class="toggle-btn" title="Spectrogram">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M2,4 L22,4 L22,20 L2,20 L2,4 Z M4,6 L4,18 L20,18 L20,6 L4,6 Z M6,8 L6,16 L8,16 L8,8 L6,8 Z M10,10 L10,16 L12,16 L12,10 L10,10 Z M14,8 L14,16 L16,16 L16,8 L14,8 Z"/></svg>
          </button>
        </div>
      </div>
      
      <div class="studio-tracks">
        <!-- Track 1: Original -->
        <div class="track-container original">
          <div class="track-label">Target Audio</div>
          <div class="waveform-display" id="waveform-original">
             <!-- Canvas will be inserted here -->
          </div>
          <div class="track-controls">
             <button id="play-original" class="icon-btn">▶</button>
          </div>
        </div>

        <!-- Track 2: User -->
        <div class="track-container user">
          <div class="track-label">Your Recording</div>
          <div class="waveform-display" id="waveform-user">
             <div class="empty-state">No recording yet</div>
          </div>
          <div class="track-controls">
             <button id="play-user" class="icon-btn" disabled>▶</button>
          </div>
        </div>
      </div>
      
      <div class="studio-main-controls">
        <button id="studio-record-btn" class="record-btn-large">
          <div class="inner-circle"></div>
        </button>
        <div class="control-label">REC</div>
      </div>
    </div>
  `;

  // Show window
  window.style.display = 'block';

  // Render View
  updateTrackViews();

  // Bind Events
  document.getElementById('exit-studio').addEventListener('click', exitStudioMode);
  document.getElementById('studio-close-btn').addEventListener('click', exitStudioMode);
  document.getElementById('view-waveform').addEventListener('click', () => switchView('waveform'));
  document.getElementById('view-spectrogram').addEventListener('click', () => switchView('spectrogram'));

  const originalAudio = new Audio(studioState.originalUrl);
  document.getElementById('play-original').addEventListener('click', () => {
    originalAudio.currentTime = 0;
    originalAudio.play();
    startPlaybackAnimation(originalAudio, 'waveform-original');
  });

  const recordBtn = document.getElementById('studio-record-btn');
  recordBtn.addEventListener('click', () => toggleStudioRecording(recordBtn));
}

function switchView(mode) {
  if (currentViewMode === mode) return;
  currentViewMode = mode;

  document.getElementById('view-waveform').classList.toggle('active', mode === 'waveform');
  document.getElementById('view-spectrogram').classList.toggle('active', mode === 'spectrogram');

  updateTrackViews();
}

function updateTrackViews() {
  if (currentViewMode === 'waveform') {
    renderWaveform(studioState.originalBlob, 'waveform-original', '#4CAF50');
    if (studioState.userBlob) {
      renderWaveform(studioState.userBlob, 'waveform-user', '#2196F3');
    }
  } else {
    renderSpectrogram(studioState.originalBlob, 'waveform-original');
    if (studioState.userBlob) {
      renderSpectrogram(studioState.userBlob, 'waveform-user');
    }
  }
}

function exitStudioMode() {
  removeStudioWindow();
}

async function toggleStudioRecording(btn) {
  if (btn.classList.contains('recording')) {
    // STOP
    if (mediaRecorder && mediaRecorder.state === 'recording') {
      mediaRecorder.stop();
    }
    btn.classList.remove('recording');
  } else {
    // START
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaRecorder = new MediaRecorder(stream);
      audioChunks = [];

      mediaRecorder.ondataavailable = (e) => audioChunks.push(e.data);

      mediaRecorder.onstop = () => {
        const blob = new Blob(audioChunks, { type: 'audio/webm' });
        studioState.userBlob = blob;
        studioState.userUrl = URL.createObjectURL(blob);

        updateUserTrackUI();
      };

      mediaRecorder.start();
      btn.classList.add('recording');

      // Auto-play original audio for shadowing?
      const originalAudio = new Audio(studioState.originalUrl);
      originalAudio.play();

    } catch (err) {
      console.error(err);
      alert("Microphone access denied");
    }
  }
}

function updateUserTrackUI() {
  const container = document.getElementById('waveform-user');
  container.innerHTML = '<div class="waveform-line user-recorded"></div>'; // Placeholder visual

  const playBtn = document.getElementById('play-user');
  playBtn.disabled = false;

  // Re-bind play button
  const userAudio = new Audio(studioState.userUrl);
  playBtn.onclick = () => {
    userAudio.currentTime = 0;
    userAudio.play();
  };
}


function toggleChorusMode(active) {
  if (active) {
    // Show overlay
    if (!subtitleOverlay) {
      createSubtitleOverlay();
    }
    subtitleOverlay.style.display = 'flex';
    positionOverlay();

    // Add resize listener
    window.addEventListener('resize', positionOverlay);

    // Initial position check
    setTimeout(positionOverlay, 500);
    startMonitoringChanges(); // Start monitoring for monitor changes

  } else {
    // Hide overlay
    if (subtitleOverlay) {
      subtitleOverlay.style.display = 'none';
    }
    resetVideoLayout(); // Unconditional reset
    window.removeEventListener('resize', positionOverlay);
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

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === "startChorus") {
    toggleChorusMode(true);
    init();
  }
  if (message.action === "stopChorus") {
    toggleChorusMode(false);
  }
  if (message.action === "subtitlesFetched") {
    const subtitleText = message.data;
    console.log("📥 Subtitles received in content script:");
    console.log(subtitleText);

    // Optionally parse and display them
    // Example: const xml = new DOMParser().parseFromString(subtitleText, "text/xml");
    displaySubtitles(subtitleText);
  }
  sendResponse({ status: "ok" })
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