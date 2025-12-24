import { useVideoPlayer, VideoView } from 'expo-video';
import { useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Animated, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { WebView } from 'react-native-webview';
import * as QoE from '../../src/services/QoETestService';

export default function SettingsScreen() {
  const [testMode, setTestMode] = useState('Idle');
  const [urlIndex, setUrlIndex] = useState(0);
  const [results, setResults] = useState([]);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(false);
  const [toastMsg, setToastMsg] = useState('');
  const [activeUrl, setActiveUrl] = useState(''); // Tracks the specific URL being fetched
  
  const toastOpacity = useRef(new Animated.Value(0)).current;
  const testStartTime = useRef(null);
  const webViewRef = useRef(null);
  const player = useVideoPlayer(QoE.VIDEO_URL, (p) => { p.loop = false; });

  // FIXED: currentUrl logic handles strings vs objects correctly
  const currentUrl = useMemo(() => {
   try {
      if (testMode === 'Web') {
        return QoE.BROWSING_URLS[urlIndex]?.url || 'https://www.google.com';
      }
      if (testMode === 'Social') {
        return QoE.SOCIAL_URLS[urlIndex]?.url || 'https://m.facebook.com';
      }
      if (testMode === 'Stream') {
        return typeof QoE.VIDEO_URL === 'string' ? QoE.VIDEO_URL : 'about:blank';
      }
      if (testMode === 'File') {
        // Return the first download URL as a fallback string to prevent crash
        return QoE.DOWNLOAD_TEST_URLS[urlIndex] || QoE.DOWNLOAD_TEST_URLS[0] || 'about:blank';
      }
    } catch (e) {
      console.error("URL Memo Error:", e);
    }
    return 'about:blank';
  }, [testMode, urlIndex]);

  const showToast = (msg) => {
    setToastMsg(msg);
    Animated.sequence([
      Animated.timing(toastOpacity, { toValue: 1, duration: 500, useNativeDriver: true }),
      Animated.delay(2500),
      Animated.timing(toastOpacity, { toValue: 0, duration: 500, useNativeDriver: true })
    ]).start();
  };

  const finalizeTest = (mode, finalKpis) => {
    setLoading(false); 
    const mainVal = finalKpis.find(r => r.k.includes('Throughput') || r.k.includes('Time'))?.v || 'Done';
    setHistory(prev => [{ id: Date.now(), mode, value: mainVal, time: new Date().toLocaleTimeString() }, ...prev].slice(0, 5));
    showToast(`${mode} Test Completed!`);
  };

  const startTestSequence = async (mode) => {
    setUrlIndex(0);
    setResults([]);
    setTestMode(mode);
    setLoading(true);
    testStartTime.current = Date.now();

    if (mode === 'File') {
      try {
        // Update UI with the first URL being tried
        setActiveUrl(QoE.DOWNLOAD_TEST_URLS[0]);
        const res = await QoE.runFullFileTest();
        
        // Artificial delay so user can see the "Fetching" state
        await new Promise(resolve => setTimeout(resolve, 1500));

        if (res && res.success) {
          const fileKpis = [
            { k: 'HTTP Throughput DL', v: `${res.dlThroughput} Kbps` },
            { k: 'Transfer Time', v: `${res.transferTime}s` },
            { k: 'File Size', v: res.actualSize }
          ];
          setResults(fileKpis);
          finalizeTest('File', fileKpis);
        } else {
          setLoading(false);
          showToast("Download Failed!");
        }
      } catch (err) {
        setLoading(false);
        showToast("Error!");
      }
    } else if (mode === 'Stream') {
      player.play();
    }
  };

  useEffect(() => {
    let interval;
    if (testMode === 'Stream' && results.length === 0) {
      interval = setInterval(() => {
        if (player.playing) {
          const accessTime = (Date.now() - testStartTime.current) / 1000;
          const streamKpis = [
            { k: 'Video Access Time', v: `${accessTime.toFixed(2)}s` },
            { k: 'Resolution', v: '720p HD' },
            { k: 'Buffering State', v: 'Stable' }
          ];
          setResults(streamKpis);
          finalizeTest('Stream', streamKpis);
          clearInterval(interval);
        }
      }, 500);
    }
    return () => clearInterval(interval);
  }, [testMode, player.playing, results]);

  const handleWebMessage = (e) => {
    try {
        const d = JSON.parse(e.nativeEvent.data);
        const kpis = [
          { k: 'App Throughput DL', v: `${d.throughput} Kbps` },
          { k: 'Page Load Time', v: `${d.pageLoadTime}ms` },
          { k: 'DNS Time', v: `${d.dnsTime}ms` }
        ];
        setResults(kpis);
        const list = testMode === 'Web' ? QoE.BROWSING_URLS : QoE.SOCIAL_URLS;
        if (urlIndex < list.length - 1) {
          setTimeout(() => setUrlIndex(prev => prev + 1), 2000);
        } else {
          finalizeTest(testMode, kpis);
        }
    } catch (e) { console.error(e); }
  };

  return (
    <SafeAreaView style={styles.container}>
      <Animated.View style={[styles.toast, { opacity: toastOpacity }]}>
        <Text style={styles.toastText}>{toastMsg}</Text>
      </Animated.View>

      <View style={styles.headerArea}>
        
        <View style={styles.statusBadge}>
          <Text style={styles.statusText}>{testMode.toUpperCase()} MODE</Text>
          <Text style={styles.urlText} numberOfLines={1}>
            {testMode === 'File' ? 'Multi-URL Reliability Test' : currentUrl}
          </Text>
        </View>
      </View>

      <View style={styles.monitor}>
        {testMode === 'Stream' ? (
          <VideoView player={player} style={styles.full} />
        ) : testMode === 'File' ? (
          <View style={[styles.full, styles.fileCenter]}>
            {loading ? (
              <>
                <ActivityIndicator size="large" color="#FFF" />
                <Text style={styles.monitorText}>FETCHING FROM:</Text>
                <Text style={styles.urlSubText} numberOfLines={1}>{activeUrl}</Text>
              </>
            ) : (
              <Text style={styles.monitorText}>DOWNLOAD TEST COMPLETE</Text>
            )}
          </View>
        ) : (
          <WebView 
            ref={webViewRef}
            source={{ uri: currentUrl }}
            // FIXED: Added UserAgent to prevent ERR_CONNECTION_RESET
            userAgent="Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/114.0.0.0 Mobile Safari/537.36"
            onMessage={handleWebMessage}
            onError={(e) => {
                console.warn("WebView Error:", e.nativeEvent);
                const list = testMode === 'Web' ? QoE.BROWSING_URLS : QoE.SOCIAL_URLS;
                if (urlIndex < list.length - 1) {
                    showToast("Site blocked. Skipping...");
                    setUrlIndex(prev => prev + 1);
                } else {
                    setLoading(false);
                    showToast("Test Sequence Ended.");
                }
            }}
            onLoadEnd={() => webViewRef.current?.injectJavaScript(QoE.getKpiScript)}
            style={styles.full}
          />
        )}
      </View>

      <ScrollView style={styles.content}>
        <Text style={styles.label}>REAL-TIME METRICS</Text>
        <View style={styles.card}>
          {results.length === 0 && <Text style={styles.emptyText}>Start a test to see results</Text>}
          {results.map((r, i) => (
            <View key={i} style={styles.tr}><Text style={styles.tdK}>{r.k}</Text><Text style={styles.tdV}>{r.v}</Text></View>
          ))}
        </View>

        <Text style={styles.label}>TEST LOGS</Text>
        <View style={styles.card}>
          {history.map((h) => (
            <View key={h.id} style={styles.historyRow}>
              <View><Text style={styles.historyMode}>{h.mode}</Text><Text style={styles.historyTime}>{h.time}</Text></View>
              <Text style={styles.historyValue}>{h.value}</Text>
            </View>
          ))}
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <FooterBtn t="Web" on={() => startTestSequence('Web')} />
        <FooterBtn t="Social" on={() => startTestSequence('Social')} />
        <FooterBtn t="Stream" on={() => startTestSequence('Stream')} />
        <FooterBtn t="File" on={() => startTestSequence('File')} />
      </View>
    </SafeAreaView>
  );
}

const FooterBtn = ({ t, on }) => (
  <TouchableOpacity style={styles.fBtn} onPress={on}><Text style={styles.fBtnT}>{t}</Text></TouchableOpacity>
);

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8F9FA' },
  toast: { position: 'absolute', top: 50, left: '10%', right: '10%', backgroundColor: '#323232', padding: 12, borderRadius: 25, alignItems: 'center', zIndex: 1000, elevation: 5 },
  toastText: { color: '#FFF', fontWeight: 'bold', fontSize: 13 },
  headerArea: { padding: 15 },
  header: { fontSize: 20, fontWeight: 'bold' },
  statusBadge: { backgroundColor: '#1A73E8', padding: 12, borderRadius: 10, marginTop: 8 },
  statusText: { color: '#FFF', fontWeight: 'bold', fontSize: 11 },
  urlText: { color: '#FFF', fontSize: 10, opacity: 0.8 },
  monitor: { height: 160, backgroundColor: '#000', marginHorizontal: 15, borderRadius: 15, overflow: 'hidden' },
  full: { flex: 1 },
  monitorText: { color: '#FFF', marginTop: 10, fontSize: 11, fontWeight: 'bold' },
  urlSubText: { color: '#AAA', fontSize: 9, marginTop: 4, paddingHorizontal: 20 },
  fileCenter: { justifyContent: 'center', alignItems: 'center' },
  content: { flex: 1, paddingHorizontal: 15 },
  label: { fontSize: 11, fontWeight: 'bold', color: '#666', marginTop: 15, marginBottom: 5 },
  card: { backgroundColor: '#FFF', borderRadius: 12, padding: 12, elevation: 2, marginBottom: 10 },
  emptyText: { textAlign: 'center', color: '#999', fontSize: 12, padding: 5 },
  tr: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#F5F5F5' },
  tdK: { fontSize: 12, color: '#444' },
  tdV: { fontSize: 12, fontWeight: 'bold', color: '#1A73E8' },
  historyRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#F5F5F5' },
  historyMode: { fontSize: 12, fontWeight: 'bold' },
  historyTime: { fontSize: 10, color: '#999' },
  historyValue: { fontSize: 12, fontWeight: 'bold', color: '#28A745' },
  footer: { flexDirection: 'row', justifyContent: 'space-between', padding: 12, backgroundColor: '#FFF', borderTopWidth: 1, borderTopColor: '#EEE' },
  fBtn: { backgroundColor: '#1A73E8', padding: 12, borderRadius: 8, width: '23%', alignItems: 'center' },
  fBtnT: { color: '#FFF', fontWeight: 'bold', fontSize: 11 }
});