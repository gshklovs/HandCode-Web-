import BaseActionMenu from './BaseActionMenu';

const buttonStyles = [
  { top: -40, left: 0, transform: 'translate(-50%, -50%)' },     // Top
  { top: 0, left: 10, transform: 'translate(0%, -50%)' },      // Right
  { top: 40, left: 0, transform: 'translate(-50%, -50%)' },      // Bottom
  { top: 0, left: -10, transform: 'translate(-100%, -50%)' }      // Left
];

const getPreviewDirection = (buttonIndex) => {
  switch (buttonIndex) {
    case 0: return 'top';    // Top button shows preview on right
    case 1: return 'right';  // Right button shows preview on right
    case 2: return 'right';  // Bottom button shows preview on right
    case 3: return 'left';   // Left button shows preview on left
    default: return 'right';
  }
};

const CrossLayoutActionMenu = (props) => (
  <BaseActionMenu
    {...props}
    buttonStyles={buttonStyles}
    getPreviewDirection={getPreviewDirection}
  />
);

export default CrossLayoutActionMenu;
