import posthog from 'posthog-js'

export { posthog }

export function captureEvent(
  event: string,
  properties?: Record<string, unknown>
) {
  posthog.capture(event, properties)
}
