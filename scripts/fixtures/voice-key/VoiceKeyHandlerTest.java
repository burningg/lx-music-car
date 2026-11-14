import cn.toside.music.car.utils.VoiceKeyHandler;
import cn.toside.music.car.utils.VoiceKeyHandler.Action;

public class VoiceKeyHandlerTest {
  private static void expect(Action expected, Action actual, String message) {
    if (expected != actual) throw new AssertionError(message + ": expected " + expected + ", got " + actual);
  }

  private static Action event(VoiceKeyHandler keys, int code, int action, int repeat) {
    return keys.dispatch(1, code, 7, action, repeat, 1000, false);
  }

  public static void main(String[] args) {
    for (int code : new int[] {231, 304, 312}) {
      VoiceKeyHandler keys = new VoiceKeyHandler();
      expect(Action.PASS, event(keys, code, 0, 0), "inactive page down");
      expect(Action.PASS, event(keys, code, 1, 0), "inactive page up");
      keys.setEnabled(true);
      expect(Action.CONSUME, event(keys, code, 0, 0), "claim voice down");
      expect(Action.CONSUME, event(keys, code, 0, 1), "consume repeat without waking");
      expect(Action.CONSUME, event(keys, code, 0, 0), "duplicate down");
      expect(Action.TRIGGER, event(keys, code, 1, 0), "wake exactly on release");
      expect(Action.PASS, event(keys, code, 1, 0), "duplicate release");
      expect(Action.PASS, event(keys, code, 2, 0), "multiple action");
      expect(Action.PASS, event(keys, code, 0, 3), "unowned repeat");

      expect(Action.CONSUME, event(keys, code, 0, 0), "press before navigating away");
      keys.setEnabled(false);
      expect(Action.CONSUME, event(keys, code, 0, 1), "own repeat after navigating away");
      expect(Action.CONSUME, event(keys, code, 1, 0), "own release without waking another page");
      keys.setEnabled(true);
      event(keys, code, 0, 0);
      keys.setEnabled(false);
      keys.setEnabled(true);
      expect(Action.CONSUME, event(keys, code, 1, 0), "returning to search must not revive an old press");

      event(keys, code, 0, 0);
      expect(Action.CONSUME, keys.dispatch(1, code, 7, 1, 0, 1000, true), "cancelled release never wakes");
      expect(Action.PASS, keys.dispatch(1, code, 7, 0, 0, 2000, true), "cancelled down is not claimed");

      event(keys, code, 0, 0);
      expect(Action.PASS, keys.dispatch(2, code, 7, 1, 0, 1000, false), "device identities are isolated");
      expect(Action.PASS, keys.dispatch(1, code, 8, 1, 0, 1000, false), "scan codes are isolated");
      expect(Action.TRIGGER, event(keys, code, 1, 0), "matching physical key still wakes");

      event(keys, code, 0, 0);
      keys.setEnabled(false);
      keys.setEnabled(true);
      expect(Action.CONSUME, keys.dispatch(1, code, 7, 0, 0, 2000, false), "fresh down replaces a lost release");
      expect(Action.TRIGGER, keys.dispatch(1, code, 7, 1, 0, 2000, false), "new press wakes normally");
      event(keys, code, 0, 0);
      keys.clear();
      expect(Action.PASS, event(keys, code, 1, 0), "destroyed window forgets ownership");
      expect(Action.PASS, event(keys, code, 0, 0), "destroyed window disables listening");
    }

    VoiceKeyHandler keys = new VoiceKeyHandler();
    keys.setEnabled(true);
    for (int code : new int[] {4, 24, 25, 66, 79, 84, 85, 87, 88, 219, 327, 328, 353}) {
      expect(Action.PASS, event(keys, code, 0, 0), "unrelated key down " + code);
      expect(Action.PASS, event(keys, code, 1, 0), "unrelated key up " + code);
    }
    System.out.println("Voice key press lifecycle passed");
  }
}
