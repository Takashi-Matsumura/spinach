import { useCallback, useEffect, useState } from "react";

interface MicrophoneDevice {
  deviceId: string;
  label: string;
  groupId: string;
}

export function useMicrophoneDevices() {
  const [devices, setDevices] = useState<MicrophoneDevice[]>([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState<string>("");
  const [permissionState, setPermissionState] = useState<"prompt" | "granted" | "denied">("prompt");
  const [audioLevel, setAudioLevel] = useState<number>(0);
  const [isTestingMic, setIsTestingMic] = useState(false);
  const [audioStream, setAudioStream] = useState<MediaStream | null>(null);

  // マイクデバイス一覧を取得
  const loadDevices = useCallback(async () => {
    try {
      const deviceList = await navigator.mediaDevices.enumerateDevices();
      const audioInputs = deviceList
        .filter((device) => device.kind === "audioinput")
        .map((device) => ({
          deviceId: device.deviceId,
          label: device.label || `マイク ${device.deviceId.slice(0, 8)}`,
          groupId: device.groupId,
        }));

      setDevices(audioInputs);

      // 保存された選択を復元
      const savedDeviceId = localStorage.getItem("selectedMicrophoneId");
      if (savedDeviceId && audioInputs.some((d) => d.deviceId === savedDeviceId)) {
        setSelectedDeviceId(savedDeviceId);
      } else if (audioInputs.length > 0) {
        setSelectedDeviceId(audioInputs[0].deviceId);
      }
    } catch (error) {
      console.error("Failed to enumerate devices:", error);
    }
  }, []);

  // マイク許可状態を確認
  const checkPermission = useCallback(async () => {
    try {
      const result = await navigator.permissions.query({ name: "microphone" as PermissionName });
      setPermissionState(result.state);

      result.addEventListener("change", () => {
        setPermissionState(result.state);
      });
    } catch (error) {
      console.error("Failed to check microphone permission:", error);
    }
  }, []);

  // マイク許可を要求
  const requestPermission = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.getTracks().forEach((track) => track.stop());
      setPermissionState("granted");
      await loadDevices();
      return true;
    } catch (error) {
      console.error("Failed to request microphone permission:", error);
      setPermissionState("denied");
      return false;
    }
  }, [loadDevices]);

  // デバイス選択
  const selectDevice = useCallback((deviceId: string) => {
    setSelectedDeviceId(deviceId);
    localStorage.setItem("selectedMicrophoneId", deviceId);
  }, []);

  // テスト録音開始
  const startTestRecording = useCallback(async () => {
    if (!selectedDeviceId) return;

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          deviceId: { exact: selectedDeviceId },
          echoCancellation: true,
          noiseSuppression: true,
        },
      });

      setAudioStream(stream);
      setIsTestingMic(true);

      // AudioContextで音量レベルを測定
      const audioContext = new AudioContext();
      const analyser = audioContext.createAnalyser();
      const microphone = audioContext.createMediaStreamSource(stream);
      const dataArray = new Uint8Array(analyser.frequencyBinCount);

      analyser.smoothingTimeConstant = 0.8;
      analyser.fftSize = 1024;
      microphone.connect(analyser);

      const updateLevel = () => {
        if (!stream.active) {
          audioContext.close();
          return;
        }

        analyser.getByteFrequencyData(dataArray);
        const average = dataArray.reduce((a, b) => a + b) / dataArray.length;
        const level = Math.min(100, (average / 255) * 100 * 3); // 3倍にして感度を上げる
        setAudioLevel(level);
        requestAnimationFrame(updateLevel);
      };

      updateLevel();
    } catch (error) {
      console.error("Failed to start test recording:", error);
      setIsTestingMic(false);
    }
  }, [selectedDeviceId]);

  // テスト録音停止
  const stopTestRecording = useCallback(() => {
    if (audioStream) {
      audioStream.getTracks().forEach((track) => track.stop());
      setAudioStream(null);
    }
    setIsTestingMic(false);
    setAudioLevel(0);
  }, [audioStream]);

  // 初期化
  useEffect(() => {
    checkPermission();
    loadDevices();

    // デバイス変更を監視
    navigator.mediaDevices.addEventListener("devicechange", loadDevices);
    return () => {
      navigator.mediaDevices.removeEventListener("devicechange", loadDevices);
      if (audioStream) {
        audioStream.getTracks().forEach((track) => track.stop());
      }
    };
  }, [checkPermission, loadDevices, audioStream]);

  return {
    devices,
    selectedDeviceId,
    permissionState,
    audioLevel,
    isTestingMic,
    selectDevice,
    requestPermission,
    startTestRecording,
    stopTestRecording,
  };
}
