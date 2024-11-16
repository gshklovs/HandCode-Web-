// Patience diff implementation
function createLineDiff(oldLines, newLines) {
  const changes = [];
  let lineNumber = 1;

  // Helper to add context lines
  const addContext = (start, end) => {
    for (let i = start; i <= end; i++) {
      if (i >= 0 && i < oldLines.length) {
        changes.push(` ${lineNumber}:     ${oldLines[i]}`);
      }
      lineNumber++;
    }
  };

  // Find unique common subsequences
  const findLCS = (start1, end1, start2, end2) => {
    const uniqueLines = new Map();
    for (let i = start1; i <= end1; i++) {
      uniqueLines.set(oldLines[i], i);
    }
    const matches = [];
    for (let j = start2; j <= end2; j++) {
      if (uniqueLines.has(newLines[j])) {
        matches.push([uniqueLines.get(newLines[j]), j]);
      }
    }
    matches.sort((a, b) => a[0] - b[0]);
    return matches;
  };

  // Recursively diff the lines
  const diff = (start1, end1, start2, end2) => {
    const lcs = findLCS(start1, end1, start2, end2);
    if (lcs.length === 0) {
      // No common subsequence, all lines are different
      for (let i = start1; i <= end1; i++) {
        changes.push(`-${lineNumber}:     ${oldLines[i]}`);
      }
      for (let j = start2; j <= end2; j++) {
        changes.push(`+${lineNumber}:     ${newLines[j]}`);
        lineNumber++;
      }
    } else {
      // Recursively diff the parts before, between, and after the LCS
      let prev1 = start1 - 1;
      let prev2 = start2 - 1;
      for (const [i, j] of lcs) {
        diff(prev1 + 1, i - 1, prev2 + 1, j - 1);
        changes.push(` ${lineNumber}:     ${oldLines[i]}`);
        lineNumber++;
        prev1 = i;
        prev2 = j;
      }
      diff(prev1 + 1, end1, prev2 + 1, end2);
    }
  };

  diff(0, oldLines.length - 1, 0, newLines.length - 1);

  return changes.join('\n');
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

  return createLineDiff(oldLines, newLines);
}

// Helper function to get inline changes for a specific line
export function getInlineChanges(originalLine, modifiedLine) {
  // TO DO: implement inline diff
  return [];
}
