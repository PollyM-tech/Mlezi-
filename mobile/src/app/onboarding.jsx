import { useEffect, useState } from "react";
import { Text, View } from "react-native";
import { Redirect, router } from "expo-router";
import { useMutation } from "convex/react";
import { api, useSession } from "../lib/session";
import { errorMessage } from "../lib/core";
import { LEGAL_VERSION } from "../../../frontend/convex/lib/legalPolicy";
import {
  Button,
  Check,
  Choices,
  ErrorNotice,
  Field,
  Loading,
  Screen,
  s,
} from "../components/ui";

export default function Onboarding() {
  const { auth, session, actions } = useSession(),
    ensure = useMutation(api.accounts.ensureExisting),
    register = useMutation(api.accounts.register);
  const [role, setRole] = useState("caregiver"),
    [name, setName] = useState(""),
    [phone, setPhone] = useState(""),
    [terms, setTerms] = useState(false);
  const [checked, setChecked] = useState(false),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  useEffect(() => {
    if (auth.isAuthenticated)
      ensure()
        .then(() => setChecked(true))
        .catch((err) => setError(errorMessage(err)));
  }, [auth.isAuthenticated, ensure]);
  if (!auth.isAuthenticated) return <Redirect href="/auth" />;
  if (session?.account) return <Redirect href="/" />;
  async function submit() {
    if (!terms) {
      setError(
        "Confirm your age and acknowledge the terms and privacy notice.",
      );
      return;
    }
    setBusy(true);
    setError("");
    try {
      await register({
        role,
        name,
        phone,
        termsAccepted: true,
        termsVersion: LEGAL_VERSION,
      });
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }
  return (
    <Screen title="Complete your account" navigation={false}>
      <ErrorNotice message={error} />
      {!checked ? (
        <Loading message="Checking your verified account…" />
      ) : (
        <View style={s.card}>
          <Choices
            label="I am joining as"
            options={{
              caregiver: "Caregiver / nanny",
              employer: "Employer / parent",
            }}
            value={role}
            onChange={setRole}
          />
          <Field
            label="Your name"
            value={name}
            onChangeText={setName}
            autoComplete="name"
            maxLength={120}
          />
          <Field
            label="Contact phone"
            value={phone}
            onChangeText={setPhone}
            keyboardType="phone-pad"
            maxLength={32}
          />
          <Button
            title="Read terms"
            secondary
            onPress={() => router.push("/legal?type=terms")}
          />
          <Button
            title="Read privacy notice"
            secondary
            onPress={() => router.push("/legal?type=privacy")}
          />
          <Check
            label="I am at least 18, agree to the Terms of use and acknowledge the Privacy notice."
            checked={terms}
            onChange={setTerms}
          />
          <Text style={s.muted}>
            Optional website cookies are a separate choice. Photos, ID and
            selfie are requested only for caregiver setup.
          </Text>
          <Button
            title={busy ? "Saving…" : "Create my account"}
            disabled={busy}
            onPress={submit}
          />
        </View>
      )}
      <Button title="Sign out" secondary onPress={() => actions.signOut()} />
    </Screen>
  );
}
