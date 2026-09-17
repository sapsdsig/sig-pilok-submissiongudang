import { useState } from 'react'
import { FormShell } from './components/FormLayout'
import { PilokAccess } from './features/pilok-form/PilokAccess'
import { PilokMainForm } from './features/pilok-form/PilokMainForm'
import { SubmissionSuccess } from './features/pilok-form/SubmissionSuccess'
import { submissionService } from './services/submissionService'
import { warehouseService } from './services/warehouseService'
import type {
  ExistingSubmission,
  Pilok,
  PilokSubmission,
  WarehouseMaster,
} from './types/domain'

function App() {
  const [pilok, setPilok] = useState<Pilok | null>(null)
  const [submittedPayload, setSubmittedPayload] =
    useState<PilokSubmission | null>(null)
  const [existingSubmission, setExistingSubmission] =
    useState<ExistingSubmission | null>(null)
  const [masterWarehouses, setMasterWarehouses] = useState<WarehouseMaster[]>(
    [],
  )

  const openPilokForm = async (resolvedPilok: Pilok) => {
    const [existing, warehouses] = await Promise.all([
      submissionService.getByPilok(resolvedPilok.kodePilok),
      warehouseService.getByPilok(resolvedPilok.kodePilok),
    ])
    setExistingSubmission(existing)
    setMasterWarehouses(warehouses)
    setPilok(resolvedPilok)
  }

  const restart = () => {
    setSubmittedPayload(null)
    setExistingSubmission(null)
    setMasterWarehouses([])
    setPilok(null)
  }

  return (
    <FormShell
      title="PILOK - Informasi Gudang"
      subtitle="Form pendataan gudang distributor berdasarkan master PILOK."
    >
      <div className={pilok ? '' : 'mx-auto max-w-xl'}>
        {submittedPayload ? (
            <SubmissionSuccess payload={submittedPayload} onRestart={restart} />
        ) : pilok ? (
            <PilokMainForm
              pilok={pilok}
              existingSubmission={existingSubmission}
              masterWarehouses={masterWarehouses}
              onBack={restart}
              onSuccess={setSubmittedPayload}
            />
        ) : (
            <PilokAccess onResolved={openPilokForm} />
        )}
      </div>
    </FormShell>
  )
}

export default App
