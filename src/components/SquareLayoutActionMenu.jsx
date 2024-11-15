import BaseActionMenu from './BaseActionMenu';

const buttonStyles = [
  { top: -40, left: 40, transform: 'translate(0%, -50%)' },      // Top right
  { top: -40, left: -40, transform: 'translate(-100%, -50%)' },  // Top left
  { top: 40, left: 40, transform: 'translate(0%, -50%)' },       // Bottom right
  { top: 40, left: -40, transform: 'translate(-100%, -50%)' }    // Bottom left
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
