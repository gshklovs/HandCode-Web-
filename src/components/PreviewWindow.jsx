import React from 'react';

const PreviewWindow = ({ code, position, direction, onMouseEnter, onMouseLeave, onClick }) => {
  return (
    <div
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      onClick={onClick}
      className="fixed w-[300px] h-[200px] bg-gray-900 border border-gray-700 rounded-md overflow-hidden shadow-lg z-[1001] select-none cursor-pointer"
      style={{
        left: position.x,
        top: position.y,
        animation: 'fadeIn 0.2s ease'
      }}
    >
      <pre className="p-3 text-sm text-gray-300 font-mono whitespace-pre-wrap h-full overflow-hidden text-left">
        {code.trimStart()}
      </pre>
    </div>
  );
};

export default PreviewWindow;
