package com.nonsensechat.app.ui.custom;

import android.animation.ValueAnimator;
import android.content.Context;
import android.graphics.Canvas;
import android.graphics.Color;
import android.graphics.Paint;
import android.os.VibrationEffect;
import android.os.Vibrator;
import android.util.AttributeSet;
import android.view.MotionEvent;
import android.view.View;
import android.widget.FrameLayout;
import java.util.Random;

public class TelegramSpoilerView extends FrameLayout {
    private boolean isRevealed = false;
    private final Paint particlePaint = new Paint(Paint.ANTI_ALIAS_FLAG);
    private final Paint overlayPaint = new Paint(Paint.ANTI_ALIAS_FLAG);
    private final Random random = new Random();
    private float[][] particles;
    private ValueAnimator shimmerAnimator;
    private float shimmerOffset = 0f;

    public TelegramSpoilerView(Context context) {
        this(context, null);
    }

    public TelegramSpoilerView(Context context, AttributeSet attrs) {
        this(context, attrs, 0);
    }

    public TelegramSpoilerView(Context context, AttributeSet attrs, int defStyleAttr) {
        super(context, attrs, defStyleAttr);
        init();
    }

    private void init() {
        setWillNotDraw(false);
        overlayPaint.setColor(Color.parseColor("#E60D1626"));
        particlePaint.setColor(Color.parseColor("#9900FF88"));

        // Sparkle / dust particle shimmer
        shimmerAnimator = ValueAnimator.ofFloat(0f, 1f);
        shimmerAnimator.setDuration(1200);
        shimmerAnimator.setRepeatCount(ValueAnimator.INFINITE);
        shimmerAnimator.addUpdateListener(anim -> {
            shimmerOffset = (float) anim.getAnimatedValue();
            if (!isRevealed) invalidate();
        });
        shimmerAnimator.start();

        setOnClickListener(v -> reveal());
    }

    @Override
    protected void onSizeChanged(int w, int h, int oldw, int oldh) {
        super.onSizeChanged(w, h, oldw, oldh);
        if (w > 0 && h > 0) {
            int count = Math.min(250, (w * h) / 300);
            particles = new float[count][4]; // x, y, radius, alpha
            for (int i = 0; i < count; i++) {
                particles[i][0] = random.nextFloat() * w;
                particles[i][1] = random.nextFloat() * h;
                particles[i][2] = 1.5f + random.nextFloat() * 2.5f;
                particles[i][3] = 100 + random.nextInt(155);
            }
        }
    }

    @Override
    protected void dispatchDraw(Canvas canvas) {
        super.dispatchDraw(canvas);
        if (!isRevealed && particles != null) {
            int w = getWidth();
            int h = getHeight();

            // Dark frosted overlay
            canvas.drawRect(0, 0, w, h, overlayPaint);

            // Shimmering particle dust (Telegram style)
            for (float[] p : particles) {
                float y = (p[1] + shimmerOffset * 40f) % h;
                float x = (p[0] + (float) Math.sin(shimmerOffset * 6.28 + p[1]) * 6f) % w;
                particlePaint.setAlpha((int) p[3]);
                canvas.drawCircle(x, y, p[2], particlePaint);
            }
        }
    }

    public void setRevealed(boolean revealed) {
        this.isRevealed = revealed;
        invalidate();
    }

    public boolean isRevealed() {
        return isRevealed;
    }

    public void reveal() {
        if (isRevealed) return;
        isRevealed = true;
        try {
            Vibrator vibrator = (Vibrator) getContext().getSystemService(Context.VIBRATOR_SERVICE);
            if (vibrator != null && vibrator.hasVibrator()) {
                vibrator.vibrate(VibrationEffect.createOneShot(35, VibrationEffect.DEFAULT_AMPLITUDE));
            }
        } catch (Exception ignored) {}

        animate().alpha(1f).setDuration(250).withEndAction(this::invalidate).start();
        invalidate();
    }
}
