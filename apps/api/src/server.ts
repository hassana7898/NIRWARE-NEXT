import { createApp } from './app.js';
import dotenv from 'dotenv';

dotenv.config();

const port = Number(process.env.PORT) || 4000;
const app = createApp();

export const server = app.listen(port, () => {
  console.log(`[NIRWARE NEXT API] Server listening on port ${port} (env: ${process.env.NODE_ENV || 'development'})`);
});
