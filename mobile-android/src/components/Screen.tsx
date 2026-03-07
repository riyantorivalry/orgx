import { PropsWithChildren } from "react";
import { KeyboardAvoidingView, Platform, ScrollView, StyleProp, StyleSheet, Text, View, ViewStyle } from "react-native";
import { theme } from "../lib/theme";

type ScreenProps = PropsWithChildren<{
  title: string;
  subtitle?: string;
  scroll?: boolean;
  contentStyle?: StyleProp<ViewStyle>;
}>;

export function Screen({ title, subtitle, children, scroll = true, contentStyle }: ScreenProps) {
  return (
    <KeyboardAvoidingView style={styles.root} behavior={Platform.select({ ios: "padding", android: undefined })}>
      <View style={styles.bgBlobA} />
      <View style={styles.bgBlobB} />
      {scroll ? (
        <ScrollView contentContainerStyle={[styles.content, contentStyle]} keyboardShouldPersistTaps="handled">
          <View style={styles.header}>
            <Text style={styles.title}>{title}</Text>
            {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
          </View>
          {children}
        </ScrollView>
      ) : (
        <View style={[styles.content, styles.contentNoScroll, contentStyle]}>
          <View style={styles.header}>
            <Text style={styles.title}>{title}</Text>
            {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
          </View>
          {children}
        </View>
      )}
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: theme.bg,
  },
  content: {
    paddingHorizontal: 16,
    paddingTop: 18,
    paddingBottom: 26,
  },
  contentNoScroll: {
    flex: 1,
    paddingBottom: 14,
  },
  header: {
    marginBottom: 12,
  },
  title: {
    color: theme.ink,
    fontSize: 27,
    fontWeight: "800",
    letterSpacing: -0.2,
  },
  subtitle: {
    marginTop: 6,
    color: theme.muted,
    fontSize: 14,
    fontWeight: "600",
  },
  bgBlobA: {
    position: "absolute",
    width: 340,
    height: 340,
    borderRadius: 999,
    backgroundColor: "#dce8ff",
    top: -170,
    left: -60,
    opacity: 0.6,
  },
  bgBlobB: {
    position: "absolute",
    width: 280,
    height: 280,
    borderRadius: 999,
    backgroundColor: "#dff6f1",
    top: -120,
    right: -80,
    opacity: 0.7,
  },
});
