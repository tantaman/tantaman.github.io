import defaultLayout from './defaultLayout.js';
import mirrorRoomLayout from './mirrorRoomLayout.js';

export const layouts = {
  default: defaultLayout,
  mirrorRoom: mirrorRoomLayout,
};

export default function layout() {
  return (tree, file) => {
    layouts[file.data?.matter?.layout || 'default'](tree, file);
  };
}
