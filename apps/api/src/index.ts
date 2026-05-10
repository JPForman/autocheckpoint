import { createApp } from './app.js';
import { env } from './config/env.js';

const app = createApp();

app.listen(env.PORT, () => {
  console.log(`API listening on http://localhost:${env.PORT}`);
  if (env.NODE_ENV !== 'production') {
    console.log(`OpenAPI UI: http://localhost:${env.PORT}/api/docs`);
  }
});
