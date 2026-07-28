import { useEffect, useState } from 'react'
import { X, Download, Loader2 } from 'lucide-react'
import { Button, Card } from '../../components/ui'

/**
 * PDF preview modal. Accepts a pdfFactory function that returns a jsPDF instance
 * (async or sync — both supported). Shows a loading spinner while the PDF builds
 * (image fetches from Cloudinary can take a second or two).
 */
export default function PDFPreviewModal({ pdfFactory, filename, onClose }) {
  const [dataUrl, setDataUrl] = useState(null)
  const [pdfInstance, setPdfInstance] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      setLoading(true); setError('')
      try {
        const pdf = await pdfFactory()
        if (cancelled) return
        setPdfInstance(pdf)
        setDataUrl(pdf.output('datauristring'))
      } catch (err) {
        if (!cancelled) setError(err.message || 'PDF build failed')
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => { cancelled = true }
  }, [pdfFactory])

  const download = () => {
    if (pdfInstance) pdfInstance.save(filename)
  }

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-2 md:p-4 z-[60]" onClick={onClose}>
      <Card className="max-w-4xl w-full h-[92vh] flex flex-col" onClick={e => e.stopPropagation()}>
        <div className="p-3 md:p-4 border-b border-slate-200 flex items-center justify-between gap-2">
          <h2 className="text-sm md:text-base font-semibold truncate">PDF Preview</h2>
          <div className="flex gap-2">
            <Button variant="secondary" onClick={download} disabled={!pdfInstance}>
              <Download className="w-4 h-4" /> Download
            </Button>
            <button onClick={onClose} className="p-2 rounded hover:bg-slate-100"><X className="w-5 h-5" /></button>
          </div>
        </div>
        <div className="flex-1 bg-slate-100 overflow-hidden">
          {loading ? (
            <div className="h-full flex flex-col items-center justify-center gap-3 text-ink-soft">
              <Loader2 className="w-8 h-8 animate-spin" />
              <p className="text-sm">Building PDF…</p>
              <p className="text-xs">Fetching images from Cloudinary. This can take a few seconds.</p>
            </div>
          ) : error ? (
            <div className="h-full flex flex-col items-center justify-center gap-2 text-red-600 p-6 text-center">
              <p className="text-sm font-medium">PDF build failed</p>
              <p className="text-xs">{error}</p>
            </div>
          ) : (
            <iframe src={dataUrl} title="PDF Preview" className="w-full h-full border-0" />
          )}
        </div>
      </Card>
    </div>
  )
}
