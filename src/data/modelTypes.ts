// Auto-generated file - do not edit manually
// Generated at: 2025-11-27T23:34:32.227Z

export const ALL_MODEL_TYPES = [
  "audio",
  "chat",
  "completion",
  "embedding",
  "image",
  "moderation",
  "ocr",
  "rerank",
  "responses",
  "search",
  "vector_store",
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
  "ocr": "ocr",
  "search": "search",
  "video_generation": "video_generation",
  "vector_store": "vector_store"
} as const;

export type DiscoveredModelType = typeof ALL_MODEL_TYPES[number];
