import { useState } from "react";
import { Text, View } from "react-native";
import { Redirect, router, useLocalSearchParams } from "expo-router";
import Constants from "expo-constants";
import { useQuery } from "convex/react";
import { useSession, api } from "../lib/session";
import { MOBILE_REDIRECT } from "../lib/config";
import { errorMessage } from "../lib/core";
import {
  Button,
  Choices,
  ErrorNotice,
  Field,
  Loading,
  Screen,
  s,
} from "../components/ui";

export default function AuthScreen() {
  const params = useLocalSearchParams(),
    { auth, actions, linkError } = useSession();
  const settings = useQuery(api.accounts.authSettings);
  const [signup, setSignup] = useState(params.mode === "signup"),
    [method, setMethod] = useState("password"),
    [step, setStep] = useState("start");
  const [email, setEmail] = useState(""),
    [password, setPassword] = useState(""),
    [code, setCode] = useState(""),
    [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [notice, setNotice] = useState("");
  if (auth.isLoading) return <Loading />;
  if (auth.isAuthenticated) return <Redirect href="/" />;
  async function submit(resend = false) {
    setBusy(true);
    setError("");
    setNotice("");
    const address = email.trim().toLowerCase();
    async function confirmCode(provider, params) {
      if (!/^\d{8}$/.test(code))
        throw Object.assign(new Error("Invalid code"), {
          data: "Enter the eight-digit email code.",
        });
      const result = await actions.signIn(provider, params);
      if (!result.signingIn) throw new Error("Invalid code");
    }
    try {
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(address)) {
        setError("Enter a valid email address.");
        return;
      }
      if (step === "reset-code" && !resend) {
        if (password.length < 8 || password !== confirm) {
          setError("Use at least eight characters and matching passwords.");
          return;
        }
        await confirmCode("password", {
          flow: "reset-verification",
          email: address,
          code,
          newPassword: password,
        });
      } else if (step === "reset-start" || (step === "reset-code" && resend)) {
        await actions.signIn("password-recovery", {
          flow: "reset",
          email: address,
        });
        setPassword("");
        setConfirm("");
        setStep("reset-code");
        setNotice(
          "If the account exists, a reset code has been sent. Check your inbox and spam folder.",
        );
      } else if (["verify", "otp"].includes(step) && !resend) {
        await confirmCode(step === "otp" ? "email-otp" : "password", {
          email: address,
          code,
          ...(step === "verify" ? { flow: "email-verification" } : {}),
        });
      } else if (step === "verify" && resend) {
        await actions.signIn("password", {
          flow: "email-verification",
          email: address,
          redirectTo: MOBILE_REDIRECT,
        });
        setNotice("A new verification code has been requested.");
      } else if (method === "password") {
        if (signup && password.length < 8) {
          setError("Use at least eight characters for your password.");
          return;
        }
        const result = await actions.signIn("password", {
          flow: signup ? "signUp" : "signIn",
          email: address,
          password,
          redirectTo: MOBILE_REDIRECT,
        });
        if (!result.signingIn) {
          setPassword("");
          setStep("verify");
          setNotice("Enter the eight-digit verification code from your email.");
        }
      } else {
        await actions.signIn(method === "otp" ? "email-otp" : "magic-link", {
          email: address,
          redirectTo: MOBILE_REDIRECT,
        });
        setStep(method === "otp" ? "otp" : "magic");
        setNotice(
          method === "otp"
            ? "Enter the eight-digit email code. It expires in ten minutes."
            : "Open the email link on this phone to sign in.",
        );
      }
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }
  return (
    <Screen
      title={
        step.startsWith("reset")
          ? "Reset your password"
          : signup
            ? "Join Mlezi"
            : "Welcome back"
      }
      navigation={false}
    >
      <ErrorNotice message={error || linkError} />
      {notice ? <Text style={s.text}>{notice}</Text> : null}
      <View style={s.card}>
        {step === "start" && (
          <>
            <Choices
              label="Account"
              options={{ signin: "Sign in", signup: "Create account" }}
              value={signup ? "signup" : "signin"}
              onChange={(value) => setSignup(value === "signup")}
            />
            <Choices
              label="Sign-in method"
              options={{
                password: "Password",
                otp: "Email code",
                ...(Constants.executionEnvironment !== "storeClient"
                  ? { magic: "Magic link" }
                  : {}),
              }}
              value={method}
              onChange={setMethod}
            />
          </>
        )}
        <Field
          label="Email address"
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
          autoComplete="email"
          editable={["start", "reset-start"].includes(step)}
          maxLength={255}
        />
        {step === "start" && method === "password" && (
          <Field
            label="Password"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            autoComplete={signup ? "new-password" : "current-password"}
            maxLength={128}
          />
        )}
        {["verify", "otp", "reset-code"].includes(step) && (
          <Field
            label="Eight-digit email code"
            value={code}
            onChangeText={setCode}
            keyboardType="number-pad"
            autoComplete="one-time-code"
            maxLength={8}
          />
        )}
        {step === "reset-code" && (
          <>
            <Field
              label="New password"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              maxLength={128}
            />
            <Field
              label="Confirm new password"
              value={confirm}
              onChangeText={setConfirm}
              secureTextEntry
              maxLength={128}
            />
          </>
        )}
        {step !== "magic" && (
          <Button
            title={
              busy
                ? "Please wait…"
                : step === "reset-start"
                  ? "Send reset code"
                  : step === "reset-code"
                    ? "Save new password"
                    : ["verify", "otp"].includes(step)
                      ? "Verify and continue"
                      : signup
                        ? "Continue with email"
                        : "Sign in"
            }
            disabled={busy || !settings?.emailReady}
            onPress={() => submit()}
          />
        )}
        {["verify", "otp", "reset-code"].includes(step) && (
          <Button
            title="Resend email code"
            secondary
            disabled={busy}
            onPress={() => submit(true)}
          />
        )}
        {step === "start" && !signup && method === "password" && (
          <Button
            title="Forgot password?"
            secondary
            onPress={() => {
              setStep("reset-start");
              setError("");
            }}
          />
        )}
        {step !== "start" && (
          <Button
            title="Use another sign-in method"
            secondary
            onPress={() => {
              setStep("start");
              setCode("");
              setPassword("");
              setError("");
              setNotice("");
            }}
          />
        )}
      </View>
      {!settings?.emailReady && (
        <Text style={s.muted}>Email delivery is being configured.</Text>
      )}
      <Text style={s.muted}>
        New accounts choose Caregiver or Employer after email verification. You
        must be at least 18.
      </Text>
      <Button
        title="Read terms and privacy"
        secondary
        onPress={() => router.push("/legal?type=terms")}
      />
      <Button
        title="Browse without signing in"
        secondary
        onPress={() => router.replace("/browse")}
      />
    </Screen>
  );
}
