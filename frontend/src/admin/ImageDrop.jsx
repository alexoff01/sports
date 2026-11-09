import { useRef, useState } from "react";
import { UploadCloud } from "lucide-react";
import { api, errorMessage } from "@/lib/api";

const ALLOWED = ["image/jpeg", "image/png", "image/webp", "image/avif"];
const MAX = 10 * 1024 * 1024;

export const ImageDrop = ({ onUploaded, multiple = false, testId }) => {
  const input = useRef(null);
  const [over, setOver] = useState(false);
  const [progress, setProgress] = useState(null);
  const [error, setError] = useState("");

  const upload = async (files) => {
    setError("");
    for (const file of Array.from(files).slice(0, multiple ? 8 : 1)) {
      if (!ALLOWED.includes(file.type)) {
        setError("Only JPG, PNG, WebP or AVIF images are allowed.");
        continue;
      }
      if (file.size > MAX) {
        setError("File too large (max 10 MB).");
        continue;
      }
      const data = new FormData();
      data.append("file", file);
      try {
        setProgress(0);
        const res = await api.post("/admin/uploads", data, {
          onUploadProgress: (e) => setProgress(e.total ? Math.round((e.loaded / e.total) * 100) : 0),
        });
        onUploaded(res.data.url);
      } catch (err) {
        setError(errorMessage(err, "Upload failed."));
      } finally {
        setProgress(null);
      }
    }
  };

  return (
    <div>
      <button
        type="button"
        data-testid={testId}
        onClick={() => input.current?.click()}
        onDragOver={(e) => { e.preventDefault(); setOver(true); }}
        onDragLeave={() => setOver(false)}
        onDrop={(e) => { e.preventDefault(); setOver(false); upload(e.dataTransfer.files); }}
        className={`flex min-h-[110px] w-full flex-col items-center justify-center gap-2 border border-dashed p-4 text-sm transition-colors ${over ? "border-volt bg-volt/10" : "border-line-strong hover:border-volt"}`}
      >
        <UploadCloud className="h-6 w-6 text-volt-bright" aria-hidden="true" />
        <span>Drop {multiple ? "images" : "an image"} here or click to choose</span>
        <span className="text-xs text-slate-400">JPG, PNG, WebP, AVIF · max 10 MB · EXIF removed automatically</span>
      </button>
      <input ref={input} type="file" accept={ALLOWED.join(",")} multiple={multiple} className="sr-only" onChange={(e) => { upload(e.target.files); e.target.value = ""; }} tabIndex={-1} aria-hidden="true" data-testid={`${testId}-input`} />
      {progress !== null && (
        <div className="mt-2 h-1.5 w-full bg-ink-800" role="progressbar" aria-valuenow={progress} aria-valuemin={0} aria-valuemax={100} aria-label="Upload progress">
          <div className="h-full bg-volt transition-[width]" style={{ width: `${progress}%` }} />
        </div>
      )}
      {error && <p className="mt-2 text-sm text-red-300" role="alert">{error}</p>}
    </div>
  );
};
