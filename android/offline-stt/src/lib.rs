//! Offline-only, bounded utterance recognition. No cloud engines, downloads or global model cache.
mod bridge;
#[path = "../vendor/wtlocal/fbank.rs"]
mod fbank;
#[path = "../vendor/wtlocal/kernels.rs"]
mod kernels;
#[path = "../vendor/wtlocal/model.rs"]
mod model;
#[path = "../vendor/wtlocal/xnet.rs"]
mod xnet;

use anyhow::{bail, Result};
pub use model::Model;
use std::path::Path;
use std::sync::atomic::{AtomicBool, Ordering};
pub const SAMPLE_RATE: usize = 16000;
pub const MAX_SAMPLES: usize = SAMPLE_RATE * 20;

/// Search only needs final text. Buffer at most 20 seconds, then decode once instead of
/// repeatedly re-running a 40-layer model while AudioRecord is collecting microphone frames.
pub fn recognize(model: &Model, pcm: &[i16], cancelled: &AtomicBool) -> Result<String> {
    if pcm.len() > MAX_SAMPLES {
        bail!("Audio exceeds the 20 second limit");
    }
    if cancelled.load(Ordering::Relaxed) || pcm.len() < 400 || pcm.iter().all(|&x| x == 0) {
        return Ok(String::new());
    }
    let mut fb = fbank::Fbank::new();
    let mut features = Vec::new();
    for chunk in pcm.chunks(1280) {
        if cancelled.load(Ordering::Relaxed) {
            return Ok(String::new());
        }
        fb.push(chunk, &mut features);
    }
    let ids = model.forward(&features, cancelled);
    if cancelled.load(Ordering::Relaxed) {
        return Ok(String::new());
    }
    // Dictation models emit sentence punctuation; a music search should not end with "。".
    Ok(model
        .text(&ids)
        .trim()
        .trim_matches(|c: char| c.is_whitespace() || "，。？！、,.?!".contains(c))
        .to_owned())
}

pub fn load_model(dir: &Path) -> Result<Model> {
    Model::load(dir)
}

#[cfg(test)]
mod tests {
    #[test]
    fn malformed_models_return_errors() {
        for data in [
            vec![],
            b"XNET".to_vec(),
            b"XNET\0\0\0\0".to_vec(),
            vec![0; 128],
        ] {
            assert!(super::xnet::parse(&data).is_err());
        }
    }
}
