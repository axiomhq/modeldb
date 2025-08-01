// Auto-generated file - do not edit manually
// Generated at: 2025-08-01T09:00:44.772Z

export const ALL_MODEL_TYPES = [
  "audio",
  "chat",
  "completion",
  "embedding",
  "image",
  "moderation",
  "rerank",
  "responses"
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
  "responses": "responses"
} as const;

export type DiscoveredModelType = typeof ALL_MODEL_TYPES[number];
