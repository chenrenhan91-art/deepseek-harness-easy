/**
 * Reminder surface plugin, node half. Pure UI plugin: the empty apply exists
 * so the plugin appears in the host cordis.yml / Loader; the browser half
 * ships via exports["./client"]. Schedule behavior itself (tools, `/schedule`,
 * the `schedule` projection) is owned by `@deepseek-ai/dsh-schedule`.
 */

/** Host plugin body — no host-side behavior for this surface plugin. */
export function apply(): void {}
