import { useState, useRef, useEffect } from 'react'
import CodeEditor from './components/Editor'
import TopBar from './components/TopBar'
import CursorOverlay from './components/CursorOverlay'
import DebugOverlay from './components/DebugOverlay'
import reactLogo from './assets/react.svg'
import viteLogo from '/vite.svg'
import { editModeState } from './globals'
import './App.css'

function App() {
  const [error, setError] = useState(null);
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const [cursorData, setCursorData] = useState({ points: [], states: [] });
  const lastClickTime = useRef({});
  const DEBUG_MODE = true;

  // Listen for context menu to enter edit mode
  useEffect(() => {
    const handleContextMenu = () => {
      console.log('Context menu triggered');
      editModeState.set(true);
      console.log('Edit mode:', editModeState.get());
    };

    // Listen for escape key to exit edit mode
    const handleKeyDown = (e) => {
      console.log('Key pressed:', e.key);
      if (e.key === 'Escape') {
        editModeState.set(false);
      }
    };

    window.addEventListener('contextmenu', handleContextMenu);
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('contextmenu', handleContextMenu);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  const handleCursorUpdate = (points, states) => {
    setCursorData({ points, states });
    
    points.forEach((point, index) => {
      if (point.gestureState === 'closed') {
        const now = Date.now();
        if (!lastClickTime.current[index] || now - lastClickTime.current[index] > 500) {
          // Get all elements at the point, including those in shadow DOM
          const elements = document.elementsFromPoint(point.x, point.y);
          
          if (elements.length > 0) {
            console.log('Clicking at', point.x, point.y, "is edit mode:", editModeState.get());
            if (editModeState.get()) {
              // Try to find a context menu item in the elements
              const menuItem = elements.find(el => 
                el.getAttribute('role') === 'menuitem' ||
                el.classList.contains('context-menu-item') ||
                el.closest('[role="menuitem"]') ||
                el.closest('.context-menu-item')
              );

              if (menuItem) {
                console.log('Found menu item:', menuItem);
                // Focus the menu item first
                menuItem.focus();
                
                // Simulate a full mouse click sequence
                ['mousedown', 'mouseup', 'click'].forEach(eventType => {
                  const event = new MouseEvent(eventType, {
                    bubbles: true,
                    cancelable: true,
                    view: window,
                    clientX: point.x,
                    clientY: point.y,
                  });
                  menuItem.dispatchEvent(event);
                });

                // Also try native click() method
                menuItem.click();
                
                // If it's a button or link, try these fallbacks
                if (menuItem.tagName === 'BUTTON' || menuItem.tagName === 'A') {
                  setTimeout(() => menuItem.click(), 0);
                  console.log('Clicked button or link:', menuItem);
                  editModeState.set(false);
                }
              } else {
                console.log('No menu item found at', point.x, point.y);
                console.log('Elements at point:', elements);
                editModeState.set(false);
              }
            } else {
              // In view mode, trigger context menu on the topmost element
              const event = new MouseEvent('contextmenu', {
                bubbles: true,
                cancelable: true,
                view: window,
                clientX: point.x,
                clientY: point.y,
              });
              elements[0].dispatchEvent(event);
            }
            lastClickTime.current[index] = now;
          }
        }
      }
    });
  };

  const handleError = (err) => {
    setError(err);
  };

  const clearError = () => {
    setError(null);
  };

  return (
    <div className="App">
      <div className="absolute inset-0 rounded-lg blur-xl opacity-75 bg-gradient-to-r from-purple-500 via-blue-500 to-pink-500"></div>
      <TopBar error={error} onClear={clearError} />
      {DEBUG_MODE && <DebugOverlay cursorData={cursorData} />}
      <CodeEditor onError={handleError} />
      <CursorOverlay 
        videoRef={videoRef}
        canvasRef={canvasRef}
        onCursorUpdate={handleCursorUpdate}
      />
      <div>
        <a href="https://vite.dev" target="_blank">
          <img src={viteLogo} className="logo" alt="Vite logo" />
        </a>
        <a href="https://react.dev" target="_blank">
          <img src={reactLogo} className="logo react" alt="React logo" />
        </a>
      </div>
    </div>
  )
}

export default App
