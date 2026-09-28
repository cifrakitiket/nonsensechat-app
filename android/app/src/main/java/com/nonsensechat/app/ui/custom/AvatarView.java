package com.nonsensechat.app.ui.custom;

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
