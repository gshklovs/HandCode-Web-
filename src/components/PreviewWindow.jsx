import Editor from '@monaco-editor/react';

const PreviewWindow = ({ code, position, direction, onMouseEnter, onMouseLeave }) => {
  return (
    <div
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      style={{
        position: 'fixed',
        left: position.x,
        top: position.y,
        width: '300px',
        height: '200px',
        backgroundColor: '#1e1e1e',
        border: '1px solid #333',
        borderRadius: '4px',
        overflow: 'hidden',
        boxShadow: '0 4px 8px rgba(0,0,0,0.3)',
        zIndex: 1001,
        animation: 'fadeIn 0.2s ease'
      }}
    >
      <Editor
        height="200px"
        defaultLanguage="javascript"
        defaultValue={code}
        theme="vs-dark"
        options={{
          readOnly: true,
          minimap: { enabled: false },
          scrollbar: {
            vertical: 'hidden',
            horizontal: 'hidden'
          },
          lineNumbers: 'off',
          fontSize: 12,
          wordWrap: 'on',
          contextmenu: false,
          renderLineHighlight: 'none',
          overviewRulerLanes: 0,
          hideCursorInOverviewRuler: true,
          overviewRulerBorder: false
        }}
      />
    </div>
  );
};

export default PreviewWindow;
