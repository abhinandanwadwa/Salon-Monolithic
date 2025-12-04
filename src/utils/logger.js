// In-memory logger that stores logs for the last hour
class Logger {
  constructor() {
    this.logs = [];
    this.maxAge = 60 * 60 * 1000; // 1 hour in milliseconds
    
    // Clean up old logs every 5 minutes
    setInterval(() => this.cleanup(), 5 * 60 * 1000);
    
    // Override console methods to capture logs
    this.overrideConsole();
  }

  overrideConsole() {
    const originalLog = console.log;
    const originalError = console.error;
    const originalWarn = console.warn;
    const originalInfo = console.info;

    console.log = (...args) => {
      this.addLog('LOG', args);
      originalLog.apply(console, args);
    };

    console.error = (...args) => {
      this.addLog('ERROR', args);
      originalError.apply(console, args);
    };

    console.warn = (...args) => {
      this.addLog('WARN', args);
      originalWarn.apply(console, args);
    };

    console.info = (...args) => {
      this.addLog('INFO', args);
      originalInfo.apply(console, args);
    };
  }

  addLog(level, args) {
    const timestamp = new Date();
    const message = args.map(arg => {
      if (typeof arg === 'object') {
        try {
          return JSON.stringify(arg, null, 2);
        } catch (e) {
          return String(arg);
        }
      }
      return String(arg);
    }).join(' ');

    this.logs.push({
      timestamp,
      level,
      message
    });

    // Keep logs under control (max 1000 entries)
    if (this.logs.length > 1000) {
      this.logs = this.logs.slice(-500);
    }
  }

  cleanup() {
    const cutoff = Date.now() - this.maxAge;
    this.logs = this.logs.filter(log => log.timestamp.getTime() > cutoff);
  }

  getLogs(minutes = 60) {
    const cutoff = Date.now() - (minutes * 60 * 1000);
    return this.logs.filter(log => log.timestamp.getTime() > cutoff);
  }

  // Add a custom log entry (for request logging)
  logRequest(req, res, duration) {
    // Skip logging requests to /logs endpoint
    if (req.originalUrl.startsWith('/logs')) {
      return;
    }
    this.addLog('REQUEST', [
      `${req.method} ${req.originalUrl} - ${res.statusCode} - ${duration}ms - IP: ${req.ip}`
    ]);
  }
}

// Singleton instance
const logger = new Logger();

// Middleware to log all requests
export const requestLoggerMiddleware = (req, res, next) => {
  const start = Date.now();
  
  res.on('finish', () => {
    const duration = Date.now() - start;
    logger.logRequest(req, res, duration);
  });
  
  next();
};

// HTML template for logs page
export const getLogsHtml = (minutes = 60) => {
  const logs = logger.getLogs(minutes);
  
  const getLevelColor = (level) => {
    switch (level) {
      case 'ERROR': return '#ff6b6b';
      case 'WARN': return '#feca57';
      case 'INFO': return '#54a0ff';
      case 'REQUEST': return '#5f27cd';
      default: return '#2ed573';
    }
  };

  const logsHtml = logs.reverse().map(log => `
    <div class="log-entry">
      <span class="timestamp">${log.timestamp.toISOString()}</span>
      <span class="level" style="background-color: ${getLevelColor(log.level)}">${log.level}</span>
      <pre class="message">${escapeHtml(log.message)}</pre>
    </div>
  `).join('');

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Server Logs - Salon Dekho</title>
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    body {
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
      background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
      min-height: 100vh;
      color: #eee;
      padding: 20px;
    }
    .container {
      max-width: 1400px;
      margin: 0 auto;
    }
    header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 20px;
      padding: 20px;
      background: rgba(255,255,255,0.1);
      border-radius: 12px;
      backdrop-filter: blur(10px);
    }
    h1 {
      font-size: 1.8rem;
      background: linear-gradient(90deg, #667eea 0%, #764ba2 100%);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
    }
    .stats {
      display: flex;
      gap: 20px;
    }
    .stat {
      text-align: center;
      padding: 10px 20px;
      background: rgba(255,255,255,0.05);
      border-radius: 8px;
    }
    .stat-value {
      font-size: 1.5rem;
      font-weight: bold;
      color: #667eea;
    }
    .stat-label {
      font-size: 0.8rem;
      color: #888;
    }
    .controls {
      display: flex;
      gap: 10px;
      align-items: center;
    }
    button, select {
      padding: 10px 20px;
      border: none;
      border-radius: 8px;
      cursor: pointer;
      font-size: 0.9rem;
      transition: all 0.3s;
    }
    button {
      background: linear-gradient(90deg, #667eea 0%, #764ba2 100%);
      color: white;
    }
    button:hover {
      transform: translateY(-2px);
      box-shadow: 0 5px 20px rgba(102, 126, 234, 0.4);
    }
    select {
      background: rgba(255,255,255,0.1);
      color: white;
      border: 1px solid rgba(255,255,255,0.2);
    }
    .logs-container {
      background: rgba(0,0,0,0.3);
      border-radius: 12px;
      padding: 20px;
      max-height: 75vh;
      overflow-y: auto;
    }
    .log-entry {
      display: flex;
      align-items: flex-start;
      gap: 12px;
      padding: 12px;
      margin-bottom: 8px;
      background: rgba(255,255,255,0.05);
      border-radius: 8px;
      transition: background 0.2s;
    }
    .log-entry:hover {
      background: rgba(255,255,255,0.1);
    }
    .timestamp {
      font-size: 0.75rem;
      color: #888;
      white-space: nowrap;
      min-width: 180px;
    }
    .level {
      font-size: 0.7rem;
      padding: 4px 8px;
      border-radius: 4px;
      font-weight: bold;
      color: white;
      min-width: 70px;
      text-align: center;
    }
    .message {
      flex: 1;
      font-family: 'Monaco', 'Menlo', monospace;
      font-size: 0.85rem;
      white-space: pre-wrap;
      word-break: break-all;
      color: #ddd;
      margin: 0;
    }
    .empty-state {
      text-align: center;
      padding: 60px 20px;
      color: #666;
    }
    .empty-state svg {
      width: 80px;
      height: 80px;
      margin-bottom: 20px;
      opacity: 0.5;
    }
    ::-webkit-scrollbar {
      width: 8px;
    }
    ::-webkit-scrollbar-track {
      background: rgba(255,255,255,0.05);
      border-radius: 4px;
    }
    ::-webkit-scrollbar-thumb {
      background: rgba(255,255,255,0.2);
      border-radius: 4px;
    }
    ::-webkit-scrollbar-thumb:hover {
      background: rgba(255,255,255,0.3);
    }
    .filter-btn {
      background: rgba(255,255,255,0.1);
      color: #ccc;
    }
    .filter-btn.active {
      background: linear-gradient(90deg, #667eea 0%, #764ba2 100%);
      color: white;
    }
  </style>
</head>
<body>
  <div class="container">
    <header>
      <h1>🪵 Server Logs</h1>
      <div class="stats">
        <div class="stat">
          <div class="stat-value">${logs.length}</div>
          <div class="stat-label">Total Logs</div>
        </div>
        <div class="stat">
          <div class="stat-value">${logs.filter(l => l.level === 'ERROR').length}</div>
          <div class="stat-label">Errors</div>
        </div>
        <div class="stat">
          <div class="stat-value">${logs.filter(l => l.level === 'REQUEST').length}</div>
          <div class="stat-label">Requests</div>
        </div>
      </div>
      <div class="controls">
        <select id="timeFilter" onchange="window.location.href='/logs?minutes=' + this.value">
          <option value="5" ${minutes == 5 ? 'selected' : ''}>Last 5 mins</option>
          <option value="15" ${minutes == 15 ? 'selected' : ''}>Last 15 mins</option>
          <option value="30" ${minutes == 30 ? 'selected' : ''}>Last 30 mins</option>
          <option value="60" ${minutes == 60 ? 'selected' : ''}>Last 1 hour</option>
        </select>
        <button onclick="window.location.reload()">🔄 Refresh</button>
      </div>
    </header>
    <div class="logs-container">
      ${logs.length === 0 ? `
        <div class="empty-state">
          <svg viewBox="0 0 24 24" fill="currentColor">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6zm4 18H6V4h7v5h5v11z"/>
          </svg>
          <h3>No logs found</h3>
          <p>Logs from the last ${minutes} minutes will appear here</p>
        </div>
      ` : logsHtml}
    </div>
  </div>
  <script>
    // Auto-refresh every 30 seconds
    setTimeout(() => window.location.reload(), 30000);
  </script>
</body>
</html>
  `;
};

function escapeHtml(text) {
  const map = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;'
  };
  return text.replace(/[&<>"']/g, m => map[m]);
}

export default logger;
