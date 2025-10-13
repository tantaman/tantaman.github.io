import defaultLayout from './defaultLayout.js';
import mirrorRoomLayout from './mirrorRoomLayout.js';
import chatLayout from './chatLayout.js';

export const layouts = {
  default: defaultLayout,
  mirrorRoom: mirrorRoomLayout,
  chat: chatLayout,
};

export default function layout() {
  return (tree, file) => {
    const layoutName = file.data?.matter?.layout || 'default';

    // Add layout-specific CSS if needed
    if (layoutName === 'chat' && file.data?.meta) {
      // Inject chat.css into the document
      if (!file.data.meta.css) {
        file.data.meta.css = [];
      }
      if (!file.data.meta.css.includes('/chat.css')) {
        file.data.meta.css.push('/chat.css');
      }
    }

    layouts[layoutName](tree, file);
  };
}
