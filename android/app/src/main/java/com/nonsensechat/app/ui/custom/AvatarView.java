package com.nonsensechat.app.ui.custom;

import android.content.Context;
import android.graphics.Canvas;
import android.graphics.Color;
import android.graphics.Paint;
import android.graphics.Rect;
import android.util.AttributeSet;
import androidx.appcompat.widget.AppCompatImageView;
import com.bumptech.glide.Glide;
import com.nonsensechat.app.R;

public class AvatarView extends AppCompatImageView {
    private boolean isOnline = false;
    private String initials = "";
    private final Paint bgPaint = new Paint(Paint.ANTI_ALIAS_FLAG);
    private final Paint textPaint = new Paint(Paint.ANTI_ALIAS_FLAG);
    private final Paint onlinePaint = new Paint(Paint.ANTI_ALIAS_FLAG);
    private final Paint onlineStrokePaint = new Paint(Paint.ANTI_ALIAS_FLAG);
    private final Rect textBounds = new Rect();

    private static final int[] PALETTE = {
        Color.parseColor("#6366F1"), // Indigo
        Color.parseColor("#06B6D4"), // Cyan
        Color.parseColor("#10B981"), // Emerald
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
        textPaint.setFakeBoldText(true);

        onlinePaint.setColor(Color.parseColor("#22C55E"));
        onlineStrokePaint.setColor(Color.parseColor("#080C14"));
        onlineStrokePaint.setStyle(Paint.Style.STROKE);
    }

    public void setUser(String name, String avatarUrl, boolean online) {
        this.isOnline = online;
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

    public void setOnline(boolean online) {
        this.isOnline = online;
        invalidate();
    }

    @Override
    protected void onDraw(Canvas canvas) {
        int w = getWidth();
        int h = getHeight();
        float radius = Math.min(w, h) / 2f;

        if (getDrawable() == null) {
            // Draw colorful circle with initials
            canvas.drawCircle(w / 2f, h / 2f, radius, bgPaint);
            textPaint.setTextSize(radius * 0.85f);
            textPaint.getTextBounds(initials, 0, initials.length(), textBounds);
            float y = (h / 2f) + (textBounds.height() / 2f);
            canvas.drawText(initials, w / 2f, y, textPaint);
        } else {
            super.onDraw(canvas);
        }

        // Draw online green dot badge
        if (isOnline) {
            float dotRadius = radius * 0.28f;
            float cx = w - dotRadius - 1f;
            float cy = h - dotRadius - 1f;
            onlineStrokePaint.setStrokeWidth(dotRadius * 0.4f);
            canvas.drawCircle(cx, cy, dotRadius, onlinePaint);
            canvas.drawCircle(cx, cy, dotRadius, onlineStrokePaint);
        }
    }
}
