const { contextBridge, ipcRenderer } = require('electron');

const desktopBridge = {
  notify: (data) => {
    ipcRenderer.send('show-notification', data);
  }
};

try {
  contextBridge.exposeInMainWorld('NonsenseDesktop', desktopBridge);
  contextBridge.exposeInMainWorld('electronAPI', {
    sendNotification: (title, options) => {
      ipcRenderer.send('show-notification', { 
        title, 
        body: options ? options.body : '', 
        chatId: options && options.data ? options.data.chatId : null 
      });
    }
  });
} catch(e) {}
