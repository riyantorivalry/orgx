import { Modal, Pressable, Text, View } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { adminHomeStyles as styles } from "./adminHomeStyles";
import type { ConfirmDialogState } from "./types";

type AdminConfirmDialogProps = {
  dialog: ConfirmDialogState | null;
  onClose: (result: boolean) => void;
};

export function AdminConfirmDialog({ dialog, onClose }: AdminConfirmDialogProps) {
  if (!dialog) {
    return null;
  }

  return (
    <Modal transparent visible animationType="fade" onRequestClose={() => onClose(false)}>
      <Pressable style={styles.dialogBackdrop} onPress={() => onClose(false)}>
        <Pressable style={styles.dialogCard} onPress={() => undefined}>
          <View style={styles.dialogIconWrap}>
            <MaterialCommunityIcons
              name={dialog.tone === "danger" ? "alert-circle-outline" : "help-circle-outline"}
              size={24}
              style={[styles.dialogIcon, dialog.tone === "danger" ? styles.dialogIconDanger : styles.dialogIconPrimary]}
            />
          </View>
          <Text style={styles.dialogTitle}>{dialog.title}</Text>
          <Text style={styles.dialogMessage}>{dialog.message}</Text>
          <View style={styles.dialogActions}>
            <Pressable style={styles.dialogCancelButton} onPress={() => onClose(false)}>
              <Text style={styles.dialogCancelText}>Cancel</Text>
            </Pressable>
            <Pressable
              style={[styles.dialogConfirmButton, dialog.tone === "danger" ? styles.dialogConfirmDanger : styles.dialogConfirmPrimary]}
              onPress={() => onClose(true)}
            >
              <Text style={styles.dialogConfirmText}>{dialog.confirmLabel}</Text>
            </Pressable>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}
