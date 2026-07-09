const fs = require('fs');

// Cloudflare Pages doesn't set REACT_APP_COMMIT_SHA itself, but it exposes
// the deployed commit as CF_PAGES_COMMIT_SHA. Bridge it so CRA's REACT_APP_
// env handling picks it up, unless it's already been set explicitly.
const commitSha = process.env.REACT_APP_COMMIT_SHA || process.env.CF_PAGES_COMMIT_SHA;

if (commitSha) {
  fs.writeFileSync('.env', `REACT_APP_COMMIT_SHA=${commitSha}\n`, { flag: 'a' });
}
