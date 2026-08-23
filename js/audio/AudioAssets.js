const SFX_ROOT='assets/audio/sfx/';
const BGM_ROOT='assets/audio/bgm/';

// Semantic BGM IDs remain stable when dedicated tracks are added later.
// The current CC0 track is intentionally shared; AudioManager keeps the same file playing continuously.
export const BGM_ASSETS=Object.freeze({
  DAILY_EXPLORATION:`${BGM_ROOT}Exploration Theme.ogg`,
  PHOTO_STREET:`${BGM_ROOT}Exploration Theme.ogg`,
  MEMORY_GALLERY:`${BGM_ROOT}Exploration Theme.ogg`,
  BATTLE:`${BGM_ROOT}Exploration Theme.ogg`,
  ALBUM:`${BGM_ROOT}Exploration Theme.ogg`,
  REFLECTION:`${BGM_ROOT}Exploration Theme.ogg`
});

// Battle code only uses these semantic IDs. Original filenames remain intact for attribution and auditing.
export const AUDIO_ASSETS=Object.freeze({
  battle_enter:`${SFX_ROOT}alexzavesa-glitch-transition-1-463623.mp3`,ui_cursor:`${SFX_ROOT}mixkit-select-click-1109.wav`,
  ui_confirm:`${SFX_ROOT}mixkit-modern-technology-select-3124.wav`,ui_cancel:`${SFX_ROOT}mixkit-sci-fi-click-900.wav`,
  player_hit:`${SFX_ROOT}mixkit-glitch-static-1457.wav`,enemy_hit:`${SFX_ROOT}mixkit-small-electric-glitch-2595.wav`,
  scan:`${SFX_ROOT}virtual_vibes-digital-glitch-noise-hd-379465.mp3`,communicate:`${SFX_ROOT}mixkit-modern-technology-select-3124.wav`,
  photo_snap:`${SFX_ROOT}mixkit-camera-digital-shutter-1432.wav`,digital_copy:`${SFX_ROOT}mixkit-small-electric-glitch-2595.wav`,
  share_whoosh:`${SFX_ROOT}zoedit-digital-glitch-whoosh-533580.mp3`,tracker_lock:`${SFX_ROOT}mixkit-sci-fi-click-900.wav`,
  data_connect:`${SFX_ROOT}soulfuljamtracks-glitch-fx-transitions-9-378582.mp3`,phase_transition:`${SFX_ROOT}freesound_community-cinematic-glitch-transition-sfx-27806.mp3`,
  victory:`${SFX_ROOT}mixkit-quick-win-video-game-notification-269.wav`
});

export const SFX_OPTIONS=Object.freeze({
  battle_enter:{volume:.7,cooldown:650},ui_cursor:{volume:.32,cooldown:95},ui_confirm:{volume:.38,cooldown:100},ui_cancel:{volume:.34,cooldown:100},
  player_hit:{volume:.55,cooldown:180},enemy_hit:{volume:.48,cooldown:140},scan:{volume:.38,cooldown:220},communicate:{volume:.32,cooldown:220},
  photo_snap:{volume:.45,cooldown:160},digital_copy:{volume:.36,cooldown:110},share_whoosh:{volume:.42,cooldown:240},tracker_lock:{volume:.4,cooldown:180},
  data_connect:{volume:.34,cooldown:150},phase_transition:{volume:.55,cooldown:900},victory:{volume:.42,cooldown:800}
});

export const SFX_FALLBACKS=Object.freeze({
  battle_enter:[110,.12,'sawtooth'],ui_cursor:[520,.035,'sine'],ui_confirm:[720,.055,'sine'],ui_cancel:[210,.05,'square'],
  player_hit:[95,.09,'sawtooth'],enemy_hit:[145,.07,'square'],scan:[390,.13,'sine'],communicate:[440,.13,'sine'],
  photo_snap:[1800,.025,'square'],digital_copy:[760,.04,'square'],share_whoosh:[240,.12,'sawtooth'],tracker_lock:[980,.08,'square'],
  data_connect:[610,.06,'sine'],phase_transition:[82,.16,'sawtooth'],victory:[740,.13,'sine']
});
