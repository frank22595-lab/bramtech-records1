/**
 * Report card PDF generator (async).
 *
 * Routes to Classic, Polish, or Experimental design based on
 * config.template. All three share the same palette system and
 * grade-tier colors.
 */

import { renderDucams } from './ducamsTemplate'
import { renderPolish } from './polishTemplate'
import { renderExperimental } from './experimentalTemplate'
import { normalizeConfig } from './reportPalettes'
import { urlToBase64 } from './imageLoader'

async function safeFetch(url) {
  if (!url) return null
  try {
    return await urlToBase64(url)
  } catch (err) {
    console.warn('Image fetch failed:', url, err.message)
    return null
  }
}

export async function generateReportCardPDF(input) {
  const { school, student } = input

  const [logo, studentPhoto, signature, stamp] = await Promise.all([
    safeFetch(school?.logoUrl),
    safeFetch(student?.photoUrl),
    safeFetch(school?.principalSignatureUrl),
    safeFetch(school?.stampUrl),
  ])

  const images = {}
  if (logo) images.logo = logo
  if (studentPhoto) images.studentPhoto = studentPhoto
  if (signature) images.signature = signature
  if (stamp) images.stamp = stamp

  const enrichedInput = { ...input, images }

  const { design } = normalizeConfig(input.config || {})
  if (design === 'polish') return renderPolish(enrichedInput)
  if (design === 'experimental') return renderExperimental(enrichedInput)
  return renderDucams(enrichedInput)
}
