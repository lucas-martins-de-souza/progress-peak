import { useEffect, useRef, useState, type ChangeEvent } from "react";
import { Camera, FileUp, Keyboard, Loader2, RotateCcw } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { weekdayLabels } from "@/lib/weekdays";
import {
  fetchShare,
  findExistingImport,
  importSharedWorkout,
  normalizeCode,
  parseShareFile,
  type SharedWorkout,
} from "@/lib/share";

type ImportMethod = "choose" | "code" | "scan" | "preview";

export function ImportWorkoutDialog({
  userId,
  open,
  onOpenChange,
  onImported,
}: {
  userId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onImported: () => void;
}) {
  const [method, setMethod] = useState<ImportMethod>("choose");
  const [codeInput, setCodeInput] = useState("");
  const [shared, setShared] = useState<SharedWorkout | null>(null);
  const [sourceCode, setSourceCode] = useState<string | undefined>();
  const [duplicate, setDuplicate] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) return;
    setMethod("choose");
    setCodeInput("");
    setShared(null);
    setSourceCode(undefined);
    setDuplicate(false);
    setError(null);
    setLoading(false);
  }, [open]);

  async function showPreview(workout: SharedWorkout, code?: string) {
    const existing = await findExistingImport(workout, code);
    setShared(workout);
    setSourceCode(code);
    setDuplicate(Boolean(existing));
    setError(null);
    setMethod("preview");
  }

  async function loadCode(value: string, fromQr = false) {
    const code = normalizeCode(value);
    if (!code) {
      setError(fromQr ? "Este QR Code não contém um treino válido do LoadWise." : "Código de treino inválido.");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const workout = await fetchShare(code);
      if (!workout) {
        setError(fromQr ? "Este QR Code não contém um treino válido do LoadWise." : "Treino não encontrado.");
        return;
      }
      await showPreview(workout, code);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Não foi possível localizar este treino.");
    } finally {
      setLoading(false);
    }
  }

  async function readFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    setLoading(true);
    setError(null);
    try {
      const parsed = parseShareFile(await file.text());
      if (!parsed.ok) {
        setError("Não foi possível importar este treino. O arquivo não é válido ou é incompatível com esta versão do LoadWise.");
        return;
      }
      await showPreview(parsed.workout);
    } catch {
      setError("Não foi possível importar este treino. O arquivo não é válido ou é incompatível com esta versão do LoadWise.");
    } finally {
      setLoading(false);
    }
  }

  async function confirmImport() {
    if (!userId || !shared) return;
    setLoading(true);
    setError(null);
    try {
      await importSharedWorkout(userId, shared, sourceCode);
      toast.success("Treino importado.");
      onImported();
      onOpenChange(false);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Não foi possível importar este treino.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md gap-0 rounded-sm border-border bg-card p-0">
        <DialogHeader className="border-b border-border px-5 py-4 text-left">
          <p className="label-tech text-primary">Importar treino</p>
          <DialogTitle className="mt-1 text-lg font-bold tracking-tight">
            {method === "preview" && shared ? shared.name : "Escolha como importar"}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 px-5 py-5">
          {method === "choose" && (
            <div className="grid gap-2">
              <Button variant="outline" className="h-12 justify-start rounded-sm" onClick={() => setMethod("scan")}>
                <Camera className="size-4 text-primary" /> Escanear QR Code
              </Button>
              <Button variant="outline" className="h-12 justify-start rounded-sm" onClick={() => setMethod("code")}>
                <Keyboard className="size-4 text-primary" /> Inserir código
              </Button>
              <Button variant="outline" className="h-12 justify-start rounded-sm" onClick={() => fileRef.current?.click()}>
                <FileUp className="size-4 text-primary" /> Importar arquivo
              </Button>
              <input ref={fileRef} type="file" accept=".loadwise,application/json" className="hidden" onChange={readFile} />
            </div>
          )}

          {method === "code" && (
            <div className="space-y-4">
              <div className="space-y-2">
                <label htmlFor="share-code" className="label-tech text-[10px]">Código do treino</label>
                <Input
                  id="share-code"
                  value={codeInput}
                  onChange={(event) => setCodeInput(event.target.value.toUpperCase())}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" && !loading) void loadCode(codeInput);
                  }}
                  placeholder="LW-8K4P2"
                  className="data h-12 rounded-sm border-border bg-transparent text-center text-base font-semibold uppercase tracking-[0.16em]"
                  autoFocus
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <Button variant="outline" className="h-11 rounded-sm" onClick={() => { setMethod("choose"); setError(null); }}>
                  Voltar
                </Button>
                <Button className="h-11 rounded-sm" disabled={!codeInput.trim() || loading} onClick={() => loadCode(codeInput)}>
                  {loading && <Loader2 className="size-4 animate-spin" />} Continuar
                </Button>
              </div>
            </div>
          )}

          {method === "scan" && <QrScanner onResult={(value) => loadCode(value, true)} onBack={() => { setMethod("choose"); setError(null); }} />}

          {method === "preview" && shared && (
            <div className="space-y-5">
              <div className="border-y border-border py-4">
                <div className="flex items-end justify-between gap-3">
                  <div>
                    <p className="label-tech text-[10px]">Prévia</p>
                    <p className="mt-2 text-base font-semibold">{shared.name}</p>
                    <p className="data mt-1 text-[11px] text-muted-foreground">
                      {shared.exercises.length} exercícios · {weekdayLabels(shared.weekdays)}
                    </p>
                  </div>
                  <span className="data text-xs text-primary">{shared.exercises.length}</span>
                </div>
                <div className="mt-4 space-y-2">
                  {shared.exercises.map((exercise, index) => (
                    <div key={`${exercise.exercise_name}-${index}`} className="flex items-center gap-3 text-sm">
                      <span className="data text-[10px] text-muted-foreground">{String(index + 1).padStart(2, "0")}</span>
                      <span className="min-w-0 flex-1 truncate">{exercise.exercise_name}</span>
                      <span className="data text-[10px] text-muted-foreground">
                        {exercise.sets}× {exercise.min_reps}–{exercise.max_reps}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {duplicate && (
                <div className="border border-warning/35 bg-warning-soft p-3 text-sm text-warning">
                  Este treino já foi importado anteriormente. Você pode importar uma nova cópia sem alterar a existente.
                </div>
              )}

              <div className="grid grid-cols-2 gap-2">
                <Button variant="outline" className="h-11 rounded-sm" disabled={loading} onClick={() => { setMethod("choose"); setShared(null); setError(null); }}>
                  Cancelar
                </Button>
                <Button className="h-11 rounded-sm" disabled={!userId || loading} onClick={confirmImport}>
                  {loading && <Loader2 className="size-4 animate-spin" />}
                  {duplicate ? "Importar nova cópia" : "Importar treino"}
                </Button>
              </div>
            </div>
          )}

          {loading && method === "choose" && (
            <div className="flex items-center justify-center py-4 text-muted-foreground">
              <Loader2 className="size-5 animate-spin" />
            </div>
          )}
          {error && <p role="alert" className="text-sm text-danger">{error}</p>}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function QrScanner({ onResult, onBack }: { onResult: (value: string) => void; onBack: () => void }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    let active = true;
    let scanner: { start: () => Promise<void>; stop: () => void; destroy: () => void } | null = null;

    void (async () => {
      try {
        const QrScannerModule = await import("qr-scanner");
        const QrScannerClass = QrScannerModule.default;
        scanner = new QrScannerClass(
          video,
          (result) => {
            if (!active) return;
            active = false;
            scanner?.stop();
            onResult(result.data);
          },
          { preferredCamera: "environment", highlightScanRegion: true, highlightCodeOutline: true },
        );
        await scanner.start();
      } catch {
        if (active) setCameraError("Não foi possível acessar a câmera. Verifique a permissão do navegador.");
      }
    })();

    return () => {
      active = false;
      scanner?.stop();
      scanner?.destroy();
    };
  }, [onResult]);

  return (
    <div className="space-y-4">
      <div className="relative aspect-square overflow-hidden rounded-sm border border-border bg-background">
        <video ref={videoRef} className="size-full object-cover" muted playsInline />
        <div className="pointer-events-none absolute inset-[15%] border border-primary/70" />
      </div>
      <p className="data text-center text-[11px] text-muted-foreground">Aponte a câmera para um QR Code do LoadWise</p>
      {cameraError && <p role="alert" className="text-sm text-danger">{cameraError}</p>}
      <Button variant="outline" className="h-11 w-full rounded-sm" onClick={onBack}>
        <RotateCcw className="size-4" /> Voltar
      </Button>
    </div>
  );
}