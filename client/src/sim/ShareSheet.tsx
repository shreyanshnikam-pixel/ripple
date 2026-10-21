import { motion } from 'framer-motion';
import { useEffect, useRef, useState } from 'react';
import type { SimulationResult } from '../../../shared/types';
import { copyText } from '../lib/clipboard';
import { shareUrlFor } from '../lib/share';
import { canvasToBlob, drawShareCard, fileNameFor } from '../lib/shareImage';
import { lockScroll } from '../lib/smooth';

/** Share a result: a link that reproduces it exactly, and an image card. */
export function ShareSheet({ r, district, onClose, onDone }: { r: SimulationResult; district: string | null; onClose: () => void; onDone: (msg: string) => void }) {
  const [image, setImage] = useState<{ url: string; blob: Blob } | null>(null);
  const [failed, setFailed] = useState(false);
  const dialog = useRef<HTMLDivElement>(null);
  const url = shareUrlFor(r, district ?? undefined);
  const text = `${r.summary.verdict}: ${r.summary.support}% for, ${r.summary.oppose}% against in a Ripple simulation of “${r.decision}”`;

  useEffect(() => {
    let objectUrl = '';
    drawShareCard(r, { district })
      .then(canvasToBlob)
      .then((blob) => {
        if (!blob) throw new Error('no image');
        objectUrl = URL.createObjectURL(blob);
        setImage({ url: objectUrl, blob });
      })
      .catch(() => setFailed(true));
    return () => {
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [r, district]);

  useEffect(() => {
    lockScroll(true);
    const prev = document.activeElement as HTMLElement | null;
    dialog.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'Tab' && dialog.current) {
        // Keep focus inside the dialog.
        const items = dialog.current.querySelectorAll<HTMLElement>('button, a[href], input, [tabindex]:not([tabindex="-1"])');
        const first = items[0];
        const last = items[items.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('keydown', onKey);
      lockScroll(false);
      prev?.focus();
    };
  }, [onClose]);

  const download = () => {
    if (!image) return;
    const a = document.createElement('a');
    a.href = image.url;
    a.download = fileNameFor(r);
    document.body.appendChild(a);
    a.click();
    a.remove();
    onDone('Image saved');
  };

  const file = image ? new File([image.blob], fileNameFor(r), { type: 'image/png' }) : null;
  const canShareFile = !!file && typeof navigator.canShare === 'function' && navigator.canShare({ files: [file] });
  const canShare = typeof navigator.share === 'function';
  const nativeShare = async () => {
    try {
      if (canShareFile && file) await navigator.share({ files: [file], title: 'Ripple simulation', text: `${text} ${url}` });
      else await navigator.share({ title: 'Ripple simulation', text, url });
    } catch {
      /* the person closed the share menu */
    }
  };

  return (
    <div className="sheet" role="presentation" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <motion.div
        ref={dialog}
        className="sheet__panel panel"
        role="dialog"
        aria-modal="true"
        aria-labelledby="share-title"
        tabIndex={-1}
        data-lenis-prevent
        initial={{ opacity: 0, y: 24, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 12 }}
        transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
      >
        <div className="sheet__head">
          <h2 id="share-title" className="reality__title">
            Share this simulation
          </h2>
          <button type="button" className="sheet__close" aria-label="Close" onClick={onClose}>
            ×
          </button>
        </div>
        <div className="sheet__preview">
          {image ? (
            <img src={image.url} alt={`Share card: ${text}.`} width={1200} height={630} />
          ) : (
            <div className="sheet__placeholder">{failed ? 'The image couldn’t be drawn in this browser. The link still works.' : 'Drawing the card…'}</div>
          )}
        </div>
        <label className="sheet__link">
          <span className="label">Link</span>
          <input readOnly value={url} onFocus={(e) => e.currentTarget.select()} />
        </label>
        <p className="reality__note">Anyone who opens the link sees this same result: Ripple gives the same answer to the same question every time.</p>
        <div className="actions">
          <button type="button" className="btn btn--sm" onClick={async () => onDone((await copyText(url)) ? 'Link copied' : 'Couldn’t copy. Select the link instead.')}>
            Copy link
          </button>
          <button type="button" className="btn btn--ghost btn--sm" onClick={download} disabled={!image}>
            Download image
          </button>
          {canShare && (
            <button type="button" className="btn btn--ghost btn--sm" onClick={nativeShare}>
              Share…
            </button>
          )}
        </div>
      </motion.div>
    </div>
  );
}
