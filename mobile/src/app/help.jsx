import { useState } from "react";
import { Text, View } from "react-native";
import { router } from "expo-router";
import { FAQ_TOPICS, findFaqs } from "../../../frontend/src/lib/faq";
import { Button, Choices, Field, Screen, s } from "../components/ui";
export default function Help() {
  const [query, setQuery] = useState(""),
    [topic, setTopic] = useState("all"),
    [open, setOpen] = useState("");
  const results = findFaqs(query, topic);
  return (
    <Screen title="Mlezi help">
      <Text style={s.text}>
        Find answers about accounts, care, identity review and plans. This
        assistant uses written FAQs, with no AI service or chat fees.
      </Text>
      <Field
        label="What do you need help with?"
        value={query}
        onChangeText={setQuery}
        maxLength={120}
      />
      <Choices
        label="Topic"
        options={FAQ_TOPICS}
        value={topic}
        onChange={setTopic}
      />
      {results.map((entry) => (
        <View key={entry.id} style={s.card}>
          <Button
            title={entry.question}
            secondary
            onPress={() => setOpen(open === entry.id ? "" : entry.id)}
          />
          {open === entry.id && <Text style={s.text}>{entry.answer}</Text>}
        </View>
      ))}
      {!results.length && (
        <Text style={s.text}>
          No matching answer. Try a different word or open a support ticket.
        </Text>
      )}
      <Text style={s.muted}>
        Website cookie preferences apply in your browser. This mobile app stores
        sign-in credentials securely and does not load optional advertising or
        analytics.
      </Text>
      <Button title="Contact support" onPress={() => router.push("/support")} />
    </Screen>
  );
}
