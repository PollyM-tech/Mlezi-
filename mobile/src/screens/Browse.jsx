import { useState } from "react";
import { Image, Pressable, Text, View } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { useRead, useSession } from "../lib/session";
import { errorMessage } from "../lib/core";
import {
  CATEGORIES,
  SERVICE_TYPES,
  LANGUAGES,
  TRAVEL_SCOPES,
  AGE_GROUPS,
  DAYS,
  SKILLS,
  money,
} from "../../../frontend/src/lib/profile";
import {
  Button,
  Choices,
  ErrorNotice,
  Field,
  Gate,
  Loading,
  Screen,
  s,
} from "../components/ui";

export function CaregiverCard({ profile }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`View ${profile.name}'s profile`}
      onPress={() =>
        router.push({
          pathname: "/caregiver/[id]",
          params: { id: String(profile.id) },
        })
      }
      style={s.card}
    >
      <Image source={{ uri: profile.photo_url }} style={s.photo} />
      <Text style={s.heading}>{profile.name}</Text>
      <Text style={s.text}>
        {CATEGORIES[profile.service_category]} ·{" "}
        {profile.location || "Location not specified"}
      </Text>
      <Text style={s.muted}>
        {profile.years_experience} years of experience ·{" "}
        {profile.review_count
          ? `${Number(profile.rating_avg).toFixed(1)} ★ (${profile.review_count} reviews)`
          : "No reviews yet"}
      </Text>
      <Text style={s.muted}>
        {profile.verification_status === "verified"
          ? "Identity checked"
          : "Identity review needed"}
        {profile.premium_active ? " · Premium — promoted" : ""}
      </Text>
      <Text style={s.text}>
        {profile.expected_pay_min != null
          ? `From KES ${money(profile.expected_pay_min)} / ${profile.pay_period}`
          : "Pay open to discussion"}
      </Text>
      <Text style={s.muted}>View profile →</Text>
    </Pressable>
  );
}
function BrowseContent({ saved }) {
  const params = useLocalSearchParams(),
    { request, session } = useSession();
  const initial = {
    q: "",
    category: typeof params.category === "string" ? params.category : "",
    service_type: "",
    location: "",
    language: "",
    travel_scope: "",
    age_group: "",
    skill: "",
    available_day: "",
    min_experience: "",
    pay_max: "",
    pay_period: "",
    min_rating: "",
  };
  const [draft, setDraft] = useState(initial),
    [filters, setFilters] = useState(initial),
    [page, setPage] = useState(1),
    [advanced, setAdvanced] = useState(false);
  const [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [rotation, setRotation] = useState("");
  const query = new URLSearchParams(
    Object.entries(filters).filter(
      ([key, value]) =>
        value && (key !== "location" || filters.service_type === "live_out"),
    ),
  );
  if (filters.pay_max && !filters.pay_period)
    query.set("pay_period", "monthly");
  query.set("page", String(page));
  if (rotation) query.set("rotation", rotation);
  const list = useRead(saved ? "/shortlist" : `/caregivers?${query}`);
  const set = (key, value) =>
    setDraft((current) => ({ ...current, [key]: value }));
  async function remove(id) {
    setBusy(true);
    setError("");
    try {
      await request(`/shortlist/${id}`, "DELETE");
      list.reload();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }
  return (
    <Screen title={saved ? "My shortlist" : "Find your care"}>
      <Text style={s.text}>
        {saved
          ? "Your saved caregivers, private to your account."
          : "Match your care needs first. Paid visibility always respects your filters."}
      </Text>
      <ErrorNotice message={error || list.error} />
      {!saved && (
        <View style={s.card}>
          <Field
            label="Name or keyword"
            value={draft.q}
            onChangeText={(value) => set("q", value)}
            maxLength={120}
          />
          <Choices
            label="Care category"
            options={{ "": "Any", ...CATEGORIES }}
            value={draft.category}
            onChange={(value) => set("category", value)}
          />
          <Choices
            label="Work arrangement"
            options={{ "": "Any", ...SERVICE_TYPES }}
            value={draft.service_type}
            onChange={(value) => set("service_type", value)}
          />
          {draft.service_type === "live_out" && (
            <Field
              label="Live-out area or town"
              value={draft.location}
              onChangeText={(value) => set("location", value)}
              maxLength={120}
            />
          )}
          <Button
            title={
              advanced
                ? "Fewer filters"
                : "Language, travel, experience and budget"
            }
            secondary
            onPress={() => setAdvanced((value) => !value)}
          />
          {advanced && (
            <>
              <Choices
                label="Language"
                options={{
                  "": "Any",
                  ...Object.fromEntries(
                    LANGUAGES.map((language) => [language, language]),
                  ),
                }}
                value={draft.language}
                onChange={(value) => set("language", value)}
              />
              <Choices
                label="Travel scope"
                options={{ "": "Any", ...TRAVEL_SCOPES }}
                value={draft.travel_scope}
                onChange={(value) => set("travel_scope", value)}
              />
              <Choices
                label="Age group"
                options={{ "": "Any", ...AGE_GROUPS }}
                value={draft.age_group}
                onChange={(value) => set("age_group", value)}
              />
              <Choices
                label="Available day"
                options={{
                  "": "Any",
                  ...Object.fromEntries(DAYS.map((day) => [day, day])),
                }}
                value={draft.available_day}
                onChange={(value) => set("available_day", value)}
              />
              <Choices
                label="Skill"
                options={{
                  "": "Any",
                  ...Object.fromEntries(SKILLS.map((skill) => [skill, skill])),
                }}
                value={draft.skill}
                onChange={(value) => set("skill", value)}
              />
              <Field
                label="Minimum experience (years)"
                keyboardType="number-pad"
                value={draft.min_experience}
                onChangeText={(value) => set("min_experience", value)}
              />
              <Field
                label="Maximum budget (KES)"
                keyboardType="number-pad"
                value={draft.pay_max}
                onChangeText={(value) => set("pay_max", value)}
              />
              <Choices
                label="Budget pay period"
                options={{
                  "": "Any / monthly for budget",
                  monthly: "Monthly",
                  daily: "Daily",
                  hourly: "Hourly",
                }}
                value={draft.pay_period}
                onChange={(value) => set("pay_period", value)}
              />
              <Choices
                label="Minimum rating"
                options={{
                  "": "Any, including new caregivers",
                  4: "4 stars",
                  3: "3 stars",
                }}
                value={draft.min_rating}
                onChange={(value) => set("min_rating", value)}
              />
            </>
          )}
          <Button
            title="Find caregivers"
            onPress={() => {
              setRotation("");
              setPage(1);
              setFilters({ ...draft });
              list.reload();
            }}
          />
          <Button
            title="Clear filters"
            secondary
            onPress={() => {
              const empty = { ...initial, category: "" };
              setDraft(empty);
              setFilters(empty);
              setPage(1);
              setRotation("");
            }}
          />
        </View>
      )}
      {!list.data && !list.error ? (
        <Loading />
      ) : (
        list.data && (
          <>
            <Text style={s.muted}>
              {saved ? list.data.profiles.length : list.data.total} caregivers{" "}
              {saved ? "saved" : "found"}
            </Text>
            {list.data.profiles.length ? (
              list.data.profiles.map((profile) => (
                <View key={profile.id} style={{ gap: 8 }}>
                  <CaregiverCard profile={profile} />
                  {saved && session?.account?.role === "employer" && (
                    <Button
                      title="Remove from shortlist"
                      secondary
                      disabled={busy}
                      onPress={() => remove(profile.id)}
                    />
                  )}
                </View>
              ))
            ) : (
              <Text style={s.text}>
                {saved
                  ? "Save a caregiver while browsing to see them here."
                  : "No matching caregivers yet. Try broader filters."}
              </Text>
            )}
            {!saved && list.data.total > 12 && (
              <View style={s.row}>
                <Button
                  title="Previous"
                  secondary
                  disabled={page === 1}
                  onPress={() => {
                    setRotation(list.data.rotation);
                    setPage((value) => value - 1);
                  }}
                />
                <Text style={s.muted}>Page {page}</Text>
                <Button
                  title="Next"
                  secondary
                  disabled={page * 12 >= list.data.total}
                  onPress={() => {
                    setRotation(list.data.rotation);
                    setPage((value) => value + 1);
                  }}
                />
              </View>
            )}
          </>
        )
      )}
      {list.error && <Button title="Retry search" onPress={list.reload} />}
    </Screen>
  );
}
export default function Browse({ saved = false }) {
  return (
    <Gate allowGuest={!saved}>
      <BrowseContent saved={saved} />
    </Gate>
  );
}
