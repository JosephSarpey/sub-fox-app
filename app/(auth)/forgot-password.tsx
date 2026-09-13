import { useSignIn, useAuth } from "@clerk/expo";
import { useRouter } from "expo-router";
import { posthog } from "@/lib/posthog";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";

/** Map Clerk error codes to user-safe messages. */
function getSafeErrorMessage(err: unknown): string {
  if (err && typeof err === "object" && "errors" in err) {
    const clerkErr = (err as { errors: { code: string }[] }).errors?.[0];
    switch (clerkErr?.code) {
      case "form_identifier_not_found":
        // Don't reveal if account exists — generic message prevents enumeration
        return "If an account with that email exists, a reset code has been sent.";
      case "form_code_incorrect":
        return "Incorrect reset code. Please try again.";
      case "verification_expired":
        return "Reset code has expired. Please request a new one.";
      case "form_password_pwned":
        return "This password has been found in a data breach. Please choose a different one.";
      case "form_password_length_too_short":
        return "Password must be at least 8 characters long.";
      case "too_many_attempts":
        return "Too many attempts. Please wait a moment and try again.";
      default:
        return "Something went wrong. Please try again.";
    }
  }
  if (err instanceof Error) {
    return err.message;
  }
  return "Something went wrong. Please try again.";
}

const PASSWORD_MIN_LENGTH = 8;

type Step = "email" | "code" | "newPassword";

export default function ForgotPasswordScreen() {
  const { isLoaded } = useAuth();
  const { signIn } = useSignIn();
  const router = useRouter();

  const [step, setStep] = useState<Step>("email");

  // Step 1 — email
  const [emailAddress, setEmailAddress] = useState("");
  const [emailError, setEmailError] = useState("");

  // Step 2 — code
  const [code, setCode] = useState("");
  const [codeError, setCodeError] = useState("");
  const [resendCooldown, setResendCooldown] = useState(0);
  const cooldownRef = useRef<ReturnType<typeof setInterval> | undefined>(undefined);

  // Step 3 — new password
  const [newPassword, setNewPassword] = useState("");
  const [confirmNewPassword, setConfirmNewPassword] = useState("");
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [passwordErrors, setPasswordErrors] = useState<{
    password?: string;
    confirmPassword?: string;
  }>({});

  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    return () => {
      if (cooldownRef.current) clearInterval(cooldownRef.current);
    };
  }, []);

  const startCooldown = (seconds: number) => {
    setResendCooldown(seconds);
    if (cooldownRef.current) clearInterval(cooldownRef.current);
    cooldownRef.current = setInterval(() => {
      setResendCooldown((prev) => {
        if (prev <= 1) {
          clearInterval(cooldownRef.current!);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  // ── Step 1: Send reset code ────────────────────────
  const onSendCode = async () => {
    if (!isLoaded) return;

    const trimmed = emailAddress.trim();
    if (!trimmed) {
      setEmailError("Email is required");
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
      setEmailError("Enter a valid email address");
      return;
    }

    setEmailError("");
    setErrorMsg("");
    setLoading(true);

    try {
      await signIn.create({ identifier: trimmed });
      await signIn.resetPasswordEmailCode.sendCode();
      setStep("code");
      startCooldown(60);
    } catch (err: unknown) {
      if (__DEV__) console.warn("[ForgotPassword sendCode]", err);
      // For enumeration protection: show a generic "sent" message even on error
      const msg = getSafeErrorMessage(err);
      if (msg.includes("If an account")) {
        setStep("code");
        startCooldown(60);
      } else {
        setErrorMsg(msg);
      }
    } finally {
      setLoading(false);
    }
  };

  // ── Step 1 Resend: Resend from code step ────────────
  const onResendCode = async () => {
    if (!isLoaded || resendCooldown > 0) return;
    setErrorMsg("");
    setLoading(true);
    try {
      await signIn.resetPasswordEmailCode.sendCode();
      startCooldown(60);
    } catch (err: unknown) {
      if (__DEV__) console.warn("[ForgotPassword resend]", err);
      setErrorMsg(getSafeErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  // ── Step 2: Verify code ────────────────────────────
  const onVerifyCode = async () => {
    if (!isLoaded) return;
    if (!code.trim()) {
      setCodeError("Please enter the reset code");
      return;
    }

    setCodeError("");
    setErrorMsg("");
    setLoading(true);

    try {
      await signIn.resetPasswordEmailCode.verifyCode({ code: code.trim() });
      setStep("newPassword");
    } catch (err: unknown) {
      if (__DEV__) console.warn("[ForgotPassword verifyCode]", err);
      setErrorMsg(getSafeErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  // ── Step 3: Submit new password ────────────────────
  const validatePasswords = useCallback((): boolean => {
    const errors: { password?: string; confirmPassword?: string } = {};

    if (!newPassword) {
      errors.password = "Password is required";
    } else if (newPassword.length < PASSWORD_MIN_LENGTH) {
      errors.password = `Password must be at least ${PASSWORD_MIN_LENGTH} characters`;
    }

    if (!confirmNewPassword) {
      errors.confirmPassword = "Please confirm your password";
    } else if (newPassword !== confirmNewPassword) {
      errors.confirmPassword = "Passwords do not match";
    }

    setPasswordErrors(errors);
    return Object.keys(errors).length === 0;
  }, [newPassword, confirmNewPassword]);

  const onSubmitNewPassword = async () => {
    if (!isLoaded) return;
    if (!validatePasswords()) return;

    setErrorMsg("");
    setLoading(true);

    try {
      await signIn.resetPasswordEmailCode.submitPassword({
        password: newPassword,
        signOutOfOtherSessions: true,
      });

      if (signIn.status === "complete") {
        await signIn.finalize();
        posthog?.capture("password_reset_completed");
        // Auth guard in _layout.tsx will redirect to tabs automatically
      } else {
        setErrorMsg("Something went wrong. Please try again.");
      }
    } catch (err: unknown) {
      if (__DEV__) console.warn("[ForgotPassword submitPassword]", err);
      setErrorMsg(getSafeErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  if (!isLoaded) {
    return (
      <View className="flex-1 items-center justify-center bg-background">
        <ActivityIndicator size="large" color="#ea7a53" />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <ScrollView
        className="auth-screen auth-scroll"
        contentContainerClassName="auth-content"
        keyboardShouldPersistTaps="handled"
      >
        {/* ── Brand ─────────────────────────── */}
        <View className="auth-brand-block">
          <View className="auth-logo-wrap">
            <View className="auth-logo-mark">
              <Text className="auth-logo-mark-text">S</Text>
            </View>
            <View>
              <Text className="auth-wordmark">SubFox</Text>
              <Text className="auth-wordmark-sub">SMART BILLING</Text>
            </View>
          </View>

          {step === "email" && (
            <>
              <Text className="auth-title">Reset password</Text>
              <Text className="auth-subtitle">
                Enter your email and we&apos;ll send you a reset code
              </Text>
            </>
          )}
          {step === "code" && (
            <>
              <Text className="auth-title">Check your email</Text>
              <Text className="auth-subtitle">
                We sent a 6-digit code to {emailAddress}
              </Text>
            </>
          )}
          {step === "newPassword" && (
            <>
              <Text className="auth-title">New password</Text>
              <Text className="auth-subtitle">
                Create a new password for your account
              </Text>
            </>
          )}
        </View>

        <View className="auth-card">
          <View className="auth-form">

            {/* ── Step 1: Email ──────────────────── */}
            {step === "email" ? (
              <>
                <View className="auth-field">
                  <Text className="auth-label">Email</Text>
                  <TextInput
                    className={`auth-input ${emailError ? "auth-input-error" : ""}`}
                    autoCapitalize="none"
                    autoComplete="email"
                    autoCorrect={false}
                    value={emailAddress}
                    placeholder="Enter your email"
                    placeholderTextColor="rgba(0,0,0,0.4)"
                    onChangeText={(text) => {
                      setEmailAddress(text);
                      if (emailError) setEmailError("");
                    }}
                    keyboardType="email-address"
                    textContentType="emailAddress"
                    returnKeyType="done"
                    onSubmitEditing={onSendCode}
                    accessibilityLabel="Email address input"
                    accessibilityHint="Enter the email associated with your account"
                  />
                  {emailError ? (
                    <Text className="auth-error">{emailError}</Text>
                  ) : null}
                </View>

                {errorMsg ? <Text className="auth-error">{errorMsg}</Text> : null}

                <Pressable
                  className={`auth-button ${loading ? "auth-button-disabled" : ""}`}
                  onPress={onSendCode}
                  disabled={loading}
                  accessibilityRole="button"
                  accessibilityLabel={loading ? "Sending code" : "Send reset code button"}
                >
                  <Text className="auth-button-text">
                    {loading ? "Sending..." : "Send reset code"}
                  </Text>
                </Pressable>

                <Pressable
                  className="auth-link-row"
                  onPress={() => router.back()}
                  accessibilityRole="button"
                  accessibilityLabel="Back to sign in"
                >
                  <Text className="auth-link">← Back to sign in</Text>
                </Pressable>
              </>
            ) : null}

            {/* ── Step 2: Code ───────────────────── */}
            {step === "code" ? (
              <>
                <View className="auth-field">
                  <Text className="auth-label">Reset Code</Text>
                  <TextInput
                    className={`auth-input ${codeError ? "auth-input-error" : ""}`}
                    value={code}
                    placeholder="Enter 6-digit code"
                    placeholderTextColor="rgba(0,0,0,0.4)"
                    keyboardType="number-pad"
                    onChangeText={(text) => {
                      setCode(text);
                      if (codeError) setCodeError("");
                    }}
                    maxLength={6}
                    textContentType="oneTimeCode"
                    autoComplete="one-time-code"
                    returnKeyType="done"
                    onSubmitEditing={onVerifyCode}
                    accessibilityLabel="Reset code input"
                    accessibilityHint="Enter the 6-digit code sent to your email"
                  />
                  {codeError ? (
                    <Text className="auth-error">{codeError}</Text>
                  ) : null}
                </View>

                {errorMsg ? <Text className="auth-error">{errorMsg}</Text> : null}

                <Pressable
                  className={`auth-button ${loading ? "auth-button-disabled" : ""}`}
                  onPress={onVerifyCode}
                  disabled={loading}
                  accessibilityRole="button"
                  accessibilityLabel={loading ? "Verifying code" : "Verify code button"}
                >
                  <Text className="auth-button-text">
                    {loading ? "Verifying..." : "Verify code"}
                  </Text>
                </Pressable>

                <Pressable
                  className={`auth-secondary-button ${resendCooldown > 0 ? "auth-button-disabled" : ""}`}
                  onPress={onResendCode}
                  disabled={resendCooldown > 0 || loading}
                  accessibilityRole="button"
                  accessibilityLabel="Resend reset code"
                >
                  <Text className="auth-secondary-button-text">
                    {resendCooldown > 0
                      ? `Resend code in ${resendCooldown}s`
                      : "Resend code"}
                  </Text>
                </Pressable>

                <Pressable
                  className="auth-link-row"
                  onPress={() => {
                    setStep("email");
                    setCode("");
                    setCodeError("");
                    setErrorMsg("");
                    if (cooldownRef.current) clearInterval(cooldownRef.current);
                    setResendCooldown(0);
                  }}
                  accessibilityRole="button"
                  accessibilityLabel="Back to email step"
                >
                  <Text className="auth-link">← Change email address</Text>
                </Pressable>
              </>
            ) : null}

            {/* ── Step 3: New Password ────────────── */}
            {step === "newPassword" ? (
              <>
                <View className="auth-field">
                  <Text className="auth-label">New password</Text>
                  <View>
                    <TextInput
                      className={`auth-input ${passwordErrors.password ? "auth-input-error" : ""}`}
                      value={newPassword}
                      placeholder="Create a new password"
                      placeholderTextColor="rgba(0,0,0,0.4)"
                      secureTextEntry={!showNewPassword}
                      autoComplete="new-password"
                      onChangeText={(text) => {
                        setNewPassword(text);
                        if (passwordErrors.password)
                          setPasswordErrors((p) => ({ ...p, password: undefined }));
                        if (confirmNewPassword && text !== confirmNewPassword) {
                          setPasswordErrors((p) => ({ ...p, confirmPassword: "Passwords do not match" }));
                        } else if (confirmNewPassword) {
                          setPasswordErrors((p) => ({ ...p, confirmPassword: undefined }));
                        }
                      }}
                      textContentType="newPassword"
                      returnKeyType="next"
                      accessibilityLabel="New password input"
                    />
                    <Pressable
                      onPress={() => setShowNewPassword((v) => !v)}
                      style={{
                        position: "absolute",
                        right: 16,
                        top: 0,
                        bottom: 0,
                        justifyContent: "center",
                      }}
                      accessibilityLabel={showNewPassword ? "Hide password" : "Show password"}
                      accessibilityRole="button"
                      hitSlop={8}
                    >
                      <Text style={{ fontSize: 14, color: "rgba(0,0,0,0.5)", fontFamily: "sans-semibold" }}>
                        {showNewPassword ? "Hide" : "Show"}
                      </Text>
                    </Pressable>
                  </View>
                  {passwordErrors.password ? (
                    <Text className="auth-error">{passwordErrors.password}</Text>
                  ) : (
                    <Text className="auth-helper">At least {PASSWORD_MIN_LENGTH} characters</Text>
                  )}
                </View>

                <View className="auth-field">
                  <Text className="auth-label">Confirm new password</Text>
                  <View>
                    <TextInput
                      className={`auth-input ${passwordErrors.confirmPassword ? "auth-input-error" : ""}`}
                      value={confirmNewPassword}
                      placeholder="Re-enter your new password"
                      placeholderTextColor="rgba(0,0,0,0.4)"
                      secureTextEntry={!showConfirmPassword}
                      autoComplete="new-password"
                      onChangeText={(text) => {
                        setConfirmNewPassword(text);
                        if (newPassword && text !== newPassword) {
                          setPasswordErrors((p) => ({ ...p, confirmPassword: "Passwords do not match" }));
                        } else {
                          setPasswordErrors((p) => ({ ...p, confirmPassword: undefined }));
                        }
                      }}
                      textContentType="newPassword"
                      returnKeyType="done"
                      onSubmitEditing={onSubmitNewPassword}
                      accessibilityLabel="Confirm new password input"
                    />
                    <Pressable
                      onPress={() => setShowConfirmPassword((v) => !v)}
                      style={{
                        position: "absolute",
                        right: 16,
                        top: 0,
                        bottom: 0,
                        justifyContent: "center",
                      }}
                      accessibilityLabel={showConfirmPassword ? "Hide confirm password" : "Show confirm password"}
                      accessibilityRole="button"
                      hitSlop={8}
                    >
                      <Text style={{ fontSize: 14, color: "rgba(0,0,0,0.5)", fontFamily: "sans-semibold" }}>
                        {showConfirmPassword ? "Hide" : "Show"}
                      </Text>
                    </Pressable>
                  </View>
                  {passwordErrors.confirmPassword ? (
                    <Text className="auth-error">{passwordErrors.confirmPassword}</Text>
                  ) : null}
                </View>

                {errorMsg ? <Text className="auth-error">{errorMsg}</Text> : null}

                <Pressable
                  className={`auth-button ${loading ? "auth-button-disabled" : ""}`}
                  onPress={onSubmitNewPassword}
                  disabled={loading}
                  accessibilityRole="button"
                  accessibilityLabel={loading ? "Updating password" : "Set new password button"}
                >
                  <Text className="auth-button-text">
                    {loading ? "Updating..." : "Set new password"}
                  </Text>
                </Pressable>
              </>
            ) : null}

          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
