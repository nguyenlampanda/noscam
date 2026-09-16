import HeroSearch from '../../components/search/HeroSearch'
import SystemStats from '../../components/common/SystemStats'
import RecentAlerts from '../../components/risk/RecentAlerts'
import CheckTypes from '../../components/search/CheckTypes'
import HowItWorks from '../../components/common/HowItWorks'
import ReportCTA from '../../components/report/ReportCTA'

function HomePage() {
  return (
    <>
      <HeroSearch />
      <SystemStats />
      <RecentAlerts />
      <CheckTypes />
      <HowItWorks />
      <ReportCTA />
    </>
  )
}

export default HomePage