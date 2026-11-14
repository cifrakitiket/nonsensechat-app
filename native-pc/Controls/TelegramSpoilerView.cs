using System;
using System.Windows;
using System.Windows.Controls;
using System.Windows.Input;
using System.Windows.Media;
using System.Windows.Media.Animation;

namespace NonsenseChat.Native {
    public class TelegramSpoilerView : ContentControl {
        private Border _maskOverlay;
        private bool _isRevealed = false;

        public bool IsRevealed {
            get { return _isRevealed; }
            set {
                _isRevealed = value;
                UpdateVisibility();
            }
        }

        public TelegramSpoilerView(UIElement content, bool startRevealed = false) {
            _isRevealed = startRevealed;
            Margin = new Thickness(0, 2, 0, 2);

            var rootGrid = new Grid {
                Cursor = Cursors.Hand
            };

            var contentContainer = new Border {
                Child = content
            };
            rootGrid.Children.Add(contentContainer);

            // Shimmer / Particle Overlay
            _maskOverlay = new Border {
                Background = new SolidColorBrush(Color.FromArgb(235, 15, 23, 42)),
                BorderBrush = Theme.AccentCyan,
                BorderThickness = new Thickness(1),
                CornerRadius = new CornerRadius(6),
                Padding = new Thickness(8, 4, 8, 4)
            };

            var maskStack = new StackPanel {
                Orientation = Orientation.Horizontal,
                HorizontalAlignment = HorizontalAlignment.Center,
                VerticalAlignment = VerticalAlignment.Center
            };

            var iconText = new TextBlock {
                Text = "👁 Спойлер  ",
                FontSize = 11,
                FontWeight = FontWeights.Bold,
                Foreground = Theme.AccentCyan
            };

            var hintText = new TextBlock {
                Text = "✦ нажмите для просмотра ✦",
                FontSize = 11,
                Foreground = Theme.TextSecondary
            };

            maskStack.Children.Add(iconText);
            maskStack.Children.Add(hintText);
            _maskOverlay.Child = maskStack;

            rootGrid.Children.Add(_maskOverlay);
            this.Content = rootGrid;

            rootGrid.MouseLeftButtonDown += (s, e) => {
                if (!_isRevealed) {
                    RevealWithAnimation();
                    e.Handled = true;
                }
            };

            UpdateVisibility();
        }

        private void RevealWithAnimation() {
            _isRevealed = true;
            var anim = new DoubleAnimation {
                From = 1.0,
                To = 0.0,
                Duration = TimeSpan.FromMilliseconds(220),
                EasingFunction = new QuadraticEase { EasingMode = EasingMode.EaseOut }
            };
            anim.Completed += (s, e) => {
                _maskOverlay.Visibility = Visibility.Collapsed;
            };
            _maskOverlay.BeginAnimation(UIElement.OpacityProperty, anim);
        }

        private void UpdateVisibility() {
            if (_isRevealed) {
                _maskOverlay.Visibility = Visibility.Collapsed;
                _maskOverlay.Opacity = 0;
            } else {
                _maskOverlay.Visibility = Visibility.Visible;
                _maskOverlay.Opacity = 1;
            }
        }
    }
}
