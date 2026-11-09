//! JNI handles are IDs, never raw pointers. Cancellation can race decode/release safely.
use crate::{load_model, recognize, Model, MAX_SAMPLES};
use anyhow::{anyhow, bail, Result};
use jni::{
    objects::{JClass, JShortArray, JString},
    sys::{jlong, jstring},
    JNIEnv,
};
use std::{
    collections::HashMap,
    panic::{catch_unwind, AssertUnwindSafe},
    path::Path,
    sync::{
        atomic::{AtomicBool, AtomicI64, Ordering},
        Arc, Mutex, OnceLock,
    },
};

struct Session {
    model: Model,
    cancelled: AtomicBool,
}
static NEXT: AtomicI64 = AtomicI64::new(1);
fn sessions() -> &'static Mutex<HashMap<i64, Arc<Session>>> {
    static SESSIONS: OnceLock<Mutex<HashMap<i64, Arc<Session>>>> = OnceLock::new();
    SESSIONS.get_or_init(|| Mutex::new(HashMap::new()))
}
fn session(id: jlong) -> Result<Arc<Session>> {
    sessions()
        .lock()
        .map_err(|_| anyhow!("Session lock poisoned"))?
        .get(&id)
        .cloned()
        .ok_or_else(|| anyhow!("Invalid STT session"))
}
// Never unwind over JNI, including malformed model/input errors.
fn guarded<T: Default>(env: &mut JNIEnv, f: impl FnOnce(&mut JNIEnv) -> Result<T>) -> T {
    match catch_unwind(AssertUnwindSafe(|| f(env))) {
        Ok(Ok(value)) => value,
        result => {
            let message = match result {
                Ok(Err(e)) => e.to_string(),
                _ => "Offline recognizer panicked".to_owned(),
            };
            let _ = env.throw_new("java/lang/IllegalStateException", message);
            T::default()
        }
    }
}

#[no_mangle]
pub extern "system" fn Java_cn_toside_music_car_speech_WetypeNative_create(
    mut env: JNIEnv,
    _: JClass,
    dir: JString,
) -> jlong {
    guarded(&mut env, |env| {
        let dir: String = env.get_string(&dir)?.into();
        let model = load_model(Path::new(&dir))?;
        let id = NEXT.fetch_add(1, Ordering::Relaxed);
        sessions()
            .lock()
            .map_err(|_| anyhow!("Session lock poisoned"))?
            .insert(
                id,
                Arc::new(Session {
                    model,
                    cancelled: AtomicBool::new(false),
                }),
            );
        Ok(id)
    })
}
#[no_mangle]
pub extern "system" fn Java_cn_toside_music_car_speech_WetypeNative_recognize(
    mut env: JNIEnv,
    _: JClass,
    id: jlong,
    audio: JShortArray,
) -> jstring {
    guarded(&mut env, |env| {
        let s = session(id)?;
        let len = env.get_array_length(&audio)? as usize;
        if len > MAX_SAMPLES {
            bail!("Audio exceeds the 20 second limit");
        }
        let mut pcm = vec![0i16; len];
        env.get_short_array_region(&audio, 0, &mut pcm)?;
        let text = recognize(&s.model, &pcm, &s.cancelled)?;
        Ok(env.new_string(text)?.into_raw())
    })
}
#[no_mangle]
pub extern "system" fn Java_cn_toside_music_car_speech_WetypeNative_cancel(
    mut env: JNIEnv,
    _: JClass,
    id: jlong,
) {
    guarded(&mut env, |_| {
        if let Ok(s) = session(id) {
            s.cancelled.store(true, Ordering::Relaxed);
        }
        Ok(())
    });
}
#[no_mangle]
pub extern "system" fn Java_cn_toside_music_car_speech_WetypeNative_release(
    mut env: JNIEnv,
    _: JClass,
    id: jlong,
) {
    guarded(&mut env, |_| {
        if let Some(s) = sessions()
            .lock()
            .map_err(|_| anyhow!("Session lock poisoned"))?
            .remove(&id)
        {
            s.cancelled.store(true, Ordering::Relaxed);
        }
        Ok(())
    });
}
