import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  NativeModules,
  PermissionsAndroid,
  Platform,
  RefreshControl,
  StyleSheet,
  Text,
  View
} from 'react-native';

const VoiceMonitor = NativeModules.VoiceMonitorModule;

// Helper to map Android CallLog integer types to labels
const getTypeLabel = (type) => {
  switch (type) {
    case 1: return 'INCOMING';
    case 2: return 'OUTGOING';
    case 3: return 'MISSED';
    case 5: return 'REJECTED';
    case 6: return 'BLOCKED';
    default: return 'OTHER';
  }
};

export default function CallLogScreen() {
  const [callLogs, setCallLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);

  const fetchCallLogs = useCallback(async () => {
    if (!VoiceMonitor) {
      setError("Native Module 'VoiceMonitorModule' not found.");
      setLoading(false);
      return;
    }

    setError(null);

    try {
      if (Platform.OS === 'android') {
        const hasPermission = await PermissionsAndroid.check(
          PermissionsAndroid.PERMISSIONS.READ_CALL_LOG
        );

        if (!hasPermission) {
          const status = await PermissionsAndroid.request(
            PermissionsAndroid.PERMISSIONS.READ_CALL_LOG
          );
          if (status !== PermissionsAndroid.RESULTS.GRANTED) {
            setError("Call Log permission denied. Please enable it in Settings.");
            setLoading(false);
            return;
          }
        }
      }

      const logs = await VoiceMonitor.getCallLogs();
      
      // Process logs to include labels for easier UI rendering
      const processedLogs = (logs || []).map(log => ({
        ...log,
        typeLabel: getTypeLabel(log.type)
      }));

      // Sort by date (newest first)
      const sortedLogs = processedLogs.sort((a, b) => b.date - a.date);
      setCallLogs(sortedLogs);

    } catch (e) {
      console.error("Fetch Error:", e);
      setError(`Failed to fetch call logs: ${e.message}`);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchCallLogs();
  }, [fetchCallLogs]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchCallLogs();
  };

  const renderItem = ({ item }) => {
    const dateTime = new Date(item.date);
    const dateString = dateTime.toLocaleDateString();
    const timeString = dateTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    
    const duration = item.duration > 0 ? `${item.duration}s` : '—';
    
    // Style configuration based on processed label
    const typeLabel = item.typeLabel;
    const isNegative = typeLabel === 'MISSED' || typeLabel === 'REJECTED' || typeLabel === 'BLOCKED';
    
    const typeColor = 
      isNegative ? '#ea4335' : 
      typeLabel === 'INCOMING' ? '#fbbc05' : 
      '#34a853';

    const icon = 
      typeLabel === 'OUTGOING' ? '⬆️' : 
      typeLabel === 'INCOMING' ? '⬇️' : 
      '❌';

    return (
      <View style={styles.logItem}>
        <View style={styles.headerRow}>
          <Text style={styles.name}>{item.name || 'Unknown'}</Text>
          <Text style={styles.number}>{item.number}</Text>
        </View>
        <View style={styles.details}>
          <Text style={[styles.type, { color: typeColor }]}>{icon} {typeLabel}</Text>
          <Text style={styles.detailText}>Dur: {duration}</Text>
          <Text style={styles.detailText}>{dateString} {timeString}</Text>
        </View>
      </View>
    );
  };

  if (loading && !refreshing) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#1a73e8" />
        <Text style={{ marginTop: 10 }}>Loading call history...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>{error}</Text>
        <Text style={styles.retry} onPress={() => { setLoading(true); fetchCallLogs(); }}>Tap to Retry</Text>
      </View>
    );
  }

  return (
    <FlatList
      data={callLogs}
      renderItem={renderItem}
      keyExtractor={(item, index) => `${item.date}-${index}`}
      style={styles.list}
      contentContainerStyle={callLogs.length === 0 && { flex: 1 }}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#1a73e8']} />
      }
      ListEmptyComponent={
        <View style={styles.centered}>
          <Text style={styles.emptyText}>No call logs found.</Text>
        </View>
      }
    />
  );
}

const styles = StyleSheet.create({
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f0f2f5' },
  errorContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 },
  errorText: { color: '#ea4335', textAlign: 'center', fontWeight: 'bold', fontSize: 16 },
  retry: { marginTop: 15, color: '#1a73e8', textDecorationLine: 'underline' },
  list: { flex: 1, backgroundColor: '#f0f2f5' },
  emptyText: { color: '#888', fontSize: 16 },
  logItem: {
    backgroundColor: '#fff',
    padding: 15,
    marginVertical: 1,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  name: { fontSize: 16, fontWeight: 'bold', color: '#1c1e21' },
  number: { fontSize: 14, color: '#65676b' },
  details: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  type: { fontSize: 13, fontWeight: 'bold', minWidth: 90 },
  detailText: { fontSize: 12, color: '#65676b' }
});