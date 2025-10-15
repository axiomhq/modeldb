// Auto-generated file - do not edit manually
// Generated at: 2025-10-15T12:44:43.477Z

export const ALL_MODEL_TYPES = [
  "audio",
  "chat",
  "completion",
  "embedding",
  "image",
  "moderation",
  "rerank",
  "responses",
  "video_generation"
] as const;

export const MODEL_TYPE_MAPPING = {
  "chat": "chat",
  "completion": "completion",
  "embedding": "embedding",
  "image_generation": "image",
  "audio_transcription": "audio",
  "audio_speech": "audio",
  "moderation": "moderation",
  "rerank": "rerank",
  "responses": "responses",
  "video_generation": "video_generation"
} as const;

export type DiscoveredModelType = typeof ALL_MODEL_TYPES[number];
