import { FlatList, Text, View } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { Card } from "../../components/Card";
import { Screen } from "../../components/Screen";
import { StatusBanner } from "../../components/StatusBanner";
import type { AdminSessionDashboard } from "../../types/admin";
import { adminHomeStyles as styles } from "./adminHomeStyles";
import type { SessionGroup } from "./types";

type AdminHomeTabProps = {
  error: string;
  success: string;
  sessionsCount: number;
  membersCount: number;
  groupedCurrentSessions: SessionGroup[];
  groupedIncomingSessions: SessionGroup[];
  sessionMetrics: Record<string, AdminSessionDashboard>;
  formatRate: (value: number | undefined) => string;
  timeShort: (value: string) => string;
};

export function AdminHomeTab({
  error,
  success,
  sessionsCount,
  membersCount,
  groupedCurrentSessions,
  groupedIncomingSessions,
  sessionMetrics,
  formatRate,
  timeShort,
}: AdminHomeTabProps) {
  return (
    <Screen title="Home" scroll={false}>
      {error ? <StatusBanner tone="error" message={error} /> : null}
      {success ? <StatusBanner tone="success" message={success} /> : null}
      <FlatList
        data={[]}
        keyExtractor={(_, index) => `home-${index}`}
        contentContainerStyle={styles.listContent}
        ListHeaderComponent={
          <>
            <Card>
              <View style={styles.titleWithIcon}>
                <MaterialCommunityIcons name="view-dashboard-outline" size={18} style={styles.sectionIcon} />
                <Text style={styles.sectionTitle}>Quick Summary</Text>
              </View>
              <View style={styles.summaryRow}>
                <View style={styles.summaryChip}>
                  <MaterialCommunityIcons name="calendar-multiple" size={16} style={styles.summaryIcon} />
                  <Text style={styles.summaryLabel}>Sessions</Text>
                  <Text style={styles.summaryValue}>{sessionsCount}</Text>
                </View>
                <View style={styles.summaryChip}>
                  <MaterialCommunityIcons name="account-group-outline" size={16} style={styles.summaryIcon} />
                  <Text style={styles.summaryLabel}>Members</Text>
                  <Text style={styles.summaryValue}>{membersCount}</Text>
                </View>
                <View style={styles.summaryChip}>
                  <MaterialCommunityIcons name="play-circle-outline" size={16} style={styles.summaryIcon} />
                  <Text style={styles.summaryLabel}>Active Now</Text>
                  <Text style={styles.summaryValue}>{groupedCurrentSessions.reduce((sum, group) => sum + group.items.length, 0)}</Text>
                </View>
              </View>
            </Card>
            <Card>
              <View style={styles.titleWithIcon}>
                <MaterialCommunityIcons name="clock-outline" size={18} style={styles.sectionIcon} />
                <Text style={styles.sectionTitle}>Current Session</Text>
              </View>
              {!groupedCurrentSessions.length ? <Text style={styles.metaMuted}>No active session right now.</Text> : null}
              {groupedCurrentSessions.map((group) => (
                <View key={group.key} style={styles.currentSessionPanel}>
                  <View style={styles.incomingHead}>
                    <Text style={styles.currentSessionTitle}>{group.label}</Text>
                    <Text style={styles.currentSessionTime}>
                      {timeShort(group.timeStart)} - {timeShort(group.timeEnd)}
                    </Text>
                  </View>
                  {group.items.map((item) => (
                    <View key={item.id} style={styles.incomingRow}>
                      <View style={[styles.typeDot, item.mandatory ? styles.typeDotMandatory : styles.typeDotOptional]} />
                      <Text style={styles.incomingEvent}>{item.eventName}</Text>
                    </View>
                  ))}
                  <View style={styles.currentSessionMetrics}>
                    <View style={styles.currentSessionMetricCard}>
                      <Text style={styles.currentSessionMetricLabel}>Check-ins</Text>
                      <Text style={styles.currentSessionMetricValue}>
                        {group.items.reduce((sum, item) => sum + (sessionMetrics[item.id]?.totalCheckIns ?? 0), 0)}
                      </Text>
                    </View>
                    <View style={styles.currentSessionMetricCard}>
                      <Text style={styles.currentSessionMetricLabel}>Rate</Text>
                      <Text style={styles.currentSessionMetricValue}>
                        {formatRate(group.items.reduce((sum, item) => sum + (sessionMetrics[item.id]?.checkInRatePercent ?? 0), 0) / Math.max(1, group.items.length))}
                      </Text>
                    </View>
                  </View>
                </View>
              ))}
            </Card>
            <Card>
              <View style={styles.titleWithIcon}>
                <MaterialCommunityIcons name="calendar-arrow-right" size={18} style={styles.sectionIcon} />
                <Text style={styles.sectionTitle}>Incoming Sessions</Text>
              </View>
              {!groupedIncomingSessions.length ? <Text style={styles.metaMuted}>No incoming session scheduled.</Text> : null}
              {groupedIncomingSessions.map((group) => (
                <View key={group.key} style={styles.incomingItem}>
                  <View style={styles.incomingHead}>
                    <Text style={styles.incomingTitle}>{group.label}</Text>
                    <Text style={styles.incomingRange}>
                      {timeShort(group.timeStart)} - {timeShort(group.timeEnd)}
                    </Text>
                  </View>
                  {group.items.map((item) => (
                    <View key={item.id} style={styles.incomingRow}>
                      <View style={[styles.typeDot, item.mandatory ? styles.typeDotMandatory : styles.typeDotOptional]} />
                      <Text style={styles.incomingEvent}>{item.eventName}</Text>
                    </View>
                  ))}
                </View>
              ))}
            </Card>
          </>
        }
        ListEmptyComponent={null}
        renderItem={() => null}
      />
    </Screen>
  );
}
