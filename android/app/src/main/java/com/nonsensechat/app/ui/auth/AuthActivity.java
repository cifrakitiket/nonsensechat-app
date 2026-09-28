package com.nonsensechat.app.ui.auth;

import android.content.Intent;
import android.os.Bundle;
import android.view.View;
import android.widget.Button;
import android.widget.EditText;
import android.widget.ProgressBar;
import android.widget.TextView;
import android.widget.Toast;
import androidx.appcompat.app.AppCompatActivity;
import com.google.firebase.auth.FirebaseAuth;
import com.nonsensechat.app.R;
import com.nonsensechat.app.data.FirebaseManager;
import com.nonsensechat.app.model.User;
import com.nonsensechat.app.ui.main.MainActivity;

public class AuthActivity extends AppCompatActivity {
    private boolean isRegisterMode = false;
    private EditText etNickname, etEmail, etPassword;
    private Button btnSubmit;
    private TextView authTitle, authSubtitle, tvToggleMode, btnGuestLogin;
    private ProgressBar authProgress;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_auth);

        etNickname = findViewById(R.id.etNickname);
        etEmail = findViewById(R.id.etEmail);
        etPassword = findViewById(R.id.etPassword);
        btnSubmit = findViewById(R.id.btnSubmit);
        authTitle = findViewById(R.id.authTitle);
        authSubtitle = findViewById(R.id.authSubtitle);
        tvToggleMode = findViewById(R.id.tvToggleMode);
        btnGuestLogin = findViewById(R.id.btnGuestLogin);
        authProgress = findViewById(R.id.authProgress);

        tvToggleMode.setOnClickListener(v -> toggleMode());
        btnSubmit.setOnClickListener(v -> submit());
        btnGuestLogin.setOnClickListener(v -> guestLogin());
    }

    private void toggleMode() {
        isRegisterMode = !isRegisterMode;
        if (isRegisterMode) {
            authTitle.setText(R.string.register_title);
            authSubtitle.setText(R.string.register_subtitle);
            etNickname.setVisibility(View.VISIBLE);
            btnSubmit.setText(R.string.action_register);
            tvToggleMode.setText(R.string.have_account);
        } else {
            authTitle.setText(R.string.login_title);
            authSubtitle.setText(R.string.login_subtitle);
            etNickname.setVisibility(View.GONE);
            btnSubmit.setText(R.string.action_login);
            tvToggleMode.setText(R.string.dont_have_account);
        }
    }

    private void submit() {
        String email = etEmail.getText().toString().trim();
        String password = etPassword.getText().toString().trim();
        String nickname = etNickname.getText().toString().trim();

        if (email.isEmpty() || !email.contains("@")) {
            Toast.makeText(this, R.string.invalid_email, Toast.LENGTH_SHORT).show();
            return;
        }
        if (password.length() < 6) {
            Toast.makeText(this, R.string.short_password, Toast.LENGTH_SHORT).show();
            return;
        }

        setLoading(true);
        FirebaseAuth auth = FirebaseManager.getInstance().getAuth();

        if (isRegisterMode) {
            if (nickname.isEmpty()) nickname = email.split("@")[0];
            final String finalNick = nickname;
            auth.createUserWithEmailAndPassword(email, password)
                .addOnSuccessListener(authResult -> {
                    String uid = authResult.getUser().getUid();
                    User newUser = new User(uid, finalNick, email);
                    FirebaseManager.getInstance().getUserRef(uid).setValue(newUser)
                        .addOnCompleteListener(t -> onSuccess());
                })
                .addOnFailureListener(e -> {
                    setLoading(false);
                    Toast.makeText(this, e.getMessage(), Toast.LENGTH_LONG).show();
                });
        } else {
            auth.signInWithEmailAndPassword(email, password)
                .addOnSuccessListener(authResult -> onSuccess())
                .addOnFailureListener(e -> {
                    setLoading(false);
                    Toast.makeText(this, e.getMessage(), Toast.LENGTH_LONG).show();
                });
        }
    }

    private void guestLogin() {
        setLoading(true);
        FirebaseManager.getInstance().getAuth().signInAnonymously()
            .addOnSuccessListener(authResult -> {
                String uid = authResult.getUser().getUid();
                String guestNick = "Гость_" + uid.substring(0, 4);
                User guest = new User(uid, guestNick, guestNick + "@nonsense.local");
                FirebaseManager.getInstance().getUserRef(uid).setValue(guest)
                    .addOnCompleteListener(t -> onSuccess());
            })
            .addOnFailureListener(e -> {
                setLoading(false);
                Toast.makeText(this, e.getMessage(), Toast.LENGTH_SHORT).show();
            });
    }

    private void onSuccess() {
        FirebaseManager.getInstance().setupPresence();
        startActivity(new Intent(this, MainActivity.class));
        finish();
    }

    private void setLoading(boolean loading) {
        authProgress.setVisibility(loading ? View.VISIBLE : View.GONE);
        btnSubmit.setEnabled(!loading);
    }
}
