import { NotConnected } from "@/components/Connect";
import { ThemedView } from "@/components/ThemedView";
import { useRouter } from "expo-router";
import React from "react";

export default function LoginScreen() {
  const router = useRouter();

  return (
    <ThemedView className="flex-1 items-center justify-center">

      <NotConnected />
    </ThemedView>
  );
}
