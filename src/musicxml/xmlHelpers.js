import { XMLBuilder, XMLParser } from 'fast-xml-parser'

export const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: '@_',
})

export const builder = new XMLBuilder({
  ignoreAttributes: false,
  attributeNamePrefix: '@_',
  format: true,
})

export function toArray(value) {
  if (value === undefined || value === null) return []
  return Array.isArray(value) ? value : [value]
}

export function normalizeSemitone(value) {
  const normalized = value % 12
  return normalized < 0 ? normalized + 12 : normalized
}
