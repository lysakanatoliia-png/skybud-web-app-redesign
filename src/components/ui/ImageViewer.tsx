import { FC, useState } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ZoomIn, ZoomOut } from "lucide-react";

type ImageViewerProps = {
  images: string[];
  thumbnailClassName?: string;
  containerClassName?: string;
};

const ImageViewer: FC<ImageViewerProps> = ({ images, thumbnailClassName = "w-full h-24 object-cover rounded border border-theme-border", containerClassName = "grid grid-cols-3 sm:grid-cols-6 gap-2" }) => {
  const [selected, setSelected] = useState<string | null>(null);
  const [scale, setScale] = useState(1);
  const [isPanning, setIsPanning] = useState(false);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [panStart, setPanStart] = useState<{ x: number; y: number } | null>(null);

  const open = (url: string) => {
    setSelected(url);
    setScale(1);
    setPan({ x: 0, y: 0 });
  };

  const close = () => setSelected(null);

  if (!images || images.length === 0) return null;

  return (
    <>
      <div className={containerClassName}>
        {images.map((url, idx) => (
          <button key={idx} className="relative group" onClick={() => open(url)}>
            <img src={url} alt="photo" className={thumbnailClassName} />
            <span className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition" />
          </button>
        ))}
      </div>

      <Dialog open={!!selected} onOpenChange={(o) => !o && close()}>
        <DialogContent className="max-w-[95vw] md:max-w-[90vw] p-0 bg-black" style={{paddingTop: 'var(--safe-area-height)'}}>
          {selected && (
            <div className="flex flex-col gap-3">
              <div className="flex items-center gap-2 p-2">
                <Button variant="secondary" onClick={() => setScale((s) => Math.max(0.5, s - 0.25))}>
                  <ZoomOut className="h-4 w-4" />
                </Button>
                <div className="text-white text-sm">{Math.round(scale * 100)}%</div>
                <Button variant="secondary" onClick={() => setScale((s) => Math.min(5, s + 0.25))}>
                  <ZoomIn className="h-4 w-4" />
                </Button>
              </div>
              <div className="w-full h-[80vh] overflow-hidden bg-black">
                <div
                  className={"w-full h-full flex items-center justify-center " + (isPanning ? 'cursor-grabbing' : 'cursor-grab')}
                  onMouseDown={(e) => { setIsPanning(true); setPanStart({ x: e.clientX - pan.x, y: e.clientY - pan.y }); }}
                  onMouseMove={(e) => { if (!isPanning) return; setPan({ x: e.clientX - (panStart?.x || 0), y: e.clientY - (panStart?.y || 0) }); }}
                  onMouseUp={() => { setIsPanning(false); setPanStart(null); }}
                  onMouseLeave={() => { setIsPanning(false); setPanStart(null); }}
                  onTouchStart={(e) => { const t0 = e.touches[0]; setIsPanning(true); setPanStart({ x: t0.clientX - pan.x, y: t0.clientY - pan.y }); }}
                  onTouchMove={(e) => { if (!isPanning) return; const t0 = e.touches[0]; setPan({ x: t0.clientX - (panStart?.x || 0), y: t0.clientY - (panStart?.y || 0) }); }}
                  onTouchEnd={() => { setIsPanning(false); setPanStart(null); }}
                >
                  <img
                    src={selected}
                    alt="full"
                    style={{ transform: `translate(${pan.x}px, ${pan.y}px) scale(${scale})`, transformOrigin: 'center center' }}
                    className="object-contain max-w-none max-h-none select-none"
                    draggable={false}
                  />
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
};

export default ImageViewer;


