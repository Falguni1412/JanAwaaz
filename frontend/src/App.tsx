import { Routes, Route } from 'react-router-dom'
import { Layout } from './components/Layout'
import { Overview } from './pages/Overview'
import { DemandMap } from './pages/DemandMap'
import { BudgetSimulator } from './pages/BudgetSimulator'
import { WhatIfSimulator } from './pages/WhatIfSimulator'
import { Alignment } from './pages/Alignment'
import { RegionDetail } from './pages/RegionDetail'
import { ImpactTracker } from './pages/ImpactTracker'
import { BRICSIntelligence } from './pages/BRICSIntelligence'
import { Recommendations } from './pages/Recommendations'
import { CitizenPortal } from './pages/CitizenPortal'

export default function App() {
  return (
    <Routes>
      <Route path="/citizen" element={<CitizenPortal />} />
      <Route path="/" element={<Layout><Overview /></Layout>} />
      <Route path="/demand" element={<Layout><DemandMap /></Layout>} />
      <Route path="/recommendations" element={<Layout><Recommendations /></Layout>} />
      <Route path="/budget" element={<Layout><BudgetSimulator /></Layout>} />
      <Route path="/interventions" element={<Layout><WhatIfSimulator /></Layout>} />
      <Route path="/alignment" element={<Layout><Alignment /></Layout>} />
      <Route path="/impact" element={<Layout><ImpactTracker /></Layout>} />
      <Route path="/brics" element={<Layout><BRICSIntelligence /></Layout>} />
      <Route path="/regions/:regionId" element={<Layout><RegionDetail /></Layout>} />
    </Routes>
  )
}
