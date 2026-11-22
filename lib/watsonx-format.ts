import { z } from 'zod'

/**
 * watsonx accepts `{ type: 'json_schema', json_schema }` at runtime, but the SDK's
 * `TextChatResponseFormat` type only declares `type`, so this returns a widened object.
 */
export function jsonSchemaFormat(name: string, schema: z.ZodType): { type: string } {
  return { type: 'json_schema', json_schema: { name, schema: z.toJSONSchema(schema) } } as {
    type: string
  }
}
