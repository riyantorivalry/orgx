import { FlatList, Pressable, Text, TextInput, View } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { Card } from "../../components/Card";
import { ListSkeleton } from "../../components/ListSkeleton";
import { Screen } from "../../components/Screen";
import { StatusBanner } from "../../components/StatusBanner";
import { TextField } from "../../components/TextField";
import type { AdminSessionListItem } from "../../types/admin";
import { adminHomeStyles as styles } from "./adminHomeStyles";
import type { SessionGroup } from "./types";

type SessionFormState = {
  eventName: string;
  startsAtLocal: string;
  endsAtLocal: string;
  mandatory: boolean;
};

type AdminSessionsTabProps = {
  error: string;
  success: string;
  loading: boolean;
  sessionSaving: boolean;
  sessionCreateOpen: boolean;
  sessionListOpen: boolean;
  sessionsQuery: string;
  groupedFilteredSessions: SessionGroup[];
  sessionForm: SessionFormState;
  editingSessionId: string | null;
  expandedSessionIds: Record<string, boolean>;
  openSessionMenuId: string | null;
  onToggleSessionCreate: () => void;
  onToggleSessionList: () => void;
  onChangeSessionsQuery: (value: string) => void;
  onSessionFormChange: (value: SessionFormState) => void;
  onSaveSession: () => Promise<void>;
  onCancelSessionEdit: () => void;
  onToggleSessionExpanded: (sessionId: string) => void;
  onToggleSessionMenu: (sessionId: string) => void;
  onStartEditSession: (session: AdminSessionListItem) => void;
  onStartOrCloseSession: (session: AdminSessionListItem) => Promise<void>;
  onDeleteSession: (session: AdminSessionListItem) => Promise<void>;
  onCloseMenus: () => void;
  timeShort: (value: string) => string;
};

export function AdminSessionsTab({
  error,
  success,
  loading,
  sessionSaving,
  sessionCreateOpen,
  sessionListOpen,
  sessionsQuery,
  groupedFilteredSessions,
  sessionForm,
  editingSessionId,
  expandedSessionIds,
  openSessionMenuId,
  onToggleSessionCreate,
  onToggleSessionList,
  onChangeSessionsQuery,
  onSessionFormChange,
  onSaveSession,
  onCancelSessionEdit,
  onToggleSessionExpanded,
  onToggleSessionMenu,
  onStartEditSession,
  onStartOrCloseSession,
  onDeleteSession,
  onCloseMenus,
  timeShort,
}: AdminSessionsTabProps) {
  return (
    <Screen title="Sessions" scroll={false}>
      {error ? <StatusBanner tone="error" message={error} /> : null}
      {success ? <StatusBanner tone="success" message={success} /> : null}
      {loading ? <ListSkeleton rows={8} /> : null}
      <View style={styles.interactionLayer}>
        <FlatList
          data={sessionListOpen ? groupedFilteredSessions : []}
          keyExtractor={(item) => item.key}
          contentContainerStyle={styles.listContent}
          keyboardShouldPersistTaps="handled"
          onScrollBeginDrag={onCloseMenus}
          removeClippedSubviews={false}
          ListHeaderComponent={
            <>
              <Card>
                <Pressable style={styles.accordionHead} onPress={onToggleSessionCreate}>
                  <View style={styles.titleWithIcon}>
                    <MaterialCommunityIcons name="calendar-plus" size={18} style={styles.sectionIcon} />
                    <Text style={styles.sectionTitle}>{sessionCreateOpen ? "Hide Create Session" : "Create Session"}</Text>
                  </View>
                  <Text style={styles.accordionIcon}>{sessionCreateOpen ? "-" : "+"}</Text>
                </Pressable>
                {sessionCreateOpen ? (
                  <View>
                    <TextField
                      label="Event Name"
                      value={sessionForm.eventName}
                      onChangeText={(value) => onSessionFormChange({ ...sessionForm, eventName: value })}
                      placeholder="Sunday Service"
                    />
                    <TextField
                      label="Starts At (YYYY-MM-DDTHH:mm)"
                      value={sessionForm.startsAtLocal}
                      onChangeText={(value) => onSessionFormChange({ ...sessionForm, startsAtLocal: value })}
                      placeholder="2026-03-07T09:00"
                    />
                    <TextField
                      label="Ends At (YYYY-MM-DDTHH:mm)"
                      value={sessionForm.endsAtLocal}
                      onChangeText={(value) => onSessionFormChange({ ...sessionForm, endsAtLocal: value })}
                      placeholder="2026-03-07T11:00"
                    />
                    <View style={styles.inlineRow}>
                      <Pressable style={[styles.actionChip, sessionForm.mandatory && styles.actionChipActive]} onPress={() => onSessionFormChange({ ...sessionForm, mandatory: !sessionForm.mandatory })}>
                        <Text style={[styles.actionChipText, sessionForm.mandatory && styles.actionChipTextActive]}>{sessionForm.mandatory ? "Mandatory" : "Optional"}</Text>
                      </Pressable>
                      <Pressable style={styles.actionPrimary} onPress={() => void onSaveSession()} disabled={sessionSaving}>
                        <Text style={styles.actionPrimaryText}>{sessionSaving ? "Saving..." : editingSessionId ? "Update" : "Create"}</Text>
                      </Pressable>
                      {editingSessionId ? (
                        <Pressable style={styles.actionSecondary} onPress={onCancelSessionEdit}>
                          <Text style={styles.actionSecondaryText}>Cancel</Text>
                        </Pressable>
                      ) : null}
                    </View>
                  </View>
                ) : null}
              </Card>
              <Card>
                <Pressable style={styles.accordionHead} onPress={onToggleSessionList}>
                  <View style={styles.titleWithIcon}>
                    <MaterialCommunityIcons name="calendar-multiple" size={18} style={styles.sectionIcon} />
                    <Text style={styles.sectionTitle}>{sessionListOpen ? "Hide All Sessions" : "All Sessions"}</Text>
                  </View>
                  <Text style={styles.accordionIcon}>{sessionListOpen ? "-" : "+"}</Text>
                </Pressable>
                {sessionListOpen ? (
                  <View style={styles.searchRow}>
                    <TextInput
                      value={sessionsQuery}
                      onChangeText={onChangeSessionsQuery}
                      placeholder="Search by event or status"
                      placeholderTextColor="#7a879a"
                      style={styles.searchInput}
                    />
                  </View>
                ) : null}
              </Card>
            </>
          }
          ListEmptyComponent={sessionListOpen ? <Text style={styles.meta}>No sessions found.</Text> : null}
          renderItem={({ item: group }) => (
            <View style={styles.incomingItem}>
              <View style={styles.incomingHead}>
                <Text style={styles.incomingTitle}>{group.label}</Text>
                <Text style={styles.incomingRange}>
                  {timeShort(group.timeStart)} - {timeShort(group.timeEnd)}
                </Text>
              </View>
              {group.items.map((item) => (
                <View key={item.id} style={[styles.rowItem, openSessionMenuId === item.id && styles.rowItemOverlay]}>
                  <View style={styles.rowHead}>
                    <Pressable style={styles.rowMain} onPress={() => onToggleSessionExpanded(item.id)}>
                      <Text style={styles.titleStrong}>{item.eventName}</Text>
                      <View style={styles.rowSubtitleWithIcon}>
                        <MaterialCommunityIcons name="clock-outline" size={14} style={styles.rowMetaIcon} />
                        <Text style={styles.rowSubtitleText}>
                          {timeShort(item.startsAt)} - {timeShort(item.endsAt)}
                        </Text>
                      </View>
                    </Pressable>
                    <View style={styles.rowActionsTop}>
                      <View style={[styles.typeDot, item.mandatory ? styles.typeDotMandatory : styles.typeDotOptional]} />
                      <Pressable style={styles.moreButton} onPress={() => onToggleSessionMenu(item.id)}>
                        <Text style={styles.moreButtonText}>...</Text>
                      </Pressable>
                    </View>
                  </View>
                  {openSessionMenuId === item.id ? (
                    <View style={styles.menuPanelInline}>
                      <Pressable
                        style={styles.menuItem}
                        onPress={() => {
                          onToggleSessionExpanded(item.id);
                          onToggleSessionMenu(item.id);
                        }}
                      >
                        <View style={styles.menuItemRow}>
                          <MaterialCommunityIcons name={expandedSessionIds[item.id] ? "chevron-up" : "chevron-down"} size={14} style={styles.menuIcon} />
                          <Text style={styles.menuItemText}>{expandedSessionIds[item.id] ? "Hide Details" : "Show Details"}</Text>
                        </View>
                      </Pressable>
                      <Pressable
                        style={styles.menuItem}
                        onPress={() => {
                          onStartEditSession(item);
                          onToggleSessionMenu(item.id);
                        }}
                      >
                        <View style={styles.menuItemRow}>
                          <MaterialCommunityIcons name="pencil-outline" size={14} style={styles.menuIcon} />
                          <Text style={styles.menuItemText}>Edit</Text>
                        </View>
                      </Pressable>
                      {item.status !== "CLOSED" ? (
                        <Pressable
                          style={styles.menuItem}
                          onPress={() => {
                            void onStartOrCloseSession(item);
                            onToggleSessionMenu(item.id);
                          }}
                          disabled={sessionSaving}
                        >
                          <View style={styles.menuItemRow}>
                            <MaterialCommunityIcons name={item.status === "ACTIVE" ? "stop-circle-outline" : "play-circle-outline"} size={14} style={styles.menuIcon} />
                            <Text style={styles.menuItemText}>{item.status === "ACTIVE" ? "Close Session" : "Start Session"}</Text>
                          </View>
                        </Pressable>
                      ) : null}
                      <Pressable
                        style={styles.menuItem}
                        onPress={() => {
                          void onDeleteSession(item);
                          onToggleSessionMenu(item.id);
                        }}
                        disabled={sessionSaving}
                      >
                        <View style={styles.menuItemRow}>
                          <MaterialCommunityIcons name="delete-outline" size={14} style={styles.menuIconDanger} />
                          <Text style={styles.menuItemDanger}>Delete</Text>
                        </View>
                      </Pressable>
                    </View>
                  ) : null}
                  {expandedSessionIds[item.id] ? (
                    <View style={styles.expandBody}>
                      <Text style={styles.meta}>Session ID: {item.id}</Text>
                    </View>
                  ) : null}
                </View>
              ))}
            </View>
          )}
        />
      </View>
    </Screen>
  );
}
