# Audit Coverage API

## Route Registry (74 total)

Dari `server.go`:

```
GET /health
GET /ws
POST /webhook/midtrans
POST /api/register
POST /api/login
POST /api/refresh
POST /api/logout
GET /api/user
POST /api/users/roles
PUT /api/users/active-role
GET /api/ui/home
GET /api/orders
POST /api/orders
PUT /api/orders/:uuid/accept
PUT /api/orders/:uuid/reject
PUT /api/orders/:uuid/status
POST /api/orders/:uuid/rate
POST /api/orders/:uuid/chat
GET /api/orders/:uuid/chat
POST /api/fare/estimate
POST /api/promos/validate
GET /api/wallet
POST /api/wallet/deposit
POST /api/wallet/withdraw
GET /api/wallet/history
GET /api/profile
PUT /api/profile
PUT /api/profile/driver
PUT /api/profile/merchant
GET /api/customer/orders
GET /api/customer/wallet/history
POST /api/driver/kyc
GET /api/driver/kyc
PUT /api/driver/status
GET /api/driver/orders
GET /api/driver/wallet/history
GET /api/driver/earnings
GET /api/merchant/orders
GET /api/merchant/wallet/history
GET /api/merchant/sales
GET /api/admin/settings
PUT /api/admin/settings/:key
GET /api/admin/drivers
PUT /api/admin/drivers/:id/verify
PUT /api/admin/drivers/:id/reject-kyc
GET /api/admin/drivers/:id/kyc
PUT /api/admin/drivers/:id/suspend
PUT /api/admin/drivers/:id/reactivate
POST /api/admin/drivers/:id/bonus
GET /api/admin/orders
PUT /api/admin/orders/:uuid/cancel
PUT /api/admin/orders/:uuid/force-complete
GET /api/admin/finance/report
GET /api/admin/finance/withdrawals
PUT /api/admin/finance/withdrawals/:id/disburse
PUT /api/admin/finance/withdrawals/:id/reject
POST /api/admin/finance/refunds
GET /api/admin/merchants
GET /api/admin/merchants/:id
PUT /api/admin/merchants/:id/approve
PUT /api/admin/merchants/:id/suspend
GET /api/admin/users
GET /api/admin/users/:id
PUT /api/admin/users/:id/active
POST /api/admin/users/:id/roles
DELETE /api/admin/users/:id/roles/:role
GET /api/admin/promos
POST /api/admin/promos
PUT /api/admin/promos/:id
DELETE /api/admin/promos/:id
GET /api/admin/promos/:id/usage
GET /api/admin/reports/dashboard
GET /api/admin/reports/sales
GET /api/admin/reports/top-drivers
```

## Coverage Analysis

Handler test coverage: **65.1%**
Worker test coverage: **22.4%**

Route tanpa test belum diidentifikasi — need cross-check.
