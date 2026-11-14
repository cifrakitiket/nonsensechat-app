using System;
using System.Windows;
using System.Windows.Controls;
using System.Windows.Input;
using System.Windows.Media;
using System.Windows.Shapes;
using System.Windows.Threading;

namespace NonsenseChat.Native {
    public class VoiceMessageView : Border {
        private bool _isPlaying = false;
        private DispatcherTimer _timer;
        private int _currentSec = 0;
        private int _totalSec = 15;
        private TextBlock _timeText;
        private TextBlock _playIcon;
        private StackPanel _waveformStack;

        public VoiceMessageView(long durationMs, bool isOutgoing) {
            _totalSec = (int)Math.Max(3, durationMs / 1000);
            if (_totalSec > 600) _totalSec = 15;

            CornerRadius = new CornerRadius(12);
            Background = new SolidColorBrush(Color.FromArgb(60, 0, 0, 0));
            Padding = new Thickness(10, 6, 12, 6);
            Margin = new Thickness(0, 4, 0, 4);

            var grid = new Grid();
            grid.ColumnDefinitions.Add(new ColumnDefinition { Width = GridLength.Auto });
            grid.ColumnDefinitions.Add(new ColumnDefinition { Width = new GridLength(1, GridUnitType.Star) });

            // Play / Pause Circular Button
            var playBtn = new Border {
                Width = 36,
                Height = 36,
                CornerRadius = new CornerRadius(18),
                Background = isOutgoing ? Theme.AccentGreen : Theme.AccentCyan,
                Cursor = Cursors.Hand,
                Margin = new Thickness(0, 0, 10, 0)
            };

            _playIcon = new TextBlock {
                Text = "▶",
                FontSize = 14,
                Foreground = Brushes.Black,
                FontWeight = FontWeights.Bold,
                HorizontalAlignment = HorizontalAlignment.Center,
                VerticalAlignment = VerticalAlignment.Center,
                Margin = new Thickness(2, 0, 0, 0)
            };
            playBtn.Child = _playIcon;
            Grid.SetColumn(playBtn, 0);
            grid.Children.Add(playBtn);

            // Right side: Waveform + Time
            var rightStack = new StackPanel { VerticalAlignment = VerticalAlignment.Center };

            _waveformStack = new StackPanel {
                Orientation = Orientation.Horizontal,
                Height = 22,
                Margin = new Thickness(0, 0, 0, 4)
            };

            // Procedural waveform bars
            int[] barHeights = new int[] { 8, 14, 20, 12, 18, 22, 16, 10, 15, 20, 12, 17, 21, 14, 8, 16, 19, 11, 7, 14, 18, 12 };
            for (int i = 0; i < barHeights.Length; i++) {
                var bar = new Border {
                    Width = 3,
                    Height = barHeights[i],
                    CornerRadius = new CornerRadius(1.5),
                    Background = new SolidColorBrush(Color.FromArgb(160, 200, 220, 240)),
                    Margin = new Thickness(1.5, 0, 1.5, 0),
                    VerticalAlignment = VerticalAlignment.Center
                };
                _waveformStack.Children.Add(bar);
            }
            rightStack.Children.Add(_waveformStack);

            _timeText = new TextBlock {
                Text = string.Format("0:00 / {0}:{1:D2}", _totalSec / 60, _totalSec % 60),
                FontSize = 11,
                Foreground = Theme.TextSecondary
            };
            rightStack.Children.Add(_timeText);

            Grid.SetColumn(rightStack, 1);
            grid.Children.Add(rightStack);

            this.Child = grid;

            // Timer for simulated playback
            _timer = new DispatcherTimer { Interval = TimeSpan.FromSeconds(1) };
            _timer.Tick += (s, e) => {
                _currentSec++;
                if (_currentSec >= _totalSec) {
                    StopPlayback();
                } else {
                    UpdatePlaybackUI();
                }
            };

            playBtn.MouseLeftButtonDown += (s, e) => {
                if (_isPlaying) {
                    StopPlayback();
                } else {
                    StartPlayback();
                }
                e.Handled = true;
            };
        }

        private void StartPlayback() {
            _isPlaying = true;
            _playIcon.Text = "❚❚";
            _playIcon.Margin = new Thickness(0, 0, 0, 0);
            _timer.Start();
        }

        private void StopPlayback() {
            _isPlaying = false;
            _timer.Stop();
            _currentSec = 0;
            _playIcon.Text = "▶";
            _playIcon.Margin = new Thickness(2, 0, 0, 0);
            _timeText.Text = string.Format("0:00 / {0}:{1:D2}", _totalSec / 60, _totalSec % 60);

            for (int i = 0; i < _waveformStack.Children.Count; i++) {
                var bar = _waveformStack.Children[i] as Border;
                if (bar != null) bar.Background = new SolidColorBrush(Color.FromArgb(160, 200, 220, 240));
            }
        }

        private void UpdatePlaybackUI() {
            _timeText.Text = string.Format("{0}:{1:D2} / {2}:{3:D2}",
                _currentSec / 60, _currentSec % 60, _totalSec / 60, _totalSec % 60);

            double progress = (double)_currentSec / _totalSec;
            int playedBars = (int)(progress * _waveformStack.Children.Count);

            for (int i = 0; i < _waveformStack.Children.Count; i++) {
                var bar = _waveformStack.Children[i] as Border;
                if (bar != null) {
                    bar.Background = (i <= playedBars) ? Theme.AccentGreen : new SolidColorBrush(Color.FromArgb(160, 200, 220, 240));
                }
            }
        }
    }
}
