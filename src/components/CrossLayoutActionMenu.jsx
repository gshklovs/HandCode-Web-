import BaseActionMenu from './BaseActionMenu';

const buttonStyles = [
  { top: '-50%', left: '50%', transform: 'translate(-120px, -40px)' },   // Top
  { top: '-50%', left: '50%', transform: 'translate(20px, 0px)' },       // Right
  { top: '-50%', left: '50%', transform: 'translate(-120px, 40px)' },    // Bottom
  { top: '-50%', left: '50%', transform: 'translate(-260px, 0px)' }      // Left
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
