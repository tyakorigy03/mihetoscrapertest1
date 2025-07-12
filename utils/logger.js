const fs = require('fs-extra');
const path = require('path');

const LOG_FILE_PATH = path.join(__dirname, '../logs/errors.json');
const MAX_LOG_SIZE = 2 * 1024 * 1024; // 2 MB in bytes

function logInfo(msg) {
  console.log(`\x1b[36m${msg}\x1b[0m`);
}

function logError(msg) {
  console.error(`\x1b[31m${msg}\x1b[0m`);
  saveErrorLog(msg);
}

function saveErrorLog(msg) {
  fs.ensureFileSync(LOG_FILE_PATH);

  try {
    const stats = fs.statSync(LOG_FILE_PATH);
    if (stats.size > MAX_LOG_SIZE) {
      console.warn(`⚠️ Log file exceeded 2MB (${(stats.size / 1024 / 1024).toFixed(2)} MB). Deleting...`);
      fs.removeSync(LOG_FILE_PATH);
      fs.ensureFileSync(LOG_FILE_PATH);
      fs.writeJsonSync(LOG_FILE_PATH, [], { spaces: 2 }); // reset file to empty array
    }
  } catch (err) {
    // File might not exist yet — ignore error
  }

  const logEntry = {
    message: typeof msg === 'string' ? msg : JSON.stringify(msg),
    timestamp: new Date().toISOString(),
  };

  let logs = [];
  try {
    logs = fs.readJsonSync(LOG_FILE_PATH);
    if (!Array.isArray(logs)) {
      logs = [];
    }
  } catch (err) {
    logs = [];
  }

  logs.push(logEntry);
  fs.writeJsonSync(LOG_FILE_PATH, logs, { spaces: 2 });
}

function clearErrorLog() {
  fs.writeJsonSync(LOG_FILE_PATH, []);
}

function hasErrorsInLog() {
  if (!fs.existsSync(LOG_FILE_PATH)) return false;

  try {
    const logs = fs.readJsonSync(LOG_FILE_PATH);
    return Array.isArray(logs) && logs.length > 0;
  } catch {
    return false;
  }
}

module.exports = {
  logInfo,
  logError,
  clearErrorLog,
  hasErrorsInLog,
};
