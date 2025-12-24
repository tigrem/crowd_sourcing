import { Stack } from 'expo-router';
import { useEffect } from 'react';
import { NativeEventEmitter, NativeModules, PermissionsAndroid, Platform } from 'react-native';

const { VoiceMonitorModule } = NativeModules;
const eventEmitter = new NativeEventEmitter(VoiceMonitorModule);

export default function RootLayout() {

  useEffect(() => {
    const startMonitoringWithPermissions = async () => {
      if (Platform.OS === 'android' && VoiceMonitorModule) {
        try {
          // Define permissions needed for Call Monitoring & Background Service
          const permissions = [
            PermissionsAndroid.PERMISSIONS.READ_PHONE_STATE,
            PermissionsAndroid.PERMISSIONS.READ_CALL_LOG,
          ];

          // Android 13+ (API 33) requires explicit notification permission for Foreground Services
          if (Platform.Version >= 33) {
            permissions.push(PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS);
          }

          // Request permissions from user
          const granted = await PermissionsAndroid.requestMultiple(permissions);

          // Check if the critical READ_PHONE_STATE was granted
          const isPhoneStateGranted = 
            granted[PermissionsAndroid.PERMISSIONS.READ_PHONE_STATE] === PermissionsAndroid.RESULTS.GRANTED;

          if (isPhoneStateGranted) {
            VoiceMonitorModule.startMonitoring();
            console.log("Native Monitoring Started successfully");
          } else {
            console.warn("Monitoring NOT started: READ_PHONE_STATE permission denied.");
          }

        } catch (e) {
          console.error("Failed to start native monitoring:", e);
        }
      }
    };

    // Initialize monitoring
    startMonitoringWithPermissions();

    // Set up Listeners for real-time UI updates
    const qoeListener = eventEmitter.addListener('QOE_METRIC', (data) => {
      console.log("New QoE Metric Received:", data);
    });

    const stateListener = eventEmitter.addListener('STATE_CHANGE', (data) => {
      console.log("Call State Changed:", data.state);
    });

    return () => {
      qoeListener.remove();
      stateListener.remove();
    };
  }, []);

  // Use Stack, hiding the header so the (tabs)/_layout can manage its own headers
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(tabs)" />
    </Stack>
  );
}