import TrackPlayer, { State } from 'react-native-track-player'
import { isInitialized } from '@/plugins/player'
import playerState from '@/store/player/state'
import { type PrepareSpeechRecognition } from '@/components/SpeechRecognitionModal'

// Search owns playback coordination; the shared recognizer never accesses the music player.
const prepareVoiceSearch: PrepareSpeechRecognition = async(isCurrent) => {
  if (!isInitialized()) return
  // Read native state: playback events can lag behind pause/play in the UI store.
  const playbackState = await TrackPlayer.getState()
  if (!isCurrent()) return
  // Buffering has playWhenReady=true; Connecting is paused buffering in our Android player.
  if (playbackState != State.Playing && playbackState != State.Buffering) return
  const playback = playerState.playMusicInfo
  await TrackPlayer.pause()

  return async() => {
    // Restore only the playback this session paused, never a replacement track or stopped player.
    if (!playback || playback !== playerState.playMusicInfo || !isInitialized() || global.lx.isPlayedStop) return
    const playbackState = await TrackPlayer.getState()
    if (playback === playerState.playMusicInfo && isInitialized() && !global.lx.isPlayedStop &&
      (playbackState == State.Paused || playbackState == State.Connecting)) {
      await TrackPlayer.play()
    }
  }
}

export default prepareVoiceSearch
