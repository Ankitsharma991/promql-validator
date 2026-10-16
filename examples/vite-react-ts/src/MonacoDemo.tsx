import { useEffect, useRef } from 'react';
import * as monaco from 'monaco-editor';
import { registerPromQLLanguage, PROMQL_LANGUAGE_ID } from '@promql-validator/monaco';

/** Mounts a real Monaco editor with the promql-validator language adapter registered —
 * syntax highlighting, completion, and live diagnostics markers, all driven by
 * @promql-validator/core. Only verifiable end-to-end in a real browser. */
export function MonacoDemo({ dark }: { dark: boolean }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const editorRef = useRef<monaco.editor.IStandaloneCodeEditor | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;
    registerPromQLLanguage(monaco);
    const editor = monaco.editor.create(containerRef.current, {
      value: 'rate(http_requests_total{service="api"}[5m])',
      language: PROMQL_LANGUAGE_ID,
      theme: dark ? 'vs-dark' : 'vs',
      minimap: { enabled: false },
      fontSize: 13,
      automaticLayout: true,
    });
    editorRef.current = editor;
    return () => editor.dispose();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    editorRef.current?.updateOptions({ theme: dark ? 'vs-dark' : 'vs' });
  }, [dark]);

  return <div ref={containerRef} data-testid="monaco-demo" style={{ height: 120, border: '1px solid #d0d5dd', borderRadius: 6 }} />;
}
