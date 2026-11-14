using System;
using System.Windows;
using System.Windows.Controls;
using System.Windows.Input;
using System.Windows.Media;

namespace NonsenseChat.Native {
    public class AuthWindow : Window {
        private TextBox _emailBox;
        private PasswordBox _passBox;
        private TextBox _nameBox;
        private TextBlock _errorLabel;
        private bool _isSignUp = false;
        private StackPanel _nameGroup;
        private Button _submitBtn;
        private TextBlock _switchModeText;

        public bool IsSuccess { get; private set; }

        public AuthWindow() {
            Title = "Авторизация — Nonsense Chat";
            Width = 400;
            Height = 420;
            WindowStartupLocation = WindowStartupLocation.CenterScreen;
            WindowStyle = WindowStyle.None;
            AllowsTransparency = true;
            Background = Brushes.Transparent;
            ResizeMode = ResizeMode.NoResize;

            var outerBorder = new Border {
                CornerRadius = new CornerRadius(16),
                Background = Theme.BgRoot,
                BorderBrush = Theme.BorderActive,
                BorderThickness = new Thickness(1),
                Padding = new Thickness(24)
            };

            var mainStack = new StackPanel();

            // Header with close button
            var headerGrid = new Grid();
            headerGrid.ColumnDefinitions.Add(new ColumnDefinition { Width = new GridLength(1, GridUnitType.Star) });
            headerGrid.ColumnDefinitions.Add(new ColumnDefinition { Width = GridLength.Auto });

            var titleStack = new StackPanel { Orientation = Orientation.Horizontal };
            titleStack.Children.Add(new TextBlock {
                Text = "⚡",
                FontSize = 20,
                Margin = new Thickness(0, 0, 8, 0)
            });
            titleStack.Children.Add(new TextBlock {
                Text = "Nonsense Chat",
                FontSize = 18,
                FontWeight = FontWeights.Bold,
                Foreground = Theme.TextPrimary
            });
            Grid.SetColumn(titleStack, 0);
            headerGrid.Children.Add(titleStack);

            var closeBtn = new TextBlock {
                Text = "✕",
                FontSize = 16,
                Foreground = Theme.TextMuted,
                Cursor = Cursors.Hand,
                VerticalAlignment = VerticalAlignment.Center
            };
            closeBtn.MouseLeftButtonDown += (s, e) => {
                IsSuccess = false;
                Close();
            };
            closeBtn.MouseEnter += (s, e) => { closeBtn.Foreground = Theme.HexBrush("#EF4444"); };
            closeBtn.MouseLeave += (s, e) => { closeBtn.Foreground = Theme.TextMuted; };
            Grid.SetColumn(closeBtn, 1);
            headerGrid.Children.Add(closeBtn);

            mainStack.Children.Add(headerGrid);

            // Subtitle
            var subtitle = new TextBlock {
                Text = "Вход в единый аккаунт Nonsense Chat",
                FontSize = 12,
                Foreground = Theme.TextSecondary,
                Margin = new Thickness(0, 4, 0, 16)
            };
            mainStack.Children.Add(subtitle);

            // Error Label
            _errorLabel = new TextBlock {
                Text = "",
                FontSize = 12,
                Foreground = Theme.HexBrush("#EF4444"),
                Margin = new Thickness(0, 0, 0, 10),
                Visibility = Visibility.Collapsed
            };
            mainStack.Children.Add(_errorLabel);

            // Name Field (only for signup)
            _nameGroup = new StackPanel { Visibility = Visibility.Collapsed, Margin = new Thickness(0, 0, 0, 12) };
            _nameGroup.Children.Add(new TextBlock {
                Text = "Ваше имя / Никнейм",
                FontSize = 12,
                Foreground = Theme.TextSecondary,
                Margin = new Thickness(0, 0, 0, 4)
            });
            _nameBox = new TextBox {
                Height = 36,
                Background = Theme.BgInput,
                Foreground = Theme.TextPrimary,
                BorderBrush = Theme.BorderSubtle,
                BorderThickness = new Thickness(1),
                Padding = new Thickness(8, 4, 8, 4),
                FontSize = 13,
                VerticalContentAlignment = VerticalAlignment.Center
            };
            _nameGroup.Children.Add(_nameBox);
            mainStack.Children.Add(_nameGroup);

            // Email Field
            var emailGroup = new StackPanel { Margin = new Thickness(0, 0, 0, 12) };
            emailGroup.Children.Add(new TextBlock {
                Text = "Электронная почта",
                FontSize = 12,
                Foreground = Theme.TextSecondary,
                Margin = new Thickness(0, 0, 0, 4)
            });
            _emailBox = new TextBox {
                Height = 36,
                Background = Theme.BgInput,
                Foreground = Theme.TextPrimary,
                BorderBrush = Theme.BorderSubtle,
                BorderThickness = new Thickness(1),
                Padding = new Thickness(8, 4, 8, 4),
                FontSize = 13,
                VerticalContentAlignment = VerticalAlignment.Center
            };
            emailGroup.Children.Add(_emailBox);
            mainStack.Children.Add(emailGroup);

            // Password Field
            var passGroup = new StackPanel { Margin = new Thickness(0, 0, 0, 18) };
            passGroup.Children.Add(new TextBlock {
                Text = "Пароль",
                FontSize = 12,
                Foreground = Theme.TextSecondary,
                Margin = new Thickness(0, 0, 0, 4)
            });
            _passBox = new PasswordBox {
                Height = 36,
                Background = Theme.BgInput,
                Foreground = Theme.TextPrimary,
                BorderBrush = Theme.BorderSubtle,
                BorderThickness = new Thickness(1),
                Padding = new Thickness(8, 4, 8, 4),
                FontSize = 13,
                VerticalContentAlignment = VerticalAlignment.Center
            };
            passGroup.Children.Add(_passBox);
            mainStack.Children.Add(passGroup);

            // Submit Button
            _submitBtn = Theme.CreateStyledButton("Войти в аккаунт", Theme.AccentGreen, Brushes.Black, 38, 8);
            _submitBtn.Click += async (s, e) => {
                _errorLabel.Visibility = Visibility.Collapsed;
                string email = _emailBox.Text.Trim();
                string pass = _passBox.Password;

                if (string.IsNullOrEmpty(email) || string.IsNullOrEmpty(pass)) {
                    ShowError("Пожалуйста, заполните почту и пароль");
                    return;
                }

                _submitBtn.IsEnabled = false;
                _submitBtn.Content = "Проверка данных...";

                if (_isSignUp) {
                    string name = _nameBox.Text.Trim();
                    if (string.IsNullOrEmpty(name)) name = email.Split('@')[0];
                    bool ok = await BackendService.Instance.SignUpFirebaseAsync(email, pass, name);
                    if (ok) {
                        IsSuccess = true;
                        Close();
                    } else {
                        ShowError("Ошибка регистрации. Возможно, почта уже занята или пароль короче 6 символов.");
                    }
                } else {
                    bool ok = await BackendService.Instance.SignInFirebaseAsync(email, pass);
                    if (ok) {
                        IsSuccess = true;
                        Close();
                    } else {
                        ShowError("Неверный адрес почты или пароль");
                    }
                }

                _submitBtn.IsEnabled = true;
                _submitBtn.Content = _isSignUp ? "Создать аккаунт" : "Войти в аккаунт";
            };
            mainStack.Children.Add(_submitBtn);

            // Switch Mode Text (Login <-> Register)
            _switchModeText = new TextBlock {
                Text = "Нет аккаунта? Зарегистрироваться",
                FontSize = 12,
                Foreground = Theme.AccentCyan,
                Cursor = Cursors.Hand,
                HorizontalAlignment = HorizontalAlignment.Center,
                Margin = new Thickness(0, 14, 0, 0)
            };
            _switchModeText.MouseLeftButtonDown += (s, e) => {
                _isSignUp = !_isSignUp;
                _nameGroup.Visibility = _isSignUp ? Visibility.Visible : Visibility.Collapsed;
                _submitBtn.Content = _isSignUp ? "Создать аккаунт" : "Войти в аккаунт";
                _switchModeText.Text = _isSignUp ? "Уже есть аккаунт? Войти" : "Нет аккаунта? Зарегистрироваться";
                Height = _isSignUp ? 480 : 420;
            };
            mainStack.Children.Add(_switchModeText);

            outerBorder.Child = mainStack;
            this.Content = outerBorder;

            outerBorder.MouseLeftButtonDown += (s, e) => {
                if (e.LeftButton == MouseButtonState.Pressed) {
                    DragMove();
                }
            };
        }

        private void ShowError(string msg) {
            _errorLabel.Text = "⚠ " + msg;
            _errorLabel.Visibility = Visibility.Visible;
        }
    }
}
