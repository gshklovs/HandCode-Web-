import { useState, useRef, useCallback, useEffect } from 'react';
import Editor from '@monaco-editor/react';
import { getCodeSuggestions, generateCode } from '../utils/groqApi';
import { createDiffSummary } from '../utils/diffUtil';
import SquareLayoutActionMenu from './SquareLayoutActionMenu';
import LoadingDots from './LoadingDots';
import TopBar from './TopBar';
import { editModeState } from '../globals';

const initialCode = `class Counter {
  constructor(initialValue = 0) {
    this.count = initialValue;
    this.history = [];
  }

  increment() {
    this.count++;
    this.history.push({ action: 'increment', value: this.count });
    return this.count;
  }

  decrement() {
    this.count--;
    this.history.push({ action: 'decrement', value: this.count });
    return this.count;
  }

  reset() {
    const oldCount = this.count;
    this.count = 0;
    this.history.push({ action: 'reset', oldValue: oldCount, newValue: 0 });
    return this.count;
  }

  getHistory() {
    return this.history;
  }

  getCurrentValue() {
    return this.count;
  }
}

// Example usage:
const counter = new Counter(5);
console.log(counter.getCurrentValue()); // 5
counter.increment();
counter.increment();
console.log(counter.getCurrentValue()); // 7
console.log(counter.getHistory());
`;

function CodeEditor({ onError }) {
  const [code, setCode] = useState(() => {
    const savedCode = localStorage.getItem('editorCode');
    return savedCode || initialCode;
  });
  const [previousCode, setPreviousCode] = useState(null);
  const [clickedLine, setClickedLine] = useState(null);
  const [selectedLineHeight, setSelectedLineHeight] = useState(3);
  const [selectedAction, setSelectedAction] = useState(null);
  const [suggestions, setSuggestions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [menuPosition, setMenuPosition] = useState(null);
  const [loadingPosition, setLoadingPosition] = useState(null);
  const [error, setError] = useState(null);
  const editorRef = useRef(null);
  const monacoRef = useRef(null);
  const decorationsRef = useRef([]);

  const applyDiffDecorations = useCallback((oldCode, newCode) => {
    if (!editorRef.current || !monacoRef.current || !oldCode || !newCode) return;
    
    const oldLines = oldCode.split('\n');
    const newLines = newCode.split('\n');
    const decorations = [];
    const monaco = monacoRef.current;

    // Parse the diff to get line changes
    const diff = createDiffSummary(oldCode, newCode);
    const diffLines = diff.split('\n');
    const lineMap = new Map();

    // Build a map of line changes
    diffLines.forEach(line => {
      if (line.startsWith('+') || line.startsWith('-')) {
        const matches = line.match(/^([+-])(\d+):/);
        if (matches) {
          const [_, marker, lineNum] = matches;
          console.log("found change:", marker, lineNum);
          lineMap.set(parseInt(lineNum), marker === '+' ? 'add' : 'remove');
        }
      }
    });

    // Apply decorations based on the diff
    let lineOffset = 0;
    for (let i = 0; i < Math.max(oldLines.length, newLines.length); i++) {
      const currentLineNumber = i + 1;
      const changeType = lineMap.get(currentLineNumber);

      if (changeType === 'remove') {
        // For removed lines, show them as phantom content
        const range = new monaco.Range(currentLineNumber + lineOffset, 1, currentLineNumber + lineOffset, 1);
        decorations.push({
          range,
          options: {
            isWholeLine: true,
            className: 'removed-line',
            glyphMarginClassName: 'removed-line-glyph',
            linesDecorationsClassName: 'removed-line-decoration',
            minimap: { color: '#ff000055', position: 2 },
            overviewRuler: { color: '#ff0000', position: 4 }
          }
        });
        decorations.push({
          range,
          options: {
            after: {
              content: `  ${oldLines[i] || ''}`,
              inlineClassName: 'removed-line-content'
            }
          }
        });
        lineOffset--; // Adjust for removed line
      } else if (changeType === 'add') {
        // For added lines, highlight the actual content
        const range = new monaco.Range(currentLineNumber + lineOffset, 1, currentLineNumber + lineOffset, 1);
        const lineRange = new monaco.Range(
          currentLineNumber + lineOffset,
          1,
          currentLineNumber + lineOffset,
          (newLines[i] || '').length + 1
        );
        
        // Add whole line background
        decorations.push({
          range,
          options: {
            isWholeLine: true,
            className: 'added-line',
            glyphMarginClassName: 'added-line-glyph',
            linesDecorationsClassName: 'added-line-decoration',
            minimap: { color: '#2cbb3b55', position: 2 },
            overviewRuler: { color: '#2cbb3b', position: 4 }
          }
        });
        
        // Add text color for the actual content
        decorations.push({
          range: lineRange,
          options: {
            inlineClassName: 'added-line-content'
          }
        });
      }
    }

    // Clear previous decorations and apply new ones
    decorationsRef.current = editorRef.current.deltaDecorations(decorationsRef.current, decorations);
  }, []);

  const handleContextMenu = async (e) => {
    setSelectedLineHeight(selectedLineHeight + 1);
    
    e.event.preventDefault();
    if (!editorRef.current) return;

    const model = editorRef.current.getModel();
    if (!model) return;

    const position = e.target.position;
    if (!position) return;

    const lineContent = model.getLineContent(position.lineNumber).trim();

    // If line is empty, just highlight it in gray and return
    if (!lineContent) {
      const lineNumber = position.lineNumber;
      const decorations = [{
        range: new monaco.Range(lineNumber, 1, lineNumber, 1),
        options: {
          isWholeLine: true,
          className: 'bg-gray-700/30'
        }
      }];
      
      // Remove decoration after 1 second
      const decorationsCollection = editorRef.current.createDecorationsCollection(decorations);
      setTimeout(() => {
        decorationsCollection.clear();
      }, 1000);
      
      return;
    }

    // Update decorations when clicking on a new line
    if (clickedLine !== position.lineNumber) {
      setSelectedLineHeight(selectedLineHeight + 1);
      const newDecorations = [{
        range: new monaco.Range(position.lineNumber, 1, position.lineNumber + selectedLineHeight, 1),
        options: {
          isWholeLine: true,
          className: 'focused-line'
        }
      }];
      decorationsRef.current = editorRef.current.deltaDecorations(decorationsRef.current, newDecorations);
    }

    setClickedLine(position.lineNumber);
    setLoadingPosition({ x: e.event.posx, y: e.event.posy });
    setLoading(true);

    try {
      const suggestionResults = await getCodeSuggestions(model.getValue(), lineContent);
      setSuggestions(suggestionResults);
      setMenuPosition({ x: e.event.posx, y: e.event.posy });
    } catch (error) {
      console.error('Failed to get suggestions:', error);
      // Clear any previous errors
      onError(null);
      // Create new error with the same structure as code generation errors
      const errorMessage = error.details?.error?.message || error.message;
      const errorObj = new Error(errorMessage);
      errorObj.details = error.details?.error || error.details;
      onError(errorObj);
      setSuggestions([{ text: 'Error', preview: errorMessage }]);
    } finally {
      setLoading(false);
      setLoadingPosition(null);
    }
  };

  const handleEditorDidMount = (editor, monaco) => {
    console.log('Editor mounted');
    editorRef.current = editor;
    monacoRef.current = monaco;

    // Set editor options
    editor.updateOptions({
      glyphMargin: true,
      lineDecorationsWidth: 5,
      renderLineHighlight: 'all',
      lineNumbers: 'on',
      fontSize: 14,
      theme: 'vs-dark'
    });

    // Add CSS for decorations with improved visibility
    const style = document.createElement('style');
    style.textContent = `
      .focused-line { 
        background: rgba(0, 155, 255, 0.1);
        textDecoration: 'underline',
        opacity: 0.7
      }
      .removed-line { 
        background: rgba(255, 0, 0, 0.1);
        text-decoration: line-through;
        opacity: 0.7;
      }
      .removed-line-glyph {
        background: #ff0000;
        width: 4px !important;
        margin-left: 3px;
      }
      .removed-line-decoration {
        background: #ff0000;
        width: 4px !important;
        margin-left: 3px;
      }
      .removed-line-content {
        color: #ff0000 !important;
        font-style: italic;
        margin-left: 4px;
        opacity: 0.8;
      }
      .added-line {
        background: rgba(0, 255, 0, 0.1);
      }
      .added-line-glyph {
        background: #2cbb3b;
        width: 4px !important;
        margin-left: 3px;
      }
      .added-line-decoration {
        background: #2cbb3b;
        width: 4px !important;
        margin-left: 3px;
      }
      .monaco-editor .mtk1.added-line-content,
      .monaco-editor .added-line .mtk1 {
        color: #2cbb3b !important;
        font-weight: 500;
      }
    `;
    document.head.appendChild(style);

    editor.onContextMenu(handleContextMenu);
  };

  const handleEditorChange = (value) => {
    if (value !== undefined && value !== null) {
      setCode(value);
      localStorage.setItem('editorCode', value);
    }
  };

  const handleActionSelect = useCallback(async (suggestion) => {
    const abortController = new AbortController();

    try {
      setError(null);  // Clear any previous errors
      if (!editorRef.current || generating) return;
      if (!suggestion?.text) {
        throw new Error('Invalid suggestion format');
      }

      const model = editorRef.current.getModel();
      if (!model) return;

      setGenerating(true);
      setSuggestions([]); // Clear suggestions immediately
      setMenuPosition(null); // Hide menu immediately
      
      const currentCode = model.getValue();
      setPreviousCode(currentCode); // Store current code before changes
      
      const newCode = await generateCode(currentCode, suggestion.text, suggestion.preview, abortController.signal);
      
      // Check if component is still mounted and operation wasn't aborted
      if (abortController.signal.aborted || !editorRef.current) {
        return;
      }

      if (!newCode) {
        throw new Error('Failed to generate code');
      }

      // Update the editor with new code
      model.pushEditOperations(
        [],
        [
          {
            range: model.getFullModelRange(),
            text: newCode
          }
        ],
        () => null
      );
      
      // Ensure we still have editor reference before applying decorations
      if (editorRef.current) {
        applyDiffDecorations(currentCode, newCode);
      }
      
      console.log('Editor model updated successfully');
    } catch (error) {
      // Only show error if not aborted
      if (!abortController.signal.aborted) {
        console.error('Error in handleActionSelect:', error);
        // Clear any previous errors
        onError(null);
        // Create new error with consistent structure
        const errorMessage = error.details?.error?.message || error.message;
        const errorObj = new Error(errorMessage);
        errorObj.details = error.details?.error || error.details;
        onError(errorObj);
      }
      
      // Only attempt to restore if we still have editor access and not aborted
      if (editorRef.current && !abortController.signal.aborted) {
        const model = editorRef.current.getModel();
        if (model) {
          // Keep current code on error
          console.log('Keeping current code due to error');
        }
      }
    } finally {
      if (!abortController.signal.aborted) {
        setGenerating(false);
      }
    }

    return () => {
      abortController.abort();
    };
  }, [generating, applyDiffDecorations, onError]);

  const handleUndo = () => {
    console.log('Undoing changes...');
    if (!previousCode || !editorRef.current) return;

    const model = editorRef.current.getModel();
    if (!model) return;

    const currentCode = model.getValue();
    console.log('Undo changes:', '\n' + createDiffSummary(currentCode, previousCode));
    
    model.setValue(previousCode);
    setCode(previousCode);
    setPreviousCode(null);
    setSelectedAction(null);
    // Clear decorations on undo
    decorationsRef.current = editorRef.current.deltaDecorations(decorationsRef.current, []);
    console.log('Changes undone');
  };

  const handleClickOutside = () => {
    setClickedLine(null);
    setSelectedAction(null);
    setMenuPosition(null);
    setSuggestions([]);
  };

  useEffect(() => {
    return () => {
      // Cleanup any pending operations
      if (editorRef.current) {
        const model = editorRef.current.getModel();
        if (model) {
          model.dispose();
        }
      }
    };
  }, []);

  return (
    <div style={{ 
      display: 'flex', 
      flexDirection: 'column', 
      height: '100vh', 
      position: 'relative',
      margin: '0 auto',
      width: '100%',
      maxWidth: '1200px',
      overflow: 'hidden'
    }}>
      <TopBar error={error} onClear={() => setError(null)} />
      {previousCode ? (
        <div style={{ 
          padding: '15px', 
          backgroundColor: '#1e1e1e', 
          color: '#fff',
          borderBottom: '1px solid #333',
          transition: 'all 0.3s ease',
          width: '100%',
          display: 'flex',
          justifyContent: 'center',
          borderRadius: '8px 8px 0 0',
          alignItems: 'center'
        }}>
          <button
            className="text-center"
            onClick={handleUndo}
            style={{
              backgroundColor: '#2d2d2d',
              color: '#fff',
              border: '1px solid #444',
              borderRadius: '4px',
              padding: '6px 12px',
              cursor: 'pointer',
              fontSize: '12px'
            }}
          >
            Undo Changes
          </button>
        </div>
      ) : (
        <div style={{ 
          padding: '15px', 
          backgroundColor: '#1e1e1e', 
          color: '#fff',
          borderBottom: '1px solid #333',
          transition: 'all 0.3s ease',
          width: '100%',
          display: 'flex',
          justifyContent: 'center',
          borderRadius: '8px 8px 0 0',
          alignItems: 'center'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{ 
              fontSize: '16px', 
              fontWeight: 600,
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}>
              <span style={{ color: '#9ca3af' }}>Welcome to</span>
              <span className="bg-gradient-to-r from-pink-500 via-purple-500 to-blue-500 text-transparent bg-clip-text">
                HandCode
              </span>
            </div>
            <div style={{ 
              fontSize: '16px',
              color: '#6b7280',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}>
              <span>—</span>
              <span>Right-click any line to view and select AI-powered improvements</span>
            </div>
          </div>
        </div>
      )}
      <div style={{ flex: 1, position: 'relative', overflow: 'hidden', marginBottom: '60px', borderRadius: '0 0 8px 8px'}}>
        <Editor
          height="100%"
          defaultLanguage="javascript"
          defaultValue={initialCode}
          theme="vs-dark"
          onChange={handleEditorChange}
          onMount={handleEditorDidMount}
          options={{
            minimap: { enabled: true },
            fontSize: 14,
            wordWrap: 'on',
            automaticLayout: true,
            lineNumbers: 'on',
            scrollBeyondLastLine: true,
            contextmenu: false,
            overviewRulerBorder: false,
            scrollbar: {
              vertical: 'visible',
              horizontal: 'visible',
              verticalScrollbarSize: 14,
              horizontalScrollbarSize: 14
            }
          }}
        />
      </div>
      
      {loading && loadingPosition && (
        <LoadingDots position={loadingPosition} />
      )}
      {editModeState.get() && !loading && menuPosition && suggestions.length > 0 && (
        <SquareLayoutActionMenu
          suggestions={suggestions}
          position={menuPosition}
          onSelect={handleActionSelect}
          onClickOutside={() => {
            setSuggestions([]);
            setMenuPosition(null);
          }}
        />
      )}
      {generating && (
        <div style={{
          position: 'fixed',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          backgroundColor: '#1e1e1e',
          padding: '20px',
          borderRadius: '4px',
          boxShadow: '0 4px 8px rgba(0,0,0,0.3)',
          color: '#fff',
          zIndex: 2000
        }}>
          Generating code...
        </div>
      )}
    </div>
  );
}

export default CodeEditor;
