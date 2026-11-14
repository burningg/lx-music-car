package cn.toside.music.car.utils;

import android.view.KeyEvent;

import com.facebook.react.bridge.Arguments;
import com.facebook.react.bridge.LifecycleEventListener;
import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.bridge.ReactContextBaseJavaModule;
import com.facebook.react.bridge.ReactMethod;
import com.facebook.react.bridge.UiThreadUtil;
import com.facebook.react.bridge.WritableMap;
import com.facebook.react.common.LifecycleState;
import com.facebook.react.modules.core.DeviceEventManagerModule;

/** Foreground window key events only; pages explicitly opt in through the JS subscription. */
public class VoiceKeyModule extends ReactContextBaseJavaModule implements LifecycleEventListener {
  private final ReactApplicationContext context;
  private final VoiceKeyHandler keys = new VoiceKeyHandler();
  private boolean invalidated;

  VoiceKeyModule(ReactApplicationContext context) {
    super(context);
    this.context = context;
    context.addLifecycleEventListener(this);
  }

  @Override
  public String getName() {
    return "VoiceKeyModule";
  }

  @ReactMethod
  public void setEnabled(boolean enabled) {
    UiThreadUtil.runOnUiThread(() -> keys.setEnabled(enabled && !invalidated && context.getLifecycleState() == LifecycleState.RESUMED));
  }

  // NativeEventEmitter bookkeeping; setEnabled owns the upstream window subscription.
  @ReactMethod public void addListener(String eventName) {}
  @ReactMethod public void removeListeners(int count) {}

  public boolean dispatchKeyEvent(KeyEvent event) {
    if (invalidated || !context.hasActiveReactInstance() || context.getLifecycleState() != LifecycleState.RESUMED) {
      keys.setEnabled(false);
    }
    VoiceKeyHandler.Action action = keys.dispatch(event.getDeviceId(), event.getKeyCode(), event.getScanCode(),
      event.getAction(), event.getRepeatCount(), event.getDownTime(), event.isCanceled());
    if (action == VoiceKeyHandler.Action.TRIGGER) {
      WritableMap data = Arguments.createMap();
      data.putInt("keyCode", event.getKeyCode());
      context.getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter.class).emit("voice-key", data);
    }
    return action != VoiceKeyHandler.Action.PASS;
  }

  @Override public void onHostResume() {}
  @Override public void onHostPause() { keys.setEnabled(false); }
  @Override public void onHostDestroy() { keys.clear(); }

  @Override
  public void invalidate() {
    context.removeLifecycleEventListener(this);
    UiThreadUtil.runOnUiThread(() -> {
      invalidated = true;
      keys.clear();
    });
    super.invalidate();
  }
}
