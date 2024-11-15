import { useState, useRef, useCallback, useEffect } from 'react';
import Editor from '@monaco-editor/react';
import { getCodeSuggestions, generateCode } from '../utils/groqApi';
import { createDiffSummary } from '../utils/diffUtil';
import SquareLayoutActionMenu from './SquareLayoutActionMenu';
import LoadingDots from './LoadingDots';

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

function CodeEditor() {
  const [code, setCode] = useState(initialCode);
  const [previousCode, setPreviousCode] = useState(null);
  const [clickedLine, setClickedLine] = useState(null);
  const [selectedAction, setSelectedAction] = useState(null);
  const [suggestions, setSuggestions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [menuPosition, setMenuPosition] = useState(null);
  const [loadingPosition, setLoadingPosition] = useState(null);
  const editorRef = useRef(null);
  const monacoRef = useRef(null);
  const decorationsRef = useRef([]);

  const applyDiffDecorations = useCallback((oldCode, newCode) => {
    if (!editorRef.current || !monacoRef.current || !oldCode || !newCode) return;
    
    const oldLines = oldCode.split('\n');
    const newLines = newCode.split('\n');
    const decorations = [];
    const monaco = monacoRef.current;

    for (let i = 0; i < Math.max(oldLines.length, newLines.length); i++) {
      const oldLine = oldLines[i];
      const newLine = newLines[i];

      if (oldLine !== newLine) {
        const lineNumber = i + 1;
        const range = new monaco.Range(lineNumber, 1, lineNumber, 1);

        if (oldLine !== undefined) {
          // Add removed line decoration
          decorations.push({
            range,
            options: {
              isWholeLine: true,
              className: 'removed-line',
              glyphMarginClassName: 'removed-line-glyph',
              linesDecorationsClassName: 'removed-line-decoration',
              minimap: { color: '#ff000055', position: 2 },
              overviewRuler: { color: '#ff0000', position: 4 },
              zIndex: 1,
            }
          });
          // Add the old content as a line decoration
          decorations.push({
            range,
            options: {
              after: {
                content: `  // ${oldLine}`,
                inlineClassName: 'removed-line-content'
              }
            }
          });
        }
        if (newLine !== undefined) {
          // Add added line decoration
          decorations.push({
            range,
            options: {
              isWholeLine: true,
              className: 'added-line',
              glyphMarginClassName: 'added-line-glyph',
              linesDecorationsClassName: 'added-line-decoration',
              minimap: { color: '#00ff0055', position: 2 },
              overviewRuler: { color: '#00ff00', position: 4 }
            }
          });
        }
      }
    }

    // Clear previous decorations
    decorationsRef.current = editorRef.current.deltaDecorations(decorationsRef.current, decorations);
  }, []);

  const handleEditorDidMount = (editor, monaco) => {
    console.log('Editor mounted');
    editorRef.current = editor;
    monacoRef.current = monaco;
    
    // Add CSS for decorations
    const style = document.createElement('style');
    style.textContent = `
      .removed-line { background: #ff000015; }
      .removed-line-glyph { background: #ff0000; width: 4px !important; margin-left: 3px; }
      .removed-line-decoration { background: #ff0000; width: 4px !important; margin-left: 3px; }
      .removed-line-content { color: #ff0000; font-style: italic; }
      .added-line { background: #00ff0015; }
      .added-line-glyph { background: #00ff00; width: 4px !important; margin-left: 3px; }
      .added-line-decoration { background: #00ff00; width: 4px !important; margin-left: 3px; }
    `;
    document.head.appendChild(style);
    
    editor.onContextMenu(async (e) => {
      e.event.preventDefault();
      const position = e.target.position;
      
      if (position) {
        const editorCoords = editor.getTargetAtClientPoint(e.event.posx, e.event.posy);
        if (!editorCoords) return;

        setClickedLine(position.lineNumber);
        setLoadingPosition({ x: e.event.posx, y: e.event.posy });
        setLoading(true);
        
        const model = editor.getModel();
        const currentCode = model.getValue();
        const lineContent = model.getLineContent(position.lineNumber);
        
        try {
          const suggestionResults = await getCodeSuggestions(currentCode, lineContent);
          setSuggestions(suggestionResults);
          setMenuPosition({ x: e.event.posx, y: e.event.posy });
        } catch (error) {
          console.error('Failed to get suggestions:', error);
          setSuggestions([{ text: 'Error loading suggestions', preview: '' }]);
        } finally {
          setLoading(false);
          setLoadingPosition(null);
        }
      }
    });
  };

  const handleEditorChange = (value) => {
    if (value !== undefined && value !== null) {
      setCode(value);
    }
  };

  const handleActionSelect = async (suggestion) => {
    console.log('Action selected:', suggestion);
    if (!editorRef.current) {
      console.error('No editor reference found');
      return;
    }

    const model = editorRef.current.getModel();
    if (!model) {
      console.error('No editor model found');
      return;
    }

    const currentCode = model.getValue();
    setSelectedAction(suggestion.text);
    setPreviousCode(currentCode);
    setGenerating(true);
    setSuggestions([]);
    setMenuPosition(null);

    try {
      console.log('Generating new code...');
      const newCode = await generateCode(currentCode, suggestion.text, suggestion.preview);
      
      const diff = createDiffSummary(currentCode, newCode);
      console.log('Code changes:', '\n' + diff);
      
      if (diff.trim() === '') {
        console.warn('No changes detected in generated code');
        return;
      }

      model.setValue(newCode);
      setCode(newCode);
      // Apply diff decorations after setting new code
      applyDiffDecorations(currentCode, newCode);
      console.log('Editor model updated');
    } catch (error) {
      console.error('Error generating code:', error);
      model.setValue(currentCode);
      setCode(currentCode);
    } finally {
      setGenerating(false);
    }
  };

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
      <div style={{ 
        padding: '15px', 
        backgroundColor: '#1e1e1e', 
        color: '#fff',
        borderBottom: '1px solid #333',
        transition: 'all 0.3s ease',
        width: '100%',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center'
      }}>
        <div>
          {selectedAction && <div>Applied: {selectedAction}</div>}
        </div>
        {previousCode && (
          <button
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
        )}
      </div>
      <div style={{ flex: 1, position: 'relative', overflow: 'hidden' }}>
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
      {!loading && menuPosition && suggestions.length > 0 && (
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
