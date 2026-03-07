import { StyleSheet, Text, View } from "react-native";
import { theme } from "../lib/theme";

type Tone = "success" | "warning" | "error";

type StatusBannerProps = {
  tone: Tone;
  message: string;
};

export function StatusBanner({ tone, message }: StatusBannerProps) {
  return (
    <View style={[styles.base, tone === "success" && styles.success, tone === "warning" && styles.warning, tone === "error" && styles.error]}>
      <Text style={[styles.text, tone === "success" && styles.successText, tone === "warning" && styles.warningText, tone === "error" && styles.errorText]}>
        {message}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  base: {
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 10,
  },
  text: {
    fontSize: 14,
    fontWeight: "700",
  },
  success: {
    backgroundColor: theme.successBg,
    borderColor: "#b9e4cd",
  },
  successText: {
    color: theme.successText,
  },
  warning: {
    backgroundColor: theme.warningBg,
    borderColor: "#f4ddb8",
  },
  warningText: {
    color: theme.warningText,
  },
  error: {
    backgroundColor: theme.dangerBg,
    borderColor: "#f2c8c8",
  },
  errorText: {
    color: theme.dangerText,
  },
});
