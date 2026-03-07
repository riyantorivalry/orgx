import { Pressable, StyleSheet, Text } from "react-native";
import { theme } from "../lib/theme";

type PrimaryButtonProps = {
  title: string;
  onPress: () => void;
  disabled?: boolean;
  variant?: "primary" | "secondary" | "danger";
};

export function PrimaryButton({ title, onPress, disabled, variant = "primary" }: PrimaryButtonProps) {
  return (
    <Pressable
      style={({ pressed }) => [
        styles.button,
        variant === "secondary" && styles.buttonSecondary,
        variant === "danger" && styles.buttonDanger,
        pressed && !disabled && styles.pressed,
        pressed && !disabled && variant === "secondary" && styles.pressedSecondary,
        pressed && !disabled && variant === "danger" && styles.pressedDanger,
        disabled && styles.disabled,
      ]}
      onPress={onPress}
      disabled={disabled}
    >
      <Text style={[styles.text, variant !== "primary" && styles.textAlt, variant === "danger" && styles.textDanger]}>{title}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    backgroundColor: theme.primary,
    borderColor: theme.primary,
    borderWidth: 1,
    borderRadius: 11,
    minHeight: 44,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 14,
    marginTop: 10,
  },
  pressed: {
    backgroundColor: theme.primaryStrong,
    borderColor: theme.primaryStrong,
  },
  buttonSecondary: {
    backgroundColor: "#ffffff",
    borderColor: "#b8cbe8",
  },
  pressedSecondary: {
    backgroundColor: "#f4f8ff",
    borderColor: "#9eb7dc",
  },
  buttonDanger: {
    backgroundColor: "#fff1f1",
    borderColor: "#f0bebe",
  },
  pressedDanger: {
    backgroundColor: "#ffe2e2",
    borderColor: "#e8a2a2",
  },
  disabled: {
    opacity: 0.6,
  },
  text: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 15,
  },
  textAlt: {
    color: "#2e476c",
  },
  textDanger: {
    color: "#9d2424",
  },
});
