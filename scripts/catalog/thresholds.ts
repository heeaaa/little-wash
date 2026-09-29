/**
 * What the measurements are allowed to decide, and what they are not.
 *
 * ## The calibration result, 20/09/2026
 *
 * `npm run catalog:calibrate` measured all 30 candidates from the first
 * session against 8 approvals and 22 rejections. **Not one measurement
 * separated the two groups.** Separation scores, where 0.5 is a coin toss:
 *
 *   subjectArea        0.38      subjectCentrality  0.59
 *   subjectRegions     0.61      subjectSharpness   0.51
 *   detailLoad         0.40      borderVariance     0.44
 *   distinctColours    0.48      valueRange         0.36
 *
 * So no hard threshold is defined here. Filtering on any of these would be
 * dressing up a guess as a measurement, and a candidate dropped by a threshold
 * is never seen again - the most expensive kind of mistake this pipeline can
 * make.
 *
 * Why they failed is worth recording. All 30 candidates came from one themed
 * collection: citrus, on plain backdrops, shot similarly. There was almost no
 * variance for a measurement to find. The distinctions being made were fine
 * ones inside a homogeneous set, which is the hardest case and the least
 * representative. A harvest spanning misty landscapes, close-up petals and
 * doorways will have variance in every one of these, and calibration should be
 * run again then - per subject, since a misty landscape has no figure-ground
 * separation at all and `subjectArea` will mean nothing there.
 *
 * Two directional hints, too weak to act on but worth re-testing: rejected
 * images had *more* subject area (0.66 median against 0.50) and a wider value
 * range. Both are consistent with "too busy, lots of objects" rather than the
 * "objects too far" reading the measure was built for.
 *
 * ## The duplicate result
 *
 * The perceptual hash does not catch what a curator means by "we already have
 * a similar one". The five candidates flagged that way sat 25-32 bits from
 * their nearest approved neighbour, against a median of 32 across all 435
 * pairs and a minimum of 18. Nothing in that set was structurally close.
 *
 * Their words say why: "No more too many cross sectional slices of fruits",
 * "We already have a lot of cross section of fruits in a plain background".
 * That is a judgement about the catalogue's balance, not about two files being
 * the same image. dHash answers the wrong question.
 *
 * It is kept, at a deliberately tight distance, for the case it *is* right
 * for: the same stock photograph arriving from three different searches during
 * a broad harvest. The judgement about having too many of a kind is answered
 * instead by the diversity signal below, and by `catalog:coverage`.
 */

/**
 * Structural near-identity only. At this distance two images are the same
 * photograph; by 18 bits, on the evidence above, they are already different
 * pictures.
 */
export const DUPLICATE_HAMMING = 8;

/**
 * How many approved references may share a subject and a colour family before
 * the review tool starts saying so.
 *
 * Not a filter. It surfaces "you already have 6 of these" at the moment of
 * decision, which is the information that was missing when five candidates in
 * a row had to be rejected for being more of the same.
 */
export const SIMILAR_ENOUGH_HUE_DEGREES = 40;
export const CROWDED_AT = 5;

/**
 * Measurements are shown and ranked on, never filtered on, until calibration
 * on a varied harvest says otherwise. Flipping this to true without new
 * evidence in the docblock above would be a regression.
 */
export const MEASUREMENTS_MAY_FILTER = false;
