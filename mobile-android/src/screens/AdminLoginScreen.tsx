import { useState } from "react";
import { Text } from "react-native";
import { Card } from "../components/Card";
import { PrimaryButton } from "../components/PrimaryButton";
import { Screen } from "../components/Screen";
import { StatusBanner } from "../components/StatusBanner";
import { TextField } from "../components/TextField";
import { authApi } from "../services/authApi";
import type { AdminAuthUser } from "../types/admin";

type AdminLoginScreenProps = {
  onLoggedIn: (user: AdminAuthUser) => void;
};

export function AdminLoginScreen({ onLoggedIn }: AdminLoginScreenProps) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const onSubmit = async () => {
    if (!username.trim() || !password) {
      setError("Username and password are required.");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const user = await authApi.login(username.trim(), password);
      onLoggedIn(user);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Login failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Screen title="Admin Login" subtitle="Sign in to manage sessions, members, and attendance.">
      <Card>
        {error ? <StatusBanner tone="error" message={error} /> : null}
        <TextField label="Username" value={username} onChangeText={setUsername} placeholder="admin" />
        <TextField label="Password" value={password} onChangeText={setPassword} secureTextEntry />
        <PrimaryButton title={loading ? "Signing In..." : "Sign In"} onPress={() => void onSubmit()} disabled={loading} />
        <Text style={{ marginTop: 10, color: "#56657E", fontSize: 12 }}>
          Backend URL: set `EXPO_PUBLIC_API_BASE_URL` when starting Expo.
        </Text>
      </Card>
    </Screen>
  );
}
