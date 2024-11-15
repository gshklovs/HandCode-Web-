function findLCS(x, y) {
  const m = x.length;
  const n = y.length;
  const dp = Array(m + 1).fill().map(() => Array(n + 1).fill(0));
  
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (x[i - 1] === y[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1] + 1;
      } else {
        dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1]);
      }
    }
  }
  
  return dp;
}

function backtrack(dp, x, y, i, j) {
  if (i === 0 || j === 0) {
    return [];
  }
  
  if (x[i - 1] === y[j - 1]) {
    return [...backtrack(dp, x, y, i - 1, j - 1), { type: 'same', value: x[i - 1] }];
  }
  
  if (dp[i][j - 1] > dp[i - 1][j]) {
    return [...backtrack(dp, x, y, i, j - 1), { type: 'add', value: y[j - 1] }];
  }
  
  return [...backtrack(dp, x, y, i - 1, j), { type: 'remove', value: x[i - 1] }];
}

export function createDiffSummary(oldCode, newCode) {
  if (!oldCode || !newCode) {
    return '';
  }

  const oldLines = oldCode.split('\n');
  const newLines = newCode.split('\n');
  
  // Remove empty lines at the end
  while (oldLines.length > 0 && oldLines[oldLines.length - 1].trim() === '') {
    oldLines.pop();
  }
  while (newLines.length > 0 && newLines[newLines.length - 1].trim() === '') {
    newLines.pop();
  }

  const dp = findLCS(oldLines, newLines);
  const diff = backtrack(dp, oldLines, newLines, oldLines.length, newLines.length);
  
  let result = [];
  let lineNumber = 0;
  let context = 3; // Number of context lines
  let lastPrintedLine = -1;
  let inChange = false;

  for (let i = 0; i < diff.length; i++) {
    const item = diff[i];
    lineNumber++;

    // Determine if we're in a change block
    const isChange = item.type !== 'same';
    if (isChange && !inChange) {
      inChange = true;
      // Add separator if needed
      if (lastPrintedLine !== -1 && lineNumber - context > lastPrintedLine + 1) {
        result.push('...');
      }
      // Add context lines before
      for (let j = Math.max(0, i - context); j < i; j++) {
        if (diff[j].type === 'same') {
          result.push(` ${j + 1}:     ${diff[j].value}`);
        }
      }
    }

    // Add the current line
    if (item.type === 'same') {
      if (inChange || (i > 0 && diff[i - 1].type !== 'same') || 
          (i < diff.length - 1 && diff[i + 1].type !== 'same')) {
        result.push(` ${lineNumber}:     ${item.value}`);
        lastPrintedLine = lineNumber;
      }
    } else if (item.type === 'remove') {
      result.push(`-${lineNumber}:     ${item.value}`);
      lastPrintedLine = lineNumber;
      lineNumber--; // Adjust for removed line
    } else if (item.type === 'add') {
      result.push(`+${lineNumber}:     ${item.value}`);
      lastPrintedLine = lineNumber;
    }

    // Check if we should end the change block
    if (isChange && i < diff.length - 1) {
      let hasMoreChanges = false;
      for (let j = i + 1; j <= i + context && j < diff.length; j++) {
        if (diff[j].type !== 'same') {
          hasMoreChanges = true;
          break;
        }
      }
      if (!hasMoreChanges) {
        inChange = false;
        // Add context lines after
        for (let j = i + 1; j <= i + context && j < diff.length; j++) {
          if (diff[j].type === 'same') {
            result.push(` ${j + 1}:     ${diff[j].value}`);
            lastPrintedLine = j + 1;
          }
        }
      }
    }
  }

  // Add final separator if needed
  if (inChange) {
    result.push('...');
  }

  return result.join('\n');
}
