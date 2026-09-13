import { useSignUp, useAuth } from "@clerk/expo";
import { Link } from "expo-router";
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
      case "form_identifier_exists":
        return "An account with this email already exists. Try signing in instead.";
      case "form_password_pwned":
        return "This password has been found in a data breach. Please choose a different one.";
      case "form_password_length_too_short":
        return "Password must be at least 8 characters long.";
      case "form_param_format_invalid":
        return "Please enter a valid email address.";
      case "form_code_incorrect":
        return "Incorrect verification code. Please try again.";
      case "verification_expired":
        return "Verification code has expired. Please request a new one.";
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

export default function SignUpScreen() {
  const { isLoaded } = useAuth();
  const { signUp } = useSignUp();

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [emailAddress, setEmailAddress] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [pendingVerification, setPendingVerification] = useState(false);
  const [code, setCode] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const [fieldErrors, setFieldErrors] = useState<{
    firstName?: string;
    lastName?: string;
    email?: string;
    password?: string;
    confirmPassword?: string;
  }>({});
  const [loading, setLoading] = useState(false);

  // Resend cooldown
  const [resendCooldown, setResendCooldown] = useState(0);
  const cooldownRef = useRef<ReturnType<typeof setInterval> | undefined>(undefined);

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

  const validate = useCallback((): boolean => {
    const errors: {
      firstName?: string;
      lastName?: string;
      email?: string;
      password?: string;
      confirmPassword?: string;
    } = {};
    const trimmedEmail = emailAddress.trim();

    if (!firstName.trim()) {
      errors.firstName = "First name is required";
    }

    if (!lastName.trim()) {
      errors.lastName = "Last name is required";
    }

    if (!trimmedEmail) {
      errors.email = "Email is required";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
      errors.email = "Enter a valid email address";
    }

    if (!password) {
      errors.password = "Password is required";
    } else if (password.length < PASSWORD_MIN_LENGTH) {
      errors.password = `Password must be at least ${PASSWORD_MIN_LENGTH} characters`;
    }

    if (!confirmPassword) {
      errors.confirmPassword = "Please confirm your password";
    } else if (password !== confirmPassword) {
      errors.confirmPassword = "Passwords do not match";
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  }, [firstName, lastName, emailAddress, password, confirmPassword]);

  const onSignUpPress = async () => {
    if (!isLoaded) return;
    if (!validate()) return;

    setErrorMsg("");
    setLoading(true);

    try {
      await signUp.password({
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        emailAddress: emailAddress.trim(),
        password,
      });

      await signUp.verifications.sendEmailCode();

      setPendingVerification(true);
      startCooldown(60);
    } catch (err: unknown) {
      if (__DEV__) {
        console.warn("[SignUp Error]", err);
      }
      setErrorMsg(getSafeErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  const onPressVerify = async () => {
    if (!isLoaded) return;
    if (!code.trim()) {
      setErrorMsg("Please enter the verification code");
      return;
    }

    setErrorMsg("");
    setLoading(true);

    try {
      await signUp.verifications.verifyEmailCode({ code: code.trim() });
      await signUp.finalize();
    } catch (err: unknown) {
      if (__DEV__) {
        console.warn("[Verify Error]", err);
      }
      setErrorMsg(getSafeErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  const onResendCode = async () => {
    if (!isLoaded || resendCooldown > 0) return;

    setErrorMsg("");
    try {
      await signUp.verifications.sendEmailCode();
      startCooldown(60);
    } catch (err: unknown) {
      if (__DEV__) {
        console.warn("[Resend Error]", err);
      }
      setErrorMsg(getSafeErrorMessage(err));
    }
  };

  const onGoBack = () => {
    setPendingVerification(false);
    setCode("");
    setErrorMsg("");
    if (cooldownRef.current) clearInterval(cooldownRef.current);
    setResendCooldown(0);
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

          {!pendingVerification ? (
            <>
              <Text className="auth-title">Create account</Text>
              <Text className="auth-subtitle">
                Join us to start managing your subscriptions
              </Text>
            </>
          ) : (
            <>
              <Text className="auth-title">Check your email</Text>
              <Text className="auth-subtitle">
                We&apos;ve sent a verification code to {emailAddress}
              </Text>
            </>
          )}
        </View>

        <View className="auth-card">
          <View className="auth-form">
            {!pendingVerification ? (
              <>
                {/* ── Name Row ─────────────────────── */}
                <View style={{ flexDirection: "row", gap: 10 }}>
                  <View style={{ flex: 1 }} className="auth-field">
                    <Text className="auth-label">First name</Text>
                    <TextInput
                      className={`auth-input ${fieldErrors.firstName ? "auth-input-error" : ""}`}
                      autoCapitalize="words"
                      autoComplete="name-given"
                      autoCorrect={false}
                      value={firstName}
                      placeholder="First"
                      placeholderTextColor="rgba(0,0,0,0.4)"
                      onChangeText={(text) => {
                        setFirstName(text);
                        if (fieldErrors.firstName)
                          setFieldErrors((p) => ({ ...p, firstName: undefined }));
                      }}
                      textContentType="givenName"
                      returnKeyType="next"
                      accessibilityLabel="First name input"
                    />
                    {fieldErrors.firstName ? (
                      <Text className="auth-error">{fieldErrors.firstName}</Text>
                    ) : null}
                  </View>

                  <View style={{ flex: 1 }} className="auth-field">
                    <Text className="auth-label">Last name</Text>
                    <TextInput
                      className={`auth-input ${fieldErrors.lastName ? "auth-input-error" : ""}`}
                      autoCapitalize="words"
                      autoComplete="name-family"
                      autoCorrect={false}
                      value={lastName}
                      placeholder="Last"
                      placeholderTextColor="rgba(0,0,0,0.4)"
                      onChangeText={(text) => {
                        setLastName(text);
                        if (fieldErrors.lastName)
                          setFieldErrors((p) => ({ ...p, lastName: undefined }));
                      }}
                      textContentType="familyName"
                      returnKeyType="next"
                      accessibilityLabel="Last name input"
                    />
                    {fieldErrors.lastName ? (
                      <Text className="auth-error">{fieldErrors.lastName}</Text>
                    ) : null}
                  </View>
                </View>

                {/* ── Email ─────────────────────────── */}
                <View className="auth-field">
                  <Text className="auth-label">Email</Text>
                  <TextInput
                    className={`auth-input ${fieldErrors.email ? "auth-input-error" : ""}`}
                    autoCapitalize="none"
                    autoComplete="email"
                    autoCorrect={false}
                    value={emailAddress}
                    placeholder="Enter your email"
                    placeholderTextColor="rgba(0,0,0,0.4)"
                    onChangeText={(text) => {
                      setEmailAddress(text);
                      if (fieldErrors.email) setFieldErrors((p) => ({ ...p, email: undefined }));
                    }}
                    keyboardType="email-address"
                    textContentType="emailAddress"
                    returnKeyType="next"
                    accessibilityLabel="Email address input"
                    accessibilityHint="Enter your email address to create an account"
                  />
                  {fieldErrors.email ? (
                    <Text className="auth-error">{fieldErrors.email}</Text>
                  ) : null}
                </View>

                {/* ── Password ──────────────────────── */}
                <View className="auth-field">
                  <Text className="auth-label">Password</Text>
                  <View>
                    <TextInput
                      className={`auth-input ${fieldErrors.password ? "auth-input-error" : ""}`}
                      value={password}
                      placeholder="Create a password"
                      placeholderTextColor="rgba(0,0,0,0.4)"
                      secureTextEntry={!showPassword}
                      autoComplete="new-password"
                      onChangeText={(text) => {
                        setPassword(text);
                        if (fieldErrors.password)
                          setFieldErrors((p) => ({ ...p, password: undefined }));
                        // Re-validate confirm match live
                        if (confirmPassword && text !== confirmPassword) {
                          setFieldErrors((p) => ({ ...p, confirmPassword: "Passwords do not match" }));
                        } else if (confirmPassword) {
                          setFieldErrors((p) => ({ ...p, confirmPassword: undefined }));
                        }
                      }}
                      textContentType="newPassword"
                      returnKeyType="next"
                      accessibilityLabel="Password input"
                      accessibilityHint="Create a password with at least 8 characters"
                    />
                    <Pressable
                      onPress={() => setShowPassword((v) => !v)}
                      style={{
                        position: "absolute",
                        right: 16,
                        top: 0,
                        bottom: 0,
                        justifyContent: "center",
                      }}
                      accessibilityLabel={showPassword ? "Hide password" : "Show password"}
                      accessibilityRole="button"
                      hitSlop={8}
                    >
                      <Text style={{ fontSize: 14, color: "rgba(0,0,0,0.5)", fontFamily: "sans-semibold" }}>
                        {showPassword ? "Hide" : "Show"}
                      </Text>
                    </Pressable>
                  </View>
                  {fieldErrors.password ? (
                    <Text className="auth-error">{fieldErrors.password}</Text>
                  ) : (
                    <Text className="auth-helper">At least {PASSWORD_MIN_LENGTH} characters</Text>
                  )}
                </View>

                {/* ── Confirm Password ──────────────── */}
                <View className="auth-field">
                  <Text className="auth-label">Confirm password</Text>
                  <View>
                    <TextInput
                      className={`auth-input ${fieldErrors.confirmPassword ? "auth-input-error" : ""}`}
                      value={confirmPassword}
                      placeholder="Re-enter your password"
                      placeholderTextColor="rgba(0,0,0,0.4)"
                      secureTextEntry={!showConfirmPassword}
                      autoComplete="new-password"
                      onChangeText={(text) => {
                        setConfirmPassword(text);
                        if (password && text !== password) {
                          setFieldErrors((p) => ({ ...p, confirmPassword: "Passwords do not match" }));
                        } else {
                          setFieldErrors((p) => ({ ...p, confirmPassword: undefined }));
                        }
                      }}
                      textContentType="newPassword"
                      returnKeyType="done"
                      onSubmitEditing={onSignUpPress}
                      accessibilityLabel="Confirm password input"
                      accessibilityHint="Re-enter your password to confirm"
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
                  {fieldErrors.confirmPassword ? (
                    <Text className="auth-error">{fieldErrors.confirmPassword}</Text>
                  ) : null}
                </View>

                {errorMsg ? <Text className="auth-error">{errorMsg}</Text> : null}

                <Pressable
                  className={`auth-button ${loading ? "auth-button-disabled" : ""}`}
                  onPress={onSignUpPress}
                  disabled={loading}
                  accessibilityLabel={loading ? "Creating account" : "Sign up button"}
                  accessibilityRole="button"
                >
                  <Text className="auth-button-text">
                    {loading ? "Creating account..." : "Sign up"}
                  </Text>
                </Pressable>

                <View className="auth-link-row">
                  <Text className="auth-link-copy">Already have an account?</Text>
                  <Link href="/(auth)/sign-in" asChild>
                    <Pressable accessibilityRole="link">
                      <Text className="auth-link">Sign in</Text>
                    </Pressable>
                  </Link>
                </View>
              </>
            ) : (
              <>
                <View className="auth-field">
                  <Text className="auth-label">Verification Code</Text>
                  <TextInput
                    className="auth-input"
                    value={code}
                    placeholder="Enter 6-digit code"
                    placeholderTextColor="rgba(0,0,0,0.4)"
                    keyboardType="number-pad"
                    onChangeText={setCode}
                    maxLength={6}
                    textContentType="oneTimeCode"
                    autoComplete="one-time-code"
                    returnKeyType="done"
                    onSubmitEditing={onPressVerify}
                    accessibilityLabel="Verification code input"
                    accessibilityHint="Enter the 6-digit code sent to your email"
                  />
                </View>

                {errorMsg ? <Text className="auth-error">{errorMsg}</Text> : null}

                <Pressable
                  className={`auth-button ${loading ? "auth-button-disabled" : ""}`}
                  onPress={onPressVerify}
                  disabled={loading}
                  accessibilityLabel={loading ? "Verifying" : "Verify email button"}
                  accessibilityRole="button"
                >
                  <Text className="auth-button-text">
                    {loading ? "Verifying..." : "Verify email"}
                  </Text>
                </Pressable>

                <Pressable
                  className={`auth-secondary-button ${resendCooldown > 0 ? "auth-button-disabled" : ""}`}
                  onPress={onResendCode}
                  disabled={resendCooldown > 0}
                  accessibilityLabel="Resend verification code"
                  accessibilityRole="button"
                >
                  <Text className="auth-secondary-button-text">
                    {resendCooldown > 0
                      ? `Resend code in ${resendCooldown}s`
                      : "Resend code"}
                  </Text>
                </Pressable>

                <Pressable
                  onPress={onGoBack}
                  className="auth-link-row"
                  accessibilityLabel="Go back to change email"
                  accessibilityRole="button"
                >
                  <Text className="auth-link">← Change email address</Text>
                </Pressable>
              </>
            )}
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
