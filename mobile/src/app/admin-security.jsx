import { useState } from "react";
import { Text } from "react-native";
import { Redirect, router } from "expo-router";
import { useMutation, useQuery } from "convex/react";
import { api, useSession } from "../lib/session";
import { errorMessage } from "../lib/core";
import {
  Button,
  ErrorNotice,
  Field,
  Loading,
  Screen,
  s,
} from "../components/ui";
function Challenge() {
  const { actions, refresh } = useSession();
  const status = useQuery(api.adminSecurity.status),
    begin = useMutation(api.adminSecurity.begin),
    verify = useMutation(api.adminSecurity.verify);
  const [setup, setSetup] = useState(null),
    [code, setCode] = useState(""),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  async function run(work) {
    setBusy(true);
    setError("");
    try {
      await work();
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }
  return (
    <Screen title="Administrator security" navigation={false}>
      <Text style={s.text}>
        Confirm your authenticator code. Administrator confirmation lasts 15
        minutes for this sign-in session.
      </Text>
      <ErrorNotice message={error} />
      {!status ? (
        <Loading />
      ) : !status.configured ? (
        <Text style={s.text}>
          Administrator security needs operator configuration.
        </Text>
      ) : (
        <>
          {!status.enrolled && !setup && (
            <Button
              title="Set up authenticator"
              disabled={busy}
              onPress={() => run(async () => setSetup(await begin({})))}
            />
          )}
          {!!setup && (
            <>
              <Text style={s.text}>
                Add a time-based Mlezi account in your authenticator using this
                setup key. Keep its backup safe.
              </Text>
              <Text selectable style={s.text}>
                {setup.secret}
              </Text>
            </>
          )}
          {(status.enrolled || setup) && (
            <>
              <Field
                label="Six-digit authenticator code"
                value={code}
                onChangeText={setCode}
                keyboardType="number-pad"
                autoComplete="one-time-code"
                maxLength={6}
              />
              <Button
                title="Verify and continue"
                disabled={busy || !/^\d{6}$/.test(code)}
                onPress={() =>
                  run(async () => {
                    const result = await verify({ code });
                    if (!result.ok) {
                      setError(result.error);
                      return;
                    }
                    setSetup(null);
                    setCode("");
                    refresh();
                    router.replace("/");
                  })
                }
              />
            </>
          )}
        </>
      )}
      <Button
        title="Sign out"
        secondary
        disabled={busy}
        onPress={() => run(() => actions.signOut())}
      />
    </Screen>
  );
}
export default function AdminSecurity() {
  const { auth, session } = useSession();
  if (auth.isLoading || (auth.isAuthenticated && session === undefined))
    return <Loading />;
  if (!auth.isAuthenticated) return <Redirect href="/auth" />;
  if (session?.account?.role !== "admin" || session.status === "ready")
    return <Redirect href="/" />;
  return <Challenge />;
}
