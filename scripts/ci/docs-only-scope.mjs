// Decides whether a pull request can change what the Required E2E job tests.
// Docs-only: every changed path is under docs/ or is a Markdown file at the repository root.
// Anything else, or an empty list, means the journeys run.
import { pathToFileURL } from 'node:url';

export function isDocsOnly(paths) {
  const files = paths.map((path) => path.trim()).filter(Boolean);
  return files.length > 0 && files.every((file) => file.startsWith('docs/') || /^[^/]+\.md$/.test(file));
}

// Reads `git diff --name-only` output on stdin and prints a GitHub step output line.
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  let input = '';
  process.stdin.setEncoding('utf8');
  for await (const chunk of process.stdin) input += chunk;
  const docsOnly = isDocsOnly(input.split('\n'));
  console.log(`run=${docsOnly ? 'false' : 'true'}`);
}
