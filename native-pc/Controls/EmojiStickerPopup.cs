using System;
using System.Windows;
using System.Windows.Controls;
using System.Windows.Controls.Primitives;
using System.Windows.Input;
using System.Windows.Media;

namespace NonsenseChat.Native {
    public class EmojiStickerPopup : Popup {
        public Action<string> OnEmojiSelected;

        private static readonly string[] Emojis = new string[] {
            "😀", "😃", "😄", "😁", "😆", "😅", "😂", "🤣", "😊", "😇",
            "🙂", "🙃", "😉", "😌", "😍", "🥰", "😘", "😗", "😙", "😚",
            "😋", "😛", "😝", "😜", "🤪", "🤨", "🧐", "🤓", "😎", "🥸",
            "🤩", "🥳", "😏", "😒", "😞", "😔", "😟", "😕", "🙁", "☹️",
            "😣", "😖", "😫", "😩", "🥺", "😢", "😭", "😮‍💨", "😤", "😠",
            "😡", "🤬", "🤯", "😳", "🥵", "🥶", "😱", "😨", "😰", "😥",
            "😓", "🤗", "🤔", "🫣", "🤭", "🤫", "🤥", "😶", "😐", "😑",
            "😬", "🫠", "🙄", "😯", "😦", "😧", "😮", "😲", "🥱", "😴",
            "🤤", "😪", "😵", "😵‍💫", "🤐", "🥴", "🤢", "🤮", "🤧", "😷",
            "👍", "👎", "👌", "✌️", "🤞", "🫰", "🤟", "🤘", "🤙", "👈",
            "👉", "👆", "👇", "✋", "🤚", "🖐️", "✋", "🖖", "👋", "🤙",
            "❤️", "🧡", "💛", "💚", "💙", "💜", "🖤", "🤍", "🤎", "💔",
            "🔥", "✨", "🌟", "💫", "💥", "💯", "💢", "💨", "💦", "💧",
            "🚀", "🛸", "🎉", "🎊", "🎁", "🎈", "🏆", "🥇", "🥈", "🥉",
            "🤖", "👾", "💩", "👻", "💀", "☠️", "🤡", "👹", "👺", "👽"
        };

        public EmojiStickerPopup() {
            StaysOpen = false;
            AllowsTransparency = true;
            Placement = PlacementMode.Top;

            var rootBorder = new Border {
                Width = 320,
                Height = 260,
                CornerRadius = new CornerRadius(12),
                Background = Theme.BgCard,
                BorderBrush = Theme.BorderActive,
                BorderThickness = new Thickness(1),
                Padding = new Thickness(8)
            };

            var grid = new Grid();
            grid.RowDefinitions.Add(new RowDefinition { Height = GridLength.Auto });
            grid.RowDefinitions.Add(new RowDefinition { Height = new GridLength(1, GridUnitType.Star) });

            // Header title
            var header = new TextBlock {
                Text = "Эмодзи и реакции",
                FontWeight = FontWeights.Bold,
                FontSize = 12,
                Foreground = Theme.TextSecondary,
                Margin = new Thickness(6, 4, 6, 8)
            };
            Grid.SetRow(header, 0);
            grid.Children.Add(header);

            // Scrollable Emoji Grid
            var scroll = new ScrollViewer {
                VerticalScrollBarVisibility = ScrollBarVisibility.Auto,
                HorizontalScrollBarVisibility = ScrollBarVisibility.Disabled
            };

            var wrap = new WrapPanel {
                HorizontalAlignment = HorizontalAlignment.Center
            };

            foreach (var emoji in Emojis) {
                string em = emoji;
                var itemBorder = new Border {
                    Width = 34,
                    Height = 34,
                    CornerRadius = new CornerRadius(6),
                    Background = Brushes.Transparent,
                    Cursor = Cursors.Hand,
                    Margin = new Thickness(2)
                };

                var text = new TextBlock {
                    Text = em,
                    FontSize = 18,
                    HorizontalAlignment = HorizontalAlignment.Center,
                    VerticalAlignment = VerticalAlignment.Center
                };
                itemBorder.Child = text;

                itemBorder.MouseEnter += (s, e) => {
                    itemBorder.Background = Theme.BgCardHover;
                };
                itemBorder.MouseLeave += (s, e) => {
                    itemBorder.Background = Brushes.Transparent;
                };
                itemBorder.MouseLeftButtonDown += (s, e) => {
                    if (OnEmojiSelected != null) {
                        OnEmojiSelected(em);
                    }
                    IsOpen = false;
                };

                wrap.Children.Add(itemBorder);
            }

            scroll.Content = wrap;
            Grid.SetRow(scroll, 1);
            grid.Children.Add(scroll);

            rootBorder.Child = grid;
            this.Child = rootBorder;
        }
    }
}
