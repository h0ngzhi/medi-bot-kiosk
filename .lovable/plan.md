

## Migrate Health AI Functions to Lovable AI Gateway

This plan migrates both health-related AI functions from the direct Gemini API to the Lovable AI Gateway, which eliminates the separate `GEMINI_API_KEY` dependency and uses the pre-configured `LOVABLE_API_KEY`.

### Benefits of This Change

- **No separate API key needed** - Uses the auto-provisioned `LOVABLE_API_KEY` instead of managing a separate `GEMINI_API_KEY`
- **Consistent rate limiting** - Lovable AI has workspace-level rate limits with clear error handling
- **Same model quality** - Will use `google/gemini-2.5-flash` (same capability as current gemini-2.0-flash)
- **Better error handling** - Built-in 402/429 status codes for quota and rate limit issues

---

### Functions to Update

| Function | Current API | New API |
|----------|-------------|---------|
| `recommend-programmes` | Direct Gemini API | Lovable AI Gateway |
| `assess-health-severity` | Direct Gemini API | Lovable AI Gateway |

---

### Technical Changes

#### 1. Update `assess-health-severity/index.ts`

**Replace:**
```text
- GEMINI_API_KEY environment variable
- Direct Gemini API endpoint
- Gemini-specific request format
```

**With:**
```text
- LOVABLE_API_KEY environment variable
- Lovable AI Gateway endpoint (https://ai.gateway.lovable.dev/v1/chat/completions)
- OpenAI-compatible chat completions format
- Model: google/gemini-2.5-flash
```

Key changes:
- Switch from `contents[].parts[]` format to `messages[]` format
- Add proper 402/429 error handling
- Use `response_format: { type: "json_object" }` for structured output

#### 2. Update `recommend-programmes/index.ts`

Same pattern as above:
- Replace Gemini direct API with Lovable AI Gateway
- Update request format to OpenAI-compatible structure
- Add rate limit and payment error handling

---

### Error Handling

Both functions will include proper handling for:
- **429 (Rate Limit)** - Return user-friendly message about trying again later
- **402 (Payment Required)** - Return message about workspace credits

---

### Prompt Preservation

All existing prompts, age-adjusted thresholds, and Asian WHO BMI standards will be preserved exactly as they are. Only the API transport layer changes.

