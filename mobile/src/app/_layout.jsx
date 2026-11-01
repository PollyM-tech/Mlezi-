import React from "react";
import { Stack, router } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { Text } from "react-native";
import { MobileProvider } from "../lib/session";
import { Button, Screen, colors, s } from "../components/ui";
import { errorMessage } from "../lib/core";

class AppErrorBoundary extends React.Component {
  state = { error: null };
  static getDerivedStateFromError(error) {
    return { error };
  }
  render() {
    if (this.state.error)
      return (
        <Screen title="Let’s try that again">
          <Text style={s.text}>{errorMessage(this.state.error)}</Text>
          <Button
            title="Return home"
            onPress={() => {
              this.setState({ error: null });
              router.replace("/");
            }}
          />
        </Screen>
      );
    return this.props.children;
  }
}
export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <MobileProvider>
        <AppErrorBoundary>
          <StatusBar style="dark" />
          <Stack
            screenOptions={{
              headerTitle: "Mlezi Care",
              headerStyle: { backgroundColor: colors.cream },
              headerTintColor: colors.green,
              headerShadowVisible: false,
              contentStyle: { backgroundColor: colors.cream },
            }}
          />
        </AppErrorBoundary>
      </MobileProvider>
    </SafeAreaProvider>
  );
}
