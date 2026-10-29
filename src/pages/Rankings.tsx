import { useMemo } from 'react'
import RankingsTable from '../components/RankingsTable'
import { rankingsCSV } from '../csv'
import { computeRankings } from '../rankings'
import { downloadFile, useEvent } from '../store'

export default function Rankings() {
  const { teams, matches } = useEvent()
  const rankings = useMemo(() => computeRankings(teams.map((t) => t.number), matches), [teams, matches])

  return (
    <div>
      <div className="mb-4 flex items-center gap-4">
        <h1 className="text-xl font-bold">Rankings</h1>
        <button className="btn" onClick={() => downloadFile('rankings.csv', rankingsCSV(rankings, teams), 'text/csv')}>
          Export CSV
        </button>
      </div>
      <RankingsTable rankings={rankings} teams={teams} />
    </div>
  )
}
