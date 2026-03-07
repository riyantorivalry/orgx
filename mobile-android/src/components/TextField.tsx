import { StyleSheet, Text, TextInput, View } from "react-native";
import { theme } from "../lib/theme";

type TextFieldProps = {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  secureTextEntry?: boolean;
  placeholder?: string;
};

export function TextField({ label, value, onChangeText, secureTextEntry, placeholder }: TextFieldProps) {
  return (
    <View style={styles.wrap}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        secureTextEntry={secureTextEntry}
        placeholder={placeholder}
        placeholderTextColor="#7a879a"
        style={styles.input}
        autoCapitalize="none"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    marginBottom: 10,
  },
  label: {
    color: "#2f425e",
    fontSize: 13,
    fontWeight: "700",
    marginBottom: 6,
  },
  input: {
    borderColor: "#a8b8d3",
    borderWidth: 1,
    borderRadius: 12,
    backgroundColor: "#fff",
    color: theme.ink,
    paddingVertical: 11,
    paddingHorizontal: 12,
    fontSize: 15,
  },
});
