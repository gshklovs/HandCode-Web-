import BaseActionMenu from './BaseActionMenu';

const buttonStyles = [
  { top: '50%', left: '50%', transform: 'translate(20px, -80px)' },     // Top right
  { top: '50%', left: '50%', transform: 'translate(-260px, -80px)' },   // Top left
  { top: '50%', left: '50%', transform: 'translate(20px, 20px)' },      // Bottom right
  { top: '50%', left: '50%', transform: 'translate(-260px, 20px)' }     // Bottom left
];

const getPreviewDirection = (buttonIndex) => {
  switch (buttonIndex) {
    case 0: return 'right';  // Top right shows preview on right
    case 1: return 'left';   // Top left shows preview on left
    case 2: return 'right';  // Bottom right shows preview on right
    case 3: return 'left';   // Bottom left shows preview on left
    default: return 'right';
  }
};

const SquareLayoutActionMenu = (props) => (
  <BaseActionMenu
    {...props}
    buttonStyles={buttonStyles}
    getPreviewDirection={getPreviewDirection}
  />
);

export default SquareLayoutActionMenu;
