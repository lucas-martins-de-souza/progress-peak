import { useEffect, useState } from "react";
import { Check, Copy, Download, Loader2, Share2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { weekdayLabels } from "@/lib/weekdays";
import {
  buildShareFile,
  createShare,
  shareQrValue,
  toSharedWorkout,
  type WorkoutWithExercises,
} from "@/lib/share";

export function ShareWorkoutDialog({
  workout,
  userId,
  open,
  onOpenChange,
}: {
  workout: WorkoutWithExercises | null;
  userId: string | null;
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const [code, setCode] = useState<string | null>(null);
  const [qr, setQr] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!open || !workout || !userId) return;
    let cancelled = false;
    setCode(null);
    setQr(null);
    setError(null);
    (async () => {
      try {
        const generated = await createShare(userId, workout);
        if (cancelled) return;
        setCode(generated);
        const QRCode = (await import("qrcode")).default;
        const url = await QRCode.toDataURL(shareQrValue(generated), {
          margin: 1,
          width: 512,
          color: { dark: "#000000", light: "#ffffff" },
        });
        if (!cancelled) setQr(url);
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : "Erro ao gerar compartilhamento.");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [open, workout, userId]);

  if (!workout) return null;
  const shared = toSharedWorkout(workout);

  async function copyCode() {
    if (!code) return;
    await navigator.clipboard.writeText(code);
    setCopied(true);
    toast.success("Código copiado.");
    setTimeout(() => setCopied(false), 1800);
  }

  function exportFile() {
    const { filename, content } = buildShareFile(shared, code ?? undefined);
    const blob = new Blob([content], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Arquivo exportado.");
  }

  async function nativeShare() {
    if (!code) return;
    const text = `Treino "${shared.name}" no LoadWise. Código: ${code}`;
    try {
      if (navigator.share) {
        await navigator.share({ title: shared.name, text, url: shareQrValue(code) });
      } else {
        await navigator.clipboard.writeText(`${text}\n${shareQrValue(code)}`);
        toast.success("Link copiado para envio.");
      }
    } catch {
      /* usuário cancelou */
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md gap-0 rounded-sm border-border bg-card p-0">
        <DialogHeader className="border-b border-border px-5 py-4 text-left">
          <p className="label-tech text-primary">Compartilhar</p>
          <DialogTitle className="mt-1 text-lg font-bold tracking-tight">{shared.name}</DialogTitle>
          <p className="data text-[11px] text-muted-foreground">
            {shared.exercises.length} exercícios · {weekdayLabels(shared.weekdays)}
          </p>
        </DialogHeader>

        <div className="space-y-5 px-5 py-5">
          <div className="flex flex-col items-center gap-3">
            <div className="flex size-52 items-center justify-center rounded-sm border border-border bg-white p-3">
              {qr ? (
                <img src={qr} alt={`QR Code do treino ${shared.name}`} className="size-full" />
              ) : (
                <Loader2 className="size-6 animate-spin text-black/50" />
              )}
            </div>
            <p className="data text-[11px] text-muted-foreground">Escaneie para importar este treino</p>
          </div>

          <div className="space-y-2">
            <p className="label-tech text-[10px]">Código de compartilhamento</p>
            <div className="flex items-center gap-2">
              <div className="data flex h-11 flex-1 items-center justify-center rounded-sm border border-primary/40 bg-info-soft text-base font-semibold tracking-[0.2em] text-primary">
                {code ?? "······"}
              </div>
              <Button variant="outline" className="h-11 rounded-sm" onClick={copyCode} disabled={!code}>
                {copied ? <Check className="size-4" /> : <Copy className="size-4" />}
              </Button>
            </div>
          </div>

          {error && <p className="text-sm text-danger">{error}</p>}

          <div className="grid grid-cols-2 gap-2">
            <Button
              variant="outline"
              className="h-11 rounded-sm text-[11px] font-semibold uppercase tracking-[0.14em]"
              onClick={exportFile}
            >
              <Download className="size-4" /> Exportar arquivo
            </Button>
            <Button
              className="h-11 rounded-sm text-[11px] font-semibold uppercase tracking-[0.14em]"
              onClick={nativeShare}
              disabled={!code}
            >
              <Share2 className="size-4" /> Compartilhar
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
