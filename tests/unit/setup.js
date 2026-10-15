// Mock Electron app for unit tests
jest.mock("electron", () => ({
  app: {
    getPath: jest.fn((name) => {
      const paths = {
        userData: "/tmp/crossplatform-test",
        temp: "/tmp",
      };
      return paths[name] || "/tmp";
    }),
    getName: jest.fn(() => "CrossPlatform"),
    getVersion: jest.fn(() => "1.0.0"),
    isPackaged: false,
    setName: jest.fn(),
    on: jest.fn(),
    whenReady: jest.fn(),
    quit: jest.fn(),
  },
  BrowserWindow: jest.fn(),
  ipcMain: {
    handle: jest.fn(),
    on: jest.fn(),
  },
  dialog: {
    showOpenDialog: jest.fn(),
    showSaveDialog: jest.fn(),
  },
  Menu: {
    setApplicationMenu: jest.fn(),
    buildFromTemplate: jest.fn(),
  },
  Notification: jest.fn(),
}));
