import { router } from "expo-router";
import { Text } from "react-native";
import { Button, Screen, s } from "../components/ui";
export default function NotFound() {
  return (
    <Screen title="Page not found">
      <Text style={s.text}>This screen is unavailable.</Text>
      <Button title="Go home" onPress={() => router.replace("/")} />
    </Screen>
  );
}
