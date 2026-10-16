import { useEffect, useRef } from 'react';
import { EditorView, basicSetup } from 'codemirror';
import { EditorState } from '@codemirror/state';
import { promql } from '@promql-validator/codemirror';

/** Mounts a real CodeMirror 6 editor with the promql-validator extension — syntax
 * highlighting, context-aware completion, and live linting, all driven by
 * @promql-validator/core. Only verifiable end-to-end in a real browser. */
export function CodeMirrorDemo() {
  const containerRef = useRef<HTMLDivElement>(null);
  const viewRef = useRef<EditorView | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;
    const state = EditorState.create({
      doc: 'rate(http_requests_total[5m)', // intentionally invalid: ']' closed with ')' instead
      extensions: [basicSetup, promql()],
    });
    const view = new EditorView({ state, parent: containerRef.current });
    viewRef.current = view;
    return () => view.destroy();
  }, []);

  return <div ref={containerRef} data-testid="codemirror-demo" style={{ border: '1px solid #d0d5dd', borderRadius: 6, fontSize: 13 }} />;
}
