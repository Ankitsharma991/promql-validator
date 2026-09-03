# promql-validator

Convenience meta-package — re-exports everything from [`@promql-validator/react`](https://www.npmjs.com/package/@promql-validator/react) (which itself re-exports [`@promql-validator/core`](https://www.npmjs.com/package/@promql-validator/core)), so a single `npm install promql-validator` gives you the full editor.

```bash
npm install promql-validator
```

```tsx
import { PromQLInput } from 'promql-validator';
import 'promql-validator/styles.css';

<PromQLInput value={query} onChange={setQuery} aria-label="PromQL query" />;
```

Prefer `@promql-validator/core` alone if you only need `validatePromQL`/`formatPromQL` and want to avoid pulling in React.

Full docs: <https://github.com/promql-validator/promql-validator>.

## License

MIT
