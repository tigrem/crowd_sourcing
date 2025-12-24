
export const BROWSING_URLS = [
  { name: 'Google', url: 'https://www.google.com' },
  { name: 'Wikipedia', url: 'https://www.wikipedia.org' },
  { name: 'Bing', url: 'https://www.bing.com' },
  { name: 'Yahoo', url: 'https://www.yahoo.com'}
];
export const SOCIAL_URLS = [// A public page, less likely to reset
  { name: 'LinkedIn', url: 'https://www.linkedin.com/feed/' },
  { name: 'Instagram', url: 'https://www.instagram.com/explore/' }
];
export const VIDEO_URL = 'https://raw.githubusercontent.com/intel-iot-devkit/sample-videos/master/bolt-detection.mp4';
//export const HTTP_FILE_URL = 'https://ipv4.download.thinkbroadband.com/10MB.zip'; 
export const DOWNLOAD_TEST_URLS = [
  'https://www.google.com/images/branding/googlelogo/2x/googlelogo_color_272x92dp.png',
  'https://www.google.com/favicon.ico',
  'https://httpbin.org/image/png'
];
export const getKpiScript = `
  (function() {
    const t = performance.timing;
    if (t.loadEventEnd > 0) {
      window.ReactNativeWebView.postMessage(JSON.stringify({
        dnsTime: Math.max(0, t.domainLookupEnd - t.domainLookupStart),
        pageLoadTime: t.loadEventEnd - t.navigationStart,
        throughput: Math.round((2000 * 8) / ((t.loadEventEnd - t.navigationStart) / 1000 || 1))
      }));
    }
  })();
`;
export const runFullFileTest = async () => {
  let response = null;
  let lastError = null;
  const testStartTime = Date.now();

  try {
    // 1. Fallback Logic: Loop through reliable URLs until one works [cite: 284-305]
    for (const url of DOWNLOAD_TEST_URLS) {
      try {
        const controller = new AbortController(); 
        const timeoutId = setTimeout(() => controller.abort(), 15000); // 15s timeout [cite: 287]

        response = await fetch(url, {
          method: 'GET',
          cache: 'no-cache', 
          signal: controller.signal, 
        });
        
        clearTimeout(timeoutId);

        if (response.ok) { 
          break; // Success, exit the loop [cite: 295]
        } else {
          throw new Error(`HTTP ${response.status}`); 
        }
      } catch (err) {
        lastError = err;
        console.log(`[QoE] Attempt failed for ${url}, trying next...`); 
        response = null; 
        continue; 
      }
    }

    if (!response || !response.ok) {
      throw lastError || new Error('All download URLs failed');
    }

    // 2. Performance Measurement: Use blob size and time [cite: 311-314]
    const downloadStart = Date.now(); 
    const blob = await response.blob(); 
    const downloadTime = Date.now() - downloadStart; 
    const totalTime = Date.now() - testStartTime; 

    // Use total time as a safety fallback for very fast downloads [cite: 319]
    const effectiveTime = Math.max(downloadTime, totalTime, 1);
    const sizeBytes = blob.size;

    // 3. Throughput Calculation (Kbps) [cite: 320-321]
    // Formula: (Bytes * 8 bits * 1000ms) / effectiveTimeMs / 1000 = Kbps
    const throughputKbps = sizeBytes > 0 && effectiveTime > 0
      ? Math.round((sizeBytes * 8 * 1000) / effectiveTime / 1000)
      : 0;

    return {
      success: true,
      dlThroughput: throughputKbps,
      transferTime: (totalTime / 1000).toFixed(2),
      actualSize: sizeBytes > 1024 * 1024 
        ? (sizeBytes / (1024 * 1024)).toFixed(2) + " MB" 
        : (sizeBytes / 1024).toFixed(2) + " KB"
    };
  } catch (e) {
    console.error("[QoE] File Test Error:", e);
    return { success: false };
  }
};
// export const runFullFileTest = async () => {
//   const fileUri = FileSystem.documentDirectory + 'test.zip';
//   try {
//     const start = Date.now();
//     const result = await FileSystem.downloadAsync(HTTP_FILE_URL, fileUri);
//     const end = Date.now();
    
//     if (result.status === 200) {
//       const duration = (end - start) / 1000;
//       const fileInfo = await FileSystem.getInfoAsync(result.uri);
//       const throughputKbps = Math.round(((fileInfo.size * 8) / duration) / 1000);
//       return {
//         success: true,
//         dlThroughput: throughputKbps,
//         transferTime: duration.toFixed(2),
//         actualSize: (fileInfo.size / (1024 * 1024)).toFixed(2) + " MB"
//       };
//     }
//     return { success: false };
//   } catch (e) {
//     return { success: false };
//   }
// };