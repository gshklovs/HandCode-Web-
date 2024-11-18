import { useState, useEffect, useRef } from 'react';
import PreviewWindow from './PreviewWindow';

const BaseActionMenu = ({ suggestions = [], position, onSelect, onClickOutside, buttonStyles, getPreviewDirection }) => {
  const [hoveredIndex, setHoveredIndex] = useState(null);
  const menuRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        onClickOutside();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') onClickOutside();
    });

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleClickOutside);
    };
  }, [onClickOutside]);

  const calculatePreviewPosition = (buttonStyle) => {
    const PREVIEW_OFFSET = 10;
    const PREVIEW_HEIGHT = 200;
    const PREVIEW_WIDTH = 300;
    const BUTTON_HEIGHT = 36;
    const screenHeight = window.innerHeight;
    const buttonY = (position?.y || 0) + (buttonStyle?.top || 0);
    
    // Calculate horizontal position to center the preview relative to the button
    const previewX = (position?.x || 0) + (buttonStyle?.left || 0) - (PREVIEW_WIDTH / 2);
    
    // If there's enough space below the button
    if (buttonY + BUTTON_HEIGHT + PREVIEW_HEIGHT + PREVIEW_OFFSET < screenHeight) {
      return {
        x: Math.max(0, previewX), // Ensure x is never negative
        y: buttonY + BUTTON_HEIGHT + PREVIEW_OFFSET // Position below the button
      };
    }
    
    // Otherwise, place preview above the button
    return {
      x: Math.max(0, previewX), // Ensure x is never negative
      y: buttonY - PREVIEW_HEIGHT - PREVIEW_OFFSET // Position above the button
    };
  };

  const getAdjustedPreviewDirection = (buttonIndex) => {
    const buttonY = position.y + buttonStyles[buttonIndex].top;
    const BUTTON_HEIGHT = 36;
    const screenHeight = window.innerHeight;
    const PREVIEW_HEIGHT = 200;
    
    // If preview would go below screen bottom, show it above
    if (buttonY + BUTTON_HEIGHT + PREVIEW_HEIGHT > screenHeight) {
      return 'bottom';
    }
    return 'top';
  };

  const onSuggestionClick = (suggestion) => {
    if (!suggestion) return;
    
    const suggestionData = {
      text: suggestion.text || suggestion.title || '',
      preview: suggestion.preview || suggestion.description || '',
      changes: suggestion.changes || [],
      ...suggestion
    };
    onSelect(suggestionData);
  };

  if (!position || !suggestions.length) return null;

  return (
    <div
      ref={menuRef}
      className='bg-gray-900/70 p-2 rounded-md shadow-md fixed w-[560px] h-[260px] flex flex-col items-center justify-center'
      style={{
        left: position.x,
        top: position.y,
        zIndex: 1000,
        transform: 'translate(-50%, -50%)'
      }}
    >
      <div className="p-2 text-lg font-extrabold text-gray-300 mb-2 text-sm absolute top-0 left-0 right-0 p-2">Select an action</div>
      {suggestions.map((suggestion, index) => {
        if (index >= buttonStyles.length) return null;
        const buttonStyle = buttonStyles[index];

        return (
          <div
            key={index}
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onSuggestionClick(suggestion);
            }}
            onMouseEnter={() => setHoveredIndex(index)}
            onMouseLeave={() => setHoveredIndex(null)}
            className={`absolute w-[240px] h-[72px] px-3 py-2 rounded border border-gray-700 cursor-pointer overflow-hidden text-sm transition-all duration-200 text-left
              ${hoveredIndex === index ? 'bg-gray-700 shadow-lg' : 'bg-gray-800 shadow'}`}
            style={{
              ...buttonStyle,
              transform: `${buttonStyle.transform}`
            }}
          >
            <div className="line-clamp-3">
              {suggestion.text}
            </div>
          </div>
        );
      })}
      {hoveredIndex !== null && suggestions[hoveredIndex]?.preview && (
        <PreviewWindow
          code={suggestions[hoveredIndex].preview}
          position={calculatePreviewPosition(buttonStyles[hoveredIndex])}
          direction={getAdjustedPreviewDirection(hoveredIndex)}
          onMouseEnter={() => setHoveredIndex(hoveredIndex)}
          onMouseLeave={() => setHoveredIndex(null)}
          onClick={() => onSuggestionClick(suggestions[hoveredIndex])}
        />
      )}
    </div>
  );
};

export default BaseActionMenu;
