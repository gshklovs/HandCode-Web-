// Simple line-by-line diff implementation
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

  let i = 0;
  let j = 0;
  const context = 3; // Number of context lines

  while (i < oldLines.length || j < newLines.length) {
    if (i < oldLines.length && j < newLines.length && oldLines[i] === newLines[j]) {
      // Lines are the same - add as context if near changes
      const prevLineHasChange = changes.length > 0 && changes[changes.length - 1].match(/^[+-]/);
      const nextLineHasChange = (i + 1 < oldLines.length && j + 1 < newLines.length && 
                                oldLines[i + 1] !== newLines[j + 1]);
      
      if (prevLineHasChange || nextLineHasChange || changes.length === 0) {
        changes.push(` ${lineNumber}:     ${oldLines[i]}`);
      }
      i++;
      j++;
      lineNumber++;
    } else {
      // Lines are different
      if (i < oldLines.length) {
        // Line was removed
        changes.push(`-${lineNumber}:     ${oldLines[i]}`);
        i++;
      }
      if (j < newLines.length) {
        // Line was added
        changes.push(`+${lineNumber}:     ${newLines[j]}`);
        j++;
        lineNumber++;
      }
    }
  }

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
