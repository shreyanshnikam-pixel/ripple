/**
 * Renders a translated sentence whose emphasized phrase is marked with *asterisks*,
 * so each language can put the emphasis wherever its word order needs it.
 *   <Emph text={t('A rehearsal for the *room* you are about to walk into.')} />
 */
export function Emph({ text }: { text: string }) {
  return (
    <>
      {text.split('*').map((part, i) => (i % 2 ? <em key={i}>{part}</em> : part))}
    </>
  );
}
