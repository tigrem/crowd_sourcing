import { useIsFocused } from '@react-navigation/native';
import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  NativeEventEmitter,
  NativeModules,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from 'react-native';

const VoiceMonitor = NativeModules.VoiceMonitorModule;
const eventEmitter = new NativeEventEmitter(VoiceMonitor);

export default function QoEMonitorScreen() {
  const isFocused = useIsFocused();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    attempts: 0,
    setupOK: 0,
    completed: 0,
    dropped: 0,
    lastVcst: 0,
    currentState: 'IDLE',
    history: []
  });

  const syncStats = useCallback(async () => {
    try {
      if (VoiceMonitor?.getStats) {
        const data = await VoiceMonitor.getStats();
        setStats(data);
      }
    } catch (e) {
      console.error("Sync Error:", e);
    } finally {
      setLoading(false);
    }
  }, []);

  // Sync when screen gains focus (Handles minimized -> open state)
  useEffect(() => {
    if (isFocused) {
      syncStats();
    }
  }, [isFocused, syncStats]);

  // Listen for real-time events while the app IS open
  useEffect(() => {
    const stateSub = eventEmitter.addListener('STATE_CHANGE', syncStats);
    const qoeSub = eventEmitter.addListener('QOE_METRIC', syncStats);
    return () => {
      stateSub.remove();
      qoeSub.remove();
    };
  }, [syncStats]);

  const handleClearStats = () => {
    Alert.alert(
      "Reset Statistics",
      "Clear all call metrics and history?",
      [
        { text: "Cancel", style: "cancel" },
        { 
          text: "Clear All", 
          style: "destructive", 
          onPress: async () => {
            if (VoiceMonitor?.clearStats) {
              await VoiceMonitor.clearStats();
              syncStats();
            }
          } 
        }
      ]
    );
  };

  if (loading) {
      return (
          <View style={styles.centered}>
              <ActivityIndicator size="large" color="#1a73e8" />
          </View>
      );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 40 }}>
      <View style={styles.card}>
        <Text style={styles.label}>
          Connection State: <Text style={styles.stateValue}>{stats.currentState}</Text>
        </Text>
        
        <View style={styles.grid}>
          <MetricBox label="Attempts" value={stats.attempts} />
          <MetricBox label="Setup OK" value={stats.setupOK} />
          <MetricBox label="Completed" value={stats.completed} color="#34a853" />
          <MetricBox label="Dropped" value={stats.dropped} color="#ea4335" />
        </View>
        
        <View style={styles.vcstContainer}>
          <Text style={styles.vcstLabel}>Last Setup Time</Text>
          <Text style={styles.vcstValue}>{stats.lastVcst > 0 ? `${stats.lastVcst} ms` : 'N/A'}</Text>
        </View>
      </View>

      <View style={styles.card}>
        <Text style={styles.header}>Call State History</Text>
        <View style={styles.historyList}>
          {stats.history && stats.history.length > 0 ? (
            [...stats.history].reverse().map((item, i) => (
              <View key={i} style={styles.historyItem}>
                <Text style={styles.historyText}>• {item}</Text>
              </View>
            ))
          ) : (
            <Text style={styles.emptyText}>No events recorded.</Text>
          )}
        </View>
      </View>

      <TouchableOpacity style={styles.clearButton} onPress={handleClearStats}>
        <Text style={styles.clearButtonText}>RESET ALL KPI DATA</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const MetricBox = ({ label, value, color = '#1c1e21' }) => (
  <View style={styles.box}>
    <Text style={styles.boxLabel}>{label}</Text>
    <Text style={[styles.boxValue, { color }]}>{value}</Text>
  </View>
);

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f0f2f5', padding: 15 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  card: { backgroundColor: '#fff', padding: 20, borderRadius: 16, marginBottom: 15, elevation: 4 },
  header: { fontSize: 18, fontWeight: 'bold', color: '#1c1e21', marginBottom: 15 },
  label: { fontSize: 14, color: '#65676b' },
  stateValue: { color: '#1a73e8', fontWeight: 'bold', fontSize: 16 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', marginTop: 20 },
  box: { width: '48%', marginBottom: 12, alignItems: 'center', paddingVertical: 15, backgroundColor: '#f8f9fa', borderRadius: 12 },
  boxLabel: { fontSize: 11, color: '#65676b', textTransform: 'uppercase' },
  boxValue: { fontSize: 24, fontWeight: 'bold', marginTop: 5 },
  vcstContainer: { borderTopWidth: 1, borderTopColor: '#f0f0f0', marginTop: 10, paddingTop: 15, alignItems: 'center' },
  vcstLabel: { fontSize: 12, color: '#65676b' },
  vcstValue: { fontSize: 18, fontWeight: 'bold', color: '#34a853' },
  historyItem: { paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#f9f9f9' },
  historyText: { fontSize: 13, color: '#444', fontFamily: Platform.OS === 'android' ? 'monospace' : 'Courier' },
  emptyText: { textAlign: 'center', color: '#999', marginVertical: 20 },
  clearButton: { backgroundColor: '#fff', borderWidth: 2, borderColor: '#ea4335', padding: 16, borderRadius: 12, alignItems: 'center', marginTop: 10 },
  clearButtonText: { color: '#ea4335', fontWeight: 'bold' }
});