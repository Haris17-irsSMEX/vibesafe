# Paddle checkout setup

CtrlCode creates Paddle transactions server-side and sends customers to the app
payment route:

```text
https://vibesafe.irssmex.com/pay?_ptxn=txn_...
```

The `/pay` page loads Paddle.js with `NEXT_PUBLIC_PADDLE_CLIENT_TOKEN` and opens
checkout for the transaction ID. The app does not mark upgrades as successful
from URL parameters; paid access is activated only after verified Paddle webhook
processing updates the user plan.

Required Paddle dashboard settings:

- Checkout → Checkout settings → Default payment link:
  `https://vibesafe.irssmex.com/pay`
- Webhook destination:
  `https://vibesafe.irssmex.com/api/paddle/webhook`

Required environment variables:

- `PADDLE_API_KEY`
- `PADDLE_WEBHOOK_SECRET`
- `NEXT_PUBLIC_PADDLE_CLIENT_TOKEN`
- `PADDLE_STARTER_PRICE_ID`
- `PADDLE_BUILDER_PRICE_ID`
- `PADDLE_ENVIRONMENT`
- `APP_URL`
- `NEXT_PUBLIC_APP_URL`

Use sandbox values with `PADDLE_ENVIRONMENT=sandbox` and production values with
`PADDLE_ENVIRONMENT=production`. Do not expose Paddle API keys or webhook secrets
client-side.
