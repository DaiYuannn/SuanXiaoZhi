import { createApp } from './app.js';
import { initDB } from './db.js';

const PORT = Number(process.env.PORT || 5177);

const app = createApp();
(async () => {
  await initDB();
  app.listen(PORT, () => {
    // eslint-disable-next-line no-console
    console.log(`[server] listening on http://localhost:${PORT}`);
  });
})();

