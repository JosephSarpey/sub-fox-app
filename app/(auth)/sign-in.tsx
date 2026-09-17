import { posthog } from "@/lib/posthog";
import { useAuth, useSignIn } from "@clerk/expo";
import { Link } from "expo-router";
import { useCallback, useState } from "react";
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

/** Map Clerk error codes to user-safe messages to prevent account enumeration. */
function getSafeErrorMessage(err: unknown): string {
  if (err && typeof err === "object" && "errors" in err) {
    const clerkErr = (err as { errors: { code: string }[] }).errors?.[0];
    switch (clerkErr?.code) {
      case "form_identifier_not_found":
      case "form_password_incorrect":
        return "Invalid email or password. Please try again.";
      case "form_param_format_invalid":
        return "Please enter a valid email address.";
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

export default function SignInScreen() {
  const { isLoaded } = useAuth();
  const { signIn } = useSignIn();

  const [emailAddress, setEmailAddress] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [code, setCode] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const [fieldErrors, setFieldErrors] = useState<{
    email?: string;
    password?: string;
    code?: string;
  }>({});
  const [loading, setLoading] = useState(false);

  const validate = useCallback((): boolean => {
    const errors: { email?: string; password?: string } = {};
    const trimmedEmail = emailAddress.trim();

    if (!trimmedEmail) {
      errors.email = "Email is required";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
      errors.email = "Enter a valid email address";
    }

    if (!password) {
      errors.password = "Password is required";
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  }, [emailAddress, password]);

  const onSignInPress = async () => {
    if (!isLoaded) return;
    if (!validate()) return;

    setErrorMsg("");
    setLoading(true);

    try {
      const { error } = await signIn.password({
        emailAddress: emailAddress.trim(),
        password,
      });

      if (error) {
        setErrorMsg(getSafeErrorMessage(error));
        setLoading(false);
        return;
      }

      if (signIn.status === "complete") {
        const { error: finalizeError } = await signIn.finalize();

        if (finalizeError) {
          setErrorMsg(getSafeErrorMessage(finalizeError));
          return;
        }

        posthog?.capture("sign_in_completed");
      } else if (signIn.status === "needs_client_trust") {
        const emailCodeFactor = signIn.supportedSecondFactors?.find(
          (factor) => factor.strategy === "email_code",
        );
        if (emailCodeFactor) {
          await signIn.mfa.sendEmailCode();
        } else {
          setErrorMsg(
            "Device trust verification required but email verification is not supported.",
          );
        }
      } else if (signIn.status === "needs_second_factor") {
        setErrorMsg(
          "Two-factor authentication is required but not yet supported in this app.",
        );
      } else {
        setErrorMsg(`Sign in requires further action: ${signIn.status}`);
      }

      // If successful, useAuth automatically updates and layout redirects
    } catch (err: unknown) {
      if (__DEV__) {
        console.warn("[SignIn Error]", err);
      }
      setErrorMsg(getSafeErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  const onVerifyPress = async () => {
    if (!isLoaded) return;
    if (!code.trim()) {
      setFieldErrors({ code: "Code is required" });
      return;
    }

    setErrorMsg("");
    setLoading(true);

    try {
      await signIn.mfa.verifyEmailCode({ code: code.trim() });

      if (signIn.status === "complete") {
        const { error: finalizeError } = await signIn.finalize();

        if (finalizeError) {
          setErrorMsg(getSafeErrorMessage(finalizeError));
          return;
        }

        posthog?.capture("sign_in_completed");
      } else {
        setErrorMsg(`Sign in requires further action: ${signIn.status}`);
      }
    } catch (err: unknown) {
      if (__DEV__) {
        console.warn("[Verify Error]", err);
      }
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

  if (signIn?.status === "needs_client_trust") {
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

            <Text className="auth-title">Verify new device</Text>
            <Text className="auth-subtitle">
              We&apos;ve sent a verification code to your email.
            </Text>
          </View>

          <View className="auth-card">
            <View className="auth-form">
              <View className="auth-field">
                <Text className="auth-label">Verification Code</Text>
                <TextInput
                  className={`auth-input ${fieldErrors.code ? "auth-input-error" : ""}`}
                  autoCapitalize="none"
                  autoCorrect={false}
                  value={code}
                  placeholder="Enter code"
                  placeholderTextColor="rgba(0,0,0,0.4)"
                  onChangeText={(text) => {
                    setCode(text);
                    if (fieldErrors.code)
                      setFieldErrors((p) => ({ ...p, code: undefined }));
                  }}
                  keyboardType="number-pad"
                  returnKeyType="done"
                  onSubmitEditing={onVerifyPress}
                />
                {fieldErrors.code ? (
                  <Text className="auth-error">{fieldErrors.code}</Text>
                ) : null}
              </View>

              {errorMsg ? <Text className="auth-error">{errorMsg}</Text> : null}

              <Pressable
                className={`auth-button ${loading ? "auth-button-disabled" : ""}`}
                onPress={onVerifyPress}
                disabled={loading}
              >
                <Text className="auth-button-text">
                  {loading ? "Verifying..." : "Verify"}
                </Text>
              </Pressable>

              <Pressable
                onPress={async () => {
                  setErrorMsg("");
                  try {
                    await signIn.mfa.sendEmailCode();
                  } catch (err) {
                    setErrorMsg(getSafeErrorMessage(err));
                  }
                }}
                style={{ alignSelf: "center", marginTop: 8 }}
              >
                <Text className="auth-link">Resend Code</Text>
              </Pressable>

              <Pressable
                onPress={() => {
                  setErrorMsg("");
                  setCode("");
                  signIn.reset(); // Reset to go back to initial form
                }}
                style={{ alignSelf: "center", marginTop: 8 }}
              >
                <Text
                  className="auth-link-copy"
                  style={{ color: "rgba(0,0,0,0.5)" }}
                >
                  Use a different account
                </Text>
              </Pressable>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
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

          <Text className="auth-title">Welcome back</Text>
          <Text className="auth-subtitle">
            Sign in to continue managing your subscriptions
          </Text>
        </View>

        <View className="auth-card">
          <View className="auth-form">
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
                  if (fieldErrors.email)
                    setFieldErrors((p) => ({ ...p, email: undefined }));
                }}
                keyboardType="email-address"
                textContentType="emailAddress"
                returnKeyType="next"
                accessibilityLabel="Email address input"
                accessibilityHint="Enter your account email address"
              />
              {fieldErrors.email ? (
                <Text className="auth-error">{fieldErrors.email}</Text>
              ) : null}
            </View>

            <View className="auth-field">
              <Text className="auth-label">Password</Text>
              <View>
                <TextInput
                  className={`auth-input ${fieldErrors.password ? "auth-input-error" : ""}`}
                  value={password}
                  placeholder="Enter your password"
                  placeholderTextColor="rgba(0,0,0,0.4)"
                  secureTextEntry={!showPassword}
                  autoComplete="password"
                  onChangeText={(text) => {
                    setPassword(text);
                    if (fieldErrors.password)
                      setFieldErrors((p) => ({ ...p, password: undefined }));
                  }}
                  textContentType="password"
                  returnKeyType="done"
                  onSubmitEditing={onSignInPress}
                  accessibilityLabel="Password input"
                  accessibilityHint="Enter your account password"
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
                  accessibilityLabel={
                    showPassword ? "Hide password" : "Show password"
                  }
                  accessibilityRole="button"
                  hitSlop={8}
                >
                  <Text
                    style={{
                      fontSize: 14,
                      color: "rgba(0,0,0,0.5)",
                      fontFamily: "sans-semibold",
                    }}
                  >
                    {showPassword ? "Hide" : "Show"}
                  </Text>
                </Pressable>
              </View>
              {fieldErrors.password ? (
                <Text className="auth-error">{fieldErrors.password}</Text>
              ) : null}
            </View>

            {/* Forgot password link */}
            <Link href="/(auth)/forgot-password" asChild>
              <Pressable
                accessibilityRole="link"
                style={{ alignSelf: "flex-end", marginTop: -4 }}
              >
                <Text className="auth-link">Forgot password?</Text>
              </Pressable>
            </Link>

            {errorMsg ? <Text className="auth-error">{errorMsg}</Text> : null}

            <Pressable
              className={`auth-button ${loading ? "auth-button-disabled" : ""}`}
              onPress={onSignInPress}
              disabled={loading}
              accessibilityLabel={loading ? "Signing in" : "Sign in button"}
              accessibilityRole="button"
            >
              <Text className="auth-button-text">
                {loading ? "Signing in..." : "Sign in"}
              </Text>
            </Pressable>

            <View className="auth-link-row">
              <Text className="auth-link-copy">New to SubFox?</Text>
              <Link href="/(auth)/sign-up" asChild>
                <Pressable accessibilityRole="link">
                  <Text className="auth-link">Create an account</Text>
                </Pressable>
              </Link>
            </View>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
