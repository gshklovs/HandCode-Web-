import { useState } from 'react'
import CodeEditor from './components/Editor'
import TopBar from './components/TopBar'
import reactLogo from './assets/react.svg'
import viteLogo from '/vite.svg'
import './App.css'

function App() {
  const [count, setCount] = useState(0)
  const [error, setError] = useState(null);

  const handleError = (err) => {
    setError(err);
  };

  const clearError = () => {
    setError(null);
  };

  return (
    <div 
      className="App"
    >
      <div className="absolute inset-0 rounded-lg blur-xl opacity-75 bg-gradient-to-r from-purple-500 via-blue-500 to-pink-500"></div>
      <TopBar error={error} onClear={clearError} />
      <CodeEditor onError={handleError} />
      <div>
        <a href="https://vite.dev" target="_blank">
          <img src={viteLogo} className="logo" alt="Vite logo" />
        </a>
        <a href="https://react.dev" target="_blank">
          <img src={reactLogo} className="logo react" alt="React logo" />
        </a>
      </div>
      <h1>Vite + React</h1>
      <div className="card">
        <button onClick={() => setCount((count) => count + 1)}>
          count is {count}
        </button>
        <p>
          Edit <code>src/App.jsx</code> and save to test HMR
        </p>
      </div>
      <p className="read-the-docs">
        Click on the Vite and React logos to learn more
      </p>
    </div>
  )
}

export default App
