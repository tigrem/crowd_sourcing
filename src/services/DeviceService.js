import * as Device from 'expo-device';
import * as Network from 'expo-network';
import { NativeModules } from 'react-native';


const { VoiceMonitorModule } = NativeModules;
export const getDeviceInfo = async () => {
    const networkState = await Network.getNetworkStateAsync();
    let nativeData = { operatorName: 'Unknown', signalStrength: 0 };

    try {
        // Calling the Kotlin code we just wrote
        nativeData = await VoiceMonitorModule.getNetworkDetailedInfo();
    } catch (e) {
        console.log("Native fetch failed, using fallback");
    }

    return {
        brand: Device.brand,
        modelName: Device.modelName,
        osVersion: Device.osVersion,
        // New Data
        operator: nativeData.operatorName,
        signal: nativeData.signalStrength + " dBm",
        netType: networkState.type,
        generation: await getNetworkGen(networkState)
    };
};

async function getNetworkGen(state) {
    if (state.type !== Network.NetworkStateType.CELLULAR) return 'WIFI';
    return "4G/LTE"; // You can expand this logic later
}


async function getNetworkGeneration(state) {
  if (state.type !== Network.NetworkStateType.CELLULAR) return 'N/A';
  // This is an estimation based on connection stability/type
  return "LTE/NR (4G/5G)"; 
}