// Auto-generated file - do not edit manually
// Generated at: 2025-09-18T17:31:20.623Z

export const ALL_CAPABILITIES = [
  "supports_assistant_prefill",
  "supports_audio_input",
  "supports_audio_output",
  "supports_computer_use",
  "supports_embedding_image_input",
  "supports_function_calling",
  "supports_image_input",
  "supports_native_streaming",
  "supports_parallel_function_calling",
  "supports_pdf_input",
  "supports_prompt_caching",
  "supports_reasoning",
  "supports_response_schema",
  "supports_system_messages",
  "supports_tool_choice",
  "supports_url_context",
  "supports_video_input",
  "supports_vision",
  "supports_web_search"
] as const;

export const CAPABILITY_FRIENDLY_NAMES = {
  "assistant_prefill": "supports_assistant_prefill",
  "audio_input": "supports_audio_input",
  "audio_output": "supports_audio_output",
  "computer_use": "supports_computer_use",
  "embedding_image_input": "supports_embedding_image_input",
  "function_calling": "supports_function_calling",
  "image_input": "supports_image_input",
  "native_streaming": "supports_native_streaming",
  "parallel_function_calling": "supports_parallel_function_calling",
  "pdf_input": "supports_pdf_input",
  "prompt_caching": "supports_prompt_caching",
  "reasoning": "supports_reasoning",
  "response_schema": "supports_response_schema",
  "system_messages": "supports_system_messages",
  "tool_choice": "supports_tool_choice",
  "url_context": "supports_url_context",
  "video_input": "supports_video_input",
  "vision": "supports_vision",
  "web_search": "supports_web_search"
} as const;

export const LEGACY_CAPABILITY_MAP = {
  function_calling: 'supports_function_calling',
  vision: 'supports_vision',
  json_mode: 'supports_json_mode',
  parallel_functions: 'supports_parallel_functions',
} as const;

export type DiscoveredCapability = typeof ALL_CAPABILITIES[number];
