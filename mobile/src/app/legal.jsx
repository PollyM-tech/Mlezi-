import { Text, View } from "react-native";
import { useLocalSearchParams } from "expo-router";
import { LEGAL_CONTENT } from "../../../frontend/src/lib/legal-content";
import { legalConfiguration } from "../../../frontend/src/lib/legal";
import { LEGAL_VERSION } from "../../../frontend/convex/lib/legalPolicy";
import { Screen, s } from "../components/ui";
export default function Legal() {
  const { type } = useLocalSearchParams();
  const key =
    typeof type === "string" && ["terms", "privacy", "cookies"].includes(type)
      ? type
      : "privacy";
  const doc = LEGAL_CONTENT[key];
  const operator = legalConfiguration({
    VITE_LEGAL_ENTITY: process.env.EXPO_PUBLIC_LEGAL_ENTITY,
    VITE_LEGAL_STRUCTURE: process.env.EXPO_PUBLIC_LEGAL_STRUCTURE,
    VITE_LEGAL_SERVICE_ADDRESS: process.env.EXPO_PUBLIC_LEGAL_SERVICE_ADDRESS,
    VITE_LEGAL_REGISTRATION_NUMBER:
      process.env.EXPO_PUBLIC_LEGAL_REGISTRATION_NUMBER,
    VITE_LEGAL_REVIEWED: process.env.EXPO_PUBLIC_LEGAL_REVIEWED,
  });
  return (
    <Screen title={doc.title}>
      <Text style={s.muted}>Version {LEGAL_VERSION}</Text>
      {!operator.reviewed && (
        <Text style={s.error}>
          Draft notice: operator details and legal review must be completed
          before public launch.
        </Text>
      )}
      <View style={s.card}>
        <Text style={s.heading}>{operator.entity}</Text>
        <Text style={s.text}>{operator.structure}</Text>
        <Text style={s.text}>{operator.address}</Text>
        {!!operator.registration && (
          <Text style={s.text}>{operator.registration}</Text>
        )}
      </View>
      {doc.sections.map((section) => (
        <View key={section.id} style={{ gap: 10 }}>
          <Text style={s.heading}>{section.title}</Text>
          {section.paragraphs?.map((p, i) => (
            <Text key={i} style={s.text}>
              {p}
            </Text>
          ))}
          {section.items?.map((p, i) => (
            <Text key={i} style={s.text}>
              • {p}
            </Text>
          ))}
        </View>
      ))}
    </Screen>
  );
}
