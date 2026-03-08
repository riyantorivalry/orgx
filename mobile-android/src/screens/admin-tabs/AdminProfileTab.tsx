import { Pressable, Text, View } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { Card } from "../../components/Card";
import { Screen } from "../../components/Screen";
import { StatusBanner } from "../../components/StatusBanner";
import { adminHomeStyles as styles } from "./adminHomeStyles";

type AdminProfileTabProps = {
  username: string;
  error: string;
  success: string;
  onLogout: () => Promise<void>;
};

export function AdminProfileTab({ username, error, success, onLogout }: AdminProfileTabProps) {
  return (
    <Screen title="Profile" scroll={false}>
      {error ? <StatusBanner tone="error" message={error} /> : null}
      {success ? <StatusBanner tone="success" message={success} /> : null}
      <Card>
        <View style={styles.titleWithIcon}>
          <MaterialCommunityIcons name="account-circle-outline" size={20} style={styles.sectionIcon} />
          <Text style={styles.sectionTitle}>Admin Account</Text>
        </View>
        <Text style={styles.metaStrong}>Username: {username}</Text>
        <Text style={styles.meta}>Role: Administrator</Text>
        <Text style={styles.metaMuted}>Use this section to manage account actions.</Text>
      </Card>
      <Card>
        <Pressable style={styles.profileLogoutButton} onPress={() => void onLogout()}>
          <MaterialCommunityIcons name="logout" size={16} style={styles.profileLogoutIcon} />
          <Text style={styles.profileLogoutText}>Logout</Text>
        </Pressable>
      </Card>
    </Screen>
  );
}
