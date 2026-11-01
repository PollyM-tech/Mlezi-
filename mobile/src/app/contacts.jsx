import { useState } from "react";
import { Linking, Text, View } from "react-native";
import { router } from "expo-router";
import { errorMessage } from "../lib/core";
import { useRead } from "../lib/session";
import {
  Button,
  ErrorNotice,
  Gate,
  Loading,
  Screen,
  s,
} from "../components/ui";
function ContactsContent() {
  const [contactError, setContactError] = useState("");
  async function open(url) {
    try {
      await Linking.openURL(url);
    } catch (e) {
      setContactError(errorMessage(e));
    }
  }
  const [page, setPage] = useState(1),
    { data, error, reload } = useRead(`/employers/contacts?page=${page}`);
  return (
    <Screen title="My unlocked contacts">
      <Text style={s.text}>
        Saved contact access survives ordinary pass expiry, subject to safety
        restrictions and account deletion.
      </Text>
      <ErrorNotice message={error || contactError} />
      {!data && !error ? (
        <Loading />
      ) : (
        data && (
          <>
            {!data.contacts.length && (
              <Text style={s.text}>No contacts unlocked yet.</Text>
            )}
            {data.contacts.map((row) => (
              <View key={row.profile.id} style={s.card}>
                <Text style={s.heading}>{row.profile.name}</Text>
                <Text style={s.text}>
                  {row.contact.phone || "No phone provided"}
                </Text>
                <Text style={s.text}>{row.contact.email}</Text>
                {row.contact.phone && (
                  <Button
                    title="Call"
                    secondary
                    onPress={() => open(`tel:${row.contact.phone}`)}
                  />
                )}
                <Button
                  title="Email"
                  secondary
                  onPress={() => open(`mailto:${row.contact.email}`)}
                />
                <Button
                  title="View caregiver"
                  secondary
                  onPress={() =>
                    router.push({
                      pathname: "/caregiver/[id]",
                      params: { id: String(row.profile.id) },
                    })
                  }
                />
              </View>
            ))}
            {data.total > 12 && (
              <View style={s.row}>
                <Button
                  title="Previous"
                  secondary
                  disabled={page === 1}
                  onPress={() => setPage((value) => value - 1)}
                />
                <Button
                  title="Next"
                  secondary
                  disabled={page * 12 >= data.total}
                  onPress={() => setPage((value) => value + 1)}
                />
              </View>
            )}
          </>
        )
      )}
      {error && <Button title="Retry" onPress={reload} />}
    </Screen>
  );
}
export default function Contacts() {
  return (
    <Gate>
      <ContactsContent />
    </Gate>
  );
}
