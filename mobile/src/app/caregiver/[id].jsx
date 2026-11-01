import { useState } from "react";
import { Image, Linking, Text, View } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { useMutation } from "convex/react";
import { api, useRead, useSession } from "../../lib/session";
import { errorMessage } from "../../lib/core";
import {
  CATEGORIES,
  SERVICE_TYPES,
  money,
} from "../../../../frontend/src/lib/profile";
import {
  Button,
  Choices,
  ErrorNotice,
  Field,
  Gate,
  Loading,
  Screen,
  s,
} from "../../components/ui";

function ReviewForm({ id, existing, onSaved }) {
  const { request } = useSession();
  const [rating, setRating] = useState(String(existing?.rating || 5)),
    [comment, setComment] = useState(existing?.comment || ""),
    [name, setName] = useState(existing?.author_name || ""),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  async function save() {
    setBusy(true);
    setError("");
    try {
      await request(`/caregivers/${id}/review`, "PUT", {
        rating: Number(rating),
        comment,
        author_name: name,
      });
      onSaved();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }
  return (
    <View style={s.card}>
      <Text style={s.heading}>
        {existing ? "Update your review" : "Share your experience"}
      </Text>
      <ErrorNotice message={error} />
      <Field
        label="Your first name (public)"
        value={name}
        onChangeText={setName}
        maxLength={80}
      />
      <Choices
        label="Rating"
        options={{ 1: "1 ★", 2: "2 ★", 3: "3 ★", 4: "4 ★", 5: "5 ★" }}
        value={rating}
        onChange={setRating}
      />
      <Field
        label="Your experience (public)"
        value={comment}
        onChangeText={setComment}
        multiline
        maxLength={2000}
      />
      <Button title="Publish review" disabled={busy} onPress={save} />
    </View>
  );
}
function Detail() {
  const params = useLocalSearchParams(),
    id = String(params.id || ""),
    { session, auth, request } = useSession(),
    role = session?.account?.role;
  const profile = useRead(`/caregivers/${encodeURIComponent(id)}`),
    [page, setPage] = useState(1),
    reviews = useRead(
      `/caregivers/${encodeURIComponent(id)}/reviews?page=${page}`,
    );
  const access = useRead(role === "employer" ? `/contact/unlock/${id}` : null),
    ownReview = useRead(
      role === "employer" ? `/caregivers/${id}/review/mine` : null,
    ),
    ownProfile = useRead(role === "caregiver" ? "/caregivers/profile" : null),
    shortlist = useRead(role === "employer" ? "/shortlist" : null);
  const [error, setError] = useState(""),
    [notice, setNotice] = useState(""),
    [busy, setBusy] = useState(false),
    [report, setReport] = useState(""),
    [reporting, setReporting] = useState(false),
    [replyId, setReplyId] = useState(null),
    [reply, setReply] = useState("");
  const reportProfile = useMutation(api.moderation.reportProfile),
    saved = shortlist.data?.profiles.some((p) => String(p.id) === id),
    owner = String(ownProfile.data?.profile?.id) === id;
  async function run(fn) {
    setBusy(true);
    setError("");
    setNotice("");
    try {
      await fn();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }
  const p = profile.data?.profile;
  return (
    <Screen title={p?.name || "Caregiver profile"}>
      <ErrorNotice message={error || profile.error} />
      {notice ? <Text style={s.text}>{notice}</Text> : null}
      {!p && !profile.error ? (
        <Loading />
      ) : (
        p && (
          <>
            <Image
              source={{ uri: p.photo_url }}
              style={[s.photo, { height: 290 }]}
            />
            <View style={s.card}>
              <Text style={s.heading}>{CATEGORIES[p.service_category]}</Text>
              <Text style={s.text}>
                {p.bio ||
                  "Explore this caregiver’s experience and services below."}
              </Text>
              <Text style={s.muted}>
                {p.verification_status === "verified"
                  ? "Identity checked"
                  : "Identity review pending"}
                {p.premium_active ? " · Premium — promoted" : ""}
              </Text>
              <Text style={s.text}>
                {p.location || "Location not specified"} · {p.years_experience}{" "}
                years of experience
              </Text>
              <Text style={s.text}>
                {p.service_types
                  .map((value) => SERVICE_TYPES[value])
                  .join(" · ")}
              </Text>
              {p.other_service_description && (
                <Text style={s.text}>{p.other_service_description}</Text>
              )}
              <Text style={s.text}>
                Languages: {p.languages.join(", ") || "Not specified"}
              </Text>
              <Text style={s.text}>
                Skills: {p.skills.join(", ") || "Not specified"}
              </Text>
              <Text style={s.text}>
                Available: {p.availability.join(", ") || "Ask the caregiver"}
              </Text>
              <Text style={s.text}>
                {p.expected_pay_min != null
                  ? `From KES ${money(p.expected_pay_min)} per ${p.pay_period}`
                  : "Pay open to discussion"}
              </Text>
              {p.travel_notes && <Text style={s.text}>{p.travel_notes}</Text>}
            </View>
            {role === "employer" ? (
              <View style={s.card}>
                <Text style={s.heading}>Connect privately</Text>
                <ErrorNotice message={access.error || shortlist.error} />
                <Button
                  title={
                    saved ? "Remove from shortlist" : "Save to my shortlist"
                  }
                  secondary
                  disabled={busy}
                  onPress={() =>
                    run(async () => {
                      await request(
                        `/shortlist/${id}`,
                        saved ? "DELETE" : "POST",
                      );
                      shortlist.reload();
                      setNotice(
                        saved ? "Removed from shortlist." : "Saved privately.",
                      );
                    })
                  }
                />
                {access.data?.unlocked ? (
                  <>
                    <Text style={s.text}>
                      {access.data.contact.phone || "No phone provided"}
                    </Text>
                    <Text style={s.text}>{access.data.contact.email}</Text>
                    {access.data.contact.phone && (
                      <Button
                        title="Call caregiver"
                        secondary
                        onPress={() =>
                          run(() =>
                            Linking.openURL(`tel:${access.data.contact.phone}`),
                          )
                        }
                      />
                    )}
                    <Button
                      title="Email caregiver"
                      secondary
                      onPress={() =>
                        run(() =>
                          Linking.openURL(
                            `mailto:${access.data.contact.email}`,
                          ),
                        )
                      }
                    />
                    <Text style={s.muted}>
                      Ordinary pass expiry does not remove this unlocked
                      contact.
                    </Text>
                  </>
                ) : access.data?.can_unlock ? (
                  <Button
                    title="Unlock contact"
                    disabled={busy}
                    onPress={() =>
                      run(async () => {
                        await request(`/contact/unlock/${id}`, "POST");
                        access.reload();
                      })
                    }
                  />
                ) : (
                  <>
                    <Text style={s.text}>
                      {access.data?.available === false
                        ? "Not accepting new contact requests."
                        : "An active employer pass is needed for new contact unlocks."}
                    </Text>
                    <Button
                      title="View contact-access plans"
                      secondary
                      onPress={() => router.push("/membership")}
                    />
                  </>
                )}
              </View>
            ) : !auth.isAuthenticated ? (
              <Button
                title="Sign in as an employer to connect"
                onPress={() => router.push("/auth")}
              />
            ) : null}
            <View style={s.card}>
              <Text style={s.heading}>Employer reviews</Text>
              <Text style={s.text}>
                {p.review_count
                  ? `${Number(p.rating_avg).toFixed(1)} ★ · ${p.review_count} reviews`
                  : "No reviews yet"}
              </Text>
              <ErrorNotice message={reviews.error} />
              {reviews.data?.reviews.map((review) => (
                <View key={review.id} style={{ gap: 8, paddingVertical: 12 }}>
                  <Text style={s.label}>
                    {review.author_name} · {review.rating} ★
                  </Text>
                  <Text style={s.text}>{review.comment}</Text>
                  {review.reply && (
                    <Text style={s.muted}>Caregiver reply: {review.reply}</Text>
                  )}
                  {owner && (
                    <Button
                      title="Reply to review"
                      secondary
                      onPress={() => {
                        setReplyId(String(review.id));
                        setReply(review.reply || "");
                      }}
                    />
                  )}
                  {auth.isAuthenticated && role !== "admin" && (
                    <Button
                      title="Report review"
                      secondary
                      onPress={() => {
                        setReporting(true);
                        setReplyId(`report:${review.id}`);
                      }}
                    />
                  )}
                </View>
              ))}
              {reviews.data?.total > 20 && (
                <View style={s.row}>
                  <Button
                    title="Previous reviews"
                    secondary
                    disabled={page === 1}
                    onPress={() => setPage((value) => value - 1)}
                  />
                  <Button
                    title="Next reviews"
                    secondary
                    disabled={page * 20 >= reviews.data.total}
                    onPress={() => setPage((value) => value + 1)}
                  />
                </View>
              )}
            </View>
            {access.data?.unlocked && ownReview.data && (
              <ReviewForm
                key={ownReview.data.review?.id || "new"}
                id={id}
                existing={ownReview.data.review}
                onSaved={() => {
                  reviews.reload();
                  profile.reload();
                  ownReview.reload();
                }}
              />
            )}
            {owner && replyId && !replyId.startsWith("report:") && (
              <View style={s.card}>
                <Field
                  label="Your public reply"
                  value={reply}
                  onChangeText={setReply}
                  multiline
                  maxLength={2000}
                />
                <Button
                  title="Save reply"
                  disabled={busy}
                  onPress={() =>
                    run(async () => {
                      await request(`/reviews/${replyId}/reply`, "PUT", {
                        reply,
                      });
                      setReplyId(null);
                      reviews.reload();
                    })
                  }
                />
              </View>
            )}
            {auth.isAuthenticated && role !== "admin" && !owner && (
              <Button
                title="Report this profile"
                secondary
                onPress={() => {
                  setReporting(true);
                  setReplyId(null);
                }}
              />
            )}
            {reporting && (
              <View style={s.card}>
                <Field
                  label="Reason for your report"
                  value={report}
                  onChangeText={setReport}
                  multiline
                  maxLength={1000}
                />
                <Button
                  title="Send safety report"
                  disabled={busy}
                  onPress={() =>
                    run(async () => {
                      if (replyId?.startsWith("report:"))
                        await request(
                          `/reviews/${replyId.slice(7)}/report`,
                          "POST",
                          { reason: report },
                        );
                      else
                        await reportProfile({
                          caregiverId: id,
                          reason: report,
                        });
                      setReporting(false);
                      setReport("");
                      setNotice("Your report is in the administrator queue.");
                    })
                  }
                />
              </View>
            )}
          </>
        )
      )}
      {profile.error && <Button title="Retry" onPress={profile.reload} />}
    </Screen>
  );
}
export default function CaregiverDetail() {
  return (
    <Gate allowGuest>
      <Detail />
    </Gate>
  );
}
