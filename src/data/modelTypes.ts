// Auto-generated file - do not edit manually
// Generated at: 2026-05-07T04:24:17.234Z

export const ALL_MODEL_TYPES = [
  "audio",
  "chat",
  "completion",
  "embedding",
  "image",
  "image_edit",
  "moderation",
  "ocr",
  "realtime",
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
  "image_edit": "image_edit",
  "search": "search",
  "realtime": "realtime",
  "video_generation": "video_generation",
  "vector_store": "vector_store"
} as const;

export type DiscoveredModelType = typeof ALL_MODEL_TYPES[number];
