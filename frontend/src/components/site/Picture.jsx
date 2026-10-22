import manifest from "@/lib/imageManifest.json";
import { mediaUrl } from "@/lib/api";

const nameOf = (src) => src?.match(/^\/images\/([a-z0-9-]+)-lg\.webp$/)?.[1];

export const Picture = ({ src, alt, sizes = "100vw", img: Img = "img", priority = false, ...rest }) => {
  const name = nameOf(src);
  const loading = priority ? "eager" : "lazy";
  if (!name || !manifest[name]) {
    return <Img src={mediaUrl(src)} alt={alt} loading={loading} decoding="async" {...rest} />;
  }
  const { w, h } = manifest[name];
  const set = (ext) => `/images/${name}-sm.${ext} ${Math.round(w / 2)}w, /images/${name}-lg.${ext} ${w}w`;
  return (
    <picture className="contents">
      <source type="image/avif" srcSet={set("avif")} sizes={sizes} />
      <source type="image/webp" srcSet={set("webp")} sizes={sizes} />
      <Img
        src={`/images/${name}-lg.jpg`}
        srcSet={set("jpg")}
        sizes={sizes}
        width={w}
        height={h}
        alt={alt}
        loading={loading}
        fetchPriority={priority ? "high" : undefined}
        decoding="async"
        {...rest}
      />
    </picture>
  );
};
