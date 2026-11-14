using System;
using System.Diagnostics;
using System.Runtime.InteropServices;
using System.Threading;
using System.Windows;

namespace NonsenseChat.Native {
    public static class Program {
        [DllImport("user32.dll")]
        private static extern bool SetForegroundWindow(IntPtr hWnd);

        [DllImport("user32.dll")]
        private static extern bool ShowWindow(IntPtr hWnd, int nCmdShow);

        private const int SW_RESTORE = 9;
        private static Mutex _appMutex;

        [STAThread]
        public static void Main() {
            bool isNewInstance;
            _appMutex = new Mutex(true, "NonsenseChat_Native_PC_SingleInstance", out isNewInstance);

            if (!isNewInstance) {
                // Focus existing instance if already running
                Process current = Process.GetCurrentProcess();
                foreach (Process process in Process.GetProcessesByName(current.ProcessName)) {
                    if (process.Id != current.Id) {
                        ShowWindow(process.MainWindowHandle, SW_RESTORE);
                        SetForegroundWindow(process.MainWindowHandle);
                        break;
                    }
                }
                return;
            }

            try {
                var app = new Application();
                app.ShutdownMode = ShutdownMode.OnMainWindowClose;

                var mainWin = new MainWindow();
                app.Run(mainWin);
            } catch (Exception ex) {
                MessageBox.Show("Критическая ошибка запуска Nonsense Chat:\n\n" + ex.ToString(),
                    "Ошибка Nonsense Chat", MessageBoxButton.OK, MessageBoxImage.Error);
            } finally {
                if (_appMutex != null) {
                    _appMutex.ReleaseMutex();
                    _appMutex.Close();
                }
            }
        }
    }
}
