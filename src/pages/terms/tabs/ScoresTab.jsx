/**
 * ScoresTab
 * ---------
 * Wraps the existing ResultsPage, forcing the term to the workspace's term.
 * ResultsPage handles all the score-entry logic. We just pass termOverride
 * so users can't pick a different term inside a term workspace.
 */
import ResultsPage from '../../results/ResultsPage'

export default function ScoresTab({ term, readOnly }) {
  return <ResultsPage termOverride={term} readOnly={readOnly} embedded />
}
