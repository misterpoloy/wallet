/** Feature flag for every Mansa Musa surface (D-16). */
export function mansaEnabled(): boolean {
  return process.env.MANSA_ENABLED === 'true'
}
