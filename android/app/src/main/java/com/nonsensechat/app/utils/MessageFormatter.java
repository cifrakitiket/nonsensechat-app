package com.nonsensechat.app.utils;

import android.content.Context;
import android.graphics.Canvas;
import android.graphics.Color;
import android.graphics.Paint;
import android.graphics.RectF;
import android.os.Build;
import android.os.VibrationEffect;
import android.os.Vibrator;
import android.text.Html;
import android.text.Layout;
import android.text.Spannable;
import android.text.SpannableStringBuilder;
import android.text.Spanned;
import android.text.TextPaint;
import android.text.style.ClickableSpan;
import android.text.style.LeadingMarginSpan;
import android.text.style.LineBackgroundSpan;
import android.text.style.StyleSpan;
import android.view.View;
import android.widget.TextView;
import androidx.annotation.NonNull;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

public class MessageFormatter {

    private static final Pattern BLOCKQUOTE_PATTERN = Pattern.compile("(?i)<blockquote>([\\s\\S]*?)</blockquote>");
    private static final Pattern SPOILER_PATTERN = Pattern.compile("(?i)(?:<span\\s+class=['\"]spoiler['\"]>([\\s\\S]*?)</span>|\\|\\|([\\s\\S]*?)\\|\\|)");
    private static final Pattern BR_PATTERN = Pattern.compile("(?i)<br\\s*/?>");
    private static final Pattern P_PATTERN = Pattern.compile("(?i)</?p>");

    public static CharSequence formatMessage(Context context, String rawText, TextView targetView) {
        if (rawText == null || rawText.trim().isEmpty()) return "";

        String text = rawText;
        // Clean line breaks
        text = BR_PATTERN.matcher(text).replaceAll("\n");
        text = P_PATTERN.matcher(text).replaceAll("\n");

        SpannableStringBuilder ssb = new SpannableStringBuilder();

        // 1. Process <blockquote>
        Matcher bqMatcher = BLOCKQUOTE_PATTERN.matcher(text);
        int lastEnd = 0;

        while (bqMatcher.find()) {
            int start = bqMatcher.start();
            int end = bqMatcher.end();

            // Append prefix text
            if (start > lastEnd) {
                appendFormattedChunk(context, ssb, text.substring(lastEnd, start), targetView);
            }

            // Append Quote Chunk
            String quoteContent = bqMatcher.group(1);
            if (quoteContent != null) {
                quoteContent = quoteContent.trim();
                int qStart = ssb.length();
                if (qStart > 0 && ssb.charAt(qStart - 1) != '\n') {
                    ssb.append("\n");
                    qStart++;
                }

                appendFormattedChunk(context, ssb, quoteContent, targetView);

                int qEnd = ssb.length();
                if (qEnd > qStart) {
                    // Apply TelegramQuoteSpan
                    int stripeColor = Color.parseColor("#00D2FF");
                    int bgColor = Color.parseColor("#142234");
                    ssb.setSpan(new TelegramQuoteSpan(stripeColor, bgColor, dpToPx(context, 3), dpToPx(context, 10)), qStart, qEnd, Spanned.SPAN_EXCLUSIVE_EXCLUSIVE);
                    ssb.setSpan(new StyleSpan(android.graphics.Typeface.ITALIC), qStart, qEnd, Spanned.SPAN_EXCLUSIVE_EXCLUSIVE);
                    ssb.append("\n");
                }
            }

            lastEnd = end;
        }

        if (lastEnd < text.length()) {
            appendFormattedChunk(context, ssb, text.substring(lastEnd), targetView);
        }

        // Trim trailing newlines
        while (ssb.length() > 0 && ssb.charAt(ssb.length() - 1) == '\n') {
            ssb.delete(ssb.length() - 1, ssb.length());
        }

        return ssb;
    }

    private static void appendFormattedChunk(Context context, SpannableStringBuilder ssb, String rawChunk, TextView targetView) {
        if (rawChunk == null || rawChunk.isEmpty()) return;

        // Parse spoilers ||text|| or <span class="spoiler">text</span>
        Matcher spMatcher = SPOILER_PATTERN.matcher(rawChunk);
        int lastIdx = 0;

        while (spMatcher.find()) {
            int start = spMatcher.start();
            int end = spMatcher.end();

            if (start > lastIdx) {
                appendHtmlText(ssb, rawChunk.substring(lastIdx, start));
            }

            String spoilerContent = spMatcher.group(1) != null ? spMatcher.group(1) : spMatcher.group(2);
            if (spoilerContent != null) {
                int sStart = ssb.length();
                appendHtmlText(ssb, spoilerContent);
                int sEnd = ssb.length();
                if (sEnd > sStart) {
                    ssb.setSpan(new TelegramTextSpoilerSpan(context, targetView), sStart, sEnd, Spanned.SPAN_EXCLUSIVE_EXCLUSIVE);
                }
            }

            lastIdx = end;
        }

        if (lastIdx < rawChunk.length()) {
            appendHtmlText(ssb, rawChunk.substring(lastIdx));
        }
    }

    private static void appendHtmlText(SpannableStringBuilder ssb, String text) {
        if (text == null || text.isEmpty()) return;
        Spanned spanned;
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.N) {
            spanned = Html.fromHtml(text, Html.FROM_HTML_MODE_COMPACT);
        } else {
            spanned = Html.fromHtml(text);
        }
        ssb.append(spanned);
    }

    public static String stripHtmlForPreview(String rawText) {
        if (rawText == null || rawText.trim().isEmpty()) return "Нет сообщений";
        String clean = rawText;
        clean = BLOCKQUOTE_PATTERN.matcher(clean).replaceAll("$1");
        clean = SPOILER_PATTERN.matcher(clean).replaceAll("$1$2");
        clean = BR_PATTERN.matcher(clean).replaceAll(" ");
        clean = clean.replaceAll("<[^>]*>", " ");
        clean = clean.replaceAll("\\s+", " ").trim();
        return clean.isEmpty() ? "Сообщение" : clean;
    }

    private static int dpToPx(Context context, int dp) {
        return Math.round(dp * context.getResources().getDisplayMetrics().density);
    }

    // ── Custom Telegram Quote Span ──
    public static class TelegramQuoteSpan implements LeadingMarginSpan, LineBackgroundSpan {
        private final int stripeColor;
        private final int backgroundColor;
        private final int stripeWidth;
        private final int gap;
        private final RectF rectF = new RectF();

        public TelegramQuoteSpan(int stripeColor, int backgroundColor, int stripeWidth, int gap) {
            this.stripeColor = stripeColor;
            this.backgroundColor = backgroundColor;
            this.stripeWidth = stripeWidth;
            this.gap = gap;
        }

        @Override
        public int getLeadingMargin(boolean first) {
            return stripeWidth + gap;
        }

        @Override
        public void drawLeadingMargin(Canvas c, Paint p, int x, int dir, int top, int baseline, int bottom,
                                      CharSequence text, int start, int end, boolean first, Layout layout) {
            Paint.Style style = p.getStyle();
            int color = p.getColor();

            p.setStyle(Paint.Style.FILL);
            p.setColor(stripeColor);
            rectF.set(x, top + 2, x + dir * stripeWidth, bottom - 2);
            c.drawRoundRect(rectF, 4, 4, p);

            p.setStyle(style);
            p.setColor(color);
        }

        @Override
        public void drawBackground(Canvas c, Paint p, int left, int right, int top, int baseline, int bottom,
                                   CharSequence text, int start, int end, int lnum) {
            int color = p.getColor();
            p.setColor(backgroundColor);
            rectF.set(left, top + 1, right, bottom - 1);
            c.drawRoundRect(rectF, 6, 6, p);
            p.setColor(color);
        }
    }

    // ── Custom Telegram Clickable Text Spoiler Span ──
    public static class TelegramTextSpoilerSpan extends ClickableSpan {
        private boolean isRevealed = false;
        private final Context context;
        private final TextView targetView;

        public TelegramTextSpoilerSpan(Context context, TextView targetView) {
            this.context = context;
            this.targetView = targetView;
        }

        @Override
        public void onClick(@NonNull View widget) {
            if (!isRevealed) {
                isRevealed = true;
                try {
                    Vibrator vibrator = (Vibrator) context.getSystemService(Context.VIBRATOR_SERVICE);
                    if (vibrator != null && vibrator.hasVibrator()) {
                        vibrator.vibrate(VibrationEffect.createOneShot(30, VibrationEffect.DEFAULT_AMPLITUDE));
                    }
                } catch (Exception ignored) {}
                if (targetView != null) targetView.invalidate();
            }
        }

        @Override
        public void updateDrawState(@NonNull TextPaint ds) {
            if (!isRevealed) {
                ds.bgColor = Color.parseColor("#384B66");
                ds.setColor(Color.TRANSPARENT);
            } else {
                ds.bgColor = Color.TRANSPARENT;
                ds.setColor(Color.parseColor("#F8FAFC"));
            }
            ds.setUnderlineText(false);
        }
    }
}
