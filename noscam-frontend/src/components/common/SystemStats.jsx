import Container from '../layout/Container'
import { homeStats } from '../../data/homeStats'

function SystemStats() {
  return (
    <section className="border-b border-slate-200 bg-slate-50/70">
      <Container>
        <div className="grid grid-cols-2 md:grid-cols-4">
          {homeStats.map((stat, index) => (
            <div
              key={stat.id}
              className={`px-2 py-7 text-center sm:px-4 sm:py-10 ${
                index % 2 === 0 ? 'border-r border-slate-200' : ''
              } ${
                index < 2 ? 'border-b border-slate-200 md:border-b-0' : ''
              } ${
                index !== homeStats.length - 1
                  ? 'md:border-r md:border-slate-200'
                  : 'md:border-r-0'
              }`}
            >
              <p className="text-xl font-bold tracking-tight text-slate-950 sm:text-3xl">
                {stat.value}
              </p>

              <p className="mt-1.5 text-xs text-slate-500 sm:mt-2 sm:text-sm">
                {stat.label}
              </p>
            </div>
          ))}
        </div>
      </Container>
    </section>
  )
}

export default SystemStats