import { useState } from "react";
import { Text, View } from "react-native";
import { Redirect, router } from "expo-router";
import { useSession } from "../lib/session";
import { errorMessage } from "../lib/core";
import {
  Button,
  ErrorNotice,
  Field,
  Loading,
  Screen,
  s,
} from "../components/ui";
function EmployerDetails({ account }) {
  const { request } = useSession();
  const [name, setName] = useState(account.name || ""),
    [phone, setPhone] = useState(account.phone || ""),
    [message, setMessage] = useState(""),
    [busy, setBusy] = useState(false);
  async function save() {
    setBusy(true);
    setMessage("");
    try {
      await request("/employers/profile", "PUT", { name, phone });
      setMessage("Account details saved.");
    } catch (e) {
      setMessage(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }
  return (
    <View style={s.card}>
      <Field label="Name" value={name} onChangeText={setName} maxLength={120} />
      <Field
        label="Contact phone"
        value={phone}
        onChangeText={setPhone}
        keyboardType="phone-pad"
        maxLength={32}
      />
      <Text style={s.text}>{message}</Text>
      <Button title="Save details" disabled={busy} onPress={save} />
    </View>
  );
}
export default function Account() {
  const { auth, server, session, actions } = useSession();
  const [error, setError] = useState("");
  if (
    auth.isLoading ||
    server.isLoading ||
    (auth.isAuthenticated && session === undefined)
  )
    return <Loading />;
  if (!auth.isAuthenticated)
    return (
      <Screen title="Your account">
        <Button
          title="Sign in or create account"
          onPress={() => router.push("/auth")}
        />
      </Screen>
    );
  if (session?.status === "onboarding") return <Redirect href="/onboarding" />;
  if (session?.status === "admin_security")
    return <Redirect href="/admin-security" />;
  const a = session?.account;
  return (
    <Screen title="Your account">
      <ErrorNotice message={error} />
      <Text style={s.heading}>{a?.name || "Mlezi member"}</Text>
      <Text style={s.text}>{a?.email}</Text>
      <Text style={s.muted}>{a?.role}</Text>
      {session?.status === "expired" ? (
        <Text style={s.text}>
          Your session has expired. Sign out and sign in again.
        </Text>
      ) : (
        <>
          {a?.role === "employer" && session.status === "ready" && (
            <EmployerDetails key={a.id} account={a} />
          )}
          {a?.role === "caregiver" && (
            <Button
              title="Edit caregiver profile"
              onPress={() => router.push("/profile")}
            />
          )}
          <Button
            title="Plans and membership"
            secondary
            onPress={() => router.push("/membership")}
          />
          <Button
            title="Privacy and account deletion"
            secondary
            onPress={() => router.push("/privacy")}
          />
          <Button
            title="Support tickets"
            secondary
            onPress={() => router.push("/support")}
          />
        </>
      )}
      <Button
        title="Terms of use"
        secondary
        onPress={() => router.push("/legal?type=terms")}
      />
      <Button
        title="Privacy notice"
        secondary
        onPress={() => router.push("/legal?type=privacy")}
      />
      <Button
        title="Sign out"
        onPress={async () => {
          try {
            await actions.signOut();
            router.replace("/");
          } catch (e) {
            setError(errorMessage(e));
          }
        }}
      />
    </Screen>
  );
}
