package cn.toside.music.car;

import android.view.KeyEvent;

import com.facebook.react.ReactNativeHost;
import com.facebook.react.bridge.ReactContext;
import com.reactnativenavigation.NavigationActivity;

import cn.toside.music.car.utils.VoiceKeyHandler;
import cn.toside.music.car.utils.VoiceKeyModule;

public class MainActivity extends NavigationActivity {
  @Override
  public boolean dispatchKeyEvent(KeyEvent event) {
    if (VoiceKeyHandler.isVoiceKey(event.getKeyCode())) {
      ReactNativeHost host = ((MainApplication) getApplication()).getReactNativeHost();
      if (host.hasInstance()) {
        ReactContext context = host.getReactInstanceManager().getCurrentReactContext();
        if (context != null && context.hasActiveReactInstance()) {
          VoiceKeyModule voiceKeys = context.getNativeModule(VoiceKeyModule.class);
          if (voiceKeys != null && voiceKeys.dispatchKeyEvent(event)) return true;
        }
      }
    }
    return super.dispatchKeyEvent(event);
  }
}
