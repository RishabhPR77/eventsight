import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { ImagePlus } from "lucide-react";
import { cn, resolveMediaUrl } from "@/lib/utils";

const MAX_BYTES = 5 * 1024 * 1024;
const TYPES = ["image/jpeg", "image/png", "image/webp"];

export default function ImageField({ name, label, current, hint = "JPG, PNG or WebP, up to 5 MB", aspect = "aspect-[4/1] min-h-28" }) {
  const [preview, setPreview] = useState(null);

  useEffect(() => () => {
    if (preview) URL.revokeObjectURL(preview);
  }, [preview]);

  const handleChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (!TYPES.includes(file.type) || file.size > MAX_BYTES) {
      toast.error("Choose a JPG, PNG or WebP image up to 5 MB");
      e.target.value = "";
      return;
    }
    setPreview(URL.createObjectURL(file));
  };

  const shown = preview || resolveMediaUrl(current);

  return (
    <div>
      <span className="mb-1.5 block text-sm font-semibold text-ink">{label}</span>
      <label className={cn("group relative flex w-full max-w-full cursor-pointer items-center justify-center overflow-hidden rounded-xl border border-dashed border-line bg-paper transition hover:border-brand focus-within:ring-2 focus-within:ring-marigold", aspect)}>
        <input type="file" name={name} accept={TYPES.join(",")} onChange={handleChange} className="sr-only" />
        {shown ? (
          <>
            <img src={shown} alt="" className="absolute inset-0 h-full w-full object-cover" />
            <span className="relative rounded-lg bg-ink/70 px-3 py-1.5 text-sm font-semibold text-white opacity-0 transition group-hover:opacity-100">Change image</span>
          </>
        ) : (
          <span className="flex flex-col items-center gap-1.5 p-4 text-center text-ink-faint">
            <ImagePlus className="h-6 w-6" aria-hidden="true" />
            <span className="text-sm font-semibold text-ink-soft">Upload an image</span>
            <span className="text-xs">{hint}</span>
          </span>
        )}
      </label>
    </div>
  );
}
