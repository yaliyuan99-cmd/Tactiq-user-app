import { INSECURE_CONTEXT_REASON, WEB_BLUETOOTH_UNAVAILABLE_REASON } from '@/services/device/capabilities';
import { bluetoothCheckText, speechCheckText, vibrationCheckText } from './browserChecks';

describe('browser checks', () => {
  it('reports the capability reason when Bluetooth cannot be used', () => {
    expect(bluetoothCheckText({ webBluetooth: false, secureContext: true, reason: WEB_BLUETOOTH_UNAVAILABLE_REASON })).toBe(
      WEB_BLUETOOTH_UNAVAILABLE_REASON,
    );
    expect(bluetoothCheckText({ webBluetooth: false, secureContext: false, reason: INSECURE_CONTEXT_REASON })).toBe(
      INSECURE_CONTEXT_REASON,
    );
  });

  it('says when Web Bluetooth is available', () => {
    expect(bluetoothCheckText({ webBluetooth: true, secureContext: true, reason: null })).toBe(
      'Web Bluetooth is available on this secure page.',
    );
  });

  it('describes speech and vibration support without overclaiming', () => {
    expect(speechCheckText(true)).toMatch(/offers speech/);
    expect(speechCheckText(false)).toMatch(/screen reader still reads every announcement/);
    expect(vibrationCheckText(true)).toMatch(/also needs a vibration motor/);
    expect(vibrationCheckText(false)).toMatch(/shown on screen and announced/);
  });
});
