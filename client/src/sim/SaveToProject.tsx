import { AnimatePresence, motion } from 'framer-motion';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import type { SimulationResult } from '../../../shared/types';
import { useT } from '../i18n';
import { addSimulation, addSurvey, savedProjects } from '../lib/projects';

/** Saves this result (or a survey made from it) to one of the projects or classes on this device. */
export function SaveToProject({ r, district, surveyId, onDone }: { r: SimulationResult; district: string | null; surveyId?: string; onDone: (msg: string) => void }) {
  const { t } = useT();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const projects = savedProjects();

  const save = async (id: string, key: string, name: string) => {
    setBusy(id);
    try {
      if (surveyId) await addSurvey(id, key, surveyId);
      else await addSimulation(id, key, { decision: r.decision, scope: r.scope, mix: r.mix, district, crowdSize: r.crowdSize });
      onDone(t('Saved to {name}', { name }));
      setOpen(false);
    } catch (e) {
      onDone(e instanceof Error ? t(e.message) : t('Something went wrong.'));
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="save-proj">
      <button type="button" className="btn btn--ghost btn--sm" aria-expanded={open} onClick={() => setOpen((o) => !o)}>
        {surveyId ? t('Add survey to a project') : t('Save to project')}
      </button>
      <AnimatePresence>
        {open && (
          <motion.div className="save-proj__menu panel" initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }}>
            {projects.length === 0 ? (
              <p className="reality__note">{t('You don’t have a project or class on this device yet.')}</p>
            ) : (
              projects.map((p) => (
                <button key={p.id} type="button" className="save-proj__item" disabled={!!busy} onClick={() => save(p.id, (p.key ?? p.token)!, p.name)}>
                  <span className="basis">{p.kind === 'class' ? t('Class') : t('Project')}</span>
                  {busy === p.id ? t('Saving…') : p.name}
                </button>
              ))
            )}
            <Link className="linkish" to="/projects">
              {t('Start a project or join a class')}
            </Link>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
