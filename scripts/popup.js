/**
 * Chorus Mode Popup - Control Panel & Data Viewer
 */

document.addEventListener('DOMContentLoaded', () => {
  let isChorusActive = false;
  const chorusBtn = document.getElementById('chorusBtn');

  // Main toggle button
  if (chorusBtn) {
    chorusBtn.addEventListener('click', () => {
      isChorusActive = !isChorusActive;
      
      // Update button appearance
      chorusBtn.textContent = isChorusActive ? '✓ Chorus Mode Active' : 'Activate Chorus Mode';
      chorusBtn.classList.toggle('active', isChorusActive);
      
      // Update status indicator
      const statusEl = document.getElementById('status-indicator');
      if (statusEl) {
        statusEl.textContent = isChorusActive ? '🟢 Active on this tab' : '⚪ Inactive';
        statusEl.className = 'status-indicator ' + (isChorusActive ? 'active' : '');
      }

      chrome.runtime.sendMessage({ action: isChorusActive ? 'startChorus' : 'stopChorus' });
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        if (tabs[0]?.id) {
          chrome.tabs.sendMessage(tabs[0].id, { action: isChorusActive ? 'startChorus' : 'stopChorus' }, (response) => {
            // Check if we got a response (content script is loaded)
            if (chrome.runtime.lastError) {
              if (statusEl) {
                statusEl.textContent = '⚠️ Not on a YouTube video';
                statusEl.className = 'status-indicator warning';
              }
            }
          });
        }
      });
    });
  }

  // Tab navigation
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
      document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
      btn.classList.add('active');
      const section = document.getElementById(`${btn.dataset.tab}-section`);
      if (section) section.classList.add('active');
      
      // Update action bar visibility
      const historyActions = document.getElementById('history-actions');
      if (historyActions) {
        historyActions.style.display = btn.dataset.tab === 'history' ? 'flex' : 'none';
      }
      
      if (btn.dataset.tab === 'history') loadHistory();
      if (btn.dataset.tab === 'srs') loadSRS();
      if (btn.dataset.tab === 'queue') loadQueue();
    });
  });

  // Clear history button
  const clearHistoryBtn = document.getElementById('clear-history-btn');
  if (clearHistoryBtn) {
    clearHistoryBtn.addEventListener('click', () => {
      if (confirm('Clear all practice history?')) {
        chrome.storage.local.remove('chorus-history', () => {
          loadHistory();
          loadStats();
        });
      }
    });
  }

  // Export history button
  const exportHistoryBtn = document.getElementById('export-history-btn');
  if (exportHistoryBtn) {
    exportHistoryBtn.addEventListener('click', () => {
      chrome.storage.local.get('chorus-history', (result) => {
        const data = result['chorus-history'] || [];
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `chorus-history-${new Date().toISOString().split('T')[0]}.json`;
        a.click();
        URL.revokeObjectURL(url);
      });
    });
  }

  // Event delegation for dynamically created buttons
  document.addEventListener('click', (e) => {
    // Delete SRS card
    if (e.target.classList.contains('srs-delete-btn')) {
      const cardId = e.target.dataset.id;
      if (cardId && confirm('Delete this flashcard?')) {
        chrome.storage.local.get('chorus-srs-cards', (result) => {
          const cards = (result['chorus-srs-cards'] || []).filter(c => c.id !== cardId);
          chrome.storage.local.set({ 'chorus-srs-cards': cards }, () => {
            loadSRS();
            loadStats();
          });
        });
      }
    }

    // Remove from queue
    if (e.target.classList.contains('queue-remove-btn')) {
      const index = parseInt(e.target.dataset.index);
      if (!isNaN(index)) {
        chrome.storage.local.get('chorus-queue', (result) => {
          const queue = result['chorus-queue'] || [];
          queue.splice(index, 1);
          chrome.storage.local.set({ 'chorus-queue': queue }, () => {
            loadQueue();
            loadStats();
          });
        });
      }
    }
  });

  // Initial load
  loadStats();
  loadHistory();
});

// ============================================================================
// DATA LOADING FUNCTIONS
// ============================================================================

function loadStats() {
  try {
    chrome.storage.local.get(['chorus-history', 'chorus-srs-cards', 'chorus-queue'], (result) => {
      if (chrome.runtime.lastError) {
        console.warn('Storage error:', chrome.runtime.lastError);
        return;
      }
      
      const history = result['chorus-history'] || [];
      const cards = result['chorus-srs-cards'] || [];
      const queue = result['chorus-queue'] || [];
      
      // Today's practice count
      const todayStart = new Date().setHours(0, 0, 0, 0);
      const todayCount = history.filter(h => h.timestamp >= todayStart).length;
      
      // Average score
      const withScore = history.filter(h => h.score != null);
      const avgScore = withScore.length > 0 
        ? Math.round(withScore.reduce((a, b) => a + b.score, 0) / withScore.length)
        : null;
      
      // Due cards
      const now = Date.now();
      const dueCount = cards.filter(c => c.nextReview <= now).length;
      
      // Update UI
      setText('stat-today', todayCount);
      setText('stat-total', history.length);
      setText('stat-avg-score', avgScore != null ? avgScore + '%' : '--');
      setText('stat-cards', cards.length);
      setText('stat-due', dueCount);
      setText('stat-queue', queue.length);
    });
  } catch (e) {
    console.error('loadStats error:', e);
  }
}

function loadHistory() {
  const container = document.getElementById('history-list');
  if (!container) return;

  try {
    chrome.storage.local.get('chorus-history', (result) => {
      if (chrome.runtime.lastError) {
        console.warn('Storage error:', chrome.runtime.lastError);
        container.innerHTML = '<div class="empty-state">Error loading history</div>';
        return;
      }
      
      const history = result['chorus-history'] || [];
      
      if (history.length === 0) {
        container.innerHTML = '<div class="empty-state">No practice history yet. Start practicing!</div>';
        return;
      }
      
      // Show last 20, newest first
      const recent = history.slice(-20).reverse();
      
      container.innerHTML = recent.map(entry => `
        <div class="history-item">
          <div class="history-text">${escapeHtml(truncate(entry.subtitleText || '', 50))}</div>
          <div class="history-meta">
            <span>${escapeHtml(truncate(entry.videoTitle || 'Unknown', 25))}</span>
            <span>${formatRelativeTime(entry.timestamp)}</span>
            ${entry.score != null ? `<span class="history-score">${entry.score}%</span>` : ''}
          </div>
        </div>
      `).join('');
    });
  } catch (e) {
    console.error('loadHistory error:', e);
    container.innerHTML = '<div class="empty-state">Error loading history</div>';
  }
}

function loadSRS() {
  const container = document.getElementById('srs-list');
  if (!container) return;

  try {
    chrome.storage.local.get('chorus-srs-cards', (result) => {
      if (chrome.runtime.lastError) {
        console.warn('Storage error:', chrome.runtime.lastError);
        container.innerHTML = '<div class="empty-state">Error loading cards</div>';
        return;
      }
      
      const cards = result['chorus-srs-cards'] || [];
      
      if (cards.length === 0) {
        container.innerHTML = '<div class="empty-state">No flashcards yet. Add some from Practice Studio!</div>';
        return;
      }
      
      const now = Date.now();
      const sorted = [...cards].sort((a, b) => a.nextReview - b.nextReview);
      
      container.innerHTML = sorted.slice(0, 20).map(card => {
        const isDue = card.nextReview <= now;
        const dueText = isDue ? 'Due now' : formatRelativeTime(card.nextReview, true);
        
        return `
          <div class="srs-card ${isDue ? 'due' : ''}">
            <div class="srs-text">${escapeHtml(truncate(card.text || '', 40))}</div>
            <div class="srs-meta">
              <span class="srs-due">${dueText}</span>
              <span>${card.interval || 1}d interval</span>
            </div>
            <div class="srs-actions">
              <button class="srs-delete-btn" data-id="${card.id}">🗑️ Delete</button>
            </div>
          </div>
        `;
      }).join('');
    });
  } catch (e) {
    console.error('loadSRS error:', e);
    container.innerHTML = '<div class="empty-state">Error loading cards</div>';
  }
}

function loadQueue() {
  const container = document.getElementById('queue-list');
  if (!container) return;

  chrome.storage.local.get('chorus-queue', (result) => {
    const queue = result['chorus-queue'] || [];
    
    if (queue.length === 0) {
      container.innerHTML = '<div class="empty-state">Queue is empty. Add subtitles from the browser!</div>';
      return;
    }
    
    container.innerHTML = queue.map((item, index) => `
      <div class="queue-item">
        <span class="queue-number">${index + 1}</span>
        <div class="queue-content">
          <div class="queue-text">${escapeHtml(truncate(item.text || '', 40))}</div>
          <div class="queue-time">${formatTime(item.startTime)} - ${formatTime(item.endTime)}</div>
        </div>
        <button class="queue-remove-btn" data-index="${index}">×</button>
      </div>
    `).join('');
  });
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

function setText(id, value) {
  const el = document.getElementById(id);
  if (el) el.textContent = value;
}

function truncate(str, len) {
  if (!str) return '';
  return str.length > len ? str.slice(0, len) + '...' : str;
}

function escapeHtml(str) {
  if (!str) return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function formatTime(seconds) {
  if (seconds == null) return '0:00';
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

function formatRelativeTime(timestamp, isFuture = false) {
  if (!timestamp) return '';
  
  const diff = isFuture ? timestamp - Date.now() : Date.now() - timestamp;
  const seconds = Math.floor(Math.abs(diff) / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  
  if (days > 0) return isFuture ? `in ${days}d` : `${days}d ago`;
  if (hours > 0) return isFuture ? `in ${hours}h` : `${hours}h ago`;
  if (minutes > 0) return isFuture ? `in ${minutes}m` : `${minutes}m ago`;
  return isFuture ? 'soon' : 'just now';
}