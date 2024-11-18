import React from 'react';

const TopBar = ({ error, onClear }) => {
  if (!error) return null;

  return (
    <div className="fixed top-0 left-0 right-0 p-2 bg-gray-900 border-b border-gray-700 z-[2000] flex items-center justify-between">
      <div className="flex items-center space-x-2">
        <div className="bg-red-500/20 text-red-500 px-3 py-1 rounded-full text-sm font-medium border border-red-500/30">
          Error
        </div>
        <span className="text-red-400 text-sm">{error.message}</span>
        {error.details && (
          <span className="text-white text-sm opacity-80">: {error.details}</span>
        )}
      </div>
      <button
        onClick={onClear}
        className="text-gray-400 hover:text-white text-sm px-2 py-1 rounded transition-colors duration-200"
        style={{
          backgroundColor: 'rgba(255, 255, 255, 0.1)',
          border: '1px solid rgba(255, 255, 255, 0.2)'
        }}
      >
        Clear
      </button>
    </div>
  );
};

export default TopBar;
