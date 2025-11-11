"use client";

import { FaCheckCircle, FaMicrophone, FaPlay, FaStop, FaTimes } from "react-icons/fa";
import { useMicrophoneDevices } from "../hooks/useMicrophoneDevices";

export function MicrophoneSettings() {
  const {
    devices,
    selectedDeviceId,
    permissionState,
    audioLevel,
    isTestingMic,
    selectDevice,
    requestPermission,
    startTestRecording,
    stopTestRecording,
  } = useMicrophoneDevices();

  return (
    <div className="space-y-6">
      {/* マイク許可状態 */}
      <div className="border border-gray-200 rounded-lg p-4">
        <h3 className="text-sm font-semibold text-gray-900 mb-3">マイク許可状態</h3>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {permissionState === "granted" ? (
              <>
                <FaCheckCircle className="text-green-600" />
                <span className="text-sm text-gray-700">許可済み</span>
              </>
            ) : permissionState === "denied" ? (
              <>
                <FaTimes className="text-red-600" />
                <span className="text-sm text-gray-700">拒否されています</span>
              </>
            ) : (
              <>
                <FaMicrophone className="text-gray-400" />
                <span className="text-sm text-gray-700">未確認</span>
              </>
            )}
          </div>
          {permissionState !== "granted" && (
            <button
              type="button"
              onClick={requestPermission}
              className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
            >
              許可を要求
            </button>
          )}
        </div>
        {permissionState === "denied" && (
          <p className="text-xs text-red-600 mt-2">
            ブラウザの設定からマイクの許可を有効にしてください
          </p>
        )}
      </div>

      {/* マイクデバイス選択 */}
      {permissionState === "granted" && (
        <div className="border border-gray-200 rounded-lg p-4">
          <h3 className="text-sm font-semibold text-gray-900 mb-3">使用するマイク</h3>
          <select
            value={selectedDeviceId}
            onChange={(e) => selectDevice(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-700 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            disabled={devices.length === 0}
          >
            {devices.length === 0 ? (
              <option value="">マイクが見つかりません</option>
            ) : (
              devices.map((device) => (
                <option key={device.deviceId} value={device.deviceId}>
                  {device.label}
                </option>
              ))
            )}
          </select>
          <p className="text-xs text-gray-500 mt-2">
            {devices.length}個のマイクが検出されました
          </p>
        </div>
      )}

      {/* テスト録音 */}
      {permissionState === "granted" && selectedDeviceId && (
        <div className="border border-gray-200 rounded-lg p-4">
          <h3 className="text-sm font-semibold text-gray-900 mb-3">マイクテスト</h3>
          <div className="space-y-3">
            {!isTestingMic ? (
              <button
                type="button"
                onClick={startTestRecording}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 text-sm font-semibold rounded-lg bg-gray-800 text-white hover:bg-gray-900 transition-colors"
              >
                <FaPlay />
                テスト開始
              </button>
            ) : (
              <button
                type="button"
                onClick={stopTestRecording}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 text-sm font-semibold rounded-lg bg-gray-500 text-white hover:bg-gray-600 transition-colors"
              >
                <FaStop />
                停止
              </button>
            )}

            {/* 音量レベル表示 */}
            {isTestingMic && (
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs text-gray-600">
                  <span>音量レベル</span>
                  <span>{Math.round(audioLevel)}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-4 overflow-hidden">
                  <div
                    className={`h-full transition-all duration-100 ${
                      audioLevel > 70
                        ? "bg-green-500"
                        : audioLevel > 30
                          ? "bg-yellow-500"
                          : "bg-gray-400"
                    }`}
                    style={{ width: `${Math.min(100, audioLevel)}%` }}
                  />
                </div>
                <p className="text-xs text-gray-500">
                  マイクに向かって話してください。音量レベルが変化すれば正常に動作しています。
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 説明 */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h4 className="text-sm font-semibold text-blue-900 mb-2">💡 ヒント</h4>
        <ul className="text-xs text-blue-800 space-y-1">
          <li>• Bluetoothマイクを使用する場合は、事前にデバイスとペアリングしてください</li>
          <li>• マイクを変更した場合は、テスト録音で動作を確認してください</li>
          <li>• PWAとしてインストールした場合も、この設定画面からマイクを管理できます</li>
        </ul>
      </div>
    </div>
  );
}
