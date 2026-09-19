# Commerce Payments Platform

End-to-end commerce system covering catalog, checkout, orders, inventory, shipments, and operational workflows, including payment method handling.

## Stack

- React.js (storefront + admin dashboard)
- Node.js, Express.js
- MongoDB
- Object storage for media
- Docker Compose for local and production deploys

## Highlights

- Product catalog with variants, attributes, and inventory
- Cart, checkout, GST, and coupon flows
- Order lifecycle, claims, invoices, and shipments
- Payment method and payment-status tracking (COD plus gateway-ready methods)
- Admin analytics, coupons, and operations tools

## Local setup

1. Copy `.env.example` to `.env` and fill in MongoDB, JWT, email, and object-storage values.
2. `docker compose up --build`
3. Storefront: `http://localhost:3000`
4. Admin panel: `http://localhost:3001`

Do not commit real environment files. Production hosts, registry credentials, and API keys stay in local env files.

## License

MIT. See [LICENSE](LICENSE).
