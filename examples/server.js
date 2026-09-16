import express from 'express';
import { fileURLToPath } from 'node:url';
import { reportMake } from '../server/index.js';

const app = express();
app.use('/report', reportMake({ templatesDir: fileURLToPath(new URL('./templates/', import.meta.url)) }));
app.listen(3000, () => console.log('Report Make: http://localhost:3000/report/'));
