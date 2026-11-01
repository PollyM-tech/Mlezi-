import { useState } from "react";
import { Linking, Text, View } from "react-native";
import { useMutation, useQuery } from "convex/react";
import { api, useSession } from "../lib/session";
import { config } from "../lib/config";
import { errorMessage } from "../lib/core";
import {
  Button,
  Choices,
  ErrorNotice,
  Field,
  Gate,
  Screen,
  s,
} from "../components/ui";
const categories = {
  account: "Account",
  profile: "Profile",
  identity: "Identity review",
  membership: "Membership",
  technical: "Technical issue",
  safety: "Safety",
  privacy: "Privacy",
  other: "Other",
};
function Tickets() {
  const { session } = useSession();
  const admin = session.account.role === "admin";
  const [cursor, setCursor] = useState(null),
    [id, setId] = useState(null),
    [subject, setSubject] = useState(""),
    [category, setCategory] = useState("technical"),
    [body, setBody] = useState(""),
    [reply, setReply] = useState(""),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  const list = useQuery(api.support.list, {
      admin,
      ...(cursor ? { cursor } : {}),
    }),
    thread = useQuery(api.support.thread, id ? { id } : "skip");
  const create = useMutation(api.support.create),
    send = useMutation(api.support.reply),
    resolve = useMutation(api.support.resolve);
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
    <Screen title="Support tickets">
      <Text style={s.text}>
        Keep your issue here so the support team can follow up. We aim to
        address issues within 48 hours. Never include passwords, sign-in codes
        or full ID details.
      </Text>
      <ErrorNotice message={error} />
      {id ? (
        <>
          <Button
            title="Back to tickets"
            secondary
            onPress={() => {
              setId(null);
              setReply("");
            }}
          />
          {thread ? (
            <>
              <Text style={s.heading}>{thread.subject}</Text>
              <Text style={s.muted}>Status: {thread.status}</Text>
              {thread.messages.map((m) => (
                <View key={m.id} style={s.card}>
                  <Text style={s.label}>
                    {m.sender === "support" ? "Mlezi support" : "Customer"} ·{" "}
                    {new Date(m.createdAt).toLocaleString()}
                  </Text>
                  <Text style={s.text}>{m.body}</Text>
                </View>
              ))}
              <Field
                label="Your reply"
                value={reply}
                onChangeText={setReply}
                multiline
                maxLength={2000}
              />
              <Button
                title="Send reply"
                disabled={busy || !reply.trim()}
                onPress={() =>
                  run(async () => {
                    await send({ id, body: reply });
                    setReply("");
                  })
                }
              />
              <Button
                title={
                  thread.status === "resolved"
                    ? "Reopen ticket"
                    : "Mark resolved"
                }
                secondary
                disabled={busy}
                onPress={() =>
                  run(() =>
                    resolve({ id, resolved: thread.status !== "resolved" }),
                  )
                }
              />
            </>
          ) : (
            <Text style={s.text}>Loading conversation…</Text>
          )}
        </>
      ) : (
        <>
          {!admin && (
            <View style={s.card}>
              <Text style={s.heading}>Open a ticket</Text>
              <Field
                label="Subject"
                value={subject}
                onChangeText={setSubject}
                maxLength={120}
              />
              <Choices
                label="Category"
                options={categories}
                value={category}
                onChange={setCategory}
              />
              <Field
                label="Describe the issue"
                value={body}
                onChangeText={setBody}
                multiline
                maxLength={2000}
              />
              <Button
                title="Submit ticket"
                disabled={busy || !subject.trim() || !body.trim()}
                onPress={() =>
                  run(async () => {
                    const result = await create({ subject, category, body });
                    setId(result.id);
                    setSubject("");
                    setBody("");
                    setCursor(null);
                  })
                }
              />
            </View>
          )}
          {list?.tickets.map((ticket) => (
            <View key={ticket.id} style={s.card}>
              <Text style={s.heading}>{ticket.subject}</Text>
              <Text style={s.muted}>
                {ticket.status} ·{" "}
                {new Date(ticket.createdAt).toLocaleDateString()}
              </Text>
              <Button
                title="Open conversation"
                secondary
                onPress={() => {
                  setId(ticket.id);
                  setReply("");
                }}
              />
            </View>
          ))}
          {list && !list.tickets.length && (
            <Text style={s.text}>No tickets yet.</Text>
          )}
          {list?.cursor && (
            <Button
              title="Next tickets"
              secondary
              onPress={() => setCursor(list.cursor)}
            />
          )}
          {!!cursor && (
            <Button
              title="Latest tickets"
              secondary
              onPress={() => setCursor(null)}
            />
          )}
        </>
      )}
    </Screen>
  );
}
export default function Support() {
  const { auth } = useSession();
  const [error, setError] = useState("");
  if (!auth.isAuthenticated)
    return (
      <Screen title="Get support">
        <Text style={s.text}>
          Signed-out support uses the website’s email form and spam protection.
          It will be available when the public website and email delivery are
          configured.
        </Text>
        <ErrorNotice message={error} />
        <Button
          title="Open website support"
          onPress={() =>
            Linking.openURL(`${config.webOrigin}/support/`).catch(() =>
              setError("Unable to open the website. Please try again later."),
            )
          }
        />
      </Screen>
    );
  return (
    <Gate allowRestricted>
      <Tickets />
    </Gate>
  );
}
