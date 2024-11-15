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
    const buttonY = position.y + buttonStyle.top;
    
    // Calculate horizontal position to center the preview relative to the button
    const previewX = position.x + buttonStyle.left - (PREVIEW_WIDTH / 2);
    
    // If there's enough space below the button
    if (buttonY + BUTTON_HEIGHT + PREVIEW_HEIGHT + PREVIEW_OFFSET < screenHeight) {
      return {
        x: previewX,
        y: buttonY + BUTTON_HEIGHT + PREVIEW_OFFSET // Position below the button
      };
    }
    
    // Otherwise, place preview above the button
    return {
      x: previewX,
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

  if (!position || !suggestions.length) return null;

  return (
    <div
      ref={menuRef}
      style={{
        position: 'fixed',
        left: position.x,
        top: position.y,
        zIndex: 1000
      }}
    >
      {suggestions.map((suggestion, index) => {
        if (index >= buttonStyles.length) return null;
        const buttonStyle = buttonStyles[index];

        return (
          <div
            key={index}
            onClick={() => onSelect(suggestion.text)}
            onMouseEnter={() => setHoveredIndex(index)}
            onMouseLeave={() => setHoveredIndex(null)}
            style={{
              position: 'absolute',
              transform: buttonStyle.transform,
              top: buttonStyle.top,
              left: buttonStyle.left,
              padding: '8px 12px',
              backgroundColor: hoveredIndex === index ? '#2c2c2c' : '#1e1e1e',
              color: '#fff',
              border: '1px solid #333',
              borderRadius: '4px',
              cursor: 'pointer',
              whiteSpace: 'nowrap',
              transition: 'background-color 0.2s ease',
              textAlign: 'left',
              maxWidth: '200px',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              fontSize: '12px',
              boxShadow: hoveredIndex === index ? '0 4px 8px rgba(0,0,0,0.3)' : '0 2px 4px rgba(0,0,0,0.2)'
            }}
          >
            {suggestion.text}
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
        />
      )}
    </div>
  );
};

export default BaseActionMenu;
