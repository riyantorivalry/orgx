import { useMemo, useState } from "react";
import { FlatList, Platform, Pressable, Text, TextInput, View } from "react-native";
import DateTimePicker, { type DateTimePickerEvent } from "@react-native-community/datetimepicker";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { Card } from "../../components/Card";
import { ListSkeleton } from "../../components/ListSkeleton";
import { Screen } from "../../components/Screen";
import { StatusBanner } from "../../components/StatusBanner";
import type { AdminSessionListItem } from "../../types/admin";
import { adminHomeStyles as styles } from "./adminHomeStyles";
import { TextField } from "../../components/TextField";
import type { SessionFormState, SessionGroup } from "./types";

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

type PickerField = "startDate" | "endDate" | "startTime" | "endTime" | null;

function asDate(form: SessionFormState, field: Exclude<PickerField, null>): Date {
  const date = field === "startDate" || field === "startTime" ? form.startDate : form.endDate;
  const time = field === "startDate" || field === "startTime" ? form.startTime : form.endTime;
  const value = new Date(`${date}T${time}`);
  return Number.isNaN(value.getTime()) ? new Date() : value;
}

function formatDateValue(value: Date): string {
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, "0");
  const day = String(value.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function formatTimeValue(value: Date): string {
  const hours = String(value.getHours()).padStart(2, "0");
  const minutes = String(value.getMinutes()).padStart(2, "0");
  return `${hours}:${minutes}`;
}

function isValidDateInput(value: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(value);
}

function isValidTimeInput(value: string): boolean {
  return /^\d{2}:\d{2}$/.test(value);
}

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
  const [pickerField, setPickerField] = useState<PickerField>(null);

  const pickerValue = useMemo(() => {
    if (!pickerField) {
      return new Date();
    }
    return asDate(sessionForm, pickerField);
  }, [pickerField, sessionForm]);

  function openPicker(field: Exclude<PickerField, null>) {
    if (Platform.OS === "web") {
      return;
    }
    setPickerField(field);
  }

  function onPickerChange(event: DateTimePickerEvent, selected?: Date) {
    if (Platform.OS === "android") {
      setPickerField(null);
    }
    if (event.type === "dismissed" || !selected || !pickerField) {
      return;
    }

    if (pickerField === "startDate") {
      onSessionFormChange({ ...sessionForm, startDate: formatDateValue(selected) });
      return;
    }
    if (pickerField === "endDate") {
      onSessionFormChange({ ...sessionForm, endDate: formatDateValue(selected) });
      return;
    }
    if (pickerField === "startTime") {
      onSessionFormChange({ ...sessionForm, startTime: formatTimeValue(selected) });
      return;
    }
    onSessionFormChange({ ...sessionForm, endTime: formatTimeValue(selected) });
  }

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
                    {Platform.OS === "web" ? (
                      <>
                        <View style={styles.dateTimeRow}>
                          <View style={styles.dateTimeField}>
                            <Text style={styles.dateTimeLabel}>Start Date</Text>
                            <TextInput
                              value={sessionForm.startDate}
                              onChangeText={(value) => onSessionFormChange({ ...sessionForm, startDate: value })}
                              placeholder="YYYY-MM-DD"
                              placeholderTextColor="#7a879a"
                              style={styles.dateTimeInput}
                            />
                          </View>
                          <View style={styles.dateTimeField}>
                            <Text style={styles.dateTimeLabel}>End Date</Text>
                            <TextInput
                              value={sessionForm.endDate}
                              onChangeText={(value) => onSessionFormChange({ ...sessionForm, endDate: value })}
                              placeholder="YYYY-MM-DD"
                              placeholderTextColor="#7a879a"
                              style={styles.dateTimeInput}
                            />
                          </View>
                        </View>
                        <View style={styles.dateTimeRow}>
                          <View style={styles.dateTimeField}>
                            <Text style={styles.dateTimeLabel}>Start Time</Text>
                            <TextInput
                              value={sessionForm.startTime}
                              onChangeText={(value) => onSessionFormChange({ ...sessionForm, startTime: value })}
                              placeholder="HH:mm"
                              placeholderTextColor="#7a879a"
                              style={styles.dateTimeInput}
                            />
                          </View>
                          <View style={styles.dateTimeField}>
                            <Text style={styles.dateTimeLabel}>End Time</Text>
                            <TextInput
                              value={sessionForm.endTime}
                              onChangeText={(value) => onSessionFormChange({ ...sessionForm, endTime: value })}
                              placeholder="HH:mm"
                              placeholderTextColor="#7a879a"
                              style={styles.dateTimeInput}
                            />
                          </View>
                        </View>
                        {(!isValidDateInput(sessionForm.startDate) ||
                          !isValidDateInput(sessionForm.endDate) ||
                          !isValidTimeInput(sessionForm.startTime) ||
                          !isValidTimeInput(sessionForm.endTime)) ? (
                          <Text style={styles.metaMuted}>Use format `YYYY-MM-DD` and `HH:mm`.</Text>
                        ) : null}
                      </>
                    ) : (
                      <>
                        <View style={styles.dateTimeRow}>
                          <Pressable style={styles.dateTimeField} onPress={() => openPicker("startDate")}>
                            <Text style={styles.dateTimeLabel}>Start Date</Text>
                            <Text style={styles.dateTimeValue}>{sessionForm.startDate}</Text>
                          </Pressable>
                          <Pressable style={styles.dateTimeField} onPress={() => openPicker("endDate")}>
                            <Text style={styles.dateTimeLabel}>End Date</Text>
                            <Text style={styles.dateTimeValue}>{sessionForm.endDate}</Text>
                          </Pressable>
                        </View>
                        <View style={styles.dateTimeRow}>
                          <Pressable style={styles.dateTimeField} onPress={() => openPicker("startTime")}>
                            <Text style={styles.dateTimeLabel}>Start Time</Text>
                            <Text style={styles.dateTimeValue}>{sessionForm.startTime}</Text>
                          </Pressable>
                          <Pressable style={styles.dateTimeField} onPress={() => openPicker("endTime")}>
                            <Text style={styles.dateTimeLabel}>End Time</Text>
                            <Text style={styles.dateTimeValue}>{sessionForm.endTime}</Text>
                          </Pressable>
                        </View>
                      </>
                    )}
                    {Platform.OS !== "web" && pickerField ? (
                      <View style={styles.pickerWrap}>
                        <DateTimePicker
                          value={pickerValue}
                          mode={pickerField.includes("Date") ? "date" : "time"}
                          display={Platform.OS === "ios" ? "spinner" : "default"}
                          is24Hour
                          onChange={onPickerChange}
                        />
                        {Platform.OS === "ios" ? (
                          <Pressable style={styles.actionSecondary} onPress={() => setPickerField(null)}>
                            <Text style={styles.actionSecondaryText}>Done</Text>
                          </Pressable>
                        ) : null}
                      </View>
                    ) : null}
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
                      <View style={styles.rowTitleWithMarker}>
                        <View style={[styles.typeDot, item.mandatory ? styles.typeDotMandatory : styles.typeDotOptional]} />
                        <Text style={styles.titleStrong}>{item.eventName}</Text>
                      </View>
                      <View style={styles.rowSubtitleWithIcon}>
                        <MaterialCommunityIcons name="clock-outline" size={14} style={styles.rowMetaIcon} />
                        <Text style={styles.rowSubtitleText}>
                          {timeShort(item.startsAt)} - {timeShort(item.endsAt)}
                        </Text>
                      </View>
                    </Pressable>
                    <View style={styles.rowActionsTop}>
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
