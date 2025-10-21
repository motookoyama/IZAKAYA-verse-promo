import express from 'express';
import fetch from 'node-fetch';
import bodyParser from 'body-parser';
import fs from 'fs';

const app = express();
app.use(bodyParser.urlencoded({ extended: false }));

const TX_ENDPOINT = process.env.PAYPAL_TX_ENDPOINT || 'https://ipnpb.sandbox.paypal.com/cgi-bin/webscr';
const LEDGER = process.env.LEDGER_PATH || '/tmp/ipn.log';

app.get('/healthz', (_, res) => res.status(200).send('ok'));

app.post('/paypal/ipn/notify', async (req, res) => {
  res.status(200).end();
  try {
    const original = new URLSearchParams(req.body);
    const validate = new URLSearchParams({ cmd: '_notify-validate' });
    for (const [key, value] of original.entries()) {
      validate.append(key, value);
    }

    const response = await fetch(TX_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: validate.toString(),
    });
    const verified = (await response.text()).trim() === 'VERIFIED';

    fs.appendFile(
      LEDGER,
      `${JSON.stringify({
        ts: new Date().toISOString(),
        verified,
        payload: Object.fromEntries(original),
      })}\n`,
      () => {}
    );
  } catch (error) {
    fs.appendFile(
      LEDGER,
      `${JSON.stringify({ ts: new Date().toISOString(), error: String(error) })}\n`,
      () => {}
    );
  }
});

app.listen(process.env.PORT || 10000);
