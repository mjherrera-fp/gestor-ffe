/**
 * Numera las tareas (issues) del proyecto: les pone delante «GF-NN-», con el
 * siguiente número tras el mayor que ya se haya usado en issues, pull requests
 * o ramas del repo (GF-60-comentario-alumnos, «GF-07: …»…).
 *
 * - Al abrir una issue: numera esa.
 * - A mano (workflow_dispatch): numera las issues abiertas que no lo estén,
 *   de la más antigua a la más nueva.
 *
 * Lo ejecuta actions/github-script desde .github/workflows/number-issues.yml.
 */

const PREFIX = /^GF-(\d+)/i;

/** El mayor número GF usado en títulos de issues y PRs y en nombres de rama. */
async function highestNumber(github, repo, skip) {
  const [issues, branches] = await Promise.all([
    github.paginate(github.rest.issues.listForRepo, { ...repo, state: 'all', per_page: 100 }),
    github.paginate(github.rest.repos.listBranches, { ...repo, per_page: 100 }),
  ]);
  const names = [
    ...issues.filter((i) => !skip.has(i.number)).map((i) => i.title),
    ...branches.map((b) => b.name),
  ];
  return names.reduce((max, name) => {
    const m = name.match(PREFIX);
    return m ? Math.max(max, Number(m[1])) : max;
  }, 0);
}

/** «GF-08-Título», quitando guiones, dos puntos o espacios sueltos al principio del nombre. */
function numberedTitle(number, title) {
  const name = title.trim().replace(/^[-:\s]+/, '');
  return `GF-${String(number).padStart(2, '0')}-${name}`;
}

module.exports = async ({ github, context, core }) => {
  const repo = context.repo;

  let pending;
  if (context.eventName === 'issues') {
    pending = [context.payload.issue];
  } else {
    const open = await github.paginate(github.rest.issues.listForRepo, { ...repo, state: 'open', per_page: 100 });
    pending = open.filter((i) => !i.pull_request).sort((a, b) => a.number - b.number);
  }
  pending = pending.filter((i) => !PREFIX.test(i.title.trim()));
  if (pending.length === 0) {
    core.info('No hay tareas sin numerar.');
    return;
  }

  let next = (await highestNumber(github, repo, new Set(pending.map((i) => i.number)))) + 1;
  for (const issue of pending) {
    const title = numberedTitle(next++, issue.title);
    core.info(`#${issue.number}: «${issue.title}» → «${title}»`);
    await github.rest.issues.update({ ...repo, issue_number: issue.number, title });
  }
};

module.exports.numberedTitle = numberedTitle;
