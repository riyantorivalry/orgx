import { StyleSheet, View } from "react-native";

type ListSkeletonProps = {
  rows?: number;
};

export function ListSkeleton({ rows = 6 }: ListSkeletonProps) {
  return (
    <View>
      {Array.from({ length: rows }).map((_, index) => (
        <View key={index} style={styles.row}>
          <View style={styles.linePrimary} />
          <View style={styles.lineSecondary} />
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    borderWidth: 1,
    borderColor: "#dbe5f4",
    borderRadius: 12,
    padding: 10,
    marginBottom: 8,
    backgroundColor: "#f7faff",
  },
  linePrimary: {
    height: 12,
    width: "56%",
    borderRadius: 999,
    backgroundColor: "#d7e3f8",
  },
  lineSecondary: {
    marginTop: 8,
    height: 10,
    width: "34%",
    borderRadius: 999,
    backgroundColor: "#e6eefc",
  },
});
