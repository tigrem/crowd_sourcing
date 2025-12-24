import "@expo/metro-runtime";
import { registerRootComponent } from 'expo';
import { ExpoRoot } from 'expo-router';

// This function bridges the native "main" component to the Expo Router
export function App() {
  const ctx = require.context('./app');
  return <ExpoRoot context={ctx} />;
}

registerRootComponent(App);