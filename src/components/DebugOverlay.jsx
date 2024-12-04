import React from 'react';
import { editModeState } from '../globals';

const DebugOverlay = ({ cursorData }) => {
  return (
    <div className="fixed top-0 right-0 m-4 bg-gray-900 p-4 rounded shadow z-50">
      <div className="mb-2 flex items-center gap-2">
        <span className="text-white">Mode:</span>
        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
          editModeState.get() 
            ? 'bg-purple-500/50 text-purple-200 border border-purple-400' 
            : 'bg-blue-500/50 text-blue-200 border border-blue-400'
        }`}>
          {editModeState.get() ? 'Edit' : 'View'}
        </span>
      </div>
      <div>
        {cursorData.points.map((point, index) => {
          const elements = document.elementsFromPoint(point.x, point.y);
          const menuItem = elements.find(el => 
            el.getAttribute('role') === 'menuitem' ||
            el.classList.contains('context-menu-item') ||
            el.closest('[role="menuitem"]') ||
            el.closest('.context-menu-item')
          );
          
          return (
            <div key={index} className="text-white mb-2">
              <div>Hand {index + 1} ({point.handedness})</div>
              {/* <div>X: {point.x.toFixed(2)}, Y: {point.y.toFixed(2)}</div> */}
              <div>State: {point.gestureState}</div>
              {/* <div>Elements: {elements.map(el => el.tagName).join(', ')}</div> */}
              <div>Menu Item: {menuItem ? `Found (${menuItem.tagName})` : 'None'}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default DebugOverlay;
