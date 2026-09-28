// server/apply-telegram-perfection.js
const fs = require('fs');
const path = require('path');

const androidRoot = path.join(__dirname, '..', 'android');

function writeAndroidFile(relPath, content) {
  const fullPath = path.join(androidRoot, relPath);
  fs.mkdirSync(path.dirname(fullPath), { recursive: true });
  fs.writeFileSync(fullPath, content.trim() + '\n', 'utf8');
  console.log('✓ Applied:', relPath);
}

console.log('Applying Telegram-style UI perfection to Android Native Java port...');

// ════════════════════════════════════════════════════════════════════════
// 1. MessageFormatter.java: Quotes, Spoilers, HTML decoding, Linkify
// ════════════════════════════════════════════════════════════════════════

writeAndroidFile('app/src/main/java/com/nonsensechat/app/utils/MessageFormatter.java', `package com.nonsensechat.app.utils;

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

    private static final Pattern BLOCKQUOTE_PATTERN = Pattern.compile("(?i)<blockquote>([\\\\s\\\\S]*?)</blockquote>");
    private static final Pattern SPOILER_PATTERN = Pattern.compile("(?i)(?:<span\\\\s+class=['\\\"]spoiler['\\\"]>([\\\\s\\\\S]*?)</span>|\\\\|\\\\|([\\\\s\\\\S]*?)\\\\|\\\\|)");
    private static final Pattern BR_PATTERN = Pattern.compile("(?i)<br\\\\s*/?>");
    private static final Pattern P_PATTERN = Pattern.compile("(?i)</?p>");

    public static CharSequence formatMessage(Context context, String rawText, TextView targetView) {
        if (rawText == null || rawText.trim().isEmpty()) return "";

        String text = rawText;
        // Clean line breaks
        text = BR_PATTERN.matcher(text).replaceAll("\\n");
        text = P_PATTERN.matcher(text).replaceAll("\\n");

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
                if (qStart > 0 && ssb.charAt(qStart - 1) != '\\n') {
                    ssb.append("\\n");
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
                    ssb.append("\\n");
                }
            }

            lastEnd = end;
        }

        if (lastEnd < text.length()) {
            appendFormattedChunk(context, ssb, text.substring(lastEnd), targetView);
        }

        // Trim trailing newlines
        while (ssb.length() > 0 && ssb.charAt(ssb.length() - 1) == '\\n') {
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
        clean = clean.replaceAll("\\\\s+", " ").trim();
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
`);

// ════════════════════════════════════════════════════════════════════════
// 2. AvatarView.java: Fav Mode (Bookmark/Cloud on Cyan), Precise Online Dot
// ════════════════════════════════════════════════════════════════════════

writeAndroidFile('app/src/main/java/com/nonsensechat/app/ui/custom/AvatarView.java', `package com.nonsensechat.app.ui.custom;

import android.content.Context;
import android.graphics.Canvas;
import android.graphics.Color;
import android.graphics.Paint;
import android.graphics.Path;
import android.graphics.Rect;
import android.graphics.Typeface;
import android.util.AttributeSet;
import androidx.appcompat.widget.AppCompatImageView;
import com.bumptech.glide.Glide;

public class AvatarView extends AppCompatImageView {
    private boolean isOnline = false;
    private boolean isFav = false;
    private String initials = "";
    private final Paint bgPaint = new Paint(Paint.ANTI_ALIAS_FLAG);
    private final Paint textPaint = new Paint(Paint.ANTI_ALIAS_FLAG);
    private final Paint onlinePaint = new Paint(Paint.ANTI_ALIAS_FLAG);
    private final Paint onlineStrokePaint = new Paint(Paint.ANTI_ALIAS_FLAG);
    private final Paint bookmarkPaint = new Paint(Paint.ANTI_ALIAS_FLAG);
    private final Rect textBounds = new Rect();
    private final Path bookmarkPath = new Path();

    private static final int[] PALETTE = {
        Color.parseColor("#38BDF8"), // Cyan
        Color.parseColor("#10B981"), // Emerald
        Color.parseColor("#6366F1"), // Indigo
        Color.parseColor("#8B5CF6"), // Purple
        Color.parseColor("#EC4899"), // Pink
        Color.parseColor("#F59E0B")  // Amber
    };

    public AvatarView(Context context) {
        this(context, null);
    }

    public AvatarView(Context context, AttributeSet attrs) {
        this(context, attrs, 0);
    }

    public AvatarView(Context context, AttributeSet attrs, int defStyleAttr) {
        super(context, attrs, defStyleAttr);
        init();
    }

    private void init() {
        textPaint.setColor(Color.WHITE);
        textPaint.setTextAlign(Paint.Align.CENTER);
        textPaint.setTypeface(Typeface.create("sans-serif-medium", Typeface.BOLD));

        onlinePaint.setColor(Color.parseColor("#22C55E"));
        onlineStrokePaint.setColor(Color.parseColor("#080C14"));
        onlineStrokePaint.setStyle(Paint.Style.STROKE);

        bookmarkPaint.setColor(Color.WHITE);
        bookmarkPaint.setStyle(Paint.Style.FILL);
    }

    public void setUser(String name, String avatarUrl, boolean online) {
        this.isOnline = online;
        this.isFav = false;

        if (name != null && !name.trim().isEmpty()) {
            this.initials = name.substring(0, Math.min(2, name.length())).toUpperCase();
            int colorIndex = Math.abs(name.hashCode()) % PALETTE.length;
            bgPaint.setColor(PALETTE[colorIndex]);
        } else {
            this.initials = "?";
            bgPaint.setColor(PALETTE[0]);
        }

        if (avatarUrl != null && !avatarUrl.trim().isEmpty()) {
            Glide.with(getContext())
                .load(avatarUrl)
                .circleCrop()
                .into(this);
        } else {
            setImageDrawable(null);
            invalidate();
        }
    }

    public void setFavMode() {
        this.isFav = true;
        this.isOnline = false;
        this.initials = "";
        bgPaint.setColor(Color.parseColor("#00D2FF"));
        setImageDrawable(null);
        invalidate();
    }

    public void setOnline(boolean online) {
        this.isOnline = online && !isFav;
        invalidate();
    }

    @Override
    protected void onDraw(Canvas canvas) {
        int w = getWidth();
        int h = getHeight();
        float radius = Math.min(w, h) / 2f;

        if (isFav) {
            // Draw electric cyan circle
            canvas.drawCircle(w / 2f, h / 2f, radius, bgPaint);
            // Draw centered bookmark ribbon icon
            float bw = radius * 0.75f;
            float bh = radius * 0.95f;
            float left = (w - bw) / 2f;
            float top = (h - bh) / 2f;
            float right = left + bw;
            float bottom = top + bh;

            bookmarkPath.reset();
            bookmarkPath.moveTo(left, top);
            bookmarkPath.lineTo(right, top);
            bookmarkPath.lineTo(right, bottom);
            bookmarkPath.lineTo(w / 2f, bottom - bh * 0.3f);
            bookmarkPath.lineTo(left, bottom);
            bookmarkPath.close();
            canvas.drawPath(bookmarkPath, bookmarkPaint);
            return;
        }

        if (getDrawable() == null) {
            // Draw colorful circle with initials
            canvas.drawCircle(w / 2f, h / 2f, radius, bgPaint);
            textPaint.setTextSize(radius * 0.8f);
            textPaint.getTextBounds(initials, 0, initials.length(), textBounds);
            float y = (h / 2f) + (textBounds.height() / 2f) - 1f;
            canvas.drawText(initials, w / 2f, y, textPaint);
        } else {
            super.onDraw(canvas);
        }

        // Draw online green dot badge (properly inset inside circle boundary)
        if (isOnline) {
            float dotRadius = radius * 0.24f;
            float cx = w - dotRadius - 2f;
            float cy = h - dotRadius - 2f;
            onlineStrokePaint.setStrokeWidth(dotRadius * 0.45f);
            canvas.drawCircle(cx, cy, dotRadius, onlinePaint);
            canvas.drawCircle(cx, cy, dotRadius, onlineStrokePaint);
        }
    }
}
`);

// ════════════════════════════════════════════════════════════════════════
// 3. activity_main.xml: Full Width Title (No Truncation), Smooth Tabs, Insets
// ════════════════════════════════════════════════════════════════════════

writeAndroidFile('app/src/main/res/layout/activity_main.xml', `<?xml version="1.0" encoding="utf-8"?>
<androidx.coordinatorlayout.widget.CoordinatorLayout xmlns:android="http://schemas.android.com/apk/res/android"
    xmlns:app="http://schemas.android.com/apk/res-auto"
    android:id="@+id/mainCoordinator"
    android:layout_width="match_parent"
    android:layout_height="match_parent"
    android:background="@color/bg_main">

    <com.google.android.material.appbar.AppBarLayout
        android:id="@+id/appBarLayout"
        android:layout_width="match_parent"
        android:layout_height="wrap_content"
        android:background="@color/bg_main"
        app:elevation="0dp">

        <!-- Top Header Bar -->
        <androidx.appcompat.widget.Toolbar
            android:id="@+id/mainToolbar"
            android:layout_width="match_parent"
            android:layout_height="wrap_content"
            android:minHeight="56dp"
            app:contentInsetStart="16dp"
            app:contentInsetEnd="16dp">

            <androidx.constraintlayout.widget.ConstraintLayout
                android:layout_width="match_parent"
                android:layout_height="match_parent">

                <!-- Profile Avatar -->
                <com.nonsensechat.app.ui.custom.AvatarView
                    android:id="@+id/btnProfileAvatar"
                    android:layout_width="38dp"
                    android:layout_height="38dp"
                    app:layout_constraintStart_toStartOf="parent"
                    app:layout_constraintTop_toTopOf="parent"
                    app:layout_constraintBottom_toBottomOf="parent" />

                <!-- Logo / App Name: Full Width, No Truncation -->
                <TextView
                    android:id="@+id/mainTitle"
                    android:layout_width="0dp"
                    android:layout_height="wrap_content"
                    android:layout_marginStart="12dp"
                    android:layout_marginEnd="8dp"
                    android:text="@string/app_name"
                    android:textColor="@color/text_primary"
                    android:textSize="18sp"
                    android:textStyle="bold"
                    android:ellipsize="end"
                    android:maxLines="1"
                    app:layout_constraintStart_toEndOf="@+id/btnProfileAvatar"
                    app:layout_constraintEnd_toStartOf="@+id/btnSearchToggle"
                    app:layout_constraintTop_toTopOf="parent"
                    app:layout_constraintBottom_toBottomOf="parent" />

                <ImageView
                    android:id="@+id/btnSearchToggle"
                    android:layout_width="36dp"
                    android:layout_height="36dp"
                    android:background="?attr/selectableItemBackgroundBorderless"
                    android:padding="7dp"
                    android:src="@drawable/ic_search"
                    app:tint="@color/text_secondary"
                    app:layout_constraintEnd_toStartOf="@+id/btnSettings"
                    app:layout_constraintTop_toTopOf="parent"
                    app:layout_constraintBottom_toBottomOf="parent" />

                <ImageView
                    android:id="@+id/btnSettings"
                    android:layout_width="36dp"
                    android:layout_height="36dp"
                    android:layout_marginStart="4dp"
                    android:background="?attr/selectableItemBackgroundBorderless"
                    android:padding="6dp"
                    android:src="@drawable/ic_settings_gear"
                    app:tint="@color/text_secondary"
                    app:layout_constraintEnd_toEndOf="parent"
                    app:layout_constraintTop_toTopOf="parent"
                    app:layout_constraintBottom_toBottomOf="parent" />

            </androidx.constraintlayout.widget.ConstraintLayout>

        </androidx.appcompat.widget.Toolbar>

        <!-- Search Bar Container (Collapsible) -->
        <FrameLayout
            android:id="@+id/searchContainer"
            android:layout_width="match_parent"
            android:layout_height="wrap_content"
            android:paddingHorizontal="16dp"
            android:paddingBottom="8dp"
            android:visibility="gone">

            <EditText
                android:id="@+id/etSearchChats"
                style="@style/Widget.NonsenseChat.EditText"
                android:layout_width="match_parent"
                android:layout_height="44dp"
                android:hint="@string/search_chats_hint"
                android:paddingStart="16dp"
                android:paddingEnd="16dp"
                android:textSize="14sp" />

        </FrameLayout>

        <!-- Folders Tab Strip (Optimized & Non-clipping) -->
        <HorizontalScrollView
            android:layout_width="match_parent"
            android:layout_height="46dp"
            android:paddingHorizontal="12dp"
            android:overScrollMode="never"
            android:scrollbars="none">

            <LinearLayout
                android:id="@+id/tabsContainer"
                android:layout_width="wrap_content"
                android:layout_height="match_parent"
                android:gravity="center_vertical"
                android:orientation="horizontal">

                <LinearLayout
                    android:id="@+id/tabAll"
                    android:layout_width="wrap_content"
                    android:layout_height="32dp"
                    android:background="@drawable/bg_primary_button"
                    android:gravity="center"
                    android:orientation="horizontal"
                    android:paddingHorizontal="14dp">

                    <ImageView
                        android:id="@+id/ivTabAll"
                        android:layout_width="16dp"
                        android:layout_height="16dp"
                        android:layout_marginEnd="6dp"
                        android:src="@drawable/ic_tab_all"
                        app:tint="#080C14" />

                    <TextView
                        android:id="@+id/tvTabAll"
                        android:layout_width="wrap_content"
                        android:layout_height="wrap_content"
                        android:text="@string/tab_all"
                        android:textColor="#080C14"
                        android:textSize="13sp"
                        android:textStyle="bold" />

                </LinearLayout>

                <LinearLayout
                    android:id="@+id/tabDirect"
                    android:layout_width="wrap_content"
                    android:layout_height="32dp"
                    android:layout_marginStart="8dp"
                    android:gravity="center"
                    android:orientation="horizontal"
                    android:paddingHorizontal="14dp">

                    <ImageView
                        android:id="@+id/ivTabDirect"
                        android:layout_width="16dp"
                        android:layout_height="16dp"
                        android:layout_marginEnd="6dp"
                        android:src="@drawable/ic_tab_direct"
                        app:tint="@color/text_secondary" />

                    <TextView
                        android:id="@+id/tvTabDirect"
                        android:layout_width="wrap_content"
                        android:layout_height="wrap_content"
                        android:text="@string/tab_direct"
                        android:textColor="@color/text_secondary"
                        android:textSize="13sp" />

                </LinearLayout>

                <LinearLayout
                    android:id="@+id/tabGroups"
                    android:layout_width="wrap_content"
                    android:layout_height="32dp"
                    android:layout_marginStart="8dp"
                    android:gravity="center"
                    android:orientation="horizontal"
                    android:paddingHorizontal="14dp">

                    <ImageView
                        android:id="@+id/ivTabGroups"
                        android:layout_width="16dp"
                        android:layout_height="16dp"
                        android:layout_marginEnd="6dp"
                        android:src="@drawable/ic_tab_groups"
                        app:tint="@color/text_secondary" />

                    <TextView
                        android:id="@+id/tvTabGroups"
                        android:layout_width="wrap_content"
                        android:layout_height="wrap_content"
                        android:text="@string/tab_groups"
                        android:textColor="@color/text_secondary"
                        android:textSize="13sp" />

                </LinearLayout>

                <LinearLayout
                    android:id="@+id/tabChannels"
                    android:layout_width="wrap_content"
                    android:layout_height="32dp"
                    android:layout_marginStart="8dp"
                    android:gravity="center"
                    android:orientation="horizontal"
                    android:paddingHorizontal="14dp">

                    <ImageView
                        android:id="@+id/ivTabChannels"
                        android:layout_width="16dp"
                        android:layout_height="16dp"
                        android:layout_marginEnd="6dp"
                        android:src="@drawable/ic_tab_channels"
                        app:tint="@color/text_secondary" />

                    <TextView
                        android:id="@+id/tvTabChannels"
                        android:layout_width="wrap_content"
                        android:layout_height="wrap_content"
                        android:text="@string/tab_channels"
                        android:textColor="@color/text_secondary"
                        android:textSize="13sp" />

                </LinearLayout>

            </LinearLayout>

        </HorizontalScrollView>

        <View
            android:layout_width="match_parent"
            android:layout_height="1dp"
            android:background="@color/border_subtle" />

    </com.google.android.material.appbar.AppBarLayout>

    <androidx.swiperefreshlayout.widget.SwipeRefreshLayout
        android:id="@+id/swipeRefresh"
        android:layout_width="match_parent"
        android:layout_height="match_parent"
        app:layout_behavior="@string/appbar_scrolling_view_behavior">

        <FrameLayout
            android:layout_width="match_parent"
            android:layout_height="match_parent">

            <androidx.recyclerview.widget.RecyclerView
                android:id="@+id/rvChats"
                android:layout_width="match_parent"
                android:layout_height="match_parent"
                android:clipToPadding="false"
                android:paddingBottom="96dp" />

            <!-- Empty State -->
            <LinearLayout
                android:id="@+id/emptyStateView"
                android:layout_width="match_parent"
                android:layout_height="wrap_content"
                android:layout_gravity="center"
                android:gravity="center"
                android:orientation="vertical"
                android:padding="32dp"
                android:visibility="gone">

                <ImageView
                    android:layout_width="64dp"
                    android:layout_height="64dp"
                    android:src="@drawable/ic_tab_all"
                    app:tint="@color/text_tertiary" />

                <TextView
                    android:layout_width="wrap_content"
                    android:layout_height="wrap_content"
                    android:layout_marginTop="16dp"
                    android:text="@string/no_chats_title"
                    android:textColor="@color/text_primary"
                    android:textSize="18sp"
                    android:textStyle="bold" />

                <TextView
                    android:layout_width="wrap_content"
                    android:layout_height="wrap_content"
                    android:layout_marginTop="8dp"
                    android:gravity="center"
                    android:text="@string/no_chats_subtitle"
                    android:textColor="@color/text_secondary"
                    android:textSize="14sp" />

            </LinearLayout>

        </FrameLayout>

    </androidx.swiperefreshlayout.widget.SwipeRefreshLayout>

    <!-- Floating Action Button (Clean Elevation & Inset) -->
    <com.google.android.material.floatingactionbutton.FloatingActionButton
        android:id="@+id/fabNewChat"
        android:layout_width="wrap_content"
        android:layout_height="wrap_content"
        android:layout_gravity="bottom|end"
        android:layout_marginEnd="16dp"
        android:layout_marginBottom="16dp"
        app:backgroundTint="@color/accent_green"
        app:fabSize="normal"
        app:elevation="6dp"
        app:borderWidth="0dp"
        android:src="@drawable/ic_add"
        app:tint="#080C14" />

</androidx.coordinatorlayout.widget.CoordinatorLayout>
`);

// ════════════════════════════════════════════════════════════════════════
// 4. item_message_text_me.xml & item_message_text_other.xml: Modern Bubbles
// ════════════════════════════════════════════════════════════════════════

// item_message_text_me.xml
writeAndroidFile('app/src/main/res/layout/item_message_text_me.xml', `<?xml version="1.0" encoding="utf-8"?>
<androidx.constraintlayout.widget.ConstraintLayout xmlns:android="http://schemas.android.com/apk/res/android"
    xmlns:app="http://schemas.android.com/apk/res-auto"
    android:layout_width="match_parent"
    android:layout_height="wrap_content"
    android:paddingVertical="2dp">

    <LinearLayout
        android:id="@+id/bubbleMe"
        android:layout_width="wrap_content"
        android:layout_height="wrap_content"
        android:background="@drawable/bg_bubble_me"
        android:maxWidth="290dp"
        android:orientation="vertical"
        android:paddingHorizontal="13dp"
        android:paddingVertical="7dp"
        app:layout_constraintEnd_toEndOf="parent"
        app:layout_constraintTop_toTopOf="parent">

        <TextView
            android:id="@+id/tvMessageText"
            android:layout_width="wrap_content"
            android:layout_height="wrap_content"
            android:textColor="@color/text_primary"
            android:textSize="15sp"
            android:lineSpacingExtra="2dp" />

        <LinearLayout
            android:layout_width="wrap_content"
            android:layout_height="wrap_content"
            android:layout_gravity="end"
            android:layout_marginTop="2dp"
            android:gravity="center_vertical"
            android:orientation="horizontal">

            <TextView
                android:id="@+id/tvMessageTime"
                android:layout_width="wrap_content"
                android:layout_height="wrap_content"
                android:textColor="@color/text_tertiary"
                android:textSize="11sp" />

            <ImageView
                android:id="@+id/ivDeliveryStatus"
                android:layout_width="14dp"
                android:layout_height="14dp"
                android:layout_marginStart="4dp"
                android:src="@drawable/ic_double_check" />

        </LinearLayout>

    </LinearLayout>

</androidx.constraintlayout.widget.ConstraintLayout>
`);

// item_message_text_other.xml (No empty circle in DMs, goneMarginStart="0dp")
writeAndroidFile('app/src/main/res/layout/item_message_text_other.xml', `<?xml version="1.0" encoding="utf-8"?>
<androidx.constraintlayout.widget.ConstraintLayout xmlns:android="http://schemas.android.com/apk/res/android"
    xmlns:app="http://schemas.android.com/apk/res-auto"
    android:layout_width="match_parent"
    android:layout_height="wrap_content"
    android:paddingVertical="2dp">

    <com.nonsensechat.app.ui.custom.AvatarView
        android:id="@+id/senderAvatar"
        android:layout_width="28dp"
        android:layout_height="28dp"
        android:visibility="gone"
        app:layout_constraintStart_toStartOf="parent"
        app:layout_constraintBottom_toBottomOf="@+id/bubbleOther" />

    <LinearLayout
        android:id="@+id/bubbleOther"
        android:layout_width="wrap_content"
        android:layout_height="wrap_content"
        android:layout_marginStart="6dp"
        android:background="@drawable/bg_bubble_other"
        android:maxWidth="290dp"
        android:orientation="vertical"
        android:paddingHorizontal="13dp"
        android:paddingVertical="7dp"
        app:layout_constraintStart_toEndOf="@+id/senderAvatar"
        app:layout_goneMarginStart="0dp"
        app:layout_constraintTop_toTopOf="parent">

        <TextView
            android:id="@+id/tvSenderName"
            android:layout_width="wrap_content"
            android:layout_height="wrap_content"
            android:layout_marginBottom="2dp"
            android:textColor="@color/accent_cyan"
            android:textSize="12sp"
            android:textStyle="bold"
            android:visibility="gone" />

        <TextView
            android:id="@+id/tvMessageText"
            android:layout_width="wrap_content"
            android:layout_height="wrap_content"
            android:textColor="@color/text_primary"
            android:textSize="15sp"
            android:lineSpacingExtra="2dp" />

        <TextView
            android:id="@+id/tvMessageTime"
            android:layout_width="wrap_content"
            android:layout_height="wrap_content"
            android:layout_gravity="end"
            android:layout_marginTop="2dp"
            android:textColor="@color/text_tertiary"
            android:textSize="11sp" />

    </LinearLayout>

</androidx.constraintlayout.widget.ConstraintLayout>
`);

// ════════════════════════════════════════════════════════════════════════
// 5. MessageAdapter.java: Uses MessageFormatter for Quote Spans & Spoilers
// ════════════════════════════════════════════════════════════════════════

writeAndroidFile('app/src/main/java/com/nonsensechat/app/ui/chat/MessageAdapter.java', `package com.nonsensechat.app.ui.chat;

import android.content.Context;
import android.graphics.Color;
import android.text.method.LinkMovementMethod;
import android.view.LayoutInflater;
import android.view.View;
import android.view.ViewGroup;
import android.widget.ImageView;
import android.widget.LinearLayout;
import android.widget.TextView;
import androidx.annotation.NonNull;
import androidx.recyclerview.widget.RecyclerView;
import com.bumptech.glide.Glide;
import com.nonsensechat.app.R;
import com.nonsensechat.app.data.FirebaseManager;
import com.nonsensechat.app.model.Chat;
import com.nonsensechat.app.model.Message;
import com.nonsensechat.app.model.Poll;
import com.nonsensechat.app.model.PollOption;
import com.nonsensechat.app.model.User;
import com.nonsensechat.app.ui.custom.AvatarView;
import com.nonsensechat.app.ui.custom.TelegramSpoilerView;
import com.nonsensechat.app.utils.MessageFormatter;
import java.text.SimpleDateFormat;
import java.util.ArrayList;
import java.util.Date;
import java.util.List;
import java.util.Locale;

public class MessageAdapter extends RecyclerView.Adapter<RecyclerView.ViewHolder> {
    public interface OnPollVoteListener {
        void onVote(Message message, int optionIndex);
    }

    private static final int TYPE_TEXT_ME = 1;
    private static final int TYPE_TEXT_OTHER = 2;
    private static final int TYPE_IMAGE_ME = 3;
    private static final int TYPE_POLL = 4;

    private final Context context;
    private final Chat chat;
    private final OnPollVoteListener voteListener;
    private final List<Message> list = new ArrayList<>();
    private final SimpleDateFormat timeFormat = new SimpleDateFormat("HH:mm", Locale.getDefault());

    public MessageAdapter(Context context, Chat chat, OnPollVoteListener voteListener) {
        this.context = context;
        this.chat = chat;
        this.voteListener = voteListener;
    }

    public void submitList(List<Message> messages) {
        list.clear();
        if (messages != null) list.addAll(messages);
        notifyDataSetChanged();
    }

    @Override
    public int getItemViewType(int position) {
        Message m = list.get(position);
        String myUid = FirebaseManager.getInstance().getCurrentUid();
        boolean isMe = m.isOutgoing(myUid);

        if ("poll".equalsIgnoreCase(m.type)) return TYPE_POLL;
        if ("image".equalsIgnoreCase(m.type)) return TYPE_IMAGE_ME;
        return isMe ? TYPE_TEXT_ME : TYPE_TEXT_OTHER;
    }

    @NonNull
    @Override
    public RecyclerView.ViewHolder onCreateViewHolder(@NonNull ViewGroup parent, int viewType) {
        LayoutInflater inflater = LayoutInflater.from(parent.getContext());
        if (viewType == TYPE_POLL) {
            return new PollViewHolder(inflater.inflate(R.layout.item_message_poll, parent, false));
        } else if (viewType == TYPE_IMAGE_ME) {
            return new ImageViewHolder(inflater.inflate(R.layout.item_message_image_me, parent, false));
        } else if (viewType == TYPE_TEXT_ME) {
            return new TextMeViewHolder(inflater.inflate(R.layout.item_message_text_me, parent, false));
        } else {
            return new TextOtherViewHolder(inflater.inflate(R.layout.item_message_text_other, parent, false));
        }
    }

    @Override
    public void onBindViewHolder(@NonNull RecyclerView.ViewHolder holder, int position) {
        Message m = list.get(position);
        String timeStr = timeFormat.format(new Date(m.getTimestampMillis()));

        if (holder instanceof TextMeViewHolder) {
            TextMeViewHolder vh = (TextMeViewHolder) holder;
            vh.tvMessageText.setMovementMethod(LinkMovementMethod.getInstance());
            vh.tvMessageText.setText(MessageFormatter.formatMessage(context, m.text, vh.tvMessageText));
            vh.tvMessageTime.setText(timeStr);
        } else if (holder instanceof TextOtherViewHolder) {
            TextOtherViewHolder vh = (TextOtherViewHolder) holder;
            vh.tvMessageText.setMovementMethod(LinkMovementMethod.getInstance());
            vh.tvMessageText.setText(MessageFormatter.formatMessage(context, m.text, vh.tvMessageText));
            vh.tvMessageTime.setText(timeStr);

            // In Direct Chats (1-on-1 DM): HIDE sender avatar next to bubbles completely!
            if (chat != null && chat.isGroup()) {
                vh.senderAvatar.setVisibility(View.VISIBLE);
                User sender = FirebaseManager.getInstance().getCachedUser(m.uid);
                String senderName = sender != null ? sender.getDisplayNameOrNick() : m.getSenderDisplayName();
                String senderAvatar = sender != null ? sender.getEffectiveAvatar() : null;
                vh.senderAvatar.setUser(senderName, senderAvatar, false);

                vh.tvSenderName.setVisibility(View.VISIBLE);
                vh.tvSenderName.setText(senderName);
            } else {
                vh.senderAvatar.setVisibility(View.GONE);
                vh.tvSenderName.setVisibility(View.GONE);
            }
        } else if (holder instanceof ImageViewHolder) {
            ImageViewHolder vh = (ImageViewHolder) holder;
            vh.tvMediaTime.setText(timeStr);
            String url = m.getMediaUrl();
            if (url != null) {
                Glide.with(context).load(url).into(vh.ivMessageMedia);
            }
            vh.spoilerView.setRevealed(!m.spoiler);
        } else if (holder instanceof PollViewHolder) {
            PollViewHolder vh = (PollViewHolder) holder;
            Poll poll = m.poll;
            if (poll != null) {
                vh.tvPollQuestion.setText(poll.question);
                vh.tvTotalVotes.setText(String.format(Locale.getDefault(), "%d голосов", poll.totalVotes));
                vh.optionsContainer.removeAllViews();
                String myUid = FirebaseManager.getInstance().getCurrentUid();

                for (int i = 0; i < poll.options.size(); i++) {
                    final int optIdx = i;
                    PollOption opt = poll.options.get(i);
                    boolean voted = opt.hasVoted(myUid);

                    TextView optView = new TextView(context);
                    int pct = opt.getPercentage(poll.totalVotes);
                    optView.setText(String.format(Locale.getDefault(), "%s (%d%%)", opt.text, pct));
                    optView.setTextColor(voted ? Color.parseColor("#00FF88") : Color.WHITE);
                    optView.setBackgroundResource(voted ? R.drawable.bg_poll_option_selected : R.drawable.bg_poll_option);
                    optView.setPadding(24, 16, 24, 16);
                    LinearLayout.LayoutParams lp = new LinearLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.WRAP_CONTENT);
                    lp.setMargins(0, 8, 0, 0);
                    optView.setLayoutParams(lp);

                    optView.setOnClickListener(v -> voteListener.onVote(m, optIdx));
                    vh.optionsContainer.addView(optView);
                }
            }
        }
    }

    @Override
    public int getItemCount() {
        return list.size();
    }

    static class TextMeViewHolder extends RecyclerView.ViewHolder {
        TextView tvMessageText, tvMessageTime;
        public TextMeViewHolder(@NonNull View itemView) {
            super(itemView);
            tvMessageText = itemView.findViewById(R.id.tvMessageText);
            tvMessageTime = itemView.findViewById(R.id.tvMessageTime);
        }
    }

    static class TextOtherViewHolder extends RecyclerView.ViewHolder {
        AvatarView senderAvatar;
        TextView tvSenderName, tvMessageText, tvMessageTime;
        public TextOtherViewHolder(@NonNull View itemView) {
            super(itemView);
            senderAvatar = itemView.findViewById(R.id.senderAvatar);
            tvSenderName = itemView.findViewById(R.id.tvSenderName);
            tvMessageText = itemView.findViewById(R.id.tvMessageText);
            tvMessageTime = itemView.findViewById(R.id.tvMessageTime);
        }
    }

    static class ImageViewHolder extends RecyclerView.ViewHolder {
        ImageView ivMessageMedia;
        TextView tvMediaTime;
        TelegramSpoilerView spoilerView;
        public ImageViewHolder(@NonNull View itemView) {
            super(itemView);
            ivMessageMedia = itemView.findViewById(R.id.ivMessageMedia);
            tvMediaTime = itemView.findViewById(R.id.tvMediaTime);
            spoilerView = itemView.findViewById(R.id.spoilerView);
        }
    }

    static class PollViewHolder extends RecyclerView.ViewHolder {
        TextView tvPollQuestion, tvTotalVotes;
        LinearLayout optionsContainer;
        public PollViewHolder(@NonNull View itemView) {
            super(itemView);
            tvPollQuestion = itemView.findViewById(R.id.tvPollQuestion);
            tvTotalVotes = itemView.findViewById(R.id.tvTotalVotes);
            optionsContainer = itemView.findViewById(R.id.pollOptionsContainer);
        }
    }
}
`);

// ════════════════════════════════════════════════════════════════════════
// 6. ChatListAdapter.java: Fav Mode with Bookmark, Clean HTML Preview
// ════════════════════════════════════════════════════════════════════════

writeAndroidFile('app/src/main/java/com/nonsensechat/app/ui/main/ChatListAdapter.java', `package com.nonsensechat.app.ui.main;

import android.view.LayoutInflater;
import android.view.View;
import android.view.ViewGroup;
import android.widget.TextView;
import androidx.annotation.NonNull;
import androidx.recyclerview.widget.RecyclerView;
import com.nonsensechat.app.R;
import com.nonsensechat.app.data.FirebaseManager;
import com.nonsensechat.app.model.Chat;
import com.nonsensechat.app.model.User;
import com.nonsensechat.app.ui.custom.AvatarView;
import com.nonsensechat.app.utils.MessageFormatter;
import java.text.SimpleDateFormat;
import java.util.ArrayList;
import java.util.Date;
import java.util.List;
import java.util.Locale;

public class ChatListAdapter extends RecyclerView.Adapter<ChatListAdapter.ChatViewHolder> {
    public interface OnChatClickListener {
        void onChatClick(Chat chat);
    }

    private final List<Chat> list = new ArrayList<>();
    private final OnChatClickListener listener;
    private final SimpleDateFormat timeFormat = new SimpleDateFormat("HH:mm", Locale.getDefault());
    private final SimpleDateFormat dayFormat = new SimpleDateFormat("dd MMM", Locale.getDefault());

    public ChatListAdapter(OnChatClickListener listener) {
        this.listener = listener;
    }

    public void submitList(List<Chat> chats) {
        list.clear();
        if (chats != null) list.addAll(chats);
        notifyDataSetChanged();
    }

    @NonNull
    @Override
    public ChatViewHolder onCreateViewHolder(@NonNull ViewGroup parent, int viewType) {
        View view = LayoutInflater.from(parent.getContext()).inflate(R.layout.item_chat, parent, false);
        return new ChatViewHolder(view);
    }

    @Override
    public void onBindViewHolder(@NonNull ChatViewHolder holder, int position) {
        Chat chat = list.get(position);
        String myUid = FirebaseManager.getInstance().getCurrentUid();
        
        String title = MainActivity.getResolvedChatTitle(chat, myUid);
        String avatar = MainActivity.getResolvedChatAvatar(chat, myUid);
        boolean isOnline = false;

        if (chat.isFav()) {
            holder.chatAvatar.setFavMode();
        } else if ("dm".equalsIgnoreCase(chat.type)) {
            String otherUid = chat.getOtherMemberUid(myUid);
            User partner = FirebaseManager.getInstance().getCachedUser(otherUid);
            if (partner != null) isOnline = partner.online;
            holder.chatAvatar.setUser(title, avatar, isOnline);
        } else {
            holder.chatAvatar.setUser(title, avatar, false);
        }

        holder.tvChatTitle.setText(title);
        
        String rawLastMsg = chat.getLastMessageText();
        String cleanLastMsg = MessageFormatter.stripHtmlForPreview(rawLastMsg);

        if (chat.lastMsgUid != null && chat.lastMsgUid.equals(myUid)) {
            holder.tvLastMessage.setText("Вы: " + cleanLastMsg);
        } else {
            holder.tvLastMessage.setText(cleanLastMsg);
        }

        long time = chat.getLastMessageTimestamp();
        if (time > 0) {
            holder.tvChatTime.setText(formatTime(time));
        } else {
            holder.tvChatTime.setText("");
        }

        holder.itemView.setOnClickListener(v -> listener.onChatClick(chat));
    }

    private String formatTime(long millis) {
        long diff = System.currentTimeMillis() - millis;
        if (diff < 24 * 3600 * 1000) {
            return timeFormat.format(new Date(millis));
        }
        return dayFormat.format(new Date(millis));
    }

    @Override
    public int getItemCount() {
        return list.size();
    }

    static class ChatViewHolder extends RecyclerView.ViewHolder {
        AvatarView chatAvatar;
        TextView tvChatTitle, tvLastMessage, tvChatTime, tvUnreadBadge;

        public ChatViewHolder(@NonNull View itemView) {
            super(itemView);
            chatAvatar = itemView.findViewById(R.id.chatAvatar);
            tvChatTitle = itemView.findViewById(R.id.tvChatTitle);
            tvLastMessage = itemView.findViewById(R.id.tvLastMessage);
            tvChatTime = itemView.findViewById(R.id.tvChatTime);
            tvUnreadBadge = itemView.findViewById(R.id.tvUnreadBadge);
        }
    }
}
`);

// ════════════════════════════════════════════════════════════════════════
// 7. MainActivity.java: Perfect Floating FAB & Insets, Tab icons toggle
// ════════════════════════════════════════════════════════════════════════

writeAndroidFile('app/src/main/java/com/nonsensechat/app/ui/main/MainActivity.java', `package com.nonsensechat.app.ui.main;

import android.app.AlertDialog;
import android.content.Intent;
import android.graphics.Color;
import android.os.Bundle;
import android.text.Editable;
import android.text.TextWatcher;
import android.view.View;
import android.widget.EditText;
import android.widget.ImageView;
import android.widget.LinearLayout;
import android.widget.TextView;
import android.widget.Toast;
import androidx.annotation.NonNull;
import androidx.appcompat.app.AppCompatActivity;
import androidx.coordinatorlayout.widget.CoordinatorLayout;
import androidx.core.graphics.Insets;
import androidx.core.view.ViewCompat;
import androidx.core.view.WindowCompat;
import androidx.core.view.WindowInsetsCompat;
import androidx.recyclerview.widget.LinearLayoutManager;
import androidx.recyclerview.widget.RecyclerView;
import androidx.swiperefreshlayout.widget.SwipeRefreshLayout;
import com.google.android.material.floatingactionbutton.FloatingActionButton;
import com.google.firebase.database.DataSnapshot;
import com.google.firebase.database.DatabaseError;
import com.google.firebase.database.ValueEventListener;
import com.nonsensechat.app.R;
import com.nonsensechat.app.data.FirebaseManager;
import com.nonsensechat.app.model.Chat;
import com.nonsensechat.app.model.User;
import com.nonsensechat.app.ui.auth.AuthActivity;
import com.nonsensechat.app.ui.chat.ChatActivity;
import com.nonsensechat.app.ui.custom.AvatarView;
import java.util.ArrayList;
import java.util.Collections;
import java.util.HashSet;
import java.util.List;
import java.util.Set;

public class MainActivity extends AppCompatActivity {
    private RecyclerView rvChats;
    private ChatListAdapter adapter;
    private SwipeRefreshLayout swipeRefresh;
    private View emptyStateView, searchContainer;
    private EditText etSearchChats;
    private AvatarView btnProfileAvatar;
    private FloatingActionButton fabNewChat;
    private final List<Chat> allChats = new ArrayList<>();
    private String currentTab = "all";

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        WindowCompat.setDecorFitsSystemWindows(getWindow(), false);
        setContentView(R.layout.activity_main);

        View mainCoord = findViewById(R.id.mainCoordinator);
        View appBar = findViewById(R.id.appBarLayout);
        fabNewChat = findViewById(R.id.fabNewChat);
        rvChats = findViewById(R.id.rvChats);
        swipeRefresh = findViewById(R.id.swipeRefresh);
        emptyStateView = findViewById(R.id.emptyStateView);
        searchContainer = findViewById(R.id.searchContainer);
        etSearchChats = findViewById(R.id.etSearchChats);
        btnProfileAvatar = findViewById(R.id.btnProfileAvatar);

        // Precise Window Insets: Top pad for status bar, FAB & list pad for navigation bar
        ViewCompat.setOnApplyWindowInsetsListener(mainCoord, (v, insets) -> {
            Insets sysBars = insets.getInsets(WindowInsetsCompat.Type.systemBars());
            appBar.setPadding(0, sysBars.top, 0, 0);

            // Position FAB 16dp above system gesture bar
            CoordinatorLayout.LayoutParams fabLp = (CoordinatorLayout.LayoutParams) fabNewChat.getLayoutParams();
            fabLp.bottomMargin = sysBars.bottom + dpToPx(16);
            fabNewChat.setLayoutParams(fabLp);

            // Padding for last chat item
            rvChats.setPadding(0, 0, 0, sysBars.bottom + dpToPx(88));
            return insets;
        });

        rvChats.setLayoutManager(new LinearLayoutManager(this));
        adapter = new ChatListAdapter(chat -> {
            Intent intent = new Intent(MainActivity.this, ChatActivity.class);
            intent.putExtra("chat", chat);
            startActivity(intent);
        });
        rvChats.setAdapter(adapter);

        setupTabs();
        setupSearch();
        loadCurrentUser();
        loadChats();

        findViewById(R.id.btnSearchToggle).setOnClickListener(v -> {
            boolean visible = searchContainer.getVisibility() == View.VISIBLE;
            searchContainer.setVisibility(visible ? View.GONE : View.VISIBLE);
            if (!visible) etSearchChats.requestFocus();
        });

        findViewById(R.id.btnSettings).setOnClickListener(v -> showProfileDialog());
        findViewById(R.id.btnProfileAvatar).setOnClickListener(v -> showProfileDialog());
        fabNewChat.setOnClickListener(v -> showNewChatDialog());

        swipeRefresh.setOnRefreshListener(this::loadChats);
    }

    private void setupTabs() {
        LinearLayout tabAll = findViewById(R.id.tabAll);
        LinearLayout tabDirect = findViewById(R.id.tabDirect);
        LinearLayout tabGroups = findViewById(R.id.tabGroups);
        LinearLayout tabChannels = findViewById(R.id.tabChannels);

        View.OnClickListener listener = v -> {
            int id = v.getId();
            resetTabPills();
            if (id == R.id.tabAll) {
                currentTab = "all";
                highlightTab(tabAll, R.id.tvTabAll, R.id.ivTabAll);
            } else if (id == R.id.tabDirect) {
                currentTab = "dm";
                highlightTab(tabDirect, R.id.tvTabDirect, R.id.ivTabDirect);
            } else if (id == R.id.tabGroups) {
                currentTab = "group";
                highlightTab(tabGroups, R.id.tvTabGroups, R.id.ivTabGroups);
            } else if (id == R.id.tabChannels) {
                currentTab = "channel";
                highlightTab(tabChannels, R.id.tvTabChannels, R.id.ivTabChannels);
            }
            filterChats();
        };

        tabAll.setOnClickListener(listener);
        tabDirect.setOnClickListener(listener);
        tabGroups.setOnClickListener(listener);
        tabChannels.setOnClickListener(listener);
    }

    private void resetTabPills() {
        int[] layoutIds = {R.id.tabAll, R.id.tabDirect, R.id.tabGroups, R.id.tabChannels};
        int[] textIds = {R.id.tvTabAll, R.id.tvTabDirect, R.id.tvTabGroups, R.id.tvTabChannels};
        int[] iconIds = {R.id.ivTabAll, R.id.ivTabDirect, R.id.ivTabGroups, R.id.ivTabChannels};

        for (int i = 0; i < layoutIds.length; i++) {
            LinearLayout l = findViewById(layoutIds[i]);
            TextView t = findViewById(textIds[i]);
            ImageView iv = findViewById(iconIds[i]);
            l.setBackground(null);
            t.setTextColor(getColor(R.color.text_secondary));
            t.setTypeface(null, android.graphics.Typeface.NORMAL);
            iv.setColorFilter(getColor(R.color.text_secondary));
        }
    }

    private void highlightTab(LinearLayout layout, int textId, int iconId) {
        layout.setBackgroundResource(R.drawable.bg_primary_button);
        TextView t = layout.findViewById(textId);
        t.setTextColor(Color.parseColor("#080C14"));
        t.setTypeface(null, android.graphics.Typeface.BOLD);
        ImageView iv = layout.findViewById(iconId);
        iv.setColorFilter(Color.parseColor("#080C14"));
    }

    private void setupSearch() {
        etSearchChats.addTextChangedListener(new TextWatcher() {
            @Override
            public void beforeTextChanged(CharSequence s, int start, int count, int after) {}
            @Override
            public void onTextChanged(CharSequence s, int start, int before, int count) {
                filterChats();
            }
            @Override
            public void afterTextChanged(Editable s) {}
        });
    }

    private void loadCurrentUser() {
        String uid = FirebaseManager.getInstance().getCurrentUid();
        if (uid == null) return;
        FirebaseManager.getInstance().getUserRef(uid).addValueEventListener(new ValueEventListener() {
            @Override
            public void onDataChange(@NonNull DataSnapshot snapshot) {
                User user = snapshot.getValue(User.class);
                if (user != null) {
                    btnProfileAvatar.setUser(user.getDisplayNameOrNick(), user.getEffectiveAvatar(), true);
                }
            }
            @Override
            public void onCancelled(@NonNull DatabaseError error) {}
        });
    }

    private void loadChats() {
        String myUid = FirebaseManager.getInstance().getCurrentUid();
        if (myUid == null) {
            swipeRefresh.setRefreshing(false);
            return;
        }

        FirebaseManager.getInstance().getChatsRef().addValueEventListener(new ValueEventListener() {
            @Override
            public void onDataChange(@NonNull DataSnapshot snapshot) {
                allChats.clear();
                Set<String> dmUidsToFetch = new HashSet<>();

                for (DataSnapshot ds : snapshot.getChildren()) {
                    Chat c = ds.getValue(Chat.class);
                    if (c != null) {
                        c.id = ds.getKey();
                        List<String> members = c.getMemberList();
                        if (members.isEmpty() || members.contains(myUid)) {
                            allChats.add(c);
                            if ("dm".equalsIgnoreCase(c.type)) {
                                String otherUid = c.getOtherMemberUid(myUid);
                                if (otherUid != null) dmUidsToFetch.add(otherUid);
                            }
                        }
                    }
                }

                // Sort chats by most recent activity
                Collections.sort(allChats, (a, b) -> Long.compare(b.getLastMessageTimestamp(), a.getLastMessageTimestamp()));

                // Prefetch DM partners profiles before display
                if (!dmUidsToFetch.isEmpty()) {
                    FirebaseManager.getInstance().prefetchUsers(new ArrayList<>(dmUidsToFetch), () -> {
                        runOnUiThread(() -> {
                            swipeRefresh.setRefreshing(false);
                            filterChats();
                        });
                    });
                } else {
                    swipeRefresh.setRefreshing(false);
                    filterChats();
                }
            }

            @Override
            public void onCancelled(@NonNull DatabaseError error) {
                swipeRefresh.setRefreshing(false);
            }
        });
    }

    private void filterChats() {
        String query = etSearchChats.getText().toString().trim().toLowerCase();
        List<Chat> filtered = new ArrayList<>();
        String myUid = FirebaseManager.getInstance().getCurrentUid();

        for (Chat c : allChats) {
            boolean tabMatch = "all".equals(currentTab);
            if ("dm".equals(currentTab)) tabMatch = "dm".equalsIgnoreCase(c.type) || c.isFav();
            else if ("group".equals(currentTab)) tabMatch = "group".equalsIgnoreCase(c.type);
            else if ("channel".equals(currentTab)) tabMatch = "channel".equalsIgnoreCase(c.type);

            String chatTitle = getResolvedChatTitle(c, myUid).toLowerCase();
            boolean queryMatch = query.isEmpty() || chatTitle.contains(query);

            if (tabMatch && queryMatch) filtered.add(c);
        }

        adapter.submitList(filtered);
        emptyStateView.setVisibility(filtered.isEmpty() ? View.VISIBLE : View.GONE);
    }

    public static String getResolvedChatTitle(Chat chat, String myUid) {
        if (chat.isFav()) return "Избранное";
        if ("dm".equalsIgnoreCase(chat.type)) {
            String otherUid = chat.getOtherMemberUid(myUid);
            if (otherUid != null) {
                User partner = FirebaseManager.getInstance().getCachedUser(otherUid);
                if (partner != null) return partner.getDisplayNameOrNick();
            }
            if (chat.title != null && !chat.title.trim().isEmpty()) return chat.title;
            return "Личный диалог";
        }
        if (chat.title != null && !chat.title.trim().isEmpty()) return chat.title;
        if (chat.name != null && !chat.name.trim().isEmpty()) return chat.name;
        return "Групповой чат";
    }

    public static String getResolvedChatAvatar(Chat chat, String myUid) {
        if ("dm".equalsIgnoreCase(chat.type)) {
            String otherUid = chat.getOtherMemberUid(myUid);
            if (otherUid != null) {
                User partner = FirebaseManager.getInstance().getCachedUser(otherUid);
                if (partner != null) return partner.getEffectiveAvatar();
            }
        }
        return chat.avatar;
    }

    private void showNewChatDialog() {
        final EditText input = new EditText(this);
        input.setHint("Название группы или никнейм");
        input.setPadding(36, 28, 36, 28);
        new AlertDialog.Builder(this)
            .setTitle(R.string.new_chat)
            .setView(input)
            .setPositiveButton("Создать", (dialog, which) -> {
                String title = input.getText().toString().trim();
                if (!title.isEmpty()) createGroupChat(title);
            })
            .setNegativeButton("Отмена", null)
            .show();
    }

    private void createGroupChat(String title) {
        String myUid = FirebaseManager.getInstance().getCurrentUid();
        Chat chat = new Chat();
        chat.title = title;
        chat.type = "group";
        chat.creatorUid = myUid;
        List<String> members = new ArrayList<>();
        members.add(myUid);
        chat.members = members;

        String chatId = FirebaseManager.getInstance().getChatsRef().push().getKey();
        if (chatId != null) {
            chat.id = chatId;
            FirebaseManager.getInstance().getChatRef(chatId).setValue(chat)
                .addOnSuccessListener(aVoid -> {
                    Intent intent = new Intent(MainActivity.this, ChatActivity.class);
                    intent.putExtra("chat", chat);
                    startActivity(intent);
                });
        }
    }

    private void showProfileDialog() {
        String myUid = FirebaseManager.getInstance().getCurrentUid();
        User me = FirebaseManager.getInstance().getCachedUser(myUid);
        String name = me != null ? me.getDisplayNameOrNick() : myUid;

        new AlertDialog.Builder(this)
            .setTitle(R.string.settings)
            .setMessage("Профиль: " + name + "\\nUID: " + myUid)
            .setIcon(R.drawable.ic_settings_gear)
            .setPositiveButton(R.string.logout, (dialog, which) -> {
                FirebaseManager.getInstance().getAuth().signOut();
                startActivity(new Intent(MainActivity.this, AuthActivity.class));
                finish();
            })
            .setNegativeButton("Закрыть", null)
            .show();
    }

    private int dpToPx(int dp) {
        return Math.round(dp * getResources().getDisplayMetrics().density);
    }
}
`);

// ════════════════════════════════════════════════════════════════════════
// 8. ChatActivity.java: Update MessageAdapter instantiation with chat object
// ════════════════════════════════════════════════════════════════════════

writeAndroidFile('app/src/main/java/com/nonsensechat/app/ui/chat/ChatActivity.java', `package com.nonsensechat.app.ui.chat;

import android.app.AlertDialog;
import android.os.Bundle;
import android.os.Handler;
import android.os.Looper;
import android.text.Editable;
import android.text.TextWatcher;
import android.view.View;
import android.widget.EditText;
import android.widget.ImageView;
import android.widget.TextView;
import android.widget.Toast;
import androidx.annotation.NonNull;
import androidx.appcompat.app.AppCompatActivity;
import androidx.core.graphics.Insets;
import androidx.core.view.ViewCompat;
import androidx.core.view.WindowCompat;
import androidx.core.view.WindowInsetsCompat;
import androidx.recyclerview.widget.LinearLayoutManager;
import androidx.recyclerview.widget.RecyclerView;
import com.google.firebase.database.ChildEventListener;
import com.google.firebase.database.DataSnapshot;
import com.google.firebase.database.DatabaseError;
import com.google.firebase.database.ValueEventListener;
import com.nonsensechat.app.R;
import com.nonsensechat.app.data.FirebaseManager;
import com.nonsensechat.app.model.Chat;
import com.nonsensechat.app.model.Message;
import com.nonsensechat.app.model.Poll;
import com.nonsensechat.app.model.PollOption;
import com.nonsensechat.app.model.User;
import com.nonsensechat.app.ui.custom.AvatarView;
import com.nonsensechat.app.ui.main.MainActivity;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.Map;

public class ChatActivity extends AppCompatActivity {
    private Chat chat;
    private RecyclerView rvMessages;
    private MessageAdapter adapter;
    private EditText etMessage;
    private ImageView btnSendOrVoice;
    private TextView tvHeaderTitle, tvHeaderSubtitle;
    private AvatarView headerAvatar;
    private final List<Message> messages = new ArrayList<>();
    private boolean isTextMode = false;
    private final Handler tickerHandler = new Handler(Looper.getMainLooper());
    private Runnable tickerRunnable;
    private String dmPartnerUid;
    private User dmPartnerUser;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        WindowCompat.setDecorFitsSystemWindows(getWindow(), false);
        setContentView(R.layout.activity_chat);

        chat = (Chat) getIntent().getSerializableExtra("chat");
        if (chat == null) {
            finish();
            return;
        }

        String myUid = FirebaseManager.getInstance().getCurrentUid();
        dmPartnerUid = chat.getOtherMemberUid(myUid);

        // Window Insets: Top pad for status bar, bottom pad for gesture bar / keyboard IME
        View chatRoot = findViewById(R.id.chatRoot);
        View chatHeader = findViewById(R.id.chatHeader);
        View bottomBar = findViewById(R.id.bottomBar);

        ViewCompat.setOnApplyWindowInsetsListener(chatRoot, (v, insets) -> {
            Insets sysBars = insets.getInsets(WindowInsetsCompat.Type.systemBars());
            Insets ime = insets.getInsets(WindowInsetsCompat.Type.ime());
            chatHeader.setPadding(chatHeader.getPaddingLeft(), sysBars.top, chatHeader.getPaddingRight(), chatHeader.getPaddingBottom());
            int bottomPadding = Math.max(sysBars.bottom, ime.bottom);
            bottomBar.setPadding(bottomBar.getPaddingLeft(), bottomBar.getPaddingTop(), bottomBar.getPaddingRight(), bottomPadding);
            return insets;
        });

        initViews();
        setupListeners();
        loadMessages();
        setupTypingAndPresence();
    }

    private void initViews() {
        rvMessages = findViewById(R.id.rvMessages);
        etMessage = findViewById(R.id.etMessage);
        btnSendOrVoice = findViewById(R.id.btnSendOrVoice);
        tvHeaderTitle = findViewById(R.id.tvHeaderTitle);
        tvHeaderSubtitle = findViewById(R.id.tvHeaderSubtitle);
        headerAvatar = findViewById(R.id.headerAvatar);

        String myUid = FirebaseManager.getInstance().getCurrentUid();
        String title = MainActivity.getResolvedChatTitle(chat, myUid);
        String avatar = MainActivity.getResolvedChatAvatar(chat, myUid);

        tvHeaderTitle.setText(title);
        if (chat.isFav()) {
            headerAvatar.setFavMode();
        } else {
            headerAvatar.setUser(title, avatar, false);
        }

        LinearLayoutManager layoutManager = new LinearLayoutManager(this);
        layoutManager.setStackFromEnd(true);
        rvMessages.setLayoutManager(layoutManager);

        adapter = new MessageAdapter(this, chat, (message, optionIndex) -> {
            FirebaseManager.getInstance().votePoll(chat.id, message.id, optionIndex, message.poll != null && message.poll.multiple);
        });
        rvMessages.setAdapter(adapter);

        findViewById(R.id.btnChatBack).setOnClickListener(v -> finish());
        findViewById(R.id.btnCall).setOnClickListener(v -> Toast.makeText(this, "Звонки доступны в веб-версии", Toast.LENGTH_SHORT).show());
        findViewById(R.id.btnChatMenu).setOnClickListener(v -> showChatMenu());
        findViewById(R.id.btnAttach).setOnClickListener(v -> showAttachMenu());
    }

    private void setupListeners() {
        etMessage.addTextChangedListener(new TextWatcher() {
            @Override
            public void beforeTextChanged(CharSequence s, int start, int count, int after) {}
            @Override
            public void onTextChanged(CharSequence s, int start, int before, int count) {
                boolean hasText = s != null && s.toString().trim().length() > 0;
                if (hasText != isTextMode) {
                    isTextMode = hasText;
                    btnSendOrVoice.setImageResource(isTextMode ? R.drawable.ic_send_airplane : R.drawable.ic_microphone);
                }
                FirebaseManager.getInstance().setTyping(chat.id, chat.isGroup(), hasText);
            }
            @Override
            public void afterTextChanged(Editable s) {}
        });

        btnSendOrVoice.setOnClickListener(v -> {
            if (isTextMode) {
                sendMessage();
            } else {
                Toast.makeText(this, "Удерживайте микрофон для записи голосового", Toast.LENGTH_SHORT).show();
            }
        });
    }

    private void sendMessage() {
        String text = etMessage.getText().toString().trim();
        if (text.isEmpty()) return;

        String myUid = FirebaseManager.getInstance().getCurrentUid();
        Message msg = new Message();
        msg.uid = myUid;
        msg.text = text;
        msg.type = "text";

        etMessage.setText("");
        FirebaseManager.getInstance().setTyping(chat.id, chat.isGroup(), false);
        FirebaseManager.getInstance().sendMessage(chat.id, msg, null);
    }

    private void loadMessages() {
        FirebaseManager.getInstance().getMessagesRef(chat.id).addListenerForSingleValueEvent(new ValueEventListener() {
            @Override
            public void onDataChange(@NonNull DataSnapshot snapshot) {
                messages.clear();
                for (DataSnapshot ds : snapshot.getChildren()) {
                    Message m = ds.getValue(Message.class);
                    if (m != null) {
                        m.id = ds.getKey();
                        messages.add(m);
                    }
                }
                Collections.sort(messages, (a, b) -> Long.compare(a.getTimestampMillis(), b.getTimestampMillis()));
                adapter.submitList(messages);
                if (!messages.isEmpty()) {
                    rvMessages.scrollToPosition(messages.size() - 1);
                }
                listenRealtimeMessages();
            }

            @Override
            public void onCancelled(@NonNull DatabaseError error) {
                listenRealtimeMessages();
            }
        });
    }

    private void listenRealtimeMessages() {
        FirebaseManager.getInstance().getMessagesRef(chat.id).addChildEventListener(new ChildEventListener() {
            @Override
            public void onChildAdded(@NonNull DataSnapshot snapshot, String previousChildName) {
                String key = snapshot.getKey();
                for (Message m : messages) {
                    if (m.id != null && m.id.equals(key)) return;
                }
                Message m = snapshot.getValue(Message.class);
                if (m != null) {
                    m.id = key;
                    messages.add(m);
                    adapter.submitList(messages);
                    rvMessages.smoothScrollToPosition(messages.size() - 1);
                }
            }

            @Override
            public void onChildChanged(@NonNull DataSnapshot snapshot, String previousChildName) {
                Message updated = snapshot.getValue(Message.class);
                if (updated != null) {
                    updated.id = snapshot.getKey();
                    for (int i = 0; i < messages.size(); i++) {
                        if (messages.get(i).id.equals(updated.id)) {
                            messages.set(i, updated);
                            adapter.notifyItemChanged(i);
                            break;
                        }
                    }
                }
            }

            @Override
            public void onChildRemoved(@NonNull DataSnapshot snapshot) {}
            @Override
            public void onChildMoved(@NonNull DataSnapshot snapshot, String previousChildName) {}
            @Override
            public void onCancelled(@NonNull DatabaseError error) {}
        });
    }

    private void setupTypingAndPresence() {
        if (chat.isGroup()) {
            listenGroupTyping();
        } else if (dmPartnerUid != null) {
            listenDmPartnerPresence();
        } else {
            tvHeaderSubtitle.setText(chat.isFav() ? "сохранённые сообщения" : "в сети");
        }

        tickerRunnable = new Runnable() {
            @Override
            public void run() {
                updateSubtitleStatus();
                tickerHandler.postDelayed(this, 2500);
            }
        };
        tickerHandler.postDelayed(tickerRunnable, 2500);
    }

    private void listenGroupTyping() {
        FirebaseManager.getInstance().getChatRef(chat.id).child("typing").addValueEventListener(new ValueEventListener() {
            @Override
            public void onDataChange(@NonNull DataSnapshot snapshot) {
                updateGroupTypingStatus(snapshot);
            }

            @Override
            public void onCancelled(@NonNull DatabaseError error) {}
        });
    }

    private void updateGroupTypingStatus(DataSnapshot snapshot) {
        String myUid = FirebaseManager.getInstance().getCurrentUid();
        long now = System.currentTimeMillis();
        List<String> activeTyperUids = new ArrayList<>();

        if (snapshot != null) {
            for (DataSnapshot ds : snapshot.getChildren()) {
                if (ds.getKey() != null && !ds.getKey().equals(myUid)) {
                    Object val = ds.getValue();
                    long time = 0;
                    if (val instanceof Long) time = (Long) val;
                    else if (val instanceof Double) time = ((Double) val).longValue();

                    if (time > 0 && (now - time) >= 0 && (now - time) < 4500) {
                        activeTyperUids.add(ds.getKey());
                    }
                }
            }
        }

        if (!activeTyperUids.isEmpty()) {
            String firstUid = activeTyperUids.get(0);
            User u = FirebaseManager.getInstance().getCachedUser(firstUid);
            String name = u != null ? u.getDisplayNameOrNick() : "Участник";
            tvHeaderSubtitle.setText("✏️ " + name + " печатает...");
            tvHeaderSubtitle.setTextColor(getColor(R.color.accent_green));
        } else {
            int membersCount = chat.getMemberList().size();
            tvHeaderSubtitle.setText(membersCount > 0 ? (membersCount + " участников") : "группа");
            tvHeaderSubtitle.setTextColor(getColor(R.color.text_tertiary));
        }
    }

    private void listenDmPartnerPresence() {
        FirebaseManager.getInstance().getUserRef(dmPartnerUid).addValueEventListener(new ValueEventListener() {
            @Override
            public void onDataChange(@NonNull DataSnapshot snapshot) {
                dmPartnerUser = snapshot.getValue(User.class);
                if (dmPartnerUser != null) {
                    dmPartnerUser.uid = snapshot.getKey();
                    headerAvatar.setUser(dmPartnerUser.getDisplayNameOrNick(), dmPartnerUser.getEffectiveAvatar(), dmPartnerUser.online);
                }
                updateSubtitleStatus();
            }

            @Override
            public void onCancelled(@NonNull DatabaseError error) {}
        });
    }

    private void updateSubtitleStatus() {
        if (chat.isGroup() || chat.isFav()) return;

        if (dmPartnerUser == null) {
            tvHeaderSubtitle.setText("в сети");
            tvHeaderSubtitle.setTextColor(getColor(R.color.text_tertiary));
            return;
        }

        if (dmPartnerUser.isTypingInChat(chat.id)) {
            tvHeaderSubtitle.setText("✏️ печатает...");
            tvHeaderSubtitle.setTextColor(getColor(R.color.accent_green));
        } else if (dmPartnerUser.online) {
            tvHeaderSubtitle.setText("в сети");
            tvHeaderSubtitle.setTextColor(getColor(R.color.online_green));
        } else {
            long ls = dmPartnerUser.getLastSeenMillis();
            if (ls > 0) {
                tvHeaderSubtitle.setText("был(а) недавно");
            } else {
                tvHeaderSubtitle.setText("не в сети");
            }
            tvHeaderSubtitle.setTextColor(getColor(R.color.text_tertiary));
        }
    }

    private void showAttachMenu() {
        String[] options = {"📊 Создать опрос", "📷 Отправить фото со спойлером"};
        new AlertDialog.Builder(this)
            .setItems(options, (dialog, which) -> {
                if (which == 0) createPollDialog();
                else if (which == 1) sendDemoImageSpoiler();
            })
            .show();
    }

    private void showChatMenu() {
        String[] options = {"Очистить историю", "Информация о чате"};
        new AlertDialog.Builder(this)
            .setItems(options, (dialog, which) -> {
                if (which == 0) Toast.makeText(this, "История чата синхронизирована", Toast.LENGTH_SHORT).show();
                else if (which == 1) Toast.makeText(this, "ID: " + chat.id, Toast.LENGTH_SHORT).show();
            })
            .show();
    }

    private void createPollDialog() {
        final EditText inputQuestion = new EditText(this);
        inputQuestion.setHint("Вопрос опроса");
        inputQuestion.setPadding(36, 28, 36, 28);
        new AlertDialog.Builder(this)
            .setTitle(R.string.create_poll_title)
            .setView(inputQuestion)
            .setPositiveButton("Создать", (dialog, which) -> {
                String q = inputQuestion.getText().toString().trim();
                if (!q.isEmpty()) {
                    List<PollOption> opts = new ArrayList<>();
                    opts.add(new PollOption("0", "Да"));
                    opts.add(new PollOption("1", "Нет"));
                    opts.add(new PollOption("2", "Возможно"));
                    Poll poll = new Poll(q, opts, false, true);

                    Message msg = new Message();
                    msg.uid = FirebaseManager.getInstance().getCurrentUid();
                    msg.type = "poll";
                    msg.poll = poll;
                    FirebaseManager.getInstance().sendMessage(chat.id, msg, null);
                }
            })
            .setNegativeButton("Отмена", null)
            .show();
    }

    private void sendDemoImageSpoiler() {
        Message msg = new Message();
        msg.uid = FirebaseManager.getInstance().getCurrentUid();
        msg.type = "image";
        msg.fileUrl = "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=600&q=80";
        msg.spoiler = true;
        FirebaseManager.getInstance().sendMessage(chat.id, msg, null);
    }

    @Override
    protected void onDestroy() {
        super.onDestroy();
        tickerHandler.removeCallbacks(tickerRunnable);
        FirebaseManager.getInstance().setTyping(chat.id, chat.isGroup(), false);
    }
}
`);

console.log('All perfection files written successfully!');
