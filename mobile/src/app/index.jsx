import { Image, Text, View } from "react-native";
import { router } from "expo-router";
import {
  Gate,
  Screen,
  Button,
  s,
  ErrorNotice,
  Loading,
} from "../components/ui";
import { useRead, useSession } from "../lib/session";

function Welcome() {
  return (
    <Screen title="A little care. A brighter beginning.">
      <Image
        source={require("../../assets/mlezi-logo.png")}
        style={{ width: "100%", height: 100 }}
        resizeMode="contain"
      />
      <Image
        source={require("../../../frontend/src/assets/bg-image.png")}
        style={s.photo}
      />
      <Text style={s.text}>
        Find childcare that fits your family, or share your experience as a
        caregiver.
      </Text>
      <Button
        title="Find your caregiver"
        onPress={() => router.push("/browse")}
      />
      <Button
        title="Create my account"
        secondary
        onPress={() => router.push("/auth?mode=signup")}
      />
      <Button title="Sign in" secondary onPress={() => router.push("/auth")} />
      <Text style={s.muted}>
        Browse for free. Identity review, Premium visibility and employer
        ratings are separate.
      </Text>
    </Screen>
  );
}
function EmployerHome() {
  const { data, error, reload } = useRead("/employers/dashboard");
  return (
    <Screen
      title={
        data
          ? `Welcome, ${data.profile.name || "parent"}.`
          : "Your family workspace"
      }
    >
      <ErrorNotice message={error} />
      {!data && !error ? (
        <Loading />
      ) : (
        data && (
          <>
            <View style={s.card}>
              <Text style={s.heading}>Your connections</Text>
              <Text style={s.text}>
                {data.counts.shortlist} shortlisted · {data.counts.contacts}{" "}
                unlocked contacts · {data.counts.reviews} reviews
              </Text>
              <Button
                title="Find caregivers"
                onPress={() => router.push("/browse")}
              />
              <Button
                title="My shortlist"
                secondary
                onPress={() => router.push("/shortlist")}
              />
              <Button
                title="My unlocked contacts"
                secondary
                onPress={() => router.push("/contacts")}
              />
            </View>
            <View style={s.card}>
              <Text style={s.heading}>
                {data.profile.pass_active
                  ? "Contact access is active"
                  : "Browse and shortlist for free"}
              </Text>
              <Text style={s.text}>
                Previously unlocked contacts stay accessible after ordinary pass
                expiry. New unlocks require an active pass.
              </Text>
              <Button
                title="View plans"
                secondary
                onPress={() => router.push("/membership")}
              />
            </View>
          </>
        )
      )}
      {error && <Button title="Retry" onPress={reload} />}
    </Screen>
  );
}
function CaregiverHome() {
  const { data, error, reload } = useRead("/caregivers/profile");
  return (
    <Screen title="Your caregiver workspace">
      <ErrorNotice message={error} />
      {!data && !error ? (
        <Loading />
      ) : (
        data && (
          <>
            <View style={s.card}>
              <Image source={{ uri: data.profile.photo_url }} style={s.photo} />
              <Text style={s.heading}>{data.profile.name}</Text>
              <Text style={s.text}>
                Identity: {data.profile.verification_status} ·{" "}
                {data.profile.premium_active ? "Premium" : "Free profile"}
              </Text>
              <Text style={s.muted}>
                {data.profile.is_available
                  ? "Accepting new requests"
                  : "Availability paused"}
              </Text>
              <Button
                title="Edit my profile"
                onPress={() => router.push("/profile")}
              />
              <Button
                title="Identity review"
                secondary
                onPress={() => router.push("/identity")}
              />
              <Button
                title="View my profile and reviews"
                secondary
                onPress={() =>
                  router.push({
                    pathname: "/caregiver/[id]",
                    params: { id: String(data.profile.id) },
                  })
                }
              />
            </View>
            <Button
              title="Premium membership"
              secondary
              onPress={() => router.push("/membership")}
            />
          </>
        )
      )}
      {error && <Button title="Retry" onPress={reload} />}
    </Screen>
  );
}
function HomeContent() {
  const { auth, session } = useSession();
  if (!auth.isAuthenticated) return <Welcome />;
  if (session?.account?.role === "employer") return <EmployerHome />;
  if (session?.account?.role === "caregiver") return <CaregiverHome />;
  return (
    <Screen title="Administrator workspace">
      <Text style={s.text}>
        Use support tickets here. Identity-document review and full moderation
        remain in the website administrator workspace.
      </Text>
      <Button
        title="Manage support tickets"
        onPress={() => router.push("/support")}
      />
      <Button
        title="Privacy and account"
        secondary
        onPress={() => router.push("/privacy")}
      />
    </Screen>
  );
}
export default function Home() {
  return (
    <Gate allowGuest>
      <HomeContent />
    </Gate>
  );
}
