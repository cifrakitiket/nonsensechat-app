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

    // Matches <blockquote>, <blockqoute>, case-insensitive with any attributes or spaces
    private static final Pattern BLOCKQUOTE_TAG_PATTERN = Pattern.compile("(?i)<(?:blockquote|blockqoute)[^>]*>([\\s\\S]*?)</(?:blockquote|blockqoute)>");
    private static final Pattern SPOILER_PATTERN = Pattern.compile("(?i)(?:<span\\s+class=['\"]spoiler['\"][^>]*>([\\s\\S]*?)</span>|\\|\\|([\\s\\S]*?)\\|\\|)");
    private static final Pattern BR_PATTERN = Pattern.compile("(?i)<br\\s*/?>");
    private static final Pattern P_PATTERN = Pattern.compile("(?i)</?p[^>]*>");

    public static CharSequence formatMessage(Context context, String rawText, TextView targetView) {
        if (rawText == null || rawText.trim().isEmpty()) return "";

        String text = rawText;
        // Clean line breaks & paragraphs
        text = BR_PATTERN.matcher(text).replaceAll("\n");
        text = P_PATTERN.matcher(text).replaceAll("\n");

        SpannableStringBuilder ssb = new SpannableStringBuilder();

        // 1. Process <blockquote> and <blockqoute>
        Matcher bqMatcher = BLOCKQUOTE_TAG_PATTERN.matcher(text);
        int lastEnd = 0;

        while (bqMatcher.find()) {
            int start = bqMatcher.start();
            int end = bqMatcher.end();

            // Append prefix text before quote
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
                    // Telegram-style Quote Span (Cyan vertical stripe + dark tinted bubble background)
                    int stripeColor = Color.parseColor("#00D2FF");
                    int bgColor = Color.parseColor("#152336");
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

        // Clean any leftover unclosed tags or stray html artifacts
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
        // Make sure orphan or weird HTML tags don't show up as raw code
        String sanitized = text.replaceAll("(?i)<(?!/?(b|i|u|s|strike|strong|em|a|code|pre)\\b)[^>]*>", "");
        Spanned spanned;
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.N) {
            spanned = Html.fromHtml(sanitized, Html.FROM_HTML_MODE_COMPACT);
        } else {
            spanned = Html.fromHtml(sanitized);
        }
        ssb.append(spanned);
    }

    public static String stripHtmlForPreview(String rawText) {
        if (rawText == null || rawText.trim().isEmpty()) return "Нет сообщений";
        String clean = rawText;
        clean = BLOCKQUOTE_TAG_PATTERN.matcher(clean).replaceAll("$1");
        clean = SPOILER_PATTERN.matcher(clean).replaceAll("$1$2");
        clean = BR_PATTERN.matcher(clean).replaceAll(" ");
        clean = clean.replaceAll("<[^>]*>", " ");
        clean = clean.replaceAll("\\s+", " ").trim();
        return clean.isEmpty() ? "Сообщение" : clean;
    }

    private static int dpToPx(Context context, int dp) {
        return (int) (dp * context.getResources().getDisplayMetrics().density + 0.5f);
    }

    public static class TelegramQuoteSpan implements LeadingMarginSpan, LineBackgroundSpan {
        private final int stripeColor;
        private final int bgColor;
        private final int stripeWidth;
        private final int gap;
        private final Paint stripePaint = new Paint(Paint.ANTI_ALIAS_FLAG);
        private final Paint bgPaint = new Paint(Paint.ANTI_ALIAS_FLAG);
        private final RectF rectF = new RectF();

        public TelegramQuoteSpan(int stripeColor, int bgColor, int stripeWidth, int gap) {
            this.stripeColor = stripeColor;
            this.bgColor = bgColor;
            this.stripeWidth = stripeWidth;
            this.gap = gap;
            stripePaint.setStyle(Paint.Style.FILL);
            bgPaint.setStyle(Paint.Style.FILL);
        }

        @Override
        public int getLeadingMargin(boolean first) {
            return stripeWidth + gap;
        }

        @Override
        public void drawLeadingMargin(Canvas c, Paint p, int x, int dir, int top, int baseline, int bottom,
                                     CharSequence text, int start, int end, boolean first, Layout layout) {
            stripePaint.setColor(stripeColor);
            rectF.set(x, top + 2, x + stripeWidth, bottom - 2);
            c.drawRoundRect(rectF, 4, 4, stripePaint);
        }

        @Override
        public void drawBackground(Canvas c, Paint p, int left, int right, int top, int baseline, int bottom,
                                   CharSequence text, int start, int end, int lnum) {
            bgPaint.setColor(bgColor);
            rectF.set(left + 2, top + 1, right - 2, bottom - 1);
            c.drawRoundRect(rectF, 8, 8, bgPaint);
        }
    }

    public static class TelegramTextSpoilerSpan extends ClickableSpan {
        private final Context context;
        private final TextView targetView;
        private boolean revealed = false;

        public TelegramTextSpoilerSpan(Context context, TextView targetView) {
            this.context = context;
            this.targetView = targetView;
        }

        @Override
        public void onClick(@NonNull View widget) {
            if (!revealed) {
                revealed = true;
                vibrate(context);
                if (targetView != null) {
                    targetView.invalidate();
                } else {
                    widget.invalidate();
                }
            }
        }

        @Override
        public void updateDrawState(@NonNull TextPaint ds) {
            if (!revealed) {
                ds.bgColor = Color.parseColor("#334155");
                ds.setColor(Color.TRANSPARENT);
            } else {
                ds.bgColor = Color.TRANSPARENT;
                ds.setColor(Color.WHITE);
            }
            ds.setUnderlineText(false);
        }

        private void vibrate(Context ctx) {
            try {
                Vibrator v = (Vibrator) ctx.getSystemService(Context.VIBRATOR_SERVICE);
                if (v != null && v.hasVibrator()) {
                    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                        v.vibrate(VibrationEffect.createOneShot(20, VibrationEffect.DEFAULT_AMPLITUDE));
                    } else {
                        v.vibrate(20);
                    }
                }
            } catch (Exception ignored) {}
        }
    }
}
