import { useEffect, useRef, useState } from "react";
import { Image, Text, View } from "react-native";
import { router } from "expo-router";
import { useRead, useSession } from "../lib/session";
import { cleanupImage, pickImage, uploadImage } from "../lib/images";
import { errorMessage, newProfileFields, validateProfile } from "../lib/core";
import {
  CATEGORIES,
  SERVICE_TYPES,
  DAYS,
  SKILLS,
  AGE_GROUPS,
  LANGUAGES,
  TRAVEL_SCOPES,
} from "../../../frontend/src/lib/profile";
import {
  Button,
  Check,
  Choices,
  ErrorNotice,
  Field,
  Gate,
  Loading,
  Screen,
  s,
} from "../components/ui";

function ProfileEditor({ profile, user }) {
  const { request, auth, refresh } = useSession();
  const [fields, setFields] = useState(() => ({
    ...newProfileFields(user),
    ...(profile || {}),
    years_experience: String(profile?.years_experience ?? 0),
    expected_pay_min:
      profile?.expected_pay_min == null ? "" : String(profile.expected_pay_min),
    expected_pay_max:
      profile?.expected_pay_max == null ? "" : String(profile.expected_pay_max),
    bio: profile?.bio || "",
    travel_notes: profile?.travel_notes || "",
    location: profile?.location || "",
    other_service_description: profile?.other_service_description || "",
    travel_scope: profile?.travel_scope || "local",
  }));
  const [images, setImages] = useState(
      /** @type {Record<string, import('expo-image-picker').ImagePickerAsset>} */ ({}),
    ),
    [consent, setConsent] = useState(false),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [progress, setProgress] = useState("");
  const cache = useRef(images);
  useEffect(() => {
    cache.current = images;
  }, [images]);
  useEffect(() => () => Object.values(cache.current).forEach(cleanupImage), []);
  const creating = !profile,
    set = (key, value) => setFields((old) => ({ ...old, [key]: value }));
  async function choose(kind, camera) {
    setError("");
    try {
      const asset = await pickImage(camera);
      if (asset) {
        cleanupImage(images[kind]);
        setImages((old) => ({ ...old, [kind]: asset }));
      }
    } catch (err) {
      setError(err.message);
    }
  }
  async function save() {
    const issue = validateProfile(fields, images, creating, consent);
    if (issue) {
      setError(issue);
      return;
    }
    if (!creating && !profile.photo_url && !images.photo) {
      setError("Choose your required profile photo.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      const body = { ...fields, consent: consent ? "true" : "false" };
      for (const kind of ["photo", "national_id", "selfie"])
        if (images[kind]) {
          setProgress(
            `Uploading ${kind === "national_id" ? "private ID" : kind}…`,
          );
          body[kind] = await uploadImage(images[kind], kind, () =>
            auth.fetchAccessToken({ forceRefreshToken: false }),
          );
        }
      setProgress("Saving profile…");
      await request("/caregivers/profile", creating ? "POST" : "PUT", body);
      refresh();
      router.replace("/");
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
      setProgress("");
    }
  }
  const travel =
    fields.service_category === "travel_nanny" ||
    fields.service_types.includes("travel");
  return (
    <Screen title={creating ? "Your caregiver profile" : "Edit your profile"}>
      <Text style={s.text}>
        A profile photo is required. Your national ID and selfie stay private.
        Publication needs an administrator identity and 18+ review.
      </Text>
      <ErrorNotice message={error} />
      <View style={s.card}>
        <Field
          label="Your name"
          value={fields.name}
          onChangeText={(value) => set("name", value)}
          maxLength={120}
        />
        <Field
          label="Contact phone"
          value={fields.phone}
          onChangeText={(value) => set("phone", value)}
          keyboardType="phone-pad"
          maxLength={32}
        />
        <Field
          label="About your care"
          value={fields.bio}
          onChangeText={(value) => set("bio", value)}
          multiline
          maxLength={2000}
        />
        <Choices
          label="Care category"
          options={CATEGORIES}
          value={fields.service_category}
          onChange={(value) => set("service_category", value)}
        />
        <Choices
          label="Work arrangements"
          options={SERVICE_TYPES}
          value={fields.service_types}
          onChange={(value) => set("service_types", value)}
          multiple
        />
        {(fields.service_category === "other" ||
          fields.service_types.includes("other")) && (
          <Field
            label="Describe the other services you offer"
            value={fields.other_service_description}
            onChangeText={(value) => set("other_service_description", value)}
            multiline
            maxLength={1000}
          />
        )}
        <Field
          label="General location"
          value={fields.location}
          onChangeText={(value) => set("location", value)}
          maxLength={120}
        />
        <Field
          label="Years of experience"
          value={fields.years_experience}
          onChangeText={(value) => set("years_experience", value)}
          keyboardType="number-pad"
        />
        <Field
          label="Minimum expected pay (KES)"
          value={fields.expected_pay_min}
          onChangeText={(value) => set("expected_pay_min", value)}
          keyboardType="number-pad"
        />
        <Field
          label="Maximum expected pay (KES)"
          value={fields.expected_pay_max}
          onChangeText={(value) => set("expected_pay_max", value)}
          keyboardType="number-pad"
        />
        <Choices
          label="Pay period"
          options={{ monthly: "Month", daily: "Day", hourly: "Hour" }}
          value={fields.pay_period}
          onChange={(value) => set("pay_period", value)}
        />
      </View>
      <View style={s.card}>
        <Choices
          label="Available days"
          options={Object.fromEntries(DAYS.map((day) => [day, day]))}
          value={fields.availability}
          onChange={(value) => set("availability", value)}
          multiple
        />
        <Choices
          label="Skills"
          options={Object.fromEntries(
            [...new Set([...SKILLS, ...fields.skills])].map((skill) => [
              skill,
              skill,
            ]),
          )}
          value={fields.skills}
          onChange={(value) => set("skills", value)}
          multiple
        />
        <Choices
          label="Child age groups"
          options={AGE_GROUPS}
          value={fields.age_groups}
          onChange={(value) => set("age_groups", value)}
          multiple
        />
        <Choices
          label="Languages"
          options={Object.fromEntries(
            [...new Set([...LANGUAGES, ...fields.languages])].map(
              (language) => [language, language],
            ),
          )}
          value={fields.languages}
          onChange={(value) => set("languages", value)}
          multiple
        />
        {travel && (
          <>
            <Choices
              label="Travel scope"
              options={TRAVEL_SCOPES}
              value={fields.travel_scope}
              onChange={(value) => set("travel_scope", value)}
            />
            <Field
              label="Travel experience and arrangements"
              value={fields.travel_notes}
              onChangeText={(value) => set("travel_notes", value)}
              multiline
              maxLength={1000}
            />
          </>
        )}
        <Check
          label="I am available for new work"
          checked={fields.is_available}
          onChange={(value) => set("is_available", value)}
        />
      </View>
      <View style={s.card}>
        {(creating ? ["photo", "national_id", "selfie"] : ["photo"]).map(
          (kind) => (
            <View key={kind} style={{ gap: 10 }}>
              <Text style={s.heading}>
                {
                  {
                    photo: "Profile photo",
                    national_id: "Private national ID",
                    selfie: "Recent private selfie",
                  }[kind]
                }
              </Text>
              {kind === "photo" &&
                (images.photo?.uri || profile?.photo_url) && (
                  <Image
                    source={{ uri: images.photo?.uri || profile.photo_url }}
                    style={s.photo}
                  />
                )}
              {images[kind] && (
                <Text style={s.muted}>
                  Image selected. It will upload when you save.
                </Text>
              )}
              <Button
                title="Choose image"
                secondary
                disabled={busy}
                onPress={() => choose(kind, false)}
              />
              <Button
                title="Take photo"
                secondary
                disabled={busy}
                onPress={() => choose(kind, true)}
              />
            </View>
          ),
        )}
        {creating && (
          <Check
            label="I permit an administrator to compare my ID, selfie and profile photo for identity and adult-age review."
            checked={consent}
            onChange={setConsent}
          />
        )}
        <Text style={s.muted}>
          Changing your name or profile photo resets identity approval. National
          ID replacement requires support.
        </Text>
        <Button
          title="Read identity privacy information"
          secondary
          onPress={() => router.push("/legal?type=privacy")}
        />
      </View>
      {progress ? <Text style={s.text}>{progress}</Text> : null}
      <Button
        title={busy ? "Saving…" : "Save caregiver profile"}
        disabled={busy}
        onPress={save}
      />
    </Screen>
  );
}
function ProfileContent() {
  const { session } = useSession(),
    account = session.account,
    needsSetup = session.status === "profile_required";
  const existing = useRead(
    !needsSetup && account.role === "caregiver" ? "/caregivers/profile" : null,
  );
  if (account.role !== "caregiver")
    return (
      <Screen title="Caregiver profiles">
        <Text style={s.text}>This form is for caregiver accounts.</Text>
      </Screen>
    );
  if (needsSetup)
    return (
      <ProfileEditor
        key={`${account.id}-setup`}
        user={account}
        profile={session.setupProfile}
      />
    );
  if (existing.error)
    return (
      <Screen title="My profile">
        <ErrorNotice message={existing.error} />
        <Button title="Retry" onPress={existing.reload} />
      </Screen>
    );
  if (!existing.data) return <Loading />;
  return (
    <ProfileEditor
      key={`${account.id}-${existing.data.profile.id}`}
      user={account}
      profile={existing.data.profile}
    />
  );
}
export default function ProfileScreen() {
  return (
    <Gate allowSetup>
      <ProfileContent />
    </Gate>
  );
}
