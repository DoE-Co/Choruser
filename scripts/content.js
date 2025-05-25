class YouTubeSubtitleExtractor {
  constructor() {
    // Rate limiting and caching
    this.subtitleCache = new Map();
    this.lastRequestTime = 0;
    this.minRequestInterval = 2000; // 2 seconds between requests
    this.requestQueue = [];
    this.isProcessingQueue = false;
    
    this.init();
  }

  init() {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => this.extractSubtitles());
    } else {
      this.extractSubtitles();
    }
    this.observeUrlChanges();
  }

  // Extract video ID for caching
  extractVideoId(url) {
    const match = url.match(/[?&]v=([^&]+)/);
    return match ? match[1] : null;
  }

  // Queue system to prevent concurrent requests
  async queueRequest(requestFn) {
    return new Promise((resolve, reject) => {
      this.requestQueue.push({ requestFn, resolve, reject });
      this.processQueue();
    });
  }

  async processQueue() {
    if (this.isProcessingQueue || this.requestQueue.length === 0) {
      return;
    }

    this.isProcessingQueue = true;

    while (this.requestQueue.length > 0) {
      const { requestFn, resolve, reject } = this.requestQueue.shift();

      try {
        // Throttle requests
        const now = Date.now();
        const timeSinceLastRequest = now - this.lastRequestTime;
        
        if (timeSinceLastRequest < this.minRequestInterval) {
          const waitTime = this.minRequestInterval - timeSinceLastRequest;
          console.log(`Throttling: waiting ${waitTime}ms before next request`);
          await new Promise(r => setTimeout(r, waitTime));
        }

        this.lastRequestTime = Date.now();
        const result = await requestFn();
        resolve(result);

      } catch (error) {
        reject(error);
      }
    }

    this.isProcessingQueue = false;
  }

  async fetchSubtitleContent(baseUrl, retryCount = 0) {
    const videoId = this.extractVideoId(baseUrl);
    
    // Check cache first
    if (videoId && this.subtitleCache.has(videoId)) {
      console.log('Using cached subtitles for video:', videoId);
      return this.subtitleCache.get(videoId);
    }

    // Queue the request to prevent concurrent fetches
    return this.queueRequest(async () => {
      return this.performSubtitleFetch(baseUrl, videoId, retryCount);
    });
  }

  async performSubtitleFetch(baseUrl, videoId, retryCount = 0) {
    const url = baseUrl + '&fmt=json3';
    const maxRetries = 3;
    
    console.log(`Fetching subtitles (attempt ${retryCount + 1}):`, url);

    try {
      const response = await fetch(url);
      
      // Handle specific rate limiting responses
      if (response.status === 429) {
        console.warn('Rate limited by YouTube');
        
        if (retryCount < maxRetries) {
          // Exponential backoff with jitter
          const baseDelay = Math.pow(2, retryCount) * 1000;
          const jitter = Math.random() * 1000; // Add randomness
          const delay = baseDelay + jitter;
          
          console.log(`Retrying in ${Math.round(delay)}ms due to rate limit`);
          this.showRateLimitWarning(delay);
          
          await new Promise(resolve => setTimeout(resolve, delay));
          return this.performSubtitleFetch(baseUrl, videoId, retryCount + 1);
        } else {
          throw new Error('Rate limited - maximum retries exceeded');
        }
      }

      // Handle other HTTP errors
      if (!response.ok) {
        if (response.status >= 500 && retryCount < maxRetries) {
          // Server errors - retry with backoff
          const delay = Math.pow(2, retryCount) * 1000;
          console.log(`Server error ${response.status}, retrying in ${delay}ms`);
          
          await new Promise(resolve => setTimeout(resolve, delay));
          return this.performSubtitleFetch(baseUrl, videoId, retryCount + 1);
        }
        
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      const subtitles = this.parseSubtitleData(data);
      
      // Cache successful results
      if (videoId && subtitles.length > 0) {
        this.subtitleCache.set(videoId, subtitles);
        console.log(`Cached ${subtitles.length} subtitles for video:`, videoId);
        
        // Limit cache size (keep last 50 videos)
        if (this.subtitleCache.size > 50) {
          const firstKey = this.subtitleCache.keys().next().value;
          this.subtitleCache.delete(firstKey);
        }
      }
      
      return subtitles;

    } catch (error) {
      // Handle network errors
      if (this.isRetryableError(error) && retryCount < maxRetries) {
        const delay = Math.pow(2, retryCount) * 1000;
        console.log(`Network error, retrying in ${delay}ms:`, error.message);
        
        await new Promise(resolve => setTimeout(resolve, delay));
        return this.performSubtitleFetch(baseUrl, videoId, retryCount + 1);
      }
      
      console.error('Failed to fetch subtitles:', error);
      throw error;
    }
  }

  parseSubtitleData(data) {
    return data.events
      .filter(event => {
        if (!event.segs) return false;
        const text = event.segs.map(seg => seg.utf8).join('').trim();
        return text.length > 0 && text !== '\n' && text !== ' ';
      })
      .map(event => ({
        startTime: event.tStartMs / 1000,
        duration: event.dDurationMs ? event.dDurationMs / 1000 : 0,
        endTime: event.tStartMs / 1000 + (event.dDurationMs ? event.dDurationMs / 1000 : 0),
        text: event.segs.map(seg => seg.utf8).join('').trim()
      }));
  }

  isRetryableError(error) {
    return error.name === 'TypeError' || 
           error.message.includes('network') ||
           error.message.includes('timeout') ||
           error.message.includes('fetch');
  }

  showRateLimitWarning(retryDelay = 0) {
    // Remove existing warning
    const existing = document.getElementById('rate-limit-warning');
    if (existing) existing.remove();

    const warning = document.createElement('div');
    warning.id = 'rate-limit-warning';
    warning.style.cssText = `
      position: fixed;
      top: 80px;
      right: 20px;
      background: #ff9900;
      color: white;
      padding: 10px 15px;
      border-radius: 5px;
      z-index: 99999;
      font-family: Arial, sans-serif;
      font-size: 14px;
      border: 2px solid #cc7700;
    `;
    
    if (retryDelay > 0) {
      warning.innerHTML = `⚠️ Rate limited - retrying in ${Math.round(retryDelay/1000)}s`;
    } else {
      warning.innerHTML = '⚠️ Too many requests - please wait';
    }
    
    document.body.appendChild(warning);
    
    // Auto-remove after delay + 2 seconds
    const removeDelay = retryDelay > 0 ? retryDelay + 2000 : 5000;
    setTimeout(() => {
      if (warning.parentNode) warning.remove();
    }, removeDelay);
  }

  // Clear cache when user navigates away (optional)
  clearCache() {
    this.subtitleCache.clear();
    console.log('Subtitle cache cleared');
  }

  // Rest of the class methods remain the same...
  getSubtitlesFromPlayerResponse() {
    console.log('Checking for ytInitialPlayerResponse...');
    
    if (window.ytInitialPlayerResponse) {
      const captions = window.ytInitialPlayerResponse.captions;
      if (captions && captions.playerCaptionsTracklistRenderer) {
        const tracks = captions.playerCaptionsTracklistRenderer.captionTracks;
        const japaneseTracks = tracks.filter(track => 
          track.languageCode === 'ja' || 
          track.languageCode === 'ja-JP' ||
          track.languageCode.startsWith('ja')
        );
        return japaneseTracks;
      }
    }
    return null;
  }

  async extractSubtitles() {
    console.log('Starting subtitle extraction...');
    
    try {
      const tracks = this.getSubtitlesFromPlayerResponse();
      
      if (tracks && tracks.length > 0) {
        const subtitles = await this.fetchSubtitleContent(tracks[0].baseUrl);
        this.processSubtitles(subtitles);
      } else {
        console.log('No Japanese subtitles found - trying fallback method');
        this.tryWhisper();
      }
    } catch (error) {
      if (error.message.includes('Rate limited')) {
        console.warn('Subtitle extraction failed due to rate limiting');
      } else {
        console.error('Error during subtitle extraction:', error);
      }
    }
  }

  processSubtitles(subtitles) {
    console.log(`Found ${subtitles.length} valid Japanese subtitle segments`);
    this.createSubtitleUI(subtitles);
    this.currentSubtitles = subtitles;
  }

  createSubtitleUI(subtitles) {
    const existingUI = document.getElementById('subtitle-extractor-ui');
    if (existingUI) existingUI.remove();
    
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
      cursor: pointer;
    `;
    ui.innerHTML = `🎌 Found ${subtitles.length} Japanese subtitles (cached: ${this.subtitleCache.size})`;
    
    document.body.appendChild(ui);
    
    setTimeout(() => {
      if (ui.parentNode) ui.remove();
    }, 10000);
  }

  observeUrlChanges() {
    let currentUrl = location.href;
    const observer = new MutationObserver(() => {
      if (location.href !== currentUrl) {
        currentUrl = location.href;
        if (currentUrl.includes('/watch?v=')) {
          console.log('New video detected, extracting subtitles...');
          setTimeout(() => this.extractSubtitles(), 2000);
        }
      }
    });
    observer.observe(document.body, { childList: true, subtree: true });
  }

  tryWhisper() {
    // Fallback method implementation...
    console.log('Method 2 not implemented in this example');
  }

  getCurrentSubtitles() {
    return this.currentSubtitles || [];
  }

  getSubtitlesInRange(startTime, endTime) {
    if (!this.currentSubtitles) return [];
    return this.currentSubtitles.filter(subtitle => 
      subtitle.startTime >= startTime && subtitle.endTime <= endTime
    );
  }
}