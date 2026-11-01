import { useState } from "react";
import { Text, View } from "react-native";
import { useMutation, useQuery } from "convex/react";
import { File, Paths } from "expo-file-system";
import * as Sharing from "expo-sharing";
import { api, useSession } from "../lib/session";
import { errorMessage } from "../lib/core";
import {
  Button,
  Check,
  ErrorNotice,
  Field,
  Gate,
  Screen,
  s,
} from "../components/ui";
function Content() {
  const { session, refresh } = useSession();
  const status = useQuery(api.privacy.status),
    exportOwn = useMutation(api.privacy.exportOwn),
    request = useMutation(api.privacy.request),
    cancel = useMutation(api.privacy.cancelDeletion);
  const [details, setDetails] = useState(""),
    [email, setEmail] = useState(""),
    [confirm, setConfirm] = useState(false),
    [message, setMessage] = useState(""),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  async function run(work) {
    setBusy(true);
    setError("");
    setMessage("");
    try {
      await work();
      refresh();
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }
  async function download() {
    if (!(await Sharing.isAvailableAsync())) {
      setError(
        "File sharing is unavailable on this device. Use the website account export.",
      );
      return;
    }
    const data = await exportOwn({});
    const file = new File(Paths.cache, `mlezi-account-${Date.now()}.json`);
    try {
      file.write(JSON.stringify(data, null, 2));
      await Sharing.shareAsync(file.uri, {
        mimeType: "application/json",
        dialogTitle: "Save your private Mlezi account export",
      });
    } finally {
      if (file.exists) file.delete();
    }
  }
  return (
    <Screen title="Privacy and account">
      <ErrorNotice message={error} />
      {!!message && <Text style={s.text}>{message}</Text>}
      <Text style={s.text}>
        Your account: {session.account.email}. Keep exports private; they may
        contain contact and support information.
      </Text>
      <Button
        title="Export my account summary"
        disabled={busy}
        onPress={() => run(download)}
      />
      <View style={s.card}>
        <Text style={s.heading}>Request a correction or access help</Text>
        <Field
          label="Details of your privacy request"
          value={details}
          onChangeText={setDetails}
          multiline
          maxLength={2000}
        />
        <Button
          title="Send privacy request"
          disabled={busy || !details.trim()}
          onPress={() =>
            run(async () => {
              await request({ type: "correction", details });
              setDetails("");
              setMessage("Your request has been received.");
            })
          }
        />
      </View>
      {status?.deletionRequestedAt ? (
        <View style={s.card}>
          <Text style={s.text}>
            Deletion was requested on{" "}
            {new Date(status.deletionRequestedAt).toLocaleDateString()}. You can
            cancel during the seven-day grace period.
          </Text>
          <Button
            title="Cancel account deletion"
            disabled={busy}
            onPress={() => run(() => cancel({}))}
          />
        </View>
      ) : (
        <View style={s.card}>
          <Text style={s.heading}>Delete my account</Text>
          <Text style={s.text}>
            Normal account use stops immediately. A seven-day cancellation
            period applies before eligible records and uploaded files are
            deleted. Certain justified records and protected backups may need
            separate handling.
          </Text>
          <Field
            label="Confirm your account email"
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            keyboardType="email-address"
          />
          <Check
            label="I understand the account deletion process."
            checked={confirm}
            onChange={setConfirm}
          />
          <Button
            title="Request account deletion"
            disabled={
              busy ||
              !confirm ||
              email.trim().toLowerCase() !== session.account.email.toLowerCase()
            }
            onPress={() =>
              run(() =>
                request({
                  type: "deletion",
                  details: "Requested in the mobile privacy screen.",
                  confirmEmail: email.trim().toLowerCase(),
                }),
              )
            }
          />
        </View>
      )}
      {status?.requests.map((r) => (
        <Text key={r.id} style={s.muted}>
          {r.type} · {r.status} · {new Date(r.createdAt).toLocaleDateString()}
        </Text>
      ))}
    </Screen>
  );
}
export default function Privacy() {
  return (
    <Gate allowRestricted>
      <Content />
    </Gate>
  );
}
