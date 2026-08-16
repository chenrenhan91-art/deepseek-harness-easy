/** Machine value of the preset that requires an explicit GUI risk gate. */
export const FULL_ACCESS_PRESET = 'danger-full-access'

/**
 * Render a permission preset under the host-supplied label.
 * @param _value - preset machine value (unused; the host name is the display text).
 * @param name - host-supplied preset name.
 * @returns the host name unchanged.
 */
export function displayPermissionPreset(_value: string, name: string): string {
  return name
}
