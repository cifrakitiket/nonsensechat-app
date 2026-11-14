using System;
using System.Collections.Generic;
using System.Windows;
using System.Windows.Controls;
using System.Windows.Input;
using System.Windows.Media;
using System.Windows.Shapes;

namespace NonsenseChat.Native {
    public static class Theme {
        // Core Palette (Obsidian Glassmorphism)
        public static readonly Color BgRootColor = Color.FromRgb(8, 12, 20);           // #080C14
        public static readonly Color BgSidebarColor = Color.FromRgb(13, 18, 30);        // #0D121E
        public static readonly Color BgCardColor = Color.FromRgb(19, 26, 42);           // #131A2A
        public static readonly Color BgCardHoverColor = Color.FromRgb(26, 36, 58);      // #1A243A
        public static readonly Color BgInputColor = Color.FromRgb(15, 22, 36);          // #0F1624
        public static readonly Color BorderSubtleColor = Color.FromRgb(30, 41, 59);     // #1E293B
        public static readonly Color BorderActiveColor = Color.FromRgb(51, 65, 85);     // #334155

        // Accents
        public static readonly Color AccentNeonGreen = Color.FromRgb(0, 255, 136);      // #00FF88
        public static readonly Color AccentNeonCyan = Color.FromRgb(0, 210, 255);       // #00D2FF
        public static readonly Color AccentPurple = Color.FromRgb(139, 92, 246);        // #8B5CF6
        public static readonly Color AccentDanger = Color.FromRgb(239, 68, 68);         // #EF4444
        public static readonly Color TextPrimaryColor = Color.FromRgb(243, 244, 246);   // #F3F4F6
        public static readonly Color TextSecondaryColor = Color.FromRgb(148, 163, 184); // #94A3B8
        public static readonly Color TextMutedColor = Color.FromRgb(100, 116, 139);     // #64748B

        // Chat Bubbles
        public static readonly Color OutgoingBubbleColor = Color.FromRgb(14, 46, 34);   // Emerald Tint
        public static readonly Color OutgoingBorderColor = Color.FromRgb(0, 255, 136);  // Emerald glow
        public static readonly Color IncomingBubbleColor = Color.FromRgb(21, 29, 45);   // Dark Slate
        public static readonly Color IncomingBorderColor = Color.FromRgb(35, 47, 71);

        // Brushes
        public static SolidColorBrush BgRoot = new SolidColorBrush(BgRootColor);
        public static SolidColorBrush BgSidebar = new SolidColorBrush(BgSidebarColor);
        public static SolidColorBrush BgCard = new SolidColorBrush(BgCardColor);
        public static SolidColorBrush BgCardHover = new SolidColorBrush(BgCardHoverColor);
        public static SolidColorBrush BgInput = new SolidColorBrush(BgInputColor);
        public static SolidColorBrush BorderSubtle = new SolidColorBrush(BorderSubtleColor);
        public static SolidColorBrush BorderActive = new SolidColorBrush(BorderActiveColor);
        public static SolidColorBrush AccentGreen = new SolidColorBrush(AccentNeonGreen);
        public static SolidColorBrush AccentCyan = new SolidColorBrush(AccentNeonCyan);
        public static SolidColorBrush TextPrimary = new SolidColorBrush(TextPrimaryColor);
        public static SolidColorBrush TextSecondary = new SolidColorBrush(TextSecondaryColor);
        public static SolidColorBrush TextMuted = new SolidColorBrush(TextMutedColor);
        public static SolidColorBrush OutgoingBubble = new SolidColorBrush(OutgoingBubbleColor);
        public static SolidColorBrush OutgoingBorder = new SolidColorBrush(OutgoingBorderColor);
        public static SolidColorBrush IncomingBubble = new SolidColorBrush(IncomingBubbleColor);
        public static SolidColorBrush IncomingBorder = new SolidColorBrush(IncomingBorderColor);

        // Avatar Gradient Colors
        public static readonly Color[][] AvatarGradients = new Color[][] {
            new Color[] { Color.FromRgb(16, 185, 129), Color.FromRgb(5, 150, 105) },   // Emerald
            new Color[] { Color.FromRgb(59, 130, 246), Color.FromRgb(37, 99, 235) },   // Blue
            new Color[] { Color.FromRgb(139, 92, 246), Color.FromRgb(109, 40, 217) },  // Purple
            new Color[] { Color.FromRgb(236, 72, 153), Color.FromRgb(190, 24, 93) },   // Pink
            new Color[] { Color.FromRgb(245, 158, 11), Color.FromRgb(217, 119, 6) },   // Amber
            new Color[] { Color.FromRgb(6, 182, 212), Color.FromRgb(8, 145, 178) }     // Cyan
        };

        public static SolidColorBrush HexBrush(string hex) {
            try {
                return (SolidColorBrush)(new BrushConverter().ConvertFrom(hex));
            } catch {
                return TextPrimary;
            }
        }

        public static Border CreateAvatar(string initials, double size = 42, int colorSeed = 0, bool isOnline = false) {
            int gradIndex = Math.Abs(colorSeed) % AvatarGradients.Length;
            Color c1 = AvatarGradients[gradIndex][0];
            Color c2 = AvatarGradients[gradIndex][1];

            var container = new Border {
                Width = size,
                Height = size,
                CornerRadius = new CornerRadius(size / 2.0),
                Background = new LinearGradientBrush(c1, c2, new Point(0, 0), new Point(1, 1))
            };

            var grid = new Grid();
            var text = new TextBlock {
                Text = initials,
                Foreground = Brushes.White,
                FontWeight = FontWeights.Bold,
                FontSize = Math.Max(10, size * 0.38),
                HorizontalAlignment = HorizontalAlignment.Center,
                VerticalAlignment = VerticalAlignment.Center
            };
            grid.Children.Add(text);

            if (isOnline) {
                var onlineDot = new Ellipse {
                    Width = Math.Max(8, size * 0.26),
                    Height = Math.Max(8, size * 0.26),
                    Fill = AccentGreen,
                    Stroke = BgSidebar,
                    StrokeThickness = 2,
                    HorizontalAlignment = HorizontalAlignment.Right,
                    VerticalAlignment = VerticalAlignment.Bottom,
                    Margin = new Thickness(0, 0, 1, 1)
                };
                grid.Children.Add(onlineDot);
            }

            container.Child = grid;
            return container;
        }

        public static Button CreateStyledButton(string text, Brush bg = null, Brush fg = null, double height = 36, double radius = 8) {
            bg = bg ?? AccentGreen;
            fg = fg ?? (bg == AccentGreen ? Brushes.Black : TextPrimary);

            var btn = new Button {
                Content = text,
                Height = height,
                Background = bg,
                Foreground = fg,
                FontWeight = FontWeights.SemiBold,
                FontSize = 13,
                Cursor = Cursors.Hand,
                BorderThickness = new Thickness(0)
            };

            var border = new FrameworkElementFactory(typeof(Border));
            border.SetValue(Border.CornerRadiusProperty, new CornerRadius(radius));
            border.SetValue(Border.BackgroundProperty, new TemplateBindingExtension(Button.BackgroundProperty));
            border.SetValue(Border.BorderBrushProperty, new TemplateBindingExtension(Button.BorderBrushProperty));
            border.SetValue(Border.BorderThicknessProperty, new TemplateBindingExtension(Button.BorderThicknessProperty));

            var presenter = new FrameworkElementFactory(typeof(ContentPresenter));
            presenter.SetValue(ContentPresenter.HorizontalAlignmentProperty, HorizontalAlignment.Center);
            presenter.SetValue(ContentPresenter.VerticalAlignmentProperty, VerticalAlignment.Center);
            border.AppendChild(presenter);

            var template = new ControlTemplate(typeof(Button)) { VisualTree = border };
            btn.Template = template;
            return btn;
        }
    }
}
