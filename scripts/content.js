/**
 * Chorus Mode - Language Learning Subtitle Browser v2.0
 * Complete feature set with SRS, Practice Queue, History, and Advanced Audio Analysis
 */

// ============================================================================
// STATE MANAGEMENT
// ============================================================================

const ChorusState = {
  // UI State
  isVisible: false,
  isStudioOpen: false,
  panelWidth: 380,
  minPanelWidth: 300,
  maxPanelWidth: 600,
  
  // Video State (stored for proper undo)
  originalVideoStyles: null,
  
  // Subtitle State
  subtitles: [],
  currentIndex: -1,
  
  // Selection State
  selectedIndices: new Set(),
  selectionAnchor: null,
  
  // Bookmarks State (persisted to localStorage)
  bookmarks: {}, // { videoId: Set of subtitle indices }
  showingBookmarksOnly: false,
  
  // Studio State
  originalAudioBlob: null,
  originalAudioUrl: null,
  originalAudioBuffer: null,
  userAudioBlob: null,
  userAudioUrl: null,
  userAudioBuffer: null,
  capturedStartTime: 0,
  capturedEndTime: 0,
  capturedSubtitleText: '',
  
  // Recording State
  mediaRecorder: null,
  audioChunks: [],
  isRecording: false,
  recordingAnalyser: null,
  recordingStream: null,
  
  // Playback State
  isLooping: false,
  loopCount: 0,
  playbackSpeed: 1.0,
  listenCount: 1,
  
  // A-B Loop State
  abLoopEnabled: false,
  abLoopStart: 0,
  abLoopEnd: 1,
  
  // Visualization State
  currentVizMode: 'waveform',
  
  // Practice Queue
  practiceQueue: [],
  currentQueueIndex: 0,
  isQueueMode: false,
  
  // Practice History (persisted)
  practiceHistory: [],
  
  // SRS State (persisted)
  srsCards: [],
  
  // SRS Review State
  currentSRSCard: null,
  isReviewingCard: false,
  dueCardQueue: [],
  currentDueIndex: 0,
  
  // Pronunciation Score
  lastScore: null,
  
  // Scrubbing State
  isScrubbing: false,
  scrubAudioSource: null,
  
  // Hotkey Debounce
  hotkeyLocked: false,
  
  // Audio Context
  audioContext: null,
};

// ============================================================================
// STYLES
// ============================================================================

const CHORUS_STYLES = `
  /* ========== CSS VARIABLES ========== */
  :root {
    --chorus-bg-primary: rgba(18, 18, 22, 0.92);
    --chorus-bg-secondary: rgba(28, 28, 35, 0.95);
    --chorus-bg-tertiary: rgba(38, 38, 48, 0.9);
    --chorus-glass: rgba(255, 255, 255, 0.03);
    --chorus-glass-border: rgba(255, 255, 255, 0.08);
    --chorus-glass-hover: rgba(255, 255, 255, 0.06);
    
    --chorus-text-primary: rgba(255, 255, 255, 0.95);
    --chorus-text-secondary: rgba(255, 255, 255, 0.6);
    --chorus-text-muted: rgba(255, 255, 255, 0.4);
    
    --chorus-accent: #6366f1;
    --chorus-accent-glow: rgba(99, 102, 241, 0.3);
    --chorus-accent-soft: rgba(99, 102, 241, 0.15);
    
    --chorus-success: #10b981;
    --chorus-success-glow: rgba(16, 185, 129, 0.3);
    
    --chorus-danger: #ef4444;
    --chorus-danger-glow: rgba(239, 68, 68, 0.4);
    
    --chorus-warning: #f59e0b;
    
    --chorus-current-line: rgba(99, 102, 241, 0.2);
    --chorus-selected-line: rgba(16, 185, 129, 0.25);
    --chorus-current-selected: rgba(99, 102, 241, 0.35);
    
    --chorus-radius-sm: 6px;
    --chorus-radius-md: 10px;
    --chorus-radius-lg: 16px;
    --chorus-radius-xl: 24px;
    
    --chorus-shadow-sm: 0 2px 8px rgba(0, 0, 0, 0.3);
    --chorus-shadow-md: 0 4px 20px rgba(0, 0, 0, 0.4);
    --chorus-shadow-lg: 0 8px 40px rgba(0, 0, 0, 0.5);
    --chorus-shadow-glow: 0 0 30px var(--chorus-accent-glow);
    
    --chorus-transition-fast: 150ms ease;
    --chorus-transition-normal: 250ms ease;
    --chorus-transition-slow: 400ms cubic-bezier(0.4, 0, 0.2, 1);
  }

  /* ========== MAIN PANEL ========== */
  #chorus-panel {
    position: absolute;
    top: 0;
    left: 0;
    bottom: 0;
    width: 380px;
    background: var(--chorus-bg-primary);
    backdrop-filter: blur(20px) saturate(180%);
    -webkit-backdrop-filter: blur(20px) saturate(180%);
    border-right: 1px solid var(--chorus-glass-border);
    box-shadow: 2px 0 10px rgba(0, 0, 0, 0.3);
    display: flex;
    flex-direction: column;
    z-index: 60;
    font-family: 'Segoe UI', -apple-system, BlinkMacSystemFont, sans-serif;
    color: var(--chorus-text-primary);
    opacity: 0;
    transform: translateX(-20px);
    transition: opacity var(--chorus-transition-slow), transform var(--chorus-transition-slow);
    overflow: hidden;
  }

  #chorus-panel.visible {
    opacity: 1;
    transform: translateX(0);
  }

  .chorus-controls-shifted .ytp-chrome-bottom {
    left: var(--chorus-panel-width, 380px) !important;
    width: calc(100% - var(--chorus-panel-width, 380px)) !important;
    transition: left 0.25s ease, width 0.25s ease;
  }

  .chorus-controls-shifted .ytp-progress-bar-container {
    width: 100% !important;
  }

  /* ========== HEADER ========== */
  .chorus-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 14px 16px;
    background: var(--chorus-bg-secondary);
    border-bottom: 1px solid var(--chorus-glass-border);
    flex-shrink: 0;
  }

  .chorus-brand {
    display: flex;
    align-items: center;
    gap: 10px;
  }

  .chorus-logo {
    width: 28px;
    height: 28px;
    background: linear-gradient(135deg, var(--chorus-accent), #8b5cf6);
    border-radius: var(--chorus-radius-sm);
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 14px;
    box-shadow: var(--chorus-shadow-glow);
  }

  .chorus-title {
    font-size: 14px;
    font-weight: 600;
    letter-spacing: 0.3px;
  }

  .chorus-header-actions {
    display: flex;
    align-items: center;
    gap: 6px;
  }

  .chorus-hotkey-badge {
    font-size: 10px;
    color: var(--chorus-text-muted);
    background: var(--chorus-glass);
    padding: 3px 8px;
    border-radius: var(--chorus-radius-sm);
    border: 1px solid var(--chorus-glass-border);
    font-family: 'SF Mono', 'Consolas', monospace;
  }

  .chorus-icon-btn {
    width: 32px;
    height: 32px;
    background: var(--chorus-glass);
    border: 1px solid var(--chorus-glass-border);
    border-radius: var(--chorus-radius-sm);
    color: var(--chorus-text-secondary);
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 14px;
    transition: all var(--chorus-transition-fast);
    position: relative;
  }

  .chorus-icon-btn:hover {
    background: var(--chorus-glass-hover);
    color: var(--chorus-text-primary);
    border-color: rgba(255, 255, 255, 0.15);
  }

  .chorus-icon-btn.has-badge::after {
    content: attr(data-badge);
    position: absolute;
    top: -5px;
    right: -5px;
    background: var(--chorus-danger);
    color: white;
    font-size: 9px;
    font-weight: 700;
    padding: 2px 5px;
    border-radius: 10px;
    min-width: 16px;
    text-align: center;
  }

  .chorus-close-btn {
    font-size: 18px;
  }

  /* ========== SEARCH BAR ========== */
  .chorus-search-bar {
    padding: 10px 16px;
    background: var(--chorus-bg-secondary);
    border-bottom: 1px solid var(--chorus-glass-border);
    position: relative;
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .chorus-search-input {
    flex: 1;
    background: var(--chorus-glass);
    border: 1px solid var(--chorus-glass-border);
    border-radius: var(--chorus-radius-md);
    padding: 8px 12px 8px 32px;
    color: var(--chorus-text-primary);
    font-size: 13px;
    outline: none;
    transition: all var(--chorus-transition-fast);
  }

  .chorus-search-input::placeholder {
    color: var(--chorus-text-muted);
  }

  .chorus-search-input:focus {
    border-color: var(--chorus-accent);
    background: rgba(99, 102, 241, 0.1);
  }

  .chorus-search-icon {
    position: absolute;
    left: 26px;
    font-size: 12px;
    opacity: 0.5;
    pointer-events: none;
  }

  .chorus-search-count {
    font-size: 11px;
    color: var(--chorus-text-muted);
    white-space: nowrap;
  }

  /* ========== FILTER BAR ========== */
  .chorus-filter-bar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 8px 16px;
    background: rgba(0, 0, 0, 0.2);
    border-bottom: 1px solid var(--chorus-glass-border);
    font-size: 12px;
    gap: 8px;
  }

  .chorus-filter-btn {
    background: var(--chorus-glass);
    border: 1px solid var(--chorus-glass-border);
    border-radius: var(--chorus-radius-sm);
    color: var(--chorus-text-secondary);
    padding: 5px 10px;
    font-size: 11px;
    cursor: pointer;
    transition: all var(--chorus-transition-fast);
    display: flex;
    align-items: center;
    gap: 5px;
  }

  .chorus-filter-btn:hover {
    background: var(--chorus-glass-hover);
    color: var(--chorus-text-primary);
  }

  .chorus-filter-btn.active {
    background: rgba(251, 191, 36, 0.2);
    border-color: #fbbf24;
    color: #fcd34d;
  }

  .chorus-bookmark-count {
    color: var(--chorus-text-muted);
    margin-left: auto;
  }

  /* ========== QUEUE INDICATOR ========== */
  .chorus-queue-bar {
    display: none;
    padding: 8px 16px;
    background: linear-gradient(135deg, rgba(99, 102, 241, 0.2), rgba(139, 92, 246, 0.2));
    border-bottom: 1px solid var(--chorus-accent);
    align-items: center;
    justify-content: space-between;
  }

  .chorus-queue-bar.active {
    display: flex;
  }

  .chorus-queue-info {
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 12px;
  }

  .chorus-queue-progress {
    color: var(--chorus-accent);
    font-weight: 600;
  }

  .chorus-queue-btn {
    background: var(--chorus-accent);
    border: none;
    color: white;
    padding: 4px 10px;
    border-radius: var(--chorus-radius-sm);
    font-size: 11px;
    cursor: pointer;
    transition: all var(--chorus-transition-fast);
  }

  .chorus-queue-btn:hover {
    background: #818cf8;
  }

  /* ========== SUBTITLE LIST ========== */
  .chorus-subtitle-list {
    flex: 1;
    overflow-y: auto;
    overflow-x: hidden;
    padding: 12px;
    display: flex;
    flex-direction: column;
    gap: 10px;
    scrollbar-width: thin;
    scrollbar-color: rgba(255, 255, 255, 0.2) transparent;
  }

  .chorus-subtitle-list::-webkit-scrollbar {
    width: 6px;
  }

  .chorus-subtitle-list::-webkit-scrollbar-track {
    background: transparent;
  }

  .chorus-subtitle-list::-webkit-scrollbar-thumb {
    background: rgba(255, 255, 255, 0.2);
    border-radius: 3px;
  }

  /* ========== SUBTITLE TILE ========== */
  .chorus-tile {
    background: var(--chorus-glass);
    border: 1px solid var(--chorus-glass-border);
    border-radius: var(--chorus-radius-md);
    padding: 16px 18px;
    padding-right: 70px;
    cursor: pointer;
    transition: all var(--chorus-transition-fast);
    position: relative;
    overflow: hidden;
    min-height: 70px;
  }

  .chorus-tile::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: linear-gradient(135deg, transparent 0%, rgba(255, 255, 255, 0.02) 100%);
    pointer-events: none;
  }

  .chorus-tile:hover {
    background: var(--chorus-glass-hover);
    border-color: rgba(255, 255, 255, 0.12);
    transform: translateY(-1px);
  }

  .chorus-tile.current {
    background: var(--chorus-current-line);
    border-color: var(--chorus-accent);
    box-shadow: inset 0 0 0 1px var(--chorus-accent-glow), var(--chorus-shadow-sm);
  }

  .chorus-tile.selected {
    background: var(--chorus-selected-line);
    border-color: var(--chorus-success);
    box-shadow: inset 0 0 0 1px var(--chorus-success-glow);
  }

  .chorus-tile.current.selected {
    background: var(--chorus-current-selected);
    border-color: var(--chorus-accent);
    box-shadow: inset 0 0 0 1px var(--chorus-accent-glow), 0 0 0 2px var(--chorus-success-glow);
  }

  .chorus-tile.in-queue {
    border-left: 3px solid var(--chorus-accent);
  }

  .chorus-tile.in-queue::after {
    content: '📋';
    position: absolute;
    bottom: 8px;
    right: 8px;
    font-size: 12px;
    opacity: 0.7;
  }

  .chorus-tile.bookmarked {
    border-left: 3px solid #fbbf24;
  }

  .chorus-tile.search-highlight {
    border-color: #fbbf24;
    box-shadow: inset 0 0 0 1px rgba(251, 191, 36, 0.3);
  }

  .chorus-tile.search-highlight .chorus-tile-text {
    color: #fcd34d;
  }

  .chorus-tile-text {
    font-size: 18px;
    line-height: 1.6;
    color: var(--chorus-text-primary);
    margin-bottom: 10px;
    word-wrap: break-word;
  }

  .chorus-tile-meta {
    display: flex;
    align-items: center;
    justify-content: space-between;
  }

  .chorus-tile-time {
    font-size: 12px;
    font-family: 'SF Mono', 'Consolas', monospace;
    color: var(--chorus-text-muted);
    background: var(--chorus-bg-tertiary);
    padding: 5px 10px;
    border-radius: var(--chorus-radius-sm);
    cursor: pointer;
    transition: all var(--chorus-transition-fast);
    border: 1px solid transparent;
  }

  .chorus-tile-time:hover {
    color: var(--chorus-accent);
    background: var(--chorus-accent-soft);
    border-color: var(--chorus-accent);
  }

  .chorus-tile-duration {
    font-size: 11px;
    color: var(--chorus-text-muted);
  }

  .chorus-tile-index {
    position: absolute;
    top: 14px;
    right: 12px;
    font-size: 11px;
    color: var(--chorus-text-muted);
    opacity: 0.5;
  }

  /* ========== BOOKMARK BUTTON ========== */
  .chorus-bookmark-btn {
    position: absolute;
    top: 12px;
    right: 40px;
    width: 24px;
    height: 24px;
    background: rgba(0, 0, 0, 0.3);
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: 5px;
    cursor: pointer;
    font-size: 13px;
    opacity: 0.6;
    transition: all var(--chorus-transition-fast);
    padding: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 5;
  }

  .chorus-bookmark-btn:hover {
    opacity: 1;
    background: rgba(251, 191, 36, 0.2);
    border-color: rgba(251, 191, 36, 0.4);
  }

  .chorus-bookmark-btn.bookmarked {
    opacity: 1;
    color: #fbbf24;
    background: rgba(251, 191, 36, 0.15);
    border-color: rgba(251, 191, 36, 0.4);
  }

  /* ========== EMPTY STATE ========== */
  .chorus-empty-state {
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 40px 20px;
    text-align: center;
  }

  .chorus-empty-icon {
    font-size: 48px;
    margin-bottom: 16px;
    opacity: 0.5;
  }

  .chorus-empty-title {
    font-size: 16px;
    font-weight: 600;
    color: var(--chorus-text-secondary);
    margin-bottom: 8px;
  }

  .chorus-empty-subtitle {
    font-size: 13px;
    color: var(--chorus-text-muted);
    max-width: 250px;
    line-height: 1.5;
  }

  .chorus-loading-spinner {
    width: 36px;
    height: 36px;
    border: 3px solid var(--chorus-glass-border);
    border-top-color: var(--chorus-accent);
    border-radius: 50%;
    animation: chorus-spin 0.8s linear infinite;
    margin-bottom: 16px;
  }

  @keyframes chorus-spin {
    to { transform: rotate(360deg); }
  }

  /* ========== FOOTER ========== */
  .chorus-footer {
    display: flex;
    flex-direction: column;
    gap: 10px;
    padding: 14px 16px;
    background: var(--chorus-bg-secondary);
    border-top: 1px solid var(--chorus-glass-border);
    flex-shrink: 0;
  }

  .chorus-selection-info {
    display: flex;
    align-items: center;
    justify-content: space-between;
    font-size: 12px;
    color: var(--chorus-text-secondary);
  }

  .chorus-selection-count {
    display: flex;
    align-items: center;
    gap: 6px;
  }

  .chorus-selection-badge {
    background: var(--chorus-accent-soft);
    color: var(--chorus-accent);
    padding: 2px 8px;
    border-radius: var(--chorus-radius-sm);
    font-weight: 600;
  }

  .chorus-footer-actions {
    display: flex;
    gap: 8px;
  }

  .chorus-btn {
    flex: 1;
    padding: 10px 16px;
    border-radius: var(--chorus-radius-md);
    font-size: 13px;
    font-weight: 600;
    cursor: pointer;
    transition: all var(--chorus-transition-fast);
    border: 1px solid transparent;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 6px;
  }

  .chorus-btn:disabled {
    opacity: 0.4;
    cursor: not-allowed;
  }

  .chorus-btn-secondary {
    background: var(--chorus-glass);
    border-color: var(--chorus-glass-border);
    color: var(--chorus-text-secondary);
  }

  .chorus-btn-secondary:hover:not(:disabled) {
    background: var(--chorus-glass-hover);
    color: var(--chorus-text-primary);
  }

  .chorus-btn-primary {
    background: linear-gradient(135deg, var(--chorus-accent), #8b5cf6);
    color: white;
    box-shadow: var(--chorus-shadow-sm), 0 0 20px var(--chorus-accent-glow);
  }

  .chorus-btn-primary:hover:not(:disabled) {
    transform: translateY(-1px);
    box-shadow: var(--chorus-shadow-md), 0 0 30px var(--chorus-accent-glow);
  }

  .chorus-btn-queue {
    background: rgba(251, 191, 36, 0.2);
    border-color: #fbbf24;
    color: #fcd34d;
  }

  .chorus-btn-queue:hover:not(:disabled) {
    background: rgba(251, 191, 36, 0.3);
  }

  /* ========== RESIZE HANDLE ========== */
  .chorus-resize-handle {
    position: absolute;
    top: 0;
    right: -4px;
    width: 8px;
    height: 100%;
    cursor: ew-resize;
    z-index: 100;
  }

  .chorus-resize-handle::after {
    content: '';
    position: absolute;
    top: 50%;
    right: 3px;
    transform: translateY(-50%);
    width: 3px;
    height: 40px;
    background: var(--chorus-glass-border);
    border-radius: 2px;
    opacity: 0;
    transition: opacity var(--chorus-transition-fast);
  }

  .chorus-resize-handle:hover::after {
    opacity: 1;
  }

  /* ========== STUDIO MODAL ========== */
  #chorus-studio-overlay {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0, 0, 0, 0.75);
    backdrop-filter: blur(8px);
    z-index: 10000;
    display: flex;
    align-items: center;
    justify-content: center;
    opacity: 0;
    visibility: hidden;
    transition: all var(--chorus-transition-normal);
  }

  #chorus-studio-overlay.visible {
    opacity: 1;
    visibility: visible;
  }

  #chorus-studio-modal {
    width: 95%;
    max-width: 1000px;
    max-height: 95vh;
    background: linear-gradient(180deg, #1c1c30 0%, #161628 100%);
    border-radius: var(--chorus-radius-xl);
    border: 1px solid rgba(255, 255, 255, 0.1);
    box-shadow: var(--chorus-shadow-lg), 0 0 80px rgba(99, 102, 241, 0.12);
    display: flex;
    flex-direction: column;
    overflow: hidden;
    transform: scale(0.95) translateY(20px);
    transition: transform var(--chorus-transition-slow);
  }

  #chorus-studio-overlay.visible #chorus-studio-modal {
    transform: scale(1) translateY(0);
  }

  .studio-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 16px 20px;
    background: linear-gradient(180deg, rgba(35, 35, 55, 0.98) 0%, rgba(28, 28, 45, 0.98) 100%);
    border-bottom: 1px solid rgba(255, 255, 255, 0.08);
  }

  .studio-title-group {
    display: flex;
    align-items: center;
    gap: 12px;
  }

  .studio-icon {
    width: 36px;
    height: 36px;
    background: linear-gradient(135deg, #ff6b6b 0%, #f97316 100%);
    border-radius: var(--chorus-radius-md);
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 18px;
    box-shadow: 0 4px 15px rgba(255, 107, 107, 0.3);
  }

  .studio-title {
    font-size: 18px;
    font-weight: 700;
    color: var(--chorus-text-primary);
  }

  .studio-subtitle {
    font-size: 12px;
    color: var(--chorus-text-secondary);
    font-family: 'SF Mono', 'Consolas', monospace;
  }

  .studio-header-actions {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .studio-close-btn {
    width: 36px;
    height: 36px;
    background: rgba(255, 255, 255, 0.05);
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: var(--chorus-radius-md);
    color: var(--chorus-text-secondary);
    cursor: pointer;
    font-size: 20px;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all var(--chorus-transition-fast);
  }

  .studio-close-btn:hover {
    background: rgba(239, 68, 68, 0.2);
    border-color: #ef4444;
    color: #fca5a5;
  }

  .studio-content {
    flex: 1;
    padding: 20px;
    overflow-y: auto;
    display: flex;
    flex-direction: column;
    gap: 16px;
    background: linear-gradient(180deg, #18182a 0%, #141424 100%);
  }

  /* ========== SUBTITLE DISPLAY IN STUDIO ========== */
  .studio-subtitle-display {
    background: rgba(99, 102, 241, 0.1);
    border: 1px solid rgba(99, 102, 241, 0.3);
    border-radius: var(--chorus-radius-md);
    padding: 16px;
    text-align: center;
  }

  .studio-subtitle-text {
    font-size: 20px;
    line-height: 1.5;
    color: var(--chorus-text-primary);
    margin-bottom: 8px;
  }

  .studio-subtitle-time {
    font-size: 12px;
    color: var(--chorus-text-muted);
    font-family: 'SF Mono', 'Consolas', monospace;
  }

  /* ========== AUDIO TRACK ========== */
  .audio-track {
    background: var(--chorus-bg-secondary);
    border-radius: var(--chorus-radius-lg);
    padding: 14px;
    border: 1px solid rgba(255, 255, 255, 0.08);
  }

  .track-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 10px;
  }

  .track-label {
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 12px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.8px;
  }

  .track-label.original { color: #4ade80; }
  .track-label.user { color: #818cf8; }

  .track-dot {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    box-shadow: 0 0 8px currentColor;
  }

  .track-dot.original { background: #4ade80; }
  .track-dot.user { background: #818cf8; }

  .track-controls {
    display: flex;
    gap: 6px;
    align-items: center;
  }

  .track-btn {
    width: 32px;
    height: 32px;
    background: rgba(255, 255, 255, 0.08);
    border: 1px solid rgba(255, 255, 255, 0.12);
    border-radius: var(--chorus-radius-sm);
    color: var(--chorus-text-primary);
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 13px;
    transition: all var(--chorus-transition-fast);
  }

  .track-btn:hover:not(:disabled) {
    background: rgba(255, 255, 255, 0.15);
    border-color: rgba(255, 255, 255, 0.25);
  }

  .track-btn:disabled {
    opacity: 0.3;
    cursor: not-allowed;
  }

  .track-btn.playing {
    background: linear-gradient(135deg, #6366f1, #818cf8);
    border-color: #818cf8;
    color: white;
  }

  /* ========== VIZ TABS ========== */
  .viz-tabs {
    display: flex;
    gap: 2px;
    background: rgba(0, 0, 0, 0.3);
    padding: 3px;
    border-radius: var(--chorus-radius-sm);
    border: 1px solid rgba(255, 255, 255, 0.05);
  }

  .viz-tab {
    padding: 5px 10px;
    font-size: 10px;
    font-weight: 600;
    background: transparent;
    border: none;
    color: var(--chorus-text-muted);
    cursor: pointer;
    border-radius: 4px;
    transition: all var(--chorus-transition-fast);
  }

  .viz-tab:hover {
    color: var(--chorus-text-secondary);
    background: rgba(255, 255, 255, 0.05);
  }

  .viz-tab.active {
    background: rgba(255, 255, 255, 0.12);
    color: var(--chorus-text-primary);
  }

  /* ========== VISUALIZATION CONTAINER ========== */
  .visualization-container {
    background: linear-gradient(180deg, #1a1a2e 0%, #16162a 100%);
    border-radius: var(--chorus-radius-md);
    height: 100px;
    position: relative;
    overflow: hidden;
    border: 1px solid rgba(255, 255, 255, 0.05);
    cursor: crosshair;
  }

  .visualization-container canvas {
    width: 100%;
    height: 100%;
    display: block;
  }

  .visualization-placeholder {
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    color: var(--chorus-text-secondary);
    font-size: 13px;
    background: linear-gradient(180deg, #1a1a2e 0%, #16162a 100%);
  }

  .playhead {
    position: absolute;
    top: 0;
    bottom: 0;
    width: 2px;
    background: #ff6b6b;
    box-shadow: 0 0 10px rgba(255, 107, 107, 0.6);
    pointer-events: none;
    z-index: 10;
  }

  .playhead::before {
    content: '';
    position: absolute;
    top: -4px;
    left: -4px;
    width: 10px;
    height: 10px;
    background: #ff6b6b;
    border-radius: 50%;
  }

  /* ========== A-B LOOP HANDLES ========== */
  .ab-loop-region {
    position: absolute;
    top: 0;
    bottom: 0;
    background: rgba(99, 102, 241, 0.2);
    border-left: 2px solid var(--chorus-accent);
    border-right: 2px solid var(--chorus-accent);
    pointer-events: none;
    display: none;
  }

  .ab-loop-region.active {
    display: block;
  }

  .ab-handle {
    position: absolute;
    top: 0;
    bottom: 0;
    width: 12px;
    cursor: ew-resize;
    z-index: 15;
    display: none;
  }

  .ab-handle.active {
    display: block;
  }

  .ab-handle::before {
    content: '';
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    width: 4px;
    height: 30px;
    background: var(--chorus-accent);
    border-radius: 2px;
  }

  .ab-handle.start {
    left: 0;
    transform: translateX(-6px);
  }

  .ab-handle.end {
    right: 0;
    transform: translateX(6px);
  }

  /* ========== SCORE DISPLAY ========== */
  .score-display {
    display: none;
    align-items: center;
    justify-content: center;
    gap: 16px;
    padding: 16px;
    background: linear-gradient(135deg, rgba(16, 185, 129, 0.1), rgba(99, 102, 241, 0.1));
    border: 1px solid rgba(16, 185, 129, 0.3);
    border-radius: var(--chorus-radius-lg);
  }

  .score-display.visible {
    display: flex;
  }

  .score-circle {
    width: 80px;
    height: 80px;
    border-radius: 50%;
    background: conic-gradient(var(--chorus-success) calc(var(--score) * 1%), rgba(255,255,255,0.1) 0);
    display: flex;
    align-items: center;
    justify-content: center;
    position: relative;
  }

  .score-circle::before {
    content: '';
    position: absolute;
    width: 64px;
    height: 64px;
    background: #1a1a2e;
    border-radius: 50%;
  }

  .score-value {
    position: relative;
    font-size: 24px;
    font-weight: 700;
    color: var(--chorus-success);
  }

  .score-details {
    display: flex;
    flex-direction: column;
    gap: 4px;
  }

  .score-label {
    font-size: 14px;
    font-weight: 600;
    color: var(--chorus-text-primary);
  }

  .score-feedback {
    font-size: 12px;
    color: var(--chorus-text-secondary);
  }

  /* ========== PLAYBACK CONTROLS ========== */
  .playback-controls {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 16px;
    padding: 16px;
    background: linear-gradient(180deg, rgba(30, 30, 50, 0.8) 0%, rgba(25, 25, 45, 0.9) 100%);
    border-radius: var(--chorus-radius-lg);
    border: 1px solid rgba(255, 255, 255, 0.08);
    flex-wrap: wrap;
  }

  .control-group {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 6px;
  }

  .control-group-row {
    display: flex;
    align-items: center;
    gap: 4px;
  }

  .control-label {
    font-size: 9px;
    color: var(--chorus-text-muted);
    text-transform: uppercase;
    letter-spacing: 0.8px;
    font-weight: 600;
  }

  .speed-btn, .listen-btn {
    padding: 6px 10px;
    font-size: 11px;
    font-weight: 600;
    background: rgba(255, 255, 255, 0.05);
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: var(--chorus-radius-sm);
    color: var(--chorus-text-secondary);
    cursor: pointer;
    transition: all var(--chorus-transition-fast);
  }

  .speed-btn:hover, .listen-btn:hover {
    background: rgba(255, 255, 255, 0.1);
    color: var(--chorus-text-primary);
  }

  .speed-btn.active {
    background: rgba(99, 102, 241, 0.3);
    border-color: #818cf8;
    color: #c7d2fe;
  }

  .listen-btn.active {
    background: rgba(251, 191, 36, 0.25);
    border-color: #fbbf24;
    color: #fcd34d;
  }

  .loop-btn, .ab-loop-btn {
    width: 36px;
    height: 36px;
    background: rgba(255, 255, 255, 0.05);
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: var(--chorus-radius-md);
    color: var(--chorus-text-secondary);
    cursor: pointer;
    font-size: 16px;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all var(--chorus-transition-fast);
  }

  .loop-btn:hover, .ab-loop-btn:hover {
    background: rgba(255, 255, 255, 0.1);
    color: var(--chorus-text-primary);
  }

  .loop-btn.active {
    background: rgba(74, 222, 128, 0.25);
    border-color: #4ade80;
    color: #86efac;
  }

  .ab-loop-btn.active {
    background: rgba(99, 102, 241, 0.25);
    border-color: #818cf8;
    color: #c7d2fe;
  }

  /* ========== RECORD BUTTON ========== */
  .record-btn-container {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 6px;
  }

  .record-btn {
    width: 64px;
    height: 64px;
    border-radius: 50%;
    background: linear-gradient(180deg, #2a2a40 0%, #1e1e30 100%);
    border: 4px solid rgba(255, 255, 255, 0.15);
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all var(--chorus-transition-fast);
    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
  }

  .record-btn-inner {
    width: 24px;
    height: 24px;
    background: linear-gradient(135deg, #ff6b6b 0%, #ee5a5a 100%);
    border-radius: 50%;
    transition: all var(--chorus-transition-fast);
    box-shadow: 0 0 15px rgba(255, 107, 107, 0.4);
  }

  .record-btn:hover {
    border-color: rgba(255, 107, 107, 0.5);
    transform: scale(1.05);
  }

  .record-btn.recording {
    border-color: #ff6b6b;
    animation: pulse-record 1.5s ease-in-out infinite;
  }

  .record-btn.recording .record-btn-inner {
    border-radius: 4px;
    transform: scale(0.7);
  }

  @keyframes pulse-record {
    0%, 100% { box-shadow: 0 0 0 0 rgba(255, 107, 107, 0.5); }
    50% { box-shadow: 0 0 0 15px transparent; }
  }

  .record-label {
    font-size: 10px;
    font-weight: 700;
    color: var(--chorus-text-secondary);
    text-transform: uppercase;
    letter-spacing: 1px;
  }

  /* ========== COMPARE BUTTON ========== */
  .compare-btn {
    padding: 8px 14px;
    font-size: 11px;
    font-weight: 600;
    background: rgba(255, 255, 255, 0.05);
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: var(--chorus-radius-md);
    color: var(--chorus-text-secondary);
    cursor: pointer;
    transition: all var(--chorus-transition-fast);
    white-space: nowrap;
  }

  .compare-btn:hover:not(:disabled) {
    background: rgba(129, 140, 248, 0.2);
    border-color: #818cf8;
    color: #c7d2fe;
  }

  .compare-btn:disabled {
    opacity: 0.4;
    cursor: not-allowed;
  }

  .compare-btn.playing {
    background: linear-gradient(135deg, #6366f1, #818cf8);
    border-color: #818cf8;
    color: white;
  }

  /* ========== SRS BUTTON ========== */
  .srs-btn {
    padding: 8px 14px;
    font-size: 11px;
    font-weight: 600;
    background: linear-gradient(135deg, rgba(251, 191, 36, 0.2), rgba(245, 158, 11, 0.2));
    border: 1px solid #fbbf24;
    border-radius: var(--chorus-radius-md);
    color: #fcd34d;
    cursor: pointer;
    transition: all var(--chorus-transition-fast);
    display: flex;
    align-items: center;
    gap: 6px;
  }

  .srs-btn:hover {
    background: linear-gradient(135deg, rgba(251, 191, 36, 0.3), rgba(245, 158, 11, 0.3));
    transform: translateY(-1px);
  }

  /* ========== COUNTDOWN OVERLAY ========== */
  .countdown-overlay {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0, 0, 0, 0.9);
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    z-index: 10002;
    opacity: 0;
    visibility: hidden;
    transition: all var(--chorus-transition-fast);
  }

  .countdown-overlay.visible {
    opacity: 1;
    visibility: visible;
  }

  .countdown-number {
    font-size: 100px;
    font-weight: 800;
    color: #fbbf24;
    text-shadow: 0 0 40px rgba(251, 191, 36, 0.5);
    animation: countdown-pulse 1s ease-in-out;
  }

  @keyframes countdown-pulse {
    0% { transform: scale(0.5); opacity: 0; }
    50% { transform: scale(1.1); opacity: 1; }
    100% { transform: scale(1); opacity: 1; }
  }

  .countdown-label {
    font-size: 14px;
    color: var(--chorus-text-secondary);
    margin-top: 12px;
    text-transform: uppercase;
    letter-spacing: 2px;
  }

  .countdown-listen-label {
    font-size: 13px;
    color: #fbbf24;
    margin-top: 6px;
  }

  /* ========== CAPTURE LOADING ========== */
  .capture-loading {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 50px 20px;
    text-align: center;
  }

  .capture-spinner {
    width: 44px;
    height: 44px;
    border: 4px solid rgba(255, 255, 255, 0.1);
    border-top-color: #818cf8;
    border-radius: 50%;
    animation: chorus-spin 0.8s linear infinite;
    margin-bottom: 20px;
  }

  .capture-title {
    font-size: 16px;
    font-weight: 600;
    color: var(--chorus-text-primary);
    margin-bottom: 8px;
  }

  .capture-subtitle {
    font-size: 13px;
    color: var(--chorus-text-secondary);
  }

  /* ========== QUEUE MODE HEADER ========== */
  .queue-mode-header {
    display: none;
    padding: 12px 16px;
    background: linear-gradient(135deg, rgba(99, 102, 241, 0.15), rgba(139, 92, 246, 0.15));
    border-bottom: 1px solid var(--chorus-accent);
    align-items: center;
    justify-content: space-between;
  }

  .queue-mode-header.active {
    display: flex;
  }

  .queue-mode-info {
    display: flex;
    align-items: center;
    gap: 12px;
  }

  .queue-mode-progress {
    font-size: 13px;
    font-weight: 600;
    color: var(--chorus-accent);
  }

  .queue-mode-nav {
    display: flex;
    gap: 6px;
  }

  .queue-nav-btn {
    padding: 6px 12px;
    background: rgba(255, 255, 255, 0.1);
    border: 1px solid rgba(255, 255, 255, 0.2);
    border-radius: var(--chorus-radius-sm);
    color: var(--chorus-text-primary);
    font-size: 12px;
    cursor: pointer;
    transition: all var(--chorus-transition-fast);
  }

  .queue-nav-btn:hover:not(:disabled) {
    background: var(--chorus-accent);
    border-color: var(--chorus-accent);
  }

  .queue-nav-btn:disabled {
    opacity: 0.4;
    cursor: not-allowed;
  }

  /* ========== TOAST ========== */
  .chorus-toast {
    position: fixed;
    bottom: 20px;
    left: 50%;
    transform: translateX(-50%) translateY(100px);
    background: var(--chorus-bg-secondary);
    border: 1px solid var(--chorus-glass-border);
    border-radius: var(--chorus-radius-md);
    padding: 12px 20px;
    color: var(--chorus-text-primary);
    font-size: 13px;
    z-index: 10003;
    box-shadow: var(--chorus-shadow-lg);
    opacity: 0;
    transition: all var(--chorus-transition-normal);
    display: flex;
    align-items: center;
    gap: 10px;
  }

  .chorus-toast.visible {
    opacity: 1;
    transform: translateX(-50%) translateY(0);
  }

  .chorus-toast.error {
    border-color: var(--chorus-danger);
    background: rgba(239, 68, 68, 0.15);
  }

  .chorus-toast.success {
    border-color: var(--chorus-success);
    background: rgba(16, 185, 129, 0.15);
  }

  .chorus-toast.warning {
    border-color: var(--chorus-warning);
    background: rgba(245, 158, 11, 0.15);
  }

  /* ========== SRS REVIEW STYLES ========== */
  .srs-review-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 12px 16px;
    background: linear-gradient(135deg, rgba(251, 191, 36, 0.15), rgba(245, 158, 11, 0.15));
    border: 1px solid rgba(251, 191, 36, 0.3);
    border-radius: var(--chorus-radius-md);
    margin-bottom: 8px;
  }

  .srs-review-progress {
    font-size: 13px;
    font-weight: 600;
    color: #fcd34d;
  }

  .srs-review-video {
    font-size: 11px;
    color: var(--chorus-text-muted);
    max-width: 200px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .srs-rating-section {
    background: linear-gradient(180deg, rgba(30, 30, 50, 0.9) 0%, rgba(25, 25, 45, 0.95) 100%);
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: var(--chorus-radius-lg);
    padding: 20px;
    margin-top: 8px;
  }

  .srs-rating-label {
    text-align: center;
    font-size: 14px;
    font-weight: 600;
    color: var(--chorus-text-secondary);
    margin-bottom: 16px;
  }

  .srs-rating-buttons {
    display: flex;
    gap: 12px;
    justify-content: center;
  }

  .srs-rate-btn {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 6px;
    padding: 14px 20px;
    border-radius: var(--chorus-radius-md);
    border: 2px solid transparent;
    cursor: pointer;
    transition: all var(--chorus-transition-fast);
    min-width: 80px;
  }

  .srs-rate-btn .rate-emoji {
    font-size: 24px;
  }

  .srs-rate-btn .rate-text {
    font-size: 12px;
    font-weight: 600;
  }

  .srs-rate-btn .rate-interval {
    font-size: 10px;
    opacity: 0.7;
    font-family: 'SF Mono', 'Consolas', monospace;
  }

  .srs-rate-btn.again {
    background: rgba(239, 68, 68, 0.15);
    border-color: rgba(239, 68, 68, 0.3);
    color: #fca5a5;
  }

  .srs-rate-btn.again:hover {
    background: rgba(239, 68, 68, 0.25);
    border-color: #ef4444;
    transform: translateY(-2px);
  }

  .srs-rate-btn.hard {
    background: rgba(251, 191, 36, 0.15);
    border-color: rgba(251, 191, 36, 0.3);
    color: #fcd34d;
  }

  .srs-rate-btn.hard:hover {
    background: rgba(251, 191, 36, 0.25);
    border-color: #fbbf24;
    transform: translateY(-2px);
  }

  .srs-rate-btn.good {
    background: rgba(74, 222, 128, 0.15);
    border-color: rgba(74, 222, 128, 0.3);
    color: #86efac;
  }

  .srs-rate-btn.good:hover {
    background: rgba(74, 222, 128, 0.25);
    border-color: #4ade80;
    transform: translateY(-2px);
  }

  .srs-rate-btn.easy {
    background: rgba(99, 102, 241, 0.15);
    border-color: rgba(99, 102, 241, 0.3);
    color: #c7d2fe;
  }

  .srs-rate-btn.easy:hover {
    background: rgba(99, 102, 241, 0.25);
    border-color: #6366f1;
    transform: translateY(-2px);
  }
`;
// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

function formatTime(seconds) {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

function formatDuration(startTime, endTime) {
  const duration = endTime - startTime;
  if (duration < 1) {
    return `${Math.round(duration * 1000)}ms`;
  }
  return `${duration.toFixed(1)}s`;
}

function getAudioContext() {
  if (!ChorusState.audioContext || ChorusState.audioContext.state === 'closed') {
    ChorusState.audioContext = new (window.AudioContext || window.webkitAudioContext)();
  }
  return ChorusState.audioContext;
}

function showToast(message, type = 'info') {
  let toast = document.getElementById('chorus-toast');
  if (!toast) {
    toast = document.createElement('div');
    toast.id = 'chorus-toast';
    toast.className = 'chorus-toast';
    document.body.appendChild(toast);
  }

  toast.textContent = message;
  toast.className = `chorus-toast ${type}`;
  toast.offsetHeight;
  toast.classList.add('visible');

  setTimeout(() => {
    toast.classList.remove('visible');
  }, 3000);
}

function getVideoId() {
  const url = new URL(window.location.href);
  return url.searchParams.get('v') || 'unknown';
}

function getVideoTitle() {
  const titleEl = document.querySelector('h1.ytd-video-primary-info-renderer, h1.ytd-watch-metadata');
  return titleEl?.textContent?.trim() || document.title || 'Unknown Video';
}

function escapeHtml(str) {
  if (!str) return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// ============================================================================
// PERSISTENCE FUNCTIONS
// ============================================================================

function loadAllData() {
  loadBookmarks();
  loadPracticeHistory();
  loadSRSCards();
  loadPracticeQueue();
}

function loadBookmarks() {
  try {
    const stored = localStorage.getItem('chorus-bookmarks');
    if (stored) {
      const parsed = JSON.parse(stored);
      for (const videoId in parsed) {
        ChorusState.bookmarks[videoId] = new Set(parsed[videoId]);
      }
    }
  } catch (e) {
    console.warn('Failed to load bookmarks:', e);
  }
}

function saveBookmarks() {
  try {
    const toStore = {};
    for (const videoId in ChorusState.bookmarks) {
      toStore[videoId] = Array.from(ChorusState.bookmarks[videoId]);
    }
    localStorage.setItem('chorus-bookmarks', JSON.stringify(toStore));
  } catch (e) {
    console.warn('Failed to save bookmarks:', e);
  }
}

function loadPracticeHistory() {
  chrome.storage.local.get('chorus-history', (result) => {
    if (result['chorus-history']) {
      ChorusState.practiceHistory = result['chorus-history'];
    }
  });
}

function savePracticeHistory() {
  if (ChorusState.practiceHistory.length > 500) {
    ChorusState.practiceHistory = ChorusState.practiceHistory.slice(-500);
  }
  chrome.storage.local.set({ 'chorus-history': ChorusState.practiceHistory });
}

function addToHistory(score = null) {
  const entry = {
    videoId: getVideoId(),
    videoTitle: getVideoTitle(),
    subtitleText: ChorusState.capturedSubtitleText,
    startTime: ChorusState.capturedStartTime,
    endTime: ChorusState.capturedEndTime,
    timestamp: Date.now(),
    score: score
  };
  
  chrome.storage.local.get('chorus-history', (result) => {
    let history = result['chorus-history'] || [];
    history.push(entry);
    if (history.length > 500) {
      history = history.slice(-500);
    }
    chrome.storage.local.set({ 'chorus-history': history }, () => {
      ChorusState.practiceHistory = history;
    });
  });
}

function loadSRSCards() {
  chrome.storage.local.get('chorus-srs-cards', (result) => {
    if (result['chorus-srs-cards']) {
      ChorusState.srsCards = result['chorus-srs-cards'];
    }
  });
}

function saveSRSCards() {
  chrome.storage.local.set({ 'chorus-srs-cards': ChorusState.srsCards });
}

function loadPracticeQueue() {
  chrome.storage.local.get('chorus-queue', (result) => {
    if (result['chorus-queue']) {
      ChorusState.practiceQueue = result['chorus-queue'];
    }
  });
}

function savePracticeQueue() {
  chrome.storage.local.set({ 'chorus-queue': ChorusState.practiceQueue });
}

// ============================================================================
// SRS SYSTEM (SM-2 Algorithm)
// ============================================================================

function createSRSCard() {
  if (!ChorusState.originalAudioBlob || !ChorusState.capturedSubtitleText) {
    showToast('No audio captured yet!', 'warning');
    return;
  }
  
  const reader = new FileReader();
  reader.onload = () => {
    const card = {
      id: Date.now().toString(),
      videoId: getVideoId(),
      videoTitle: getVideoTitle(),
      text: ChorusState.capturedSubtitleText,
      startTime: ChorusState.capturedStartTime,
      endTime: ChorusState.capturedEndTime,
      audioBase64: reader.result,
      created: Date.now(),
      interval: 1,
      repetition: 0,
      easeFactor: 2.5,
      nextReview: Date.now(),
      lastReview: null
    };
    
    chrome.storage.local.get('chorus-srs-cards', (result) => {
      const existingCards = result['chorus-srs-cards'] || [];
      existingCards.push(card);
      chrome.storage.local.set({ 'chorus-srs-cards': existingCards }, () => {
        ChorusState.srsCards = existingCards;
        showToast('Added to flashcards! 📚', 'success');
        updateSRSBadge();
      });
    });
  };
  
  reader.readAsDataURL(ChorusState.originalAudioBlob);
}

function reviewSRSCard(cardId, quality) {
  const card = ChorusState.srsCards.find(c => c.id === cardId);
  if (!card) return;
  
  if (quality >= 3) {
    if (card.repetition === 0) {
      card.interval = 1;
    } else if (card.repetition === 1) {
      card.interval = 6;
    } else {
      card.interval = Math.round(card.interval * card.easeFactor);
    }
    card.repetition++;
  } else {
    card.repetition = 0;
    card.interval = 1;
  }
  
  card.easeFactor = Math.max(1.3, card.easeFactor + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02)));
  card.lastReview = Date.now();
  card.nextReview = Date.now() + (card.interval * 24 * 60 * 60 * 1000);
  
  saveSRSCards();
  updateSRSBadge();
}

function getDueCards() {
  const now = Date.now();
  return ChorusState.srsCards.filter(card => card.nextReview <= now);
}

function updateSRSBadge() {
  const dueCount = getDueCards().length;
  const badge = document.getElementById('chorus-srs-badge');
  if (badge) {
    if (dueCount > 0) {
      badge.setAttribute('data-badge', dueCount);
      badge.classList.add('has-badge');
    } else {
      badge.classList.remove('has-badge');
    }
  }
}

// ============================================================================
// SRS REVIEW MODE
// ============================================================================

function startSRSReviewMode(dueCards) {
  if (!dueCards || dueCards.length === 0) {
    showToast('No cards due for review!', 'warning');
    return;
  }
  
  ChorusState.dueCardQueue = dueCards;
  ChorusState.currentDueIndex = 0;
  ChorusState.isReviewingCard = true;
  
  openStudioWithSRSCard(dueCards[0]);
}

async function openStudioWithSRSCard(card) {
  if (!card || !card.audioBase64) {
    showToast('Card has no audio data!', 'error');
    return;
  }
  
  ChorusState.currentSRSCard = card;
  ChorusState.isReviewingCard = true;
  
  try {
    const response = await fetch(card.audioBase64);
    const blob = await response.blob();
    
    ChorusState.originalAudioBlob = blob;
    ChorusState.originalAudioUrl = URL.createObjectURL(blob);
    ChorusState.capturedStartTime = card.startTime;
    ChorusState.capturedEndTime = card.endTime;
    ChorusState.capturedSubtitleText = card.text;
    
    if (ChorusState.userAudioUrl) URL.revokeObjectURL(ChorusState.userAudioUrl);
    ChorusState.userAudioBlob = null;
    ChorusState.userAudioUrl = null;
    ChorusState.userAudioBuffer = null;
    ChorusState.lastScore = null;
    
    const audioCtx = getAudioContext();
    const arrayBuffer = await blob.arrayBuffer();
    ChorusState.originalAudioBuffer = await audioCtx.decodeAudioData(arrayBuffer);
    
    showStudio();
    document.getElementById('studio-time-range').textContent = 
      `${formatTime(card.startTime)} - ${formatTime(card.endTime)}`;
    
    renderSRSStudioContent();
    
  } catch (err) {
    console.error('Failed to open SRS card:', err);
    showToast('Failed to load card audio', 'error');
  }
}

function renderSRSStudioContent() {
  const card = ChorusState.currentSRSCard;
  const content = document.getElementById('studio-content');
  
  const progressText = ChorusState.dueCardQueue.length > 0 
    ? `Card ${ChorusState.currentDueIndex + 1} of ${ChorusState.dueCardQueue.length}`
    : 'Single Card Review';
  
  content.innerHTML = `
    <div class="srs-review-header">
      <div class="srs-review-progress">${progressText}</div>
      <div class="srs-review-video">${escapeHtml(card.videoTitle || 'Unknown Video')}</div>
    </div>

    <div class="studio-subtitle-display">
      <div class="studio-subtitle-text">${escapeHtml(card.text)}</div>
      <div class="studio-subtitle-time">${formatTime(card.startTime)} - ${formatTime(card.endTime)}</div>
    </div>

    <div class="score-display" id="score-display">
      <div class="score-circle" style="--score: 0">
        <span class="score-value" id="score-value">--</span>
      </div>
      <div class="score-details">
        <div class="score-label">Similarity Score</div>
        <div class="score-feedback" id="score-feedback">Record to get your score!</div>
      </div>
    </div>

    <div class="audio-track">
      <div class="track-header">
        <div class="track-label original">
          <span class="track-dot original"></span>
          Target Audio
        </div>
        <div class="track-controls">
          <div class="viz-tabs" data-track="original">
            <button class="viz-tab active" data-viz="waveform">Wave</button>
            <button class="viz-tab" data-viz="spectrogram">Spec</button>
            <button class="viz-tab" data-viz="pitch">Pitch</button>
            <button class="viz-tab" data-viz="overlay">Compare</button>
          </div>
          <button class="track-btn" id="play-original" title="Play">▶</button>
        </div>
      </div>
      <div class="visualization-container" id="viz-original">
        <canvas id="canvas-original"></canvas>
        <div class="playhead" id="playhead-original" style="left: 0"></div>
      </div>
    </div>

    <div class="audio-track">
      <div class="track-header">
        <div class="track-label user">
          <span class="track-dot user"></span>
          Your Recording
        </div>
        <div class="track-controls">
          <div class="viz-tabs" data-track="user">
            <button class="viz-tab active" data-viz="waveform">Wave</button>
            <button class="viz-tab" data-viz="spectrogram">Spec</button>
            <button class="viz-tab" data-viz="pitch">Pitch</button>
          </div>
          <button class="track-btn" id="play-user" title="Play" disabled>▶</button>
        </div>
      </div>
      <div class="visualization-container" id="viz-user">
        <div class="visualization-placeholder">Record to see visualization</div>
        <canvas id="canvas-user" style="display:none"></canvas>
        <div class="playhead" id="playhead-user" style="left: 0; display: none"></div>
      </div>
    </div>

    <div class="playback-controls">
      <div class="control-group">
        <span class="control-label">Speed</span>
        <div class="control-group-row">
          <button class="speed-btn" data-speed="0.5">0.5×</button>
          <button class="speed-btn" data-speed="0.75">0.75×</button>
          <button class="speed-btn active" data-speed="1">1×</button>
          <button class="speed-btn" data-speed="1.25">1.25×</button>
        </div>
      </div>
      
      <div class="control-group">
        <span class="control-label">Listen</span>
        <div class="control-group-row">
          <button class="listen-btn active" data-listen="1">1×</button>
          <button class="listen-btn" data-listen="2">2×</button>
          <button class="listen-btn" data-listen="3">3×</button>
        </div>
      </div>
      
      <div class="record-btn-container">
        <button class="record-btn" id="studio-record-btn">
          <div class="record-btn-inner"></div>
        </button>
        <span class="record-label" id="record-label">Record</span>
      </div>

      <div class="control-group">
        <span class="control-label">Compare</span>
        <button class="compare-btn" id="compare-btn" disabled>🔄 A/B</button>
      </div>

      <div class="control-group">
        <span class="control-label">Loop</span>
        <button class="loop-btn" id="loop-btn" title="Loop">🔁</button>
      </div>
    </div>

    <div class="srs-rating-section" id="srs-rating-section">
      <div class="srs-rating-label">How well did you do?</div>
      <div class="srs-rating-buttons">
        <button class="srs-rate-btn again" data-quality="0">
          <span class="rate-emoji">😓</span>
          <span class="rate-text">Again</span>
          <span class="rate-interval">1d</span>
        </button>
        <button class="srs-rate-btn hard" data-quality="3">
          <span class="rate-emoji">😐</span>
          <span class="rate-text">Hard</span>
          <span class="rate-interval">${Math.max(1, Math.round((card.interval || 1) * 1.2))}d</span>
        </button>
        <button class="srs-rate-btn good" data-quality="4">
          <span class="rate-emoji">😊</span>
          <span class="rate-text">Good</span>
          <span class="rate-interval">${Math.round((card.interval || 1) * (card.easeFactor || 2.5))}d</span>
        </button>
        <button class="srs-rate-btn easy" data-quality="5">
          <span class="rate-emoji">🌟</span>
          <span class="rate-text">Easy</span>
          <span class="rate-interval">${Math.round((card.interval || 1) * (card.easeFactor || 2.5) * 1.3)}d</span>
        </button>
      </div>
    </div>
  `;

  setupSRSStudioEvents();
  renderWaveform(ChorusState.originalAudioBlob, 'canvas-original', '#4ade80');
}

function setupSRSStudioEvents() {
  const originalAudio = new Audio(ChorusState.originalAudioUrl);
  const playOriginalBtn = document.getElementById('play-original');
  const vizOriginal = document.getElementById('viz-original');
  const playheadOriginal = document.getElementById('playhead-original');
  
  let animFrameOriginal;
  
  function updatePlayheadOriginal() {
    if (originalAudio.paused || originalAudio.ended) return;
    const progress = originalAudio.currentTime / originalAudio.duration;
    playheadOriginal.style.left = `${progress * vizOriginal.clientWidth}px`;
    animFrameOriginal = requestAnimationFrame(updatePlayheadOriginal);
  }
  
  playOriginalBtn.addEventListener('click', () => {
    if (originalAudio.paused) {
      originalAudio.playbackRate = ChorusState.playbackSpeed;
      originalAudio.play();
      playOriginalBtn.classList.add('playing');
      playOriginalBtn.textContent = '⏸';
      updatePlayheadOriginal();
    } else {
      originalAudio.pause();
      playOriginalBtn.classList.remove('playing');
      playOriginalBtn.textContent = '▶';
      cancelAnimationFrame(animFrameOriginal);
    }
  });

  originalAudio.addEventListener('ended', () => {
    playOriginalBtn.classList.remove('playing');
    playOriginalBtn.textContent = '▶';
    cancelAnimationFrame(animFrameOriginal);
    playheadOriginal.style.left = '0';
    
    if (ChorusState.isLooping) {
      originalAudio.currentTime = 0;
      originalAudio.play();
      playOriginalBtn.classList.add('playing');
      playOriginalBtn.textContent = '⏸';
      updatePlayheadOriginal();
    }
  });

  vizOriginal.addEventListener('click', (e) => {
    const rect = vizOriginal.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const progress = x / rect.width;
    originalAudio.currentTime = progress * originalAudio.duration;
    playheadOriginal.style.left = `${x}px`;
  });

  document.querySelectorAll('.speed-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.speed-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      ChorusState.playbackSpeed = parseFloat(btn.dataset.speed);
      originalAudio.playbackRate = ChorusState.playbackSpeed;
    });
  });

  document.querySelectorAll('.listen-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.listen-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      ChorusState.listenCount = parseInt(btn.dataset.listen);
    });
  });

  document.getElementById('loop-btn').addEventListener('click', (e) => {
    ChorusState.isLooping = !ChorusState.isLooping;
    e.currentTarget.classList.toggle('active', ChorusState.isLooping);
  });

  document.getElementById('studio-record-btn').addEventListener('click', toggleRecording);
  document.getElementById('compare-btn').addEventListener('click', playComparison);

  document.querySelectorAll('.viz-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      const track = tab.closest('.viz-tabs').dataset.track;
      const vizType = tab.dataset.viz;
      
      tab.parentElement.querySelectorAll('.viz-tab').forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      
      const blob = track === 'original' ? ChorusState.originalAudioBlob : ChorusState.userAudioBlob;
      const canvasId = track === 'original' ? 'canvas-original' : 'canvas-user';
      const color = track === 'original' ? '#4ade80' : '#818cf8';
      
      if (blob) {
        if (vizType === 'waveform') renderWaveform(blob, canvasId, color);
        else if (vizType === 'spectrogram') renderSpectrogram(blob, canvasId);
        else if (vizType === 'pitch') renderPitchContour(blob, canvasId, color);
        else if (vizType === 'overlay') renderPitchOverlay();
      }
    });
  });

  document.querySelectorAll('.srs-rate-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const quality = parseInt(btn.dataset.quality);
      handleSRSRating(ChorusState.currentSRSCard.id, quality);
    });
  });

  setupScrubbing(vizOriginal, originalAudio);
}

function handleSRSRating(cardId, quality) {
  chrome.storage.local.get('chorus-srs-cards', (result) => {
    const cards = result['chorus-srs-cards'] || [];
    const cardIndex = cards.findIndex(c => c.id === cardId);
    
    if (cardIndex === -1) {
      showToast('Card not found!', 'error');
      return;
    }
    
    const card = cards[cardIndex];
    
    if (quality >= 3) {
      if (card.repetition === 0) {
        card.interval = 1;
      } else if (card.repetition === 1) {
        card.interval = 6;
      } else {
        card.interval = Math.round(card.interval * card.easeFactor);
      }
      card.repetition++;
    } else {
      card.repetition = 0;
      card.interval = 1;
    }
    
    card.easeFactor = Math.max(1.3, card.easeFactor + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02)));
    card.lastReview = Date.now();
    card.nextReview = Date.now() + (card.interval * 24 * 60 * 60 * 1000);
    
    cards[cardIndex] = card;
    
    chrome.storage.local.set({ 'chorus-srs-cards': cards }, () => {
      const qualityLabels = ['Again', '', '', 'Hard', 'Good', 'Easy'];
      showToast(`Rated "${qualityLabels[quality]}" - Next review in ${card.interval} day${card.interval > 1 ? 's' : ''}`, 'success');
      
      if (ChorusState.dueCardQueue.length > 0) {
        ChorusState.currentDueIndex++;
        
        if (ChorusState.currentDueIndex < ChorusState.dueCardQueue.length) {
          const nextCard = ChorusState.dueCardQueue[ChorusState.currentDueIndex];
          openStudioWithSRSCard(nextCard);
        } else {
          showToast('🎉 Review session complete!', 'success');
          closeSRSReview();
        }
      } else {
        closeSRSReview();
      }
    });
  });
}

function closeSRSReview() {
  ChorusState.currentSRSCard = null;
  ChorusState.isReviewingCard = false;
  ChorusState.dueCardQueue = [];
  ChorusState.currentDueIndex = 0;
  closeStudio();
}

// ============================================================================
// VIDEO LAYOUT MANAGEMENT
// ============================================================================

function storeOriginalVideoStyles() {
  const video = document.querySelector('.html5-main-video');
  if (video && !ChorusState.originalVideoStyles) {
    ChorusState.originalVideoStyles = {
      width: video.style.width || '',
      left: video.style.left || '',
      top: video.style.top || '',
      objectFit: video.style.objectFit || '',
    };
  }
}

function applyVideoLayout(panelWidth) {
  const video = document.querySelector('.html5-main-video');
  const player = document.querySelector('#movie_player') || document.querySelector('.html5-video-player');
  
  const gap = 8;
  const totalOffset = panelWidth + gap;
  
  if (video) {
    storeOriginalVideoStyles();
    video.style.width = `calc(100% - ${totalOffset}px)`;
    video.style.left = `${totalOffset}px`;
    video.style.top = '0';
    video.style.objectFit = 'contain';
  }
  
  if (player) {
    player.classList.add('chorus-controls-shifted');
    player.style.setProperty('--chorus-panel-width', `${totalOffset}px`);
  }
}

function restoreVideoLayout() {
  const video = document.querySelector('.html5-main-video');
  const player = document.querySelector('#movie_player') || document.querySelector('.html5-video-player');
  
  if (video && ChorusState.originalVideoStyles) {
    video.style.width = ChorusState.originalVideoStyles.width;
    video.style.left = ChorusState.originalVideoStyles.left;
    video.style.top = ChorusState.originalVideoStyles.top;
    video.style.objectFit = ChorusState.originalVideoStyles.objectFit;
  } else if (video) {
    video.style.width = '';
    video.style.left = '';
    video.style.top = '';
    video.style.objectFit = '';
  }
  
  if (player) {
    player.classList.remove('chorus-controls-shifted');
    player.style.removeProperty('--chorus-panel-width');
  }
}

// ============================================================================
// PANEL CREATION
// ============================================================================

function injectStyles() {
  if (document.getElementById('chorus-styles')) return;
  
  const style = document.createElement('style');
  style.id = 'chorus-styles';
  style.textContent = CHORUS_STYLES;
  document.head.appendChild(style);
}

function createPanel() {
  if (document.getElementById('chorus-panel')) return;
  
  const player = document.querySelector('#movie_player') || document.querySelector('.html5-video-player');
  if (!player) {
    console.warn('YouTube player not found');
    return;
  }

  const panel = document.createElement('div');
  panel.id = 'chorus-panel';
  panel.innerHTML = `
    <div class="chorus-header">
      <div class="chorus-brand">
        <div class="chorus-logo">🎵</div>
        <div>
          <div class="chorus-title">Chorus Mode</div>
        </div>
      </div>
      <div class="chorus-header-actions">
        <span class="chorus-hotkey-badge">H</span>
        <button class="chorus-icon-btn" id="chorus-history-btn" title="Practice History">📊</button>
        <button class="chorus-icon-btn" id="chorus-srs-btn" title="Flashcards">📚</button>
        <button class="chorus-icon-btn chorus-close-btn" id="chorus-close" title="Close">×</button>
      </div>
    </div>
    
    <div class="chorus-search-bar">
      <input type="text" id="chorus-search-input" class="chorus-search-input" placeholder="Search subtitles...">
      <span class="chorus-search-icon">🔍</span>
      <span class="chorus-search-count" id="chorus-search-count"></span>
    </div>
    
    <div class="chorus-filter-bar">
      <div style="display: flex; gap: 6px;">
        <button class="chorus-filter-btn" id="chorus-bookmark-filter">⭐ Bookmarks</button>
        <button class="chorus-filter-btn" id="chorus-queue-filter">📋 Queue (<span id="queue-count">0</span>)</button>
      </div>
      <span class="chorus-bookmark-count" id="chorus-bookmark-count"></span>
    </div>
    
    <div class="chorus-queue-bar" id="chorus-queue-bar">
      <div class="chorus-queue-info">
        <span>📋 Queue Mode</span>
        <span class="chorus-queue-progress" id="queue-progress">1/5</span>
      </div>
      <button class="chorus-queue-btn" id="exit-queue-mode">Exit Queue</button>
    </div>
    
    <div class="chorus-subtitle-list" id="chorus-subtitle-list">
      <div class="chorus-empty-state">
        <div class="chorus-loading-spinner"></div>
        <div class="chorus-empty-title">Loading Subtitles</div>
        <div class="chorus-empty-subtitle">Please wait...</div>
      </div>
    </div>
    
    <div class="chorus-footer">
      <div class="chorus-selection-info">
        <div class="chorus-selection-count">
          <span>Selected:</span>
          <span class="chorus-selection-badge" id="chorus-selection-count">0</span>
        </div>
        <span id="chorus-selection-range"></span>
      </div>
      <div class="chorus-footer-actions">
        <button class="chorus-btn chorus-btn-secondary" id="chorus-clear-btn" disabled>Clear</button>
        <button class="chorus-btn chorus-btn-queue" id="chorus-add-queue-btn" disabled>+ Queue</button>
        <button class="chorus-btn chorus-btn-primary" id="chorus-practice-btn" disabled>🎤 Practice</button>
      </div>
    </div>
    
    <div class="chorus-resize-handle" id="chorus-resize-handle"></div>
  `;

  player.appendChild(panel);
  setupPanelEvents();
  updateQueueCount();
  updateSRSBadge();
}

function setupPanelEvents() {
  document.getElementById('chorus-close').addEventListener('click', () => hidePanel());
  document.getElementById('chorus-clear-btn').addEventListener('click', clearSelection);
  document.getElementById('chorus-practice-btn').addEventListener('click', startPractice);
  document.getElementById('chorus-add-queue-btn').addEventListener('click', addToQueue);
  document.getElementById('chorus-bookmark-filter').addEventListener('click', toggleBookmarkFilter);
  document.getElementById('chorus-queue-filter').addEventListener('click', toggleQueueFilter);
  document.getElementById('exit-queue-mode').addEventListener('click', exitQueueMode);
  document.getElementById('chorus-history-btn').addEventListener('click', showHistoryModal);
  document.getElementById('chorus-srs-btn').addEventListener('click', showSRSModal);

  const searchInput = document.getElementById('chorus-search-input');
  searchInput.addEventListener('input', (e) => filterSubtitles(e.target.value));

  const resizeHandle = document.getElementById('chorus-resize-handle');
  let isResizing = false;

  resizeHandle.addEventListener('mousedown', (e) => {
    isResizing = true;
    e.preventDefault();
  });

  document.addEventListener('mousemove', (e) => {
    if (!isResizing) return;
    const panel = document.getElementById('chorus-panel');
    const player = panel.parentElement;
    const playerRect = player.getBoundingClientRect();
    let newWidth = e.clientX - playerRect.left;
    newWidth = Math.max(ChorusState.minPanelWidth, Math.min(ChorusState.maxPanelWidth, newWidth));
    ChorusState.panelWidth = newWidth;
    panel.style.width = `${newWidth}px`;
    applyVideoLayout(newWidth);
  });

  document.addEventListener('mouseup', () => { isResizing = false; });

  const video = document.querySelector('video');
  if (video) {
    video.addEventListener('timeupdate', updateCurrentSubtitle);
  }
}

// ============================================================================
// PANEL VISIBILITY
// ============================================================================

function showPanel() {
  if (ChorusState.isVisible) return;
  
  injectStyles();
  createPanel();
  
  const panel = document.getElementById('chorus-panel');
  if (panel) {
    panel.style.width = `${ChorusState.panelWidth}px`;
    applyVideoLayout(ChorusState.panelWidth);
    requestAnimationFrame(() => panel.classList.add('visible'));
    ChorusState.isVisible = true;
  }
}

function hidePanel() {
  const panel = document.getElementById('chorus-panel');
  if (panel) {
    panel.classList.remove('visible');
    setTimeout(() => restoreVideoLayout(), 250);
    ChorusState.isVisible = false;
  }
}

function togglePanel() {
  if (ChorusState.hotkeyLocked) return;
  ChorusState.hotkeyLocked = true;
  
  if (ChorusState.isVisible) {
    hidePanel();
  } else {
    showPanel();
    loadSubtitles();
  }
  
  setTimeout(() => { ChorusState.hotkeyLocked = false; }, 400);
}

// ============================================================================
// SUBTITLE RENDERING
// ============================================================================

function renderSubtitles(subtitles) {
  ChorusState.subtitles = subtitles;
  const list = document.getElementById('chorus-subtitle-list');
  if (!list) return;

  const searchInput = document.getElementById('chorus-search-input');
  const searchCount = document.getElementById('chorus-search-count');
  if (searchInput) searchInput.value = '';
  if (searchCount) searchCount.textContent = '';

  ChorusState.showingBookmarksOnly = false;
  const bookmarkFilterBtn = document.getElementById('chorus-bookmark-filter');
  if (bookmarkFilterBtn) {
    bookmarkFilterBtn.classList.remove('active');
    bookmarkFilterBtn.textContent = '⭐ Bookmarks';
  }

  if (!subtitles || subtitles.length === 0) {
    list.innerHTML = `
      <div class="chorus-empty-state">
        <div class="chorus-empty-icon">📭</div>
        <div class="chorus-empty-title">No Subtitles Available</div>
        <div class="chorus-empty-subtitle">This video doesn't have subtitles, or they haven't loaded yet.</div>
      </div>
    `;
    return;
  }

  list.innerHTML = '';
  
  subtitles.forEach((sub, index) => {
    const tile = document.createElement('div');
    tile.className = 'chorus-tile';
    tile.dataset.index = index;
    tile.dataset.startTime = sub.startTime;
    tile.dataset.endTime = sub.endTime;
    
    const duration = formatDuration(sub.startTime, sub.endTime);
    const bookmarked = isBookmarked(index);
    const inQueue = isInQueue(index);
    
    if (bookmarked) tile.classList.add('bookmarked');
    if (inQueue) tile.classList.add('in-queue');
    
    tile.innerHTML = `
      <button class="chorus-bookmark-btn ${bookmarked ? 'bookmarked' : ''}" title="Bookmark">
        ${bookmarked ? '★' : '☆'}
      </button>
      <span class="chorus-tile-index">#${index + 1}</span>
      <div class="chorus-tile-text">${sub.text}</div>
      <div class="chorus-tile-meta">
        <span class="chorus-tile-time" data-time="${sub.startTime}">
          ${formatTime(sub.startTime)} → ${formatTime(sub.endTime)}
        </span>
        <span class="chorus-tile-duration">${duration}</span>
      </div>
    `;

    tile.addEventListener('click', (e) => {
      if (e.target.classList.contains('chorus-tile-time')) return;
      if (e.target.classList.contains('chorus-bookmark-btn')) return;
      handleTileClick(index);
    });

    const bookmarkBtn = tile.querySelector('.chorus-bookmark-btn');
    bookmarkBtn.addEventListener('click', (e) => toggleBookmark(index, e));

    const timeEl = tile.querySelector('.chorus-tile-time');
    timeEl.addEventListener('click', (e) => {
      e.stopPropagation();
      seekToTime(sub.startTime);
    });

    list.appendChild(tile);
  });
  
  updateBookmarkCount();
  updateQueueCount();
}

function updateCurrentSubtitle() {
  const video = document.querySelector('video');
  if (!video || !ChorusState.subtitles.length) return;

  const currentTime = video.currentTime;
  let newIndex = -1;

  for (let i = 0; i < ChorusState.subtitles.length; i++) {
    const sub = ChorusState.subtitles[i];
    const nextSub = ChorusState.subtitles[i + 1];

    if (currentTime >= sub.startTime) {
      if (nextSub) {
        if (currentTime < nextSub.startTime) {
          newIndex = i;
          break;
        }
      } else {
        newIndex = i;
        break;
      }
    }
  }

  if (newIndex !== ChorusState.currentIndex) {
    if (ChorusState.currentIndex >= 0) {
      const prevTile = document.querySelector(`.chorus-tile[data-index="${ChorusState.currentIndex}"]`);
      if (prevTile) prevTile.classList.remove('current');
    }

    ChorusState.currentIndex = newIndex;
    if (newIndex >= 0) {
      const currentTile = document.querySelector(`.chorus-tile[data-index="${newIndex}"]`);
      if (currentTile) {
        currentTile.classList.add('current');
        currentTile.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }
  }
}

function seekToTime(seconds) {
  const video = document.querySelector('video');
  if (video) video.currentTime = seconds;
}

// ============================================================================
// SELECTION & FILTERING
// ============================================================================

function handleTileClick(index) {
  if (ChorusState.selectedIndices.size === 0) {
    ChorusState.selectedIndices.add(index);
    ChorusState.selectionAnchor = index;
  } else if (ChorusState.selectedIndices.has(index)) {
    ChorusState.selectedIndices.clear();
    ChorusState.selectionAnchor = null;
  } else {
    const currentIndices = Array.from(ChorusState.selectedIndices).sort((a, b) => a - b);
    const min = Math.min(...currentIndices, index);
    const max = Math.max(...currentIndices, index);
    ChorusState.selectedIndices.clear();
    for (let i = min; i <= max; i++) {
      ChorusState.selectedIndices.add(i);
    }
  }
  updateSelectionUI();
}

function updateSelectionUI() {
  document.querySelectorAll('.chorus-tile').forEach(tile => {
    const index = parseInt(tile.dataset.index);
    tile.classList.toggle('selected', ChorusState.selectedIndices.has(index));
  });

  const countEl = document.getElementById('chorus-selection-count');
  const rangeEl = document.getElementById('chorus-selection-range');
  const clearBtn = document.getElementById('chorus-clear-btn');
  const practiceBtn = document.getElementById('chorus-practice-btn');
  const queueBtn = document.getElementById('chorus-add-queue-btn');
  
  const count = ChorusState.selectedIndices.size;
  countEl.textContent = count;
  
  if (count > 0) {
    const indices = Array.from(ChorusState.selectedIndices).sort((a, b) => a - b);
    const first = ChorusState.subtitles[indices[0]];
    const last = ChorusState.subtitles[indices[indices.length - 1]];
    rangeEl.textContent = `${formatTime(first.startTime)} - ${formatTime(last.endTime)}`;
    clearBtn.disabled = false;
    practiceBtn.disabled = false;
    queueBtn.disabled = false;
  } else {
    rangeEl.textContent = '';
    clearBtn.disabled = true;
    practiceBtn.disabled = true;
    queueBtn.disabled = true;
  }
}

function clearSelection() {
  ChorusState.selectedIndices.clear();
  ChorusState.selectionAnchor = null;
  updateSelectionUI();
}

function filterSubtitles(query) {
  const tiles = document.querySelectorAll('.chorus-tile');
  const searchCount = document.getElementById('chorus-search-count');
  const normalizedQuery = query.toLowerCase().trim();
  
  if (!normalizedQuery) {
    tiles.forEach(tile => {
      tile.style.display = '';
      tile.classList.remove('search-highlight');
    });
    searchCount.textContent = '';
    return;
  }
  
  let matchCount = 0;
  tiles.forEach(tile => {
    const text = tile.querySelector('.chorus-tile-text').textContent.toLowerCase();
    if (text.includes(normalizedQuery)) {
      tile.style.display = '';
      tile.classList.add('search-highlight');
      matchCount++;
    } else {
      tile.style.display = 'none';
      tile.classList.remove('search-highlight');
    }
  });
  
  searchCount.textContent = `${matchCount} found`;
}

// ============================================================================
// BOOKMARKS
// ============================================================================

function toggleBookmark(index, event) {
  event.stopPropagation();
  
  const videoId = getVideoId();
  if (!ChorusState.bookmarks[videoId]) {
    ChorusState.bookmarks[videoId] = new Set();
  }
  
  const bookmarks = ChorusState.bookmarks[videoId];
  const tile = document.querySelector(`.chorus-tile[data-index="${index}"]`);
  const btn = tile.querySelector('.chorus-bookmark-btn');
  
  if (bookmarks.has(index)) {
    bookmarks.delete(index);
    tile.classList.remove('bookmarked');
    btn.classList.remove('bookmarked');
    btn.textContent = '☆';
  } else {
    bookmarks.add(index);
    tile.classList.add('bookmarked');
    btn.classList.add('bookmarked');
    btn.textContent = '★';
  }
  
  saveBookmarks();
  updateBookmarkCount();
}

function isBookmarked(index) {
  const videoId = getVideoId();
  return ChorusState.bookmarks[videoId]?.has(index) || false;
}

function updateBookmarkCount() {
  const videoId = getVideoId();
  const count = ChorusState.bookmarks[videoId]?.size || 0;
  const countEl = document.getElementById('chorus-bookmark-count');
  if (countEl) countEl.textContent = count > 0 ? `${count} saved` : '';
}

function toggleBookmarkFilter() {
  ChorusState.showingBookmarksOnly = !ChorusState.showingBookmarksOnly;
  const btn = document.getElementById('chorus-bookmark-filter');
  const videoId = getVideoId();
  const bookmarks = ChorusState.bookmarks[videoId] || new Set();
  
  if (ChorusState.showingBookmarksOnly) {
    btn.classList.add('active');
    btn.textContent = '★ Bookmarks';
    document.querySelectorAll('.chorus-tile').forEach(tile => {
      const index = parseInt(tile.dataset.index);
      tile.style.display = bookmarks.has(index) ? '' : 'none';
    });
  } else {
    btn.classList.remove('active');
    btn.textContent = '⭐ Bookmarks';
    document.querySelectorAll('.chorus-tile').forEach(tile => {
      tile.style.display = '';
    });
  }
}

// ============================================================================
// PRACTICE QUEUE
// ============================================================================

function addToQueue() {
  if (ChorusState.selectedIndices.size === 0) return;
  
  const videoId = getVideoId();
  const indices = Array.from(ChorusState.selectedIndices).sort((a, b) => a - b);
  
  indices.forEach(index => {
    const sub = ChorusState.subtitles[index];
    if (!isInQueue(index)) {
      ChorusState.practiceQueue.push({
        videoId,
        subtitleIndex: index,
        text: sub.text,
        startTime: sub.startTime,
        endTime: sub.endTime
      });
    }
  });
  
  savePracticeQueue();
  updateQueueCount();
  
  document.querySelectorAll('.chorus-tile').forEach(tile => {
    const idx = parseInt(tile.dataset.index);
    if (ChorusState.selectedIndices.has(idx)) {
      tile.classList.add('in-queue');
    }
  });
  
  clearSelection();
  showToast(`Added ${indices.length} to queue!`, 'success');
}

function isInQueue(index) {
  const videoId = getVideoId();
  return ChorusState.practiceQueue.some(item => 
    item.videoId === videoId && item.subtitleIndex === index
  );
}

function updateQueueCount() {
  const countEl = document.getElementById('queue-count');
  if (countEl) countEl.textContent = ChorusState.practiceQueue.length;
}

function toggleQueueFilter() {
  const videoId = getVideoId();
  const queueIndices = new Set(
    ChorusState.practiceQueue
      .filter(item => item.videoId === videoId)
      .map(item => item.subtitleIndex)
  );
  
  const btn = document.getElementById('chorus-queue-filter');
  const isActive = btn.classList.toggle('active');
  
  document.querySelectorAll('.chorus-tile').forEach(tile => {
    const index = parseInt(tile.dataset.index);
    if (isActive) {
      tile.style.display = queueIndices.has(index) ? '' : 'none';
    } else {
      tile.style.display = '';
    }
  });
}

function startQueueMode() {
  if (ChorusState.practiceQueue.length === 0) {
    showToast('Queue is empty!', 'warning');
    return;
  }
  
  ChorusState.isQueueMode = true;
  ChorusState.currentQueueIndex = 0;
  
  document.getElementById('chorus-queue-bar').classList.add('active');
  updateQueueProgress();
  practiceQueueItem(0);
}

function exitQueueMode() {
  ChorusState.isQueueMode = false;
  document.getElementById('chorus-queue-bar').classList.remove('active');
  closeStudio();
}

function updateQueueProgress() {
  const progressEl = document.getElementById('queue-progress');
  if (progressEl) {
    progressEl.textContent = `${ChorusState.currentQueueIndex + 1}/${ChorusState.practiceQueue.length}`;
  }
}

function practiceQueueItem(index) {
  if (index >= ChorusState.practiceQueue.length) {
    showToast('Queue complete! 🎉', 'success');
    exitQueueMode();
    return;
  }
  
  const item = ChorusState.practiceQueue[index];
  ChorusState.currentQueueIndex = index;
  updateQueueProgress();
  
  if (item.videoId !== getVideoId()) {
    showToast('This item is from a different video', 'warning');
    return;
  }
  
  ChorusState.selectedIndices.clear();
  ChorusState.selectedIndices.add(item.subtitleIndex);
  updateSelectionUI();
  startPractice();
}

function nextQueueItem() {
  practiceQueueItem(ChorusState.currentQueueIndex + 1);
}

function prevQueueItem() {
  if (ChorusState.currentQueueIndex > 0) {
    practiceQueueItem(ChorusState.currentQueueIndex - 1);
  }
}

// ============================================================================
// STUDIO MODE
// ============================================================================

function createStudioOverlay() {
  if (document.getElementById('chorus-studio-overlay')) return;

  const overlay = document.createElement('div');
  overlay.id = 'chorus-studio-overlay';
  overlay.innerHTML = `
    <div id="chorus-studio-modal">
      <div class="studio-header">
        <div class="studio-title-group">
          <div class="studio-icon">🎙️</div>
          <div>
            <div class="studio-title">Practice Studio</div>
            <div class="studio-subtitle" id="studio-time-range">--:-- - --:--</div>
          </div>
        </div>
        <div class="studio-header-actions">
          <button class="srs-btn" id="studio-add-srs">📚 Add to Cards</button>
          <button class="studio-close-btn" id="studio-close">×</button>
        </div>
      </div>
      <div class="studio-content" id="studio-content">
        <div class="capture-loading">
          <div class="capture-spinner"></div>
          <div class="capture-title">Capturing Audio</div>
          <div class="capture-subtitle">Playing segment and recording...</div>
        </div>
      </div>
    </div>
    
    <div class="countdown-overlay" id="countdown-overlay">
      <div class="countdown-number" id="countdown-number">3</div>
      <div class="countdown-label">Get Ready</div>
      <div class="countdown-listen-label" id="countdown-listen-label"></div>
    </div>
  `;

  document.body.appendChild(overlay);
  document.getElementById('studio-close').addEventListener('click', closeStudio);
  document.getElementById('studio-add-srs').addEventListener('click', createSRSCard);
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) closeStudio();
  });
}

function showStudio() {
  createStudioOverlay();
  const overlay = document.getElementById('chorus-studio-overlay');
  requestAnimationFrame(() => overlay.classList.add('visible'));
  ChorusState.isStudioOpen = true;
}

function closeStudio() {
  const overlay = document.getElementById('chorus-studio-overlay');
  if (overlay) overlay.classList.remove('visible');
  ChorusState.isStudioOpen = false;
  
  if (ChorusState.originalAudioUrl) {
    URL.revokeObjectURL(ChorusState.originalAudioUrl);
    ChorusState.originalAudioUrl = null;
  }
  if (ChorusState.userAudioUrl) {
    URL.revokeObjectURL(ChorusState.userAudioUrl);
    ChorusState.userAudioUrl = null;
  }
  if (ChorusState.recordingStream) {
    ChorusState.recordingStream.getTracks().forEach(t => t.stop());
    ChorusState.recordingStream = null;
  }
}

async function startPractice() {
  if (ChorusState.selectedIndices.size === 0) return;

  const indices = Array.from(ChorusState.selectedIndices).sort((a, b) => a - b);
  const firstSub = ChorusState.subtitles[indices[0]];
  const lastSub = ChorusState.subtitles[indices[indices.length - 1]];
  
  ChorusState.capturedStartTime = firstSub.startTime;
  ChorusState.capturedEndTime = lastSub.endTime;
  ChorusState.capturedSubtitleText = indices.map(i => ChorusState.subtitles[i].text).join(' ');

  if (ChorusState.originalAudioUrl) URL.revokeObjectURL(ChorusState.originalAudioUrl);
  if (ChorusState.userAudioUrl) URL.revokeObjectURL(ChorusState.userAudioUrl);
  ChorusState.userAudioBlob = null;
  ChorusState.userAudioUrl = null;
  ChorusState.userAudioBuffer = null;
  ChorusState.lastScore = null;

  showStudio();
  document.getElementById('studio-time-range').textContent = 
    `${formatTime(ChorusState.capturedStartTime)} - ${formatTime(ChorusState.capturedEndTime)}`;

  const content = document.getElementById('studio-content');
  content.innerHTML = `
    <div class="capture-loading">
      <div class="capture-spinner"></div>
      <div class="capture-title">Capturing Audio</div>
      <div class="capture-subtitle">Playing segment and recording...</div>
    </div>
  `;

  try {
    const blob = await captureAudioFromVideo(ChorusState.capturedStartTime, ChorusState.capturedEndTime);
    ChorusState.originalAudioBlob = blob;
    ChorusState.originalAudioUrl = URL.createObjectURL(blob);
    
    const audioCtx = getAudioContext();
    const arrayBuffer = await blob.arrayBuffer();
    ChorusState.originalAudioBuffer = await audioCtx.decodeAudioData(arrayBuffer);
    
    renderStudioContent();
  } catch (err) {
    console.error('Audio capture failed:', err);
    showToast('Failed to capture audio', 'error');
    closeStudio();
  }
}

async function captureAudioFromVideo(startTime, endTime) {
  const video = document.querySelector('video');
  const duration = (endTime - startTime) * 1000;

  video.currentTime = startTime;
  await new Promise(resolve => {
    const onSeek = () => { video.removeEventListener('seeked', onSeek); resolve(); };
    video.addEventListener('seeked', onSeek);
  });

  let stream;
  if (video.captureStream) stream = video.captureStream();
  else if (video.mozCaptureStream) stream = video.mozCaptureStream();
  else throw new Error('captureStream not supported');

  const mediaRecorder = new MediaRecorder(stream);
  const chunks = [];

  return new Promise((resolve, reject) => {
    mediaRecorder.ondataavailable = (e) => { if (e.data.size > 0) chunks.push(e.data); };
    mediaRecorder.onstop = () => resolve(new Blob(chunks, { type: 'audio/webm' }));
    mediaRecorder.onerror = reject;
    mediaRecorder.start();
    video.play();
    setTimeout(() => { mediaRecorder.stop(); video.pause(); }, duration + 200);
  });
}

function renderStudioContent() {
  const content = document.getElementById('studio-content');
  
  content.innerHTML = `
    <div class="studio-subtitle-display">
      <div class="studio-subtitle-text">${ChorusState.capturedSubtitleText}</div>
      <div class="studio-subtitle-time">${formatTime(ChorusState.capturedStartTime)} - ${formatTime(ChorusState.capturedEndTime)}</div>
    </div>

    <div class="score-display" id="score-display">
      <div class="score-circle" style="--score: 0">
        <span class="score-value" id="score-value">--</span>
      </div>
      <div class="score-details">
        <div class="score-label">Similarity Score</div>
        <div class="score-feedback" id="score-feedback">Record to get your score!</div>
      </div>
    </div>

    <div class="audio-track">
      <div class="track-header">
        <div class="track-label original">
          <span class="track-dot original"></span>
          Target Audio
        </div>
        <div class="track-controls">
          <div class="viz-tabs" data-track="original">
            <button class="viz-tab active" data-viz="waveform">Wave</button>
            <button class="viz-tab" data-viz="spectrogram">Spec</button>
            <button class="viz-tab" data-viz="pitch">Pitch</button>
            <button class="viz-tab" data-viz="overlay">Compare</button>
          </div>
          <button class="track-btn" id="download-original" title="Download">⬇</button>
          <button class="track-btn" id="play-original" title="Play">▶</button>
        </div>
      </div>
      <div class="visualization-container" id="viz-original">
        <canvas id="canvas-original"></canvas>
        <div class="playhead" id="playhead-original" style="left: 0"></div>
        <div class="ab-loop-region" id="ab-region"></div>
        <div class="ab-handle start" id="ab-handle-start"></div>
        <div class="ab-handle end" id="ab-handle-end"></div>
      </div>
    </div>

    <div class="audio-track">
      <div class="track-header">
        <div class="track-label user">
          <span class="track-dot user"></span>
          Your Recording
        </div>
        <div class="track-controls">
          <div class="viz-tabs" data-track="user">
            <button class="viz-tab active" data-viz="waveform">Wave</button>
            <button class="viz-tab" data-viz="spectrogram">Spec</button>
            <button class="viz-tab" data-viz="pitch">Pitch</button>
          </div>
          <button class="track-btn" id="download-user" title="Download" disabled>⬇</button>
          <button class="track-btn" id="play-user" title="Play" disabled>▶</button>
        </div>
      </div>
      <div class="visualization-container" id="viz-user">
        <div class="visualization-placeholder">Record to see visualization</div>
        <canvas id="canvas-user" style="display:none"></canvas>
        <div class="playhead" id="playhead-user" style="left: 0; display: none"></div>
      </div>
    </div>

    <div class="playback-controls">
      <div class="control-group">
        <span class="control-label">Speed</span>
        <div class="control-group-row">
          <button class="speed-btn" data-speed="0.5">0.5×</button>
          <button class="speed-btn" data-speed="0.75">0.75×</button>
          <button class="speed-btn active" data-speed="1">1×</button>
          <button class="speed-btn" data-speed="1.25">1.25×</button>
        </div>
      </div>
      
      <div class="control-group">
        <span class="control-label">Listen</span>
        <div class="control-group-row">
          <button class="listen-btn active" data-listen="1">1×</button>
          <button class="listen-btn" data-listen="2">2×</button>
          <button class="listen-btn" data-listen="3">3×</button>
        </div>
      </div>
      
      <div class="record-btn-container">
        <button class="record-btn" id="studio-record-btn">
          <div class="record-btn-inner"></div>
        </button>
        <span class="record-label" id="record-label">Record</span>
      </div>

      <div class="control-group">
        <span class="control-label">Compare</span>
        <button class="compare-btn" id="compare-btn" disabled>🔄 A/B</button>
      </div>

      <div class="control-group">
        <span class="control-label">Loop</span>
        <div class="control-group-row">
          <button class="loop-btn" id="loop-btn" title="Loop">🔁</button>
          <button class="ab-loop-btn" id="ab-loop-btn" title="A-B Loop">AB</button>
        </div>
      </div>
    </div>
    
    <div class="queue-mode-header ${ChorusState.isQueueMode ? 'active' : ''}" id="studio-queue-nav">
      <div class="queue-mode-info">
        <span class="queue-mode-progress" id="studio-queue-progress">${ChorusState.currentQueueIndex + 1}/${ChorusState.practiceQueue.length}</span>
      </div>
      <div class="queue-mode-nav">
        <button class="queue-nav-btn" id="queue-prev" ${ChorusState.currentQueueIndex === 0 ? 'disabled' : ''}>← Prev</button>
        <button class="queue-nav-btn" id="queue-next">Next →</button>
      </div>
    </div>
  `;

  setupStudioEvents();
  renderWaveform(ChorusState.originalAudioBlob, 'canvas-original', '#4ade80');
}

function setupStudioEvents() {
  const originalAudio = new Audio(ChorusState.originalAudioUrl);
  const playOriginalBtn = document.getElementById('play-original');
  const vizOriginal = document.getElementById('viz-original');
  const playheadOriginal = document.getElementById('playhead-original');
  
  let animFrameOriginal;
  
  function updatePlayheadOriginal() {
    if (originalAudio.paused || originalAudio.ended) return;
    const progress = originalAudio.currentTime / originalAudio.duration;
    playheadOriginal.style.left = `${progress * vizOriginal.clientWidth}px`;
    animFrameOriginal = requestAnimationFrame(updatePlayheadOriginal);
  }
  
  playOriginalBtn.addEventListener('click', () => {
    if (originalAudio.paused) {
      originalAudio.playbackRate = ChorusState.playbackSpeed;
      
      if (ChorusState.abLoopEnabled) {
        originalAudio.currentTime = ChorusState.abLoopStart * originalAudio.duration;
      }
      
      originalAudio.play();
      playOriginalBtn.classList.add('playing');
      playOriginalBtn.textContent = '⏸';
      updatePlayheadOriginal();
    } else {
      originalAudio.pause();
      playOriginalBtn.classList.remove('playing');
      playOriginalBtn.textContent = '▶';
      cancelAnimationFrame(animFrameOriginal);
    }
  });

  originalAudio.addEventListener('timeupdate', () => {
    if (ChorusState.abLoopEnabled && ChorusState.isLooping) {
      const endPos = ChorusState.abLoopEnd * originalAudio.duration;
      if (originalAudio.currentTime >= endPos) {
        originalAudio.currentTime = ChorusState.abLoopStart * originalAudio.duration;
      }
    }
  });

  originalAudio.addEventListener('ended', () => {
    playOriginalBtn.classList.remove('playing');
    playOriginalBtn.textContent = '▶';
    cancelAnimationFrame(animFrameOriginal);
    playheadOriginal.style.left = '0';
    
    if (ChorusState.isLooping) {
      originalAudio.currentTime = ChorusState.abLoopEnabled ? ChorusState.abLoopStart * originalAudio.duration : 0;
      originalAudio.play();
      playOriginalBtn.classList.add('playing');
      playOriginalBtn.textContent = '⏸';
      updatePlayheadOriginal();
    }
  });

  vizOriginal.addEventListener('click', (e) => {
    if (e.target.classList.contains('ab-handle')) return;
    const rect = vizOriginal.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const progress = x / rect.width;
    originalAudio.currentTime = progress * originalAudio.duration;
    playheadOriginal.style.left = `${x}px`;
  });

  document.querySelectorAll('.speed-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.speed-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      ChorusState.playbackSpeed = parseFloat(btn.dataset.speed);
      originalAudio.playbackRate = ChorusState.playbackSpeed;
    });
  });

  document.querySelectorAll('.listen-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.listen-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      ChorusState.listenCount = parseInt(btn.dataset.listen);
    });
  });

  document.getElementById('loop-btn').addEventListener('click', (e) => {
    ChorusState.isLooping = !ChorusState.isLooping;
    e.currentTarget.classList.toggle('active', ChorusState.isLooping);
  });

  document.getElementById('ab-loop-btn').addEventListener('click', (e) => {
    ChorusState.abLoopEnabled = !ChorusState.abLoopEnabled;
    e.currentTarget.classList.toggle('active', ChorusState.abLoopEnabled);
    
    const region = document.getElementById('ab-region');
    const handleStart = document.getElementById('ab-handle-start');
    const handleEnd = document.getElementById('ab-handle-end');
    
    if (ChorusState.abLoopEnabled) {
      region.classList.add('active');
      handleStart.classList.add('active');
      handleEnd.classList.add('active');
      updateABLoopRegion();
    } else {
      region.classList.remove('active');
      handleStart.classList.remove('active');
      handleEnd.classList.remove('active');
    }
  });

  setupABLoopHandles(vizOriginal);
  document.getElementById('studio-record-btn').addEventListener('click', toggleRecording);

  document.getElementById('download-original').addEventListener('click', () => {
    downloadAudio(ChorusState.originalAudioBlob, 'target-audio');
  });
  document.getElementById('download-user').addEventListener('click', () => {
    if (ChorusState.userAudioBlob) downloadAudio(ChorusState.userAudioBlob, 'my-recording');
  });

  document.getElementById('compare-btn').addEventListener('click', playComparison);

  document.querySelectorAll('.viz-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      const track = tab.closest('.viz-tabs').dataset.track;
      const vizType = tab.dataset.viz;
      
      tab.parentElement.querySelectorAll('.viz-tab').forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      
      const blob = track === 'original' ? ChorusState.originalAudioBlob : ChorusState.userAudioBlob;
      const canvasId = track === 'original' ? 'canvas-original' : 'canvas-user';
      const color = track === 'original' ? '#4ade80' : '#818cf8';
      
      if (blob) {
        if (vizType === 'waveform') renderWaveform(blob, canvasId, color);
        else if (vizType === 'spectrogram') renderSpectrogram(blob, canvasId);
        else if (vizType === 'pitch') renderPitchContour(blob, canvasId, color);
        else if (vizType === 'overlay') renderPitchOverlay();
      }
    });
  });

  if (ChorusState.isQueueMode) {
    document.getElementById('queue-prev')?.addEventListener('click', prevQueueItem);
    document.getElementById('queue-next')?.addEventListener('click', nextQueueItem);
  }

  setupScrubbing(vizOriginal, originalAudio);
}

function setupABLoopHandles(container) {
  const handleStart = document.getElementById('ab-handle-start');
  const handleEnd = document.getElementById('ab-handle-end');
  
  let isDragging = null;
  
  const onMouseDown = (handle, type) => (e) => {
    if (!ChorusState.abLoopEnabled) return;
    isDragging = type;
    e.preventDefault();
  };
  
  handleStart.addEventListener('mousedown', onMouseDown(handleStart, 'start'));
  handleEnd.addEventListener('mousedown', onMouseDown(handleEnd, 'end'));
  
  document.addEventListener('mousemove', (e) => {
    if (!isDragging) return;
    
    const rect = container.getBoundingClientRect();
    let progress = (e.clientX - rect.left) / rect.width;
    progress = Math.max(0, Math.min(1, progress));
    
    if (isDragging === 'start') {
      ChorusState.abLoopStart = Math.min(progress, ChorusState.abLoopEnd - 0.05);
    } else {
      ChorusState.abLoopEnd = Math.max(progress, ChorusState.abLoopStart + 0.05);
    }
    
    updateABLoopRegion();
  });
  
  document.addEventListener('mouseup', () => { isDragging = null; });
}

function updateABLoopRegion() {
  const container = document.getElementById('viz-original');
  const region = document.getElementById('ab-region');
  const handleStart = document.getElementById('ab-handle-start');
  const handleEnd = document.getElementById('ab-handle-end');
  
  if (!container || !region) return;
  
  const width = container.clientWidth;
  const left = ChorusState.abLoopStart * width;
  const right = ChorusState.abLoopEnd * width;
  
  region.style.left = `${left}px`;
  region.style.width = `${right - left}px`;
  handleStart.style.left = `${left}px`;
  handleEnd.style.left = `${right}px`;
}

function setupScrubbing(container, audio) {
  let isScrubbing = false;
  
  container.addEventListener('mousedown', (e) => {
    if (e.button !== 0) return;
    if (e.target.classList.contains('ab-handle')) return;
    isScrubbing = true;
  });
  
  container.addEventListener('mousemove', (e) => {
    if (!isScrubbing || !e.buttons) return;
    
    const rect = container.getBoundingClientRect();
    const progress = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    
    const playhead = container.querySelector('.playhead');
    if (playhead) playhead.style.left = `${progress * rect.width}px`;
    
    audio.currentTime = progress * audio.duration;
    audio.playbackRate = 0.5;
    
    if (audio.paused) {
      audio.play();
      setTimeout(() => audio.pause(), 100);
    }
  });
  
  document.addEventListener('mouseup', () => {
    if (isScrubbing) {
      isScrubbing = false;
      audio.playbackRate = ChorusState.playbackSpeed;
    }
  });
}

// ============================================================================
// RECORDING
// ============================================================================

async function toggleRecording() {
  const btn = document.getElementById('studio-record-btn');
  const label = document.getElementById('record-label');
  
  if (ChorusState.isRecording) {
    if (ChorusState.mediaRecorder?.state === 'recording') {
      ChorusState.mediaRecorder.stop();
    }
    btn.classList.remove('recording');
    label.textContent = 'Record';
    ChorusState.isRecording = false;
  } else {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      ChorusState.recordingStream = stream;
      
      await showCountdown();
      
      ChorusState.mediaRecorder = new MediaRecorder(stream);
      ChorusState.audioChunks = [];

      ChorusState.mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) ChorusState.audioChunks.push(e.data);
      };

      ChorusState.mediaRecorder.onstop = async () => {
        const blob = new Blob(ChorusState.audioChunks, { type: 'audio/webm' });
        ChorusState.userAudioBlob = blob;
        ChorusState.userAudioUrl = URL.createObjectURL(blob);
        
        const audioCtx = getAudioContext();
        const arrayBuffer = await blob.arrayBuffer();
        ChorusState.userAudioBuffer = await audioCtx.decodeAudioData(arrayBuffer);
        
        onUserRecordingComplete();
        stream.getTracks().forEach(track => track.stop());
      };

      setupRealtimeWaveform(stream);

      ChorusState.mediaRecorder.start();
      btn.classList.add('recording');
      label.textContent = 'Stop';
      ChorusState.isRecording = true;

      await playOriginalMultipleTimes(ChorusState.listenCount);
      
      if (ChorusState.isRecording) {
        ChorusState.mediaRecorder.stop();
        btn.classList.remove('recording');
        label.textContent = 'Record';
        ChorusState.isRecording = false;
      }

    } catch (err) {
      console.error('Recording error:', err);
      showToast('Microphone access denied', 'error');
      hideCountdown();
    }
  }
}

function setupRealtimeWaveform(stream) {
  const audioCtx = getAudioContext();
  const source = audioCtx.createMediaStreamSource(stream);
  const analyser = audioCtx.createAnalyser();
  analyser.fftSize = 2048;
  source.connect(analyser);
  
  ChorusState.recordingAnalyser = analyser;
  
  const vizUser = document.getElementById('viz-user');
  const placeholder = vizUser.querySelector('.visualization-placeholder');
  const canvas = document.getElementById('canvas-user');
  
  if (placeholder) placeholder.style.display = 'none';
  canvas.style.display = 'block';
  
  const ctx = canvas.getContext('2d');
  const bufferLength = analyser.frequencyBinCount;
  const dataArray = new Uint8Array(bufferLength);
  
  canvas.width = vizUser.clientWidth;
  canvas.height = vizUser.clientHeight;
  
  function draw() {
    if (!ChorusState.isRecording) return;
    
    requestAnimationFrame(draw);
    analyser.getByteTimeDomainData(dataArray);
    
    ctx.fillStyle = '#1a1a2e';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    ctx.lineWidth = 2;
    ctx.strokeStyle = '#818cf8';
    ctx.beginPath();
    
    const sliceWidth = canvas.width / bufferLength;
    let x = 0;
    
    for (let i = 0; i < bufferLength; i++) {
      const v = dataArray[i] / 128.0;
      const y = (v * canvas.height) / 2;
      
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
      
      x += sliceWidth;
    }
    
    ctx.lineTo(canvas.width, canvas.height / 2);
    ctx.stroke();
  }
  
  draw();
}

function showCountdown() {
  return new Promise((resolve) => {
    const overlay = document.getElementById('countdown-overlay');
    const numberEl = document.getElementById('countdown-number');
    const listenLabel = document.getElementById('countdown-listen-label');
    
    listenLabel.textContent = `Will play ${ChorusState.listenCount}× while recording`;
    overlay.classList.add('visible');
    
    let count = 3;
    numberEl.textContent = count;
    numberEl.style.color = '#fbbf24';
    numberEl.style.animation = 'none';
    numberEl.offsetHeight;
    numberEl.style.animation = 'countdown-pulse 1s ease-in-out';
    
    const interval = setInterval(() => {
      count--;
      if (count > 0) {
        numberEl.textContent = count;
        numberEl.style.animation = 'none';
        numberEl.offsetHeight;
        numberEl.style.animation = 'countdown-pulse 1s ease-in-out';
      } else if (count === 0) {
        numberEl.textContent = 'GO!';
        numberEl.style.color = '#4ade80';
        numberEl.style.animation = 'none';
        numberEl.offsetHeight;
        numberEl.style.animation = 'countdown-pulse 0.5s ease-in-out';
      } else {
        clearInterval(interval);
        overlay.classList.remove('visible');
        resolve();
      }
    }, 1000);
  });
}

function hideCountdown() {
  const overlay = document.getElementById('countdown-overlay');
  if (overlay) overlay.classList.remove('visible');
}

function playOriginalMultipleTimes(times) {
  return new Promise((resolve) => {
    const audio = new Audio(ChorusState.originalAudioUrl);
    audio.playbackRate = ChorusState.playbackSpeed;
    
    let playCount = 0;
    const label = document.getElementById('record-label');
    
    audio.addEventListener('ended', () => {
      playCount++;
      if (playCount < times && ChorusState.isRecording) {
        label.textContent = `Playing ${playCount + 1}/${times}`;
        audio.currentTime = 0;
        audio.play();
      } else {
        resolve();
      }
    });
    
    label.textContent = `Playing 1/${times}`;
    audio.play();
  });
}

function onUserRecordingComplete() {
  const playUserBtn = document.getElementById('play-user');
  const downloadUserBtn = document.getElementById('download-user');
  const compareBtn = document.getElementById('compare-btn');
  const playheadUser = document.getElementById('playhead-user');
  
  playUserBtn.disabled = false;
  downloadUserBtn.disabled = false;
  compareBtn.disabled = false;
  if (playheadUser) playheadUser.style.display = 'block';
  
  const userAudio = new Audio(ChorusState.userAudioUrl);
  const vizUser = document.getElementById('viz-user');
  
  let animFrameUser;
  
  function updatePlayheadUser() {
    if (userAudio.paused || userAudio.ended) return;
    const progress = userAudio.currentTime / userAudio.duration;
    playheadUser.style.left = `${progress * vizUser.clientWidth}px`;
    animFrameUser = requestAnimationFrame(updatePlayheadUser);
  }
  
  playUserBtn.addEventListener('click', () => {
    if (userAudio.paused) {
      userAudio.playbackRate = ChorusState.playbackSpeed;
      userAudio.play();
      playUserBtn.classList.add('playing');
      playUserBtn.textContent = '⏸';
      updatePlayheadUser();
    } else {
      userAudio.pause();
      playUserBtn.classList.remove('playing');
      playUserBtn.textContent = '▶';
      cancelAnimationFrame(animFrameUser);
    }
  });

  userAudio.addEventListener('ended', () => {
    playUserBtn.classList.remove('playing');
    playUserBtn.textContent = '▶';
    cancelAnimationFrame(animFrameUser);
    playheadUser.style.left = '0';
  });
  
  vizUser.addEventListener('click', (e) => {
    const rect = vizUser.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const progress = x / rect.width;
    userAudio.currentTime = progress * userAudio.duration;
    playheadUser.style.left = `${x}px`;
  });

  renderWaveform(ChorusState.userAudioBlob, 'canvas-user', '#818cf8');
  calculatePronunciationScore();
  addToHistory(ChorusState.lastScore);
  showToast('Recording saved!', 'success');
}

// ============================================================================
// AUDIO ANALYSIS & SCORING
// ============================================================================

function calculatePronunciationScore() {
  if (!ChorusState.originalAudioBuffer || !ChorusState.userAudioBuffer) return;
  
  const originalData = ChorusState.originalAudioBuffer.getChannelData(0);
  const userData = ChorusState.userAudioBuffer.getChannelData(0);
  
  const windowSize = 2048;
  const hopSize = 512;
  
  let similarities = [];
  
  const minLen = Math.min(originalData.length, userData.length);
  const numWindows = Math.floor((minLen - windowSize) / hopSize);
  
  for (let i = 0; i < numWindows; i++) {
    const offset = i * hopSize;
    
    let origEnergy = 0, userEnergy = 0;
    for (let j = 0; j < windowSize; j++) {
      origEnergy += originalData[offset + j] ** 2;
      userEnergy += userData[offset + j] ** 2;
    }
    origEnergy = Math.sqrt(origEnergy / windowSize);
    userEnergy = Math.sqrt(userEnergy / windowSize);
    
    if (origEnergy < 0.01 && userEnergy < 0.01) continue;
    
    let corr = 0;
    for (let j = 0; j < windowSize; j++) {
      corr += originalData[offset + j] * userData[offset + j];
    }
    corr /= windowSize;
    
    const similarity = Math.min(1, Math.max(0, (corr / (origEnergy * userEnergy + 0.001) + 1) / 2));
    similarities.push(similarity);
  }
  
  const avgScore = similarities.length > 0 
    ? similarities.reduce((a, b) => a + b, 0) / similarities.length 
    : 0;
  
  const finalScore = Math.round(avgScore * 100);
  ChorusState.lastScore = finalScore;
  
  const scoreDisplay = document.getElementById('score-display');
  const scoreValue = document.getElementById('score-value');
  const scoreFeedback = document.getElementById('score-feedback');
  const scoreCircle = scoreDisplay.querySelector('.score-circle');
  
  scoreDisplay.classList.add('visible');
  scoreValue.textContent = `${finalScore}%`;
  scoreCircle.style.setProperty('--score', finalScore);
  
  if (finalScore >= 80) {
    scoreFeedback.textContent = 'Excellent! Native-like pronunciation! 🌟';
    scoreValue.style.color = '#4ade80';
  } else if (finalScore >= 60) {
    scoreFeedback.textContent = 'Good effort! Keep practicing! 👍';
    scoreValue.style.color = '#fbbf24';
  } else {
    scoreFeedback.textContent = 'Try again - focus on rhythm and tone 💪';
    scoreValue.style.color = '#f87171';
  }
}

// ============================================================================
// VISUALIZATIONS
// ============================================================================

async function renderWaveform(blob, canvasId, color) {
  const canvas = document.getElementById(canvasId);
  if (!canvas) return;

  const ctx = canvas.getContext('2d');
  const container = canvas.parentElement;
  
  const dpr = window.devicePixelRatio || 1;
  const displayWidth = container.clientWidth;
  const displayHeight = container.clientHeight;
  
  canvas.width = displayWidth * dpr;
  canvas.height = displayHeight * dpr;
  canvas.style.width = displayWidth + 'px';
  canvas.style.height = displayHeight + 'px';
  ctx.scale(dpr, dpr);

  try {
    const audioCtx = getAudioContext();
    const arrayBuffer = await blob.arrayBuffer();
    const audioBuffer = await audioCtx.decodeAudioData(arrayBuffer);
    
    const data = audioBuffer.getChannelData(0);
    const samples = displayWidth * 2;
    const step = Math.floor(data.length / samples);
    
    const bgGradient = ctx.createLinearGradient(0, 0, 0, displayHeight);
    bgGradient.addColorStop(0, '#1e1e3f');
    bgGradient.addColorStop(0.5, '#1a1a35');
    bgGradient.addColorStop(1, '#16162a');
    ctx.fillStyle = bgGradient;
    ctx.fillRect(0, 0, displayWidth, displayHeight);
    
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
    ctx.lineWidth = 1;
    for (let i = 0; i <= 4; i++) {
      const y = (displayHeight / 4) * i;
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(displayWidth, y);
      ctx.stroke();
    }
    
    const waveGradient = ctx.createLinearGradient(0, 0, 0, displayHeight);
    waveGradient.addColorStop(0, color);
    waveGradient.addColorStop(0.5, color);
    waveGradient.addColorStop(1, color);
    
    ctx.strokeStyle = waveGradient;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    
    const centerY = displayHeight / 2;
    const amplitude = (displayHeight / 2) - 15;
    
    for (let i = 0; i < samples; i++) {
      let min = 1.0, max = -1.0;
      for (let j = 0; j < step; j++) {
        const idx = (i * step) + j;
        if (idx < data.length) {
          const d = data[idx];
          if (d < min) min = d;
          if (d > max) max = d;
        }
      }
      
      const x = (i / samples) * displayWidth;
      const yMin = centerY - (max * amplitude);
      const yMax = centerY - (min * amplitude);
      
      ctx.moveTo(x, yMin);
      ctx.lineTo(x, yMax);
    }
    
    ctx.stroke();
    
    ctx.shadowColor = color;
    ctx.shadowBlur = 4;
    ctx.stroke();
    ctx.shadowBlur = 0;
    
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, centerY);
    ctx.lineTo(displayWidth, centerY);
    ctx.stroke();
    
    const duration = audioBuffer.duration;
    ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
    ctx.fillRect(0, displayHeight - 16, displayWidth, 16);
    
    ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
    ctx.font = '9px SF Mono, Consolas, monospace';
    
    const markers = 5;
    for (let i = 0; i <= markers; i++) {
      const time = (duration / markers) * i;
      const x = (i / markers) * displayWidth;
      const label = formatTime(time);
      
      ctx.textAlign = i === 0 ? 'left' : i === markers ? 'right' : 'center';
      ctx.fillText(label, i === 0 ? x + 3 : i === markers ? x - 3 : x, displayHeight - 4);
    }
    
  } catch (err) {
    console.error('Waveform render error:', err);
  }
}

async function renderSpectrogram(blob, canvasId) {
  const canvas = document.getElementById(canvasId);
  if (!canvas) return;

  const ctx = canvas.getContext('2d');
  const container = canvas.parentElement;
  
  const dpr = window.devicePixelRatio || 1;
  const displayWidth = container.clientWidth;
  const displayHeight = container.clientHeight;
  
  canvas.width = displayWidth * dpr;
  canvas.height = displayHeight * dpr;
  canvas.style.width = displayWidth + 'px';
  canvas.style.height = displayHeight + 'px';
  ctx.scale(dpr, dpr);

  try {
    const audioCtx = getAudioContext();
    const arrayBuffer = await blob.arrayBuffer();
    const audioBuffer = await audioCtx.decodeAudioData(arrayBuffer);
    
    const data = audioBuffer.getChannelData(0);
    const fftSize = 256;
    const stepSize = Math.floor(data.length / displayWidth);
    
    const bgGradient = ctx.createLinearGradient(0, 0, 0, displayHeight);
    bgGradient.addColorStop(0, '#1e1e3f');
    bgGradient.addColorStop(1, '#0f0f1a');
    ctx.fillStyle = bgGradient;
    ctx.fillRect(0, 0, displayWidth, displayHeight);
    
    for (let x = 0; x < displayWidth; x++) {
      const offset = x * stepSize;
      
      for (let y = 0; y < displayHeight - 16; y++) {
        const freqBin = (displayHeight - 16 - y) / (displayHeight - 16);
        
        let energy = 0;
        const binSize = Math.min(fftSize, data.length - offset);
        
        for (let i = 0; i < binSize; i++) {
          const sample = data[offset + i] || 0;
          energy += sample * sample * Math.sin(freqBin * Math.PI * i / binSize);
        }
        
        energy = Math.abs(energy / binSize);
        const intensity = Math.min(1, energy * 50);
        
        if (intensity > 0.05) {
          const hue = 280 - (intensity * 200);
          ctx.fillStyle = `hsl(${hue}, 80%, ${20 + intensity * 50}%)`;
          ctx.fillRect(x, y, 1, 1);
        }
      }
    }
    
    const duration = audioBuffer.duration;
    ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
    ctx.fillRect(0, displayHeight - 16, displayWidth, 16);
    
    ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
    ctx.font = '9px SF Mono, Consolas, monospace';
    
    const markers = 5;
    for (let i = 0; i <= markers; i++) {
      const time = (duration / markers) * i;
      const xPos = (i / markers) * displayWidth;
      ctx.textAlign = i === 0 ? 'left' : i === markers ? 'right' : 'center';
      ctx.fillText(formatTime(time), i === 0 ? xPos + 3 : i === markers ? xPos - 3 : xPos, displayHeight - 4);
    }
    
  } catch (err) {
    console.error('Spectrogram render error:', err);
  }
}

async function renderPitchContour(blob, canvasId, color) {
  const canvas = document.getElementById(canvasId);
  if (!canvas) return;

  const ctx = canvas.getContext('2d');
  const container = canvas.parentElement;
  
  const dpr = window.devicePixelRatio || 1;
  const displayWidth = container.clientWidth;
  const displayHeight = container.clientHeight;
  
  canvas.width = displayWidth * dpr;
  canvas.height = displayHeight * dpr;
  canvas.style.width = displayWidth + 'px';
  canvas.style.height = displayHeight + 'px';
  ctx.scale(dpr, dpr);

  try {
    const audioCtx = getAudioContext();
    const arrayBuffer = await blob.arrayBuffer();
    const audioBuffer = await audioCtx.decodeAudioData(arrayBuffer);
    
    const data = audioBuffer.getChannelData(0);
    const sampleRate = audioBuffer.sampleRate;
    const frameSize = Math.floor(sampleRate * 0.03);
    const hopSize = Math.floor(frameSize / 2);
    
    const bgGradient = ctx.createLinearGradient(0, 0, 0, displayHeight);
    bgGradient.addColorStop(0, '#1e1e3f');
    bgGradient.addColorStop(1, '#16162a');
    ctx.fillStyle = bgGradient;
    ctx.fillRect(0, 0, displayWidth, displayHeight);
    
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
    ctx.lineWidth = 1;
    for (let i = 0; i <= 4; i++) {
      const y = ((displayHeight - 16) / 4) * i;
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(displayWidth, y);
      ctx.stroke();
    }
    
    const pitches = [];
    for (let i = 0; i < data.length - frameSize; i += hopSize) {
      const frame = data.slice(i, i + frameSize);
      const pitch = detectPitch(frame, sampleRate);
      pitches.push(pitch);
    }
    
    const validPitches = pitches.filter(p => p > 0);
    const minPitch = Math.min(...validPitches) || 80;
    const maxPitch = Math.max(...validPitches) || 400;
    
    ctx.strokeStyle = color;
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    
    let started = false;
    
    for (let i = 0; i < pitches.length; i++) {
      const x = (i / pitches.length) * displayWidth;
      const pitch = pitches[i];
      
      if (pitch > 0) {
        const y = (displayHeight - 16) - ((pitch - minPitch) / (maxPitch - minPitch)) * (displayHeight - 36) - 10;
        if (!started) { ctx.moveTo(x, y); started = true; }
        else ctx.lineTo(x, y);
      } else if (started) {
        ctx.stroke();
        ctx.beginPath();
        started = false;
      }
    }
    ctx.stroke();
    
    ctx.shadowColor = color;
    ctx.shadowBlur = 6;
    ctx.stroke();
    ctx.shadowBlur = 0;
    
    ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
    ctx.font = '9px SF Mono, Consolas, monospace';
    ctx.textAlign = 'left';
    ctx.fillText(`${Math.round(maxPitch)}Hz`, 4, 12);
    ctx.fillText(`${Math.round(minPitch)}Hz`, 4, displayHeight - 22);
    
    const duration = audioBuffer.duration;
    ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
    ctx.fillRect(0, displayHeight - 16, displayWidth, 16);
    
    ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
    const markers = 5;
    for (let i = 0; i <= markers; i++) {
      const time = (duration / markers) * i;
      const xPos = (i / markers) * displayWidth;
      ctx.textAlign = i === 0 ? 'left' : i === markers ? 'right' : 'center';
      ctx.fillText(formatTime(time), i === 0 ? xPos + 3 : i === markers ? xPos - 3 : xPos, displayHeight - 4);
    }
    
  } catch (err) {
    console.error('Pitch contour render error:', err);
  }
}

async function renderPitchOverlay() {
  if (!ChorusState.originalAudioBuffer || !ChorusState.userAudioBuffer) {
    showToast('Record first to compare!', 'warning');
    return;
  }
  
  const canvas = document.getElementById('canvas-original');
  if (!canvas) return;

  const ctx = canvas.getContext('2d');
  const container = canvas.parentElement;
  
  const dpr = window.devicePixelRatio || 1;
  const displayWidth = container.clientWidth;
  const displayHeight = container.clientHeight;
  
  canvas.width = displayWidth * dpr;
  canvas.height = displayHeight * dpr;
  canvas.style.width = displayWidth + 'px';
  canvas.style.height = displayHeight + 'px';
  ctx.scale(dpr, dpr);

  const bgGradient = ctx.createLinearGradient(0, 0, 0, displayHeight);
  bgGradient.addColorStop(0, '#1e1e3f');
  bgGradient.addColorStop(1, '#16162a');
  ctx.fillStyle = bgGradient;
  ctx.fillRect(0, 0, displayWidth, displayHeight);

  ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
  for (let i = 0; i <= 4; i++) {
    const y = ((displayHeight - 16) / 4) * i;
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(displayWidth, y);
    ctx.stroke();
  }

  const originalPitches = extractPitches(ChorusState.originalAudioBuffer);
  const userPitches = extractPitches(ChorusState.userAudioBuffer);
  
  const allValid = [...originalPitches, ...userPitches].filter(p => p > 0);
  const minPitch = Math.min(...allValid) || 80;
  const maxPitch = Math.max(...allValid) || 400;
  
  drawPitchLine(ctx, originalPitches, displayWidth, displayHeight, minPitch, maxPitch, '#4ade80');
  drawPitchLine(ctx, userPitches, displayWidth, displayHeight, minPitch, maxPitch, '#818cf8');
  
  ctx.fillStyle = '#4ade80';
  ctx.fillRect(displayWidth - 100, 8, 12, 12);
  ctx.fillStyle = 'rgba(255,255,255,0.7)';
  ctx.font = '10px sans-serif';
  ctx.fillText('Target', displayWidth - 84, 17);
  
  ctx.fillStyle = '#818cf8';
  ctx.fillRect(displayWidth - 100, 24, 12, 12);
  ctx.fillStyle = 'rgba(255,255,255,0.7)';
  ctx.fillText('You', displayWidth - 84, 33);
  
  ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
  ctx.fillRect(0, displayHeight - 16, displayWidth, 16);
}

function extractPitches(audioBuffer) {
  const data = audioBuffer.getChannelData(0);
  const sampleRate = audioBuffer.sampleRate;
  const frameSize = Math.floor(sampleRate * 0.03);
  const hopSize = Math.floor(frameSize / 2);
  
  const pitches = [];
  for (let i = 0; i < data.length - frameSize; i += hopSize) {
    const frame = data.slice(i, i + frameSize);
    pitches.push(detectPitch(frame, sampleRate));
  }
  return pitches;
}

function drawPitchLine(ctx, pitches, width, height, minPitch, maxPitch, color) {
  ctx.strokeStyle = color;
  ctx.lineWidth = 2;
  ctx.beginPath();
  
  let started = false;
  
  for (let i = 0; i < pitches.length; i++) {
    const x = (i / pitches.length) * width;
    const pitch = pitches[i];
    
    if (pitch > 0) {
      const y = (height - 16) - ((pitch - minPitch) / (maxPitch - minPitch)) * (height - 36) - 10;
      if (!started) { ctx.moveTo(x, y); started = true; }
      else ctx.lineTo(x, y);
    } else if (started) {
      ctx.stroke();
      ctx.beginPath();
      started = false;
    }
  }
  ctx.stroke();
  
  ctx.shadowColor = color;
  ctx.shadowBlur = 4;
  ctx.stroke();
  ctx.shadowBlur = 0;
}

function detectPitch(frame, sampleRate) {
  let zeroCrossings = 0;
  for (let i = 1; i < frame.length; i++) {
    if ((frame[i] >= 0 && frame[i - 1] < 0) || (frame[i] < 0 && frame[i - 1] >= 0)) {
      zeroCrossings++;
    }
  }
  const frequency = (zeroCrossings * sampleRate) / (2 * frame.length);
  return (frequency > 50 && frequency < 600) ? frequency : 0;
}

// ============================================================================
// COMPARISON & DOWNLOAD
// ============================================================================

async function playComparison() {
  const compareBtn = document.getElementById('compare-btn');
  
  if (!ChorusState.userAudioUrl) {
    showToast('Record yourself first!', 'warning');
    return;
  }
  
  compareBtn.disabled = true;
  compareBtn.classList.add('playing');
  compareBtn.textContent = '▶ Playing...';
  
  const originalAudio = new Audio(ChorusState.originalAudioUrl);
  const userAudio = new Audio(ChorusState.userAudioUrl);
  
  originalAudio.playbackRate = ChorusState.playbackSpeed;
  userAudio.playbackRate = ChorusState.playbackSpeed;
  
  const vizOriginal = document.getElementById('viz-original');
  const vizUser = document.getElementById('viz-user');
  const playheadOriginal = document.getElementById('playhead-original');
  const playheadUser = document.getElementById('playhead-user');
  
  let animFrame;
  
  function updatePlayheads() {
    if (!originalAudio.paused && !originalAudio.ended) {
      const p = originalAudio.currentTime / originalAudio.duration;
      playheadOriginal.style.left = `${p * vizOriginal.clientWidth}px`;
    }
    if (!userAudio.paused && !userAudio.ended) {
      const p = userAudio.currentTime / userAudio.duration;
      playheadUser.style.left = `${p * vizUser.clientWidth}px`;
    }
    if (!originalAudio.ended || !userAudio.ended) {
      animFrame = requestAnimationFrame(updatePlayheads);
    }
  }
  
  let finishedCount = 0;
  const onEnded = () => {
    finishedCount++;
    if (finishedCount >= 2) {
      cancelAnimationFrame(animFrame);
      compareBtn.disabled = false;
      compareBtn.classList.remove('playing');
      compareBtn.textContent = '🔄 A/B';
    }
  };
  
  originalAudio.addEventListener('ended', onEnded);
  userAudio.addEventListener('ended', onEnded);
  
  originalAudio.play();
  userAudio.play();
  updatePlayheads();
}

function downloadAudio(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${filename}-${formatTime(ChorusState.capturedStartTime)}-${formatTime(ChorusState.capturedEndTime)}.webm`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  showToast('Audio downloaded!', 'success');
}

// ============================================================================
// HISTORY & SRS MODALS (Simplified)
// ============================================================================

function showHistoryModal() {
  showToast(`You have ${ChorusState.practiceHistory.length} practice sessions recorded`, 'info');
}

function showSRSModal() {
  const dueCount = getDueCards().length;
  showToast(`${ChorusState.srsCards.length} flashcards total, ${dueCount} due for review`, 'info');
}

// ============================================================================
// HOTKEY & MESSAGE HANDLING
// ============================================================================

function setupHotkey() {
  document.addEventListener('keydown', (e) => {
    if (e.key.toLowerCase() !== 'h') return;
    
    const active = document.activeElement;
    const isTyping = active && (
      active.tagName === 'INPUT' ||
      active.tagName === 'TEXTAREA' ||
      active.contentEditable === 'true'
    );
    
    if (isTyping || e.ctrlKey || e.altKey || e.metaKey || e.shiftKey) return;
    if (!window.location.href.includes('/watch')) return;
    
    e.preventDefault();
    e.stopPropagation();
    togglePanel();
  }, true);
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'getStatus') {
    sendResponse({ isActive: ChorusState.isVisible });
    return true;
  }
  
  if (message.action === 'startChorus') {
    showPanel();
    loadSubtitles();
    sendResponse({ status: 'ok' });
    return true;
  }
  
  if (message.action === 'stopChorus') {
    hidePanel();
    sendResponse({ status: 'ok' });
    return true;
  }
  
  if (message.action === 'subtitlesFetched') {
    renderSubtitles(message.data);
    sendResponse({ status: 'ok' });
    return true;
  }
  
  if (message.action === 'openSRSCard') {
    openStudioWithSRSCard(message.card);
    sendResponse({ status: 'ok' });
    return true;
  }
  
  if (message.action === 'startSRSReview') {
    startSRSReviewMode(message.cards);
    sendResponse({ status: 'ok' });
    return true;
  }
  
  sendResponse({ status: 'ok' });
  return true;
});

async function loadSubtitles() {
  const videoId = getVideoId();
  
  chrome.runtime.sendMessage({ action: 'checkCache', videoId }, (response) => {
    if (chrome.runtime.lastError) return;
    if (response?.cached) {
      renderSubtitles(response.data);
    } else {
      triggerSubtitleLoad();
    }
  });
}

async function triggerSubtitleLoad() {
  try {
    const ccButton = await waitForElement('.ytp-subtitles-button', 5000);
    if (ccButton.getAttribute('aria-pressed') === 'false') {
      ccButton.click();
      setTimeout(() => ccButton.click(), 100);
    }
  } catch (e) {
    console.warn('Subtitle button not found:', e);
  }
}

function waitForElement(selector, timeout = 5000) {
  return new Promise((resolve, reject) => {
    const interval = 100;
    let elapsed = 0;
    const check = () => {
      const el = document.querySelector(selector);
      if (el) return resolve(el);
      elapsed += interval;
      if (elapsed >= timeout) reject(`Timeout: ${selector}`);
      else setTimeout(check, interval);
    };
    check();
  });
}

// ============================================================================
// URL CHANGE DETECTION
// ============================================================================

let lastUrl = location.href;

new MutationObserver(() => {
  if (location.href !== lastUrl) {
    lastUrl = location.href;
    handleVideoChange();
  }
}).observe(document, { childList: true, subtree: true });

function handleVideoChange() {
  if (!window.location.href.includes('/watch')) return;
  
  ChorusState.subtitles = [];
  ChorusState.currentIndex = -1;
  ChorusState.selectedIndices.clear();
  ChorusState.selectionAnchor = null;
  
  if (ChorusState.isVisible) {
    const list = document.getElementById('chorus-subtitle-list');
    if (list) {
      list.innerHTML = `
        <div class="chorus-empty-state">
          <div class="chorus-loading-spinner"></div>
          <div class="chorus-empty-title">Loading Subtitles</div>
          <div class="chorus-empty-subtitle">Please wait...</div>
        </div>
      `;
    }
    updateSelectionUI();
    chrome.runtime.sendMessage({ action: 'startChorus' });
    setTimeout(triggerSubtitleLoad, 1000);
  }
}

// ============================================================================
// INITIALIZATION
// ============================================================================

function init() {
  console.log('🎵 Chorus Mode v2.0 initialized');
  injectStyles();
  setupHotkey();
  loadAllData();
}

init();