import { useRef, useState } from "react";
import { Film } from "lucide-react";
import { api, errorMessage } from "@/lib/api";

const ALLOWED = ["video/mp4", "video/webm"];
const MAX = 100 * 1024 * 1024;

// Chunked upload (5 MB parts) so large videos pass proxy body limits.
export const VideoDrop = ({ onUploaded, testId }) => {
  const input = useRef(null);
  const [over, setOver] = useState(false);
  const [progress, setProgress] = useState(null);
  const [error, setError] = useState("");

  const upload = async (files) => {
    setError("");
    const file = Array.from(files)[0];
    if (!file) return;
    if (!ALLOWED.includes(file.type)) {
      setError("Only MP4 or WebM videos are allowed.");
      return;
    }
    if (file.size > MAX) {
      setError("File too large (max 100 MB).");
      return;
    }
    try {
      setProgress(0);
      const { data } = await api.post("/admin/uploads/video/init", { size: file.size, content_type: file.type });
      const chunk = data.chunk_size;
      for (let i = 0, offset = 0; offset < file.size; i += 1, offset += chunk) {
        await api.put(`/admin/uploads/video/${data.upload_id}/chunk`, file.slice(offset, offset + chunk), {
          params: { index: i },
          headers: { "Content-Type": "application/octet-stream" },
          timeout: 120000,
        });
        setProgress(Math.min(95, Math.round(((offset + chunk) / file.size) * 95)));
      }
      const res = await api.post(`/admin/uploads/video/${data.upload_id}/complete`, null, { timeout: 300000 });
      setProgress(100);
      onUploaded(res.data.url);
    } catch (err) {
      setError(errorMessage(err, "Upload failed."));
    } finally {
      setProgress(null);
    }
  };

  return (
    <div>
      <button
        type="button"
        data-testid={testId}
        disabled={progress !== null}
        onClick={() => input.current?.click()}
        onDragOver={(e) => { e.preventDefault(); setOver(true); }}
        onDragLeave={() => setOver(false)}
        onDrop={(e) => { e.preventDefault(); setOver(false); upload(e.dataTransfer.files); }}
        className={`flex min-h-[110px] w-full flex-col items-center justify-center gap-2 border border-dashed p-4 text-sm transition-colors disabled:opacity-70 ${over ? "border-volt bg-volt/10" : "border-line-strong hover:border-volt"}`}
      >
        <Film className="h-6 w-6 text-volt-bright" aria-hidden="true" />
        <span>{progress !== null ? `Uploading video… ${progress}%` : "Drop a video here or click to choose"}</span>
        <span className="text-xs text-slate-400">MP4 or WebM · max 100 MB</span>
      </button>
      <input ref={input} type="file" accept={ALLOWED.join(",")} className="sr-only" onChange={(e) => { upload(e.target.files); e.target.value = ""; }} tabIndex={-1} aria-hidden="true" data-testid={`${testId}-input`} />
      {progress !== null && (
        <div className="mt-2 h-1.5 w-full bg-ink-800" role="progressbar" aria-valuenow={progress} aria-valuemin={0} aria-valuemax={100} aria-label="Video upload progress">
          <div className="h-full bg-volt transition-[width]" style={{ width: `${progress}%` }} />
        </div>
      )}
      {error && <p className="mt-2 text-sm text-red-300" role="alert" data-testid={`${testId}-error`}>{error}</p>}
    </div>
  );
};
