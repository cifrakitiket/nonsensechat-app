using System;
using System.Windows;
using System.Windows.Controls;
using System.Windows.Input;
using System.Windows.Media;
using System.Windows.Media.Animation;

namespace NonsenseChat.Native {
    public class PollView : Border {
        public Action<int> OnVoteSelected;

        public PollView(Poll poll, string currentUid, bool isOutgoing) {
            CornerRadius = new CornerRadius(10);
            Background = new SolidColorBrush(Color.FromArgb(120, 10, 15, 26));
            BorderBrush = isOutgoing ? Theme.OutgoingBorder : Theme.BorderSubtle;
            BorderThickness = new Thickness(1);
            Padding = new Thickness(12);
            Margin = new Thickness(0, 4, 0, 4);
            MaxWidth = 420;

            var stack = new StackPanel();

            // Question
            var questionText = new TextBlock {
                Text = "📊 " + (poll.question ?? "Опрос"),
                FontWeight = FontWeights.Bold,
                FontSize = 14,
                Foreground = Theme.TextPrimary,
                TextWrapping = TextWrapping.Wrap,
                Margin = new Thickness(0, 0, 0, 4)
            };
            stack.Children.Add(questionText);

            // Subtitle
            string sub = (poll.anonymous ? "Анонимный опрос" : "Публичный опрос") +
                         (poll.multiple ? " • Выбор нескольких" : "");
            var subText = new TextBlock {
                Text = sub,
                FontSize = 11,
                Foreground = Theme.TextMuted,
                Margin = new Thickness(0, 0, 0, 10)
            };
            stack.Children.Add(subText);

            poll.RecalculateTotal();
            bool hasVoted = poll.HasUserVoted(currentUid);

            // Options
            if (poll.options != null) {
                for (int i = 0; i < poll.options.Count; i++) {
                    int optIndex = i;
                    var opt = poll.options[i];
                    bool userChecked = opt.HasVoted(currentUid);
                    int pct = opt.GetPercentage(poll.totalVotes);

                    var optContainer = new Border {
                        CornerRadius = new CornerRadius(6),
                        Background = new SolidColorBrush(Color.FromArgb(50, 255, 255, 255)),
                        BorderBrush = userChecked ? Theme.AccentGreen : Theme.BorderSubtle,
                        BorderThickness = new Thickness(userChecked ? 1.5 : 1),
                        Margin = new Thickness(0, 3, 0, 3),
                        Height = 36,
                        Cursor = Cursors.Hand
                    };

                    var optGrid = new Grid();

                    // Progress Fill
                    if (hasVoted) {
                        var col1 = new ColumnDefinition { Width = new GridLength(pct, GridUnitType.Star) };
                        var col2 = new ColumnDefinition { Width = new GridLength(100 - pct, GridUnitType.Star) };
                        optGrid.ColumnDefinitions.Add(col1);
                        optGrid.ColumnDefinitions.Add(col2);

                        var progressFill = new Border {
                            Background = userChecked ?
                                new SolidColorBrush(Color.FromArgb(90, 0, 255, 136)) :
                                new SolidColorBrush(Color.FromArgb(60, 0, 210, 255)),
                            CornerRadius = new CornerRadius(5, 0, 0, 5)
                        };
                        Grid.SetColumn(progressFill, 0);
                        optGrid.Children.Add(progressFill);
                    }

                    // Content Overlay
                    var contentGrid = new Grid { Margin = new Thickness(10, 0, 10, 0) };
                    contentGrid.ColumnDefinitions.Add(new ColumnDefinition { Width = new GridLength(1, GridUnitType.Star) });
                    contentGrid.ColumnDefinitions.Add(new ColumnDefinition { Width = GridLength.Auto });

                    var labelStack = new StackPanel {
                        Orientation = Orientation.Horizontal,
                        VerticalAlignment = VerticalAlignment.Center
                    };

                    if (userChecked) {
                        labelStack.Children.Add(new TextBlock {
                            Text = "✓ ",
                            FontWeight = FontWeights.Bold,
                            Foreground = Theme.AccentGreen,
                            FontSize = 12
                        });
                    }

                    labelStack.Children.Add(new TextBlock {
                        Text = opt.text ?? "",
                        FontSize = 13,
                        Foreground = Theme.TextPrimary,
                        VerticalAlignment = VerticalAlignment.Center
                    });

                    Grid.SetColumn(labelStack, 0);
                    contentGrid.Children.Add(labelStack);

                    if (hasVoted) {
                        var pctLabel = new TextBlock {
                            Text = pct + "%",
                            FontWeight = FontWeights.SemiBold,
                            FontSize = 12,
                            Foreground = userChecked ? Theme.AccentGreen : Theme.TextSecondary,
                            VerticalAlignment = VerticalAlignment.Center
                        };
                        Grid.SetColumn(pctLabel, 1);
                        contentGrid.Children.Add(pctLabel);
                    }

                    if (hasVoted) {
                        Grid.SetColumnSpan(contentGrid, 2);
                    }
                    optGrid.Children.Add(contentGrid);
                    optContainer.Child = optGrid;

                    optContainer.MouseLeftButtonDown += (s, e) => {
                        if (OnVoteSelected != null) {
                            OnVoteSelected(optIndex);
                        }
                    };

                    stack.Children.Add(optContainer);
                }
            }

            // Total votes label
            var votesFooter = new TextBlock {
                Text = "Всего голосов: " + poll.totalVotes,
                FontSize = 11,
                Foreground = Theme.TextMuted,
                Margin = new Thickness(0, 8, 0, 0),
                HorizontalAlignment = HorizontalAlignment.Right
            };
            stack.Children.Add(votesFooter);

            this.Child = stack;
        }
    }
}
