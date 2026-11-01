import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Redirect, router } from "expo-router";
import { useSession } from "../lib/session";

export const colors = {
  ink: "#254b3d",
  green: "#235b45",
  cream: "#fbfaf5",
  gold: "#a77c3e",
  border: "#dbe2d4",
  muted: "#667666",
};
export const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.cream },
  content: { padding: 20, paddingBottom: 36, gap: 16, flexGrow: 1 },
  title: { color: colors.ink, fontSize: 29, fontWeight: "700", lineHeight: 35 },
  heading: {
    color: colors.ink,
    fontSize: 20,
    fontWeight: "600",
    marginBottom: 8,
  },
  text: { color: colors.ink, fontSize: 15, lineHeight: 24 },
  muted: { color: colors.muted, fontSize: 13, lineHeight: 20 },
  card: {
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 16,
    padding: 18,
    gap: 12,
  },
  row: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    gap: 10,
  },
  button: {
    minHeight: 46,
    paddingHorizontal: 17,
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: colors.green,
    alignItems: "center",
    justifyContent: "center",
  },
  secondary: {
    backgroundColor: "#edf2e8",
    borderWidth: 1,
    borderColor: colors.border,
  },
  buttonText: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "600",
    textAlign: "center",
  },
  secondaryText: { color: colors.ink },
  field: { gap: 7 },
  label: { color: colors.ink, fontSize: 14, fontWeight: "600" },
  input: {
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: 10,
    backgroundColor: "#fff",
    color: colors.ink,
    fontSize: 16,
    paddingHorizontal: 13,
    paddingVertical: 12,
    minHeight: 47,
  },
  chip: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 20,
    paddingVertical: 9,
    paddingHorizontal: 13,
    backgroundColor: "#fff",
  },
  selected: { backgroundColor: "#dfeadb", borderColor: colors.green },
  error: {
    color: "#9b3028",
    backgroundColor: "#fff0ec",
    padding: 14,
    borderRadius: 10,
    lineHeight: 21,
  },
  nav: {
    flexDirection: "row",
    justifyContent: "space-around",
    borderTopWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.cream,
    paddingVertical: 8,
  },
  navItem: { padding: 10 },
  navText: { color: colors.green, fontWeight: "600", fontSize: 13 },
  photo: {
    width: "100%",
    height: 220,
    borderRadius: 12,
    backgroundColor: "#edf2e8",
  },
});
export function Button({
  title,
  onPress,
  secondary = false,
  disabled = false,
}) {
  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        s.button,
        secondary && s.secondary,
        { opacity: disabled ? 0.45 : pressed ? 0.75 : 1 },
      ]}
    >
      <Text style={[s.buttonText, secondary && s.secondaryText]}>{title}</Text>
    </Pressable>
  );
}
export function Field({
  label,
  value,
  onChangeText,
  multiline = false,
  ...props
}) {
  return (
    <View style={s.field}>
      <Text style={s.label}>{label}</Text>
      <TextInput
        accessibilityLabel={label}
        value={value}
        onChangeText={onChangeText}
        multiline={multiline}
        style={[
          s.input,
          multiline && { minHeight: 100, textAlignVertical: "top" },
        ]}
        {...props}
      />
    </View>
  );
}
export function Check({ label, checked, onChange }) {
  return (
    <Pressable
      accessibilityRole="checkbox"
      accessibilityState={{ checked }}
      onPress={() => onChange(!checked)}
      style={[s.row, { paddingVertical: 8, flexWrap: "nowrap" }]}
    >
      <Text style={{ fontSize: 23, color: colors.green }}>
        {checked ? "☑" : "☐"}
      </Text>
      <Text style={[s.text, { flex: 1 }]}>{label}</Text>
    </Pressable>
  );
}
export function Choices({ label, options, value, onChange, multiple = false }) {
  return (
    <View style={{ gap: 9 }}>
      <Text style={s.label}>{label}</Text>
      <View style={s.row}>
        {Object.entries(options).map(([key, name]) => {
          const selected = multiple ? value.includes(key) : key === value;
          return (
            <Pressable
              key={key}
              accessibilityRole={multiple ? "checkbox" : "radio"}
              accessibilityLabel={name}
              accessibilityState={{ checked: selected }}
              style={[s.chip, selected && s.selected]}
              onPress={() =>
                onChange(
                  multiple
                    ? selected
                      ? value.filter((item) => item !== key)
                      : [...value, key]
                    : key,
                )
              }
            >
              <Text style={s.muted}>{name}</Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}
export function Loading({ message = "Loading Mlezi…" }) {
  return (
    <View
      style={[
        s.screen,
        {
          padding: 30,
          justifyContent: "center",
          alignItems: "center",
          gap: 16,
        },
      ]}
    >
      <ActivityIndicator color={colors.green} />
      <Text style={s.text}>{message}</Text>
    </View>
  );
}
export function ErrorNotice({ message }) {
  return message ? (
    <Text accessibilityRole="alert" style={s.error}>
      {message}
    </Text>
  ) : null;
}
export function Screen({ title, children, navigation = true }) {
  return (
    <SafeAreaView style={s.screen} edges={["bottom", "left", "right"]}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <ScrollView
          contentContainerStyle={s.content}
          keyboardShouldPersistTaps="handled"
        >
          {title && (
            <Text accessibilityRole="header" style={s.title}>
              {title}
            </Text>
          )}
          {children}
        </ScrollView>
      </KeyboardAvoidingView>
      {navigation && (
        <View style={s.nav}>
          {[
            ["Home", "/"],
            ["Find care", "/browse"],
            ["Help", "/help"],
            ["Account", "/account"],
          ].map(([name, path]) => (
            <Pressable
              key={name}
              accessibilityRole="button"
              onPress={() => router.replace(path)}
              style={s.navItem}
            >
              <Text style={s.navText}>{name}</Text>
            </Pressable>
          ))}
        </View>
      )}
    </SafeAreaView>
  );
}
export function Gate({
  children,
  allowGuest = false,
  allowSetup = false,
  allowRestricted = false,
}) {
  const { auth, server, session, linkBusy } = useSession();
  if (
    auth.isLoading ||
    server.isLoading ||
    linkBusy ||
    (auth.isAuthenticated && session === undefined)
  )
    return <Loading />;
  if (!auth.isAuthenticated)
    return allowGuest ? children : <Redirect href="/auth" />;
  if (session?.status === "expired") return <Redirect href="/account" />;
  if (session?.status === "onboarding") return <Redirect href="/onboarding" />;
  if (session?.status === "admin_security")
    return <Redirect href="/admin-security" />;
  if (session?.status === "restricted" && !allowRestricted)
    return <Redirect href="/privacy" />;
  if (session?.status === "profile_required" && !allowSetup && !allowRestricted)
    return <Redirect href="/profile" />;
  return (
    <View key={session?.account?.id || "guest"} style={{ flex: 1 }}>
      {children}
    </View>
  );
}
