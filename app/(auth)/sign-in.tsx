import { useSignIn, useAuth } from "@clerk/expo";
import { Link } from "expo-router";
import { posthog } from "@/lib/posthog";
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
  const [errorMsg, setErrorMsg] = useState("");
  const [fieldErrors, setFieldErrors] = useState<{
    email?: string;
    password?: string;
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

      const { error: finalizeError } = await signIn.finalize();

      if (finalizeError) {
        setErrorMsg(getSafeErrorMessage(finalizeError));
        return;
      }

      posthog?.capture("sign_in_completed");

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
                  if (fieldErrors.email) setFieldErrors((p) => ({ ...p, email: undefined }));
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
                    if (fieldErrors.password) setFieldErrors((p) => ({ ...p, password: undefined }));
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
