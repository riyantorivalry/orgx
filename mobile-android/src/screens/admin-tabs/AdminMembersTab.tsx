import { FlatList, Pressable, Text, TextInput, View } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { Card } from "../../components/Card";
import { ListSkeleton } from "../../components/ListSkeleton";
import { Screen } from "../../components/Screen";
import { StatusBanner } from "../../components/StatusBanner";
import { TextField } from "../../components/TextField";
import type { AdminMember } from "../../types/admin";
import { adminHomeStyles as styles } from "./adminHomeStyles";

type MemberFormState = {
  fullName: string;
  dob: string;
  bloodType: string;
  address: string;
  email: string;
  mobileNumber: string;
  active: boolean;
};

type AdminMembersTabProps = {
  error: string;
  success: string;
  loading: boolean;
  memberSaving: boolean;
  memberCreateOpen: boolean;
  memberListOpen: boolean;
  members: AdminMember[];
  membersQuery: string;
  memberForm: MemberFormState;
  editingMemberId: string | null;
  expandedMemberIds: Record<string, boolean>;
  openMemberMenuId: string | null;
  onToggleMemberCreate: () => void;
  onToggleMemberList: () => void;
  onChangeMembersQuery: (value: string) => void;
  onSearchMembers: () => Promise<void>;
  onMemberFormChange: (value: MemberFormState) => void;
  onSaveMember: () => Promise<void>;
  onCancelMemberEdit: () => void;
  onToggleMemberExpanded: (memberId: string) => void;
  onToggleMemberMenu: (memberId: string) => void;
  onStartEditMember: (member: AdminMember) => void;
  onToggleMemberActive: (member: AdminMember) => Promise<void>;
  onDeleteMember: (member: AdminMember) => Promise<void>;
  onCloseMenus: () => void;
};

export function AdminMembersTab({
  error,
  success,
  loading,
  memberSaving,
  memberCreateOpen,
  memberListOpen,
  members,
  membersQuery,
  memberForm,
  editingMemberId,
  expandedMemberIds,
  openMemberMenuId,
  onToggleMemberCreate,
  onToggleMemberList,
  onChangeMembersQuery,
  onSearchMembers,
  onMemberFormChange,
  onSaveMember,
  onCancelMemberEdit,
  onToggleMemberExpanded,
  onToggleMemberMenu,
  onStartEditMember,
  onToggleMemberActive,
  onDeleteMember,
  onCloseMenus,
}: AdminMembersTabProps) {
  return (
    <Screen title="Members" scroll={false}>
      {error ? <StatusBanner tone="error" message={error} /> : null}
      {success ? <StatusBanner tone="success" message={success} /> : null}
      {loading ? <ListSkeleton rows={8} /> : null}
      <View style={styles.interactionLayer}>
        <FlatList
          data={memberListOpen ? members : []}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          keyboardShouldPersistTaps="handled"
          onScrollBeginDrag={onCloseMenus}
          removeClippedSubviews={false}
          ListHeaderComponent={
            <>
              <Card>
                <Pressable style={styles.accordionHead} onPress={onToggleMemberCreate}>
                  <View style={styles.titleWithIcon}>
                    <MaterialCommunityIcons name="account-plus-outline" size={18} style={styles.sectionIcon} />
                    <Text style={styles.sectionTitle}>{memberCreateOpen ? "Hide Create Member" : "Create Member"}</Text>
                  </View>
                  <Text style={styles.accordionIcon}>{memberCreateOpen ? "-" : "+"}</Text>
                </Pressable>
                {memberCreateOpen ? (
                  <View>
                    <TextField label="Full Name" value={memberForm.fullName} onChangeText={(value) => onMemberFormChange({ ...memberForm, fullName: value })} placeholder="e.g. John Doe" />
                    <TextField label="Date of Birth (YYYY-MM-DD)" value={memberForm.dob} onChangeText={(value) => onMemberFormChange({ ...memberForm, dob: value })} placeholder="1990-12-31" />
                    <TextField label="Blood Type" value={memberForm.bloodType} onChangeText={(value) => onMemberFormChange({ ...memberForm, bloodType: value })} placeholder="O+" />
                    <TextField label="Email" value={memberForm.email} onChangeText={(value) => onMemberFormChange({ ...memberForm, email: value })} placeholder="name@example.com" />
                    <TextField label="Mobile Number" value={memberForm.mobileNumber} onChangeText={(value) => onMemberFormChange({ ...memberForm, mobileNumber: value })} placeholder="+62..." />
                    <TextField label="Address" value={memberForm.address} onChangeText={(value) => onMemberFormChange({ ...memberForm, address: value })} placeholder="Street, city" />
                    <View style={styles.inlineRow}>
                      <Pressable style={[styles.actionChip, memberForm.active && styles.actionChipActive]} onPress={() => onMemberFormChange({ ...memberForm, active: !memberForm.active })}>
                        <Text style={[styles.actionChipText, memberForm.active && styles.actionChipTextActive]}>{memberForm.active ? "Active" : "Inactive"}</Text>
                      </Pressable>
                      <Pressable style={styles.actionPrimary} onPress={() => void onSaveMember()} disabled={memberSaving}>
                        <Text style={styles.actionPrimaryText}>{memberSaving ? "Saving..." : editingMemberId ? "Update" : "Create"}</Text>
                      </Pressable>
                      {editingMemberId ? (
                        <Pressable style={styles.actionSecondary} onPress={onCancelMemberEdit}>
                          <Text style={styles.actionSecondaryText}>Cancel</Text>
                        </Pressable>
                      ) : null}
                    </View>
                  </View>
                ) : null}
              </Card>
              <Card>
                <Pressable style={styles.accordionHead} onPress={onToggleMemberList}>
                  <View style={styles.titleWithIcon}>
                    <MaterialCommunityIcons name="account-group-outline" size={18} style={styles.sectionIcon} />
                    <Text style={styles.sectionTitle}>{memberListOpen ? "Hide All Members" : "All Members"}</Text>
                  </View>
                  <Text style={styles.accordionIcon}>{memberListOpen ? "-" : "+"}</Text>
                </Pressable>
                {memberListOpen ? (
                  <View style={styles.searchRow}>
                    <TextInput
                      value={membersQuery}
                      onChangeText={onChangeMembersQuery}
                      placeholder="Search by name or code"
                      placeholderTextColor="#7a879a"
                      style={styles.searchInput}
                      returnKeyType="search"
                      onSubmitEditing={() => void onSearchMembers()}
                    />
                    <Pressable style={styles.searchButton} onPress={() => void onSearchMembers()}>
                      <Text style={styles.searchButtonText}>Search</Text>
                    </Pressable>
                  </View>
                ) : null}
              </Card>
            </>
          }
          ListEmptyComponent={memberListOpen ? <Text style={styles.meta}>No members found.</Text> : null}
          renderItem={({ item }) => (
            <View style={[styles.rowItem, openMemberMenuId === item.id && styles.rowItemOverlay]}>
              <View style={styles.rowHead}>
                <Pressable style={styles.rowMain} onPress={() => onToggleMemberExpanded(item.id)}>
                  <Text style={styles.titleStrong}>{item.fullName}</Text>
                  <View style={styles.rowSubtitleWithIcon}>
                    <MaterialCommunityIcons name="badge-account-horizontal-outline" size={14} style={styles.rowMetaIcon} />
                    <Text style={styles.rowSubtitleText}>Code: {item.memberCode}</Text>
                  </View>
                </Pressable>
                <View style={styles.rowActionsTop}>
                  <View style={[styles.rowBadge, item.active ? styles.badgeActive : styles.badgeNeutral]}>
                    <Text style={[styles.rowBadgeText, item.active ? styles.badgeActiveText : styles.badgeNeutralText]}>{item.active ? "ACTIVE" : "INACTIVE"}</Text>
                  </View>
                  <Pressable style={styles.moreButton} onPress={() => onToggleMemberMenu(item.id)}>
                    <Text style={styles.moreButtonText}>...</Text>
                  </Pressable>
                </View>
              </View>
              {openMemberMenuId === item.id ? (
                <View style={styles.menuPanelInline}>
                  <Pressable
                    style={styles.menuItem}
                    onPress={() => {
                      onToggleMemberExpanded(item.id);
                      onToggleMemberMenu(item.id);
                    }}
                  >
                    <View style={styles.menuItemRow}>
                      <MaterialCommunityIcons name={expandedMemberIds[item.id] ? "chevron-up" : "chevron-down"} size={14} style={styles.menuIcon} />
                      <Text style={styles.menuItemText}>{expandedMemberIds[item.id] ? "Hide Details" : "Show Details"}</Text>
                    </View>
                  </Pressable>
                  <Pressable
                    style={styles.menuItem}
                    onPress={() => {
                      onStartEditMember(item);
                      onToggleMemberMenu(item.id);
                    }}
                  >
                    <View style={styles.menuItemRow}>
                      <MaterialCommunityIcons name="pencil-outline" size={14} style={styles.menuIcon} />
                      <Text style={styles.menuItemText}>Edit</Text>
                    </View>
                  </Pressable>
                  <Pressable
                    style={styles.menuItem}
                    onPress={() => {
                      void onToggleMemberActive(item);
                      onToggleMemberMenu(item.id);
                    }}
                    disabled={memberSaving}
                  >
                    <View style={styles.menuItemRow}>
                      <MaterialCommunityIcons name={item.active ? "account-off-outline" : "account-check-outline"} size={14} style={styles.menuIcon} />
                      <Text style={styles.menuItemText}>{item.active ? "Deactivate" : "Activate"}</Text>
                    </View>
                  </Pressable>
                  <Pressable
                    style={styles.menuItem}
                    onPress={() => {
                      void onDeleteMember(item);
                      onToggleMemberMenu(item.id);
                    }}
                    disabled={memberSaving}
                  >
                    <View style={styles.menuItemRow}>
                      <MaterialCommunityIcons name="delete-outline" size={14} style={styles.menuIconDanger} />
                      <Text style={styles.menuItemDanger}>Delete</Text>
                    </View>
                  </Pressable>
                </View>
              ) : null}
              {expandedMemberIds[item.id] ? (
                <View style={styles.expandBody}>
                  <Text style={styles.meta}>Email: {item.email || "-"}</Text>
                  <Text style={styles.meta}>Mobile: {item.mobileNumber || "-"}</Text>
                  <Text style={styles.meta}>Blood: {item.bloodType || "-"}</Text>
                  <Text style={styles.meta}>DOB: {item.dob || "-"}</Text>
                  <Text style={styles.meta}>Address: {item.address || "-"}</Text>
                </View>
              ) : null}
            </View>
          )}
        />
      </View>
    </Screen>
  );
}
