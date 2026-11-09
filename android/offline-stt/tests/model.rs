use lx_offline_stt::{load_model, recognize, MAX_SAMPLES};
use std::{path::PathBuf, sync::atomic::AtomicBool, time::Instant};

// Explicit opt-in: normal unit tests remain small and never download a model.
// node scripts/prepare-offline-stt.cjs --tests
// cargo test --release --manifest-path android/offline-stt/Cargo.toml --test model -- --ignored --nocapture
#[test]
#[ignore = "requires the pinned local model and WAV fixtures"]
fn real_model_offline_recognition() {
    let root = PathBuf::from(env!("CARGO_MANIFEST_DIR")).join("../.stt/offline-stt");
    let model = load_model(&root.join("assets/stt/offline-stt")).unwrap();
    let mut wav = hound::WavReader::open(root.join("test-assets/stt/0.wav")).unwrap();
    assert_eq!(wav.spec().sample_rate, 16000);
    assert_eq!(wav.spec().channels, 1);
    let pcm: Vec<i16> = wav.samples::<i16>().map(Result::unwrap).collect();
    let started = Instant::now();
    let text = recognize(&model, &pcm, &AtomicBool::new(false)).unwrap();
    eprintln!("Offline STT fixture: {text}; {:?}", started.elapsed());
    assert!(text.contains("昨天"), "{text}");
    assert!(text.to_lowercase().contains("monday"), "{text}");
    assert!(text.contains("星期三"), "{text}");
    assert_eq!(
        recognize(&model, &[0; 16000], &AtomicBool::new(false)).unwrap(),
        ""
    );
    assert_eq!(recognize(&model, &pcm, &AtomicBool::new(true)).unwrap(), "");
    assert!(recognize(&model, &vec![0; MAX_SAMPLES + 1], &AtomicBool::new(false)).is_err());
    // Decode cancellation must be observable during CPU work, not only before starting it.
    let cancelled = AtomicBool::new(false);
    std::thread::scope(|scope| {
        scope.spawn(|| {
            std::thread::sleep(std::time::Duration::from_millis(100));
            cancelled.store(true, std::sync::atomic::Ordering::Relaxed);
        });
        let text = recognize(&model, &pcm, &cancelled).unwrap();
        assert!(text.is_empty());
    });
}
