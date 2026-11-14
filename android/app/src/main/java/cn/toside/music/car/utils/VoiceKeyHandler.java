package cn.toside.music.car.utils;

import java.util.HashMap;
import java.util.Map;

/** Press ownership is independent of Android so release/repeat handling can be tested on the JVM. */
public final class VoiceKeyHandler {
  public enum Action { PASS, CONSUME, TRIGGER }

  private static final int ACTION_DOWN = 0;
  private static final int ACTION_UP = 1;
  // CarPlayHostActivity's window route: Android VOICE_ASSIST and BYD short/long voice keys.
  private static final int KEYCODE_VOICE_ASSIST = 231;
  private static final int KEYCODE_BYD_VOICE = 304;
  private static final int KEYCODE_BYD_VOICE_LONG = 312;

  private static final class Press {
    final int generation;
    final long downTime;

    Press(int generation, long downTime) {
      this.generation = generation;
      this.downTime = downTime;
    }
  }

  private final Map<String, Press> presses = new HashMap<>();
  private boolean enabled;
  private int generation;

  public static boolean isVoiceKey(int keyCode) {
    return keyCode == KEYCODE_VOICE_ASSIST || keyCode == KEYCODE_BYD_VOICE || keyCode == KEYCODE_BYD_VOICE_LONG;
  }

  public void setEnabled(boolean enabled) {
    if (this.enabled == enabled) return;
    this.enabled = enabled;
    ++generation;
  }

  public void clear() {
    setEnabled(false);
    presses.clear();
  }

  public Action dispatch(int deviceId, int keyCode, int scanCode, int action, int repeatCount, long downTime, boolean cancelled) {
    if (!isVoiceKey(keyCode) || (action != ACTION_DOWN && action != ACTION_UP)) return Action.PASS;
    String physicalKey = deviceId + ":" + keyCode + ":" + scanCode;
    Press press = presses.get(physicalKey);
    if (action == ACTION_DOWN) {
      if (press != null && (repeatCount > 0 || press.downTime == downTime)) return Action.CONSUME;
      // A fresh down can replace a press whose release was lost when the window lost focus.
      presses.remove(physicalKey);
      if (!enabled || repeatCount != 0 || cancelled) return Action.PASS;
      presses.put(physicalKey, new Press(generation, downTime));
      return Action.CONSUME;
    }
    if (press == null) return Action.PASS;
    presses.remove(physicalKey);
    // Keep ownership of the up event, but never wake a new page with an old page's press.
    return enabled && press.generation == generation && !cancelled ? Action.TRIGGER : Action.CONSUME;
  }
}
