import { useEffect, useRef, useState } from "react";
import { Text, View } from "react-native";
import { useRead, useSession } from "../lib/session";
import { cleanupImage, pickImage, uploadImage } from "../lib/images";
import { errorMessage } from "../lib/core";
import {
  Button,
  Check,
  ErrorNotice,
  Gate,
  Loading,
  Screen,
  s,
} from "../components/ui";

function IdentityContent() {
  const { session, request, auth } = useSession(),
    data = useRead(
      session.account.role === "caregiver" ? "/verification/status" : null,
    );
  const [selfie, setSelfie] = useState(null),
    [consent, setConsent] = useState(false),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const cache = useRef(null);
  useEffect(() => {
    cache.current = selfie;
  }, [selfie]);
  useEffect(() => () => cleanupImage(cache.current), []);
  async function choose(camera) {
    try {
      const result = await pickImage(camera);
      if (result) {
        cleanupImage(selfie);
        setSelfie(result);
      }
    } catch (err) {
      setError(err.message);
    }
  }
  async function submit() {
    if (!selfie || !consent) {
      setError("Choose a recent selfie and confirm permission for review.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      const id = await uploadImage(selfie, "selfie", () =>
        auth.fetchAccessToken({ forceRefreshToken: false }),
      );
      await request("/verification/submit", "POST", {
        selfie: id,
        consent: "true",
      });
      cleanupImage(selfie);
      setSelfie(null);
      data.reload();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }
  if (session.account.role !== "caregiver")
    return (
      <Screen title="Identity review">
        <Text style={s.text}>Identity review is for caregiver accounts.</Text>
      </Screen>
    );
  return (
    <Screen title="Identity review">
      <Text style={s.text}>
        An administrator compares your ID, photo and selfie and checks that the
        ID birth date indicates an age of at least 18. This is separate from
        paid Premium and ratings.
      </Text>
      <ErrorNotice message={error || data.error} />
      {!data.data && !data.error ? (
        <Loading />
      ) : (
        data.data && (
          <View style={s.card}>
            <Text style={s.heading}>
              Status: {data.data.verification_status}
            </Text>
            {data.data.submission?.rejection_reason && (
              <Text style={s.text}>
                {data.data.submission.rejection_reason}
              </Text>
            )}
            {!["verified", "pending"].includes(
              data.data.verification_status,
            ) && (
              <>
                <Button
                  title="Take a recent selfie"
                  secondary
                  onPress={() => choose(true)}
                />
                <Button
                  title="Choose a recent selfie"
                  secondary
                  onPress={() => choose(false)}
                />
                {selfie && (
                  <Text style={s.muted}>
                    Selfie selected for private upload.
                  </Text>
                )}
                <Check
                  label="I permit manual comparison of my selfie, ID and profile photo."
                  checked={consent}
                  onChange={setConsent}
                />
                <Button
                  title={busy ? "Submitting…" : "Submit identity review"}
                  disabled={busy}
                  onPress={submit}
                />
              </>
            )}
          </View>
        )
      )}
    </Screen>
  );
}
export default function Identity() {
  return (
    <Gate>
      <IdentityContent />
    </Gate>
  );
}
