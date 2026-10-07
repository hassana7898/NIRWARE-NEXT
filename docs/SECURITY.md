# NIRWARE NEXT — Security & Compliance Architecture

## 1. Authentication Architecture

- **Credentials**: Passwords are hashed using bcrypt with salt rounds = 10. Plaintext passwords are never logged or stored.
- **Tokens**: Stateless, cryptographically signed JSON Web Tokens (JWT) using HMAC SHA-256 with an ephemeral server secret.
- **Sessions Table**: Each login generates a persistent `sessions` record containing token SHA-256 fingerprint, client IP, user agent, and expiration timestamp.
- **Revocation**: Logout immediately flags the session as revoked, preventing token reuse even if the client retains the JWT before its expiration.

---

## 2. Role-Based Access Control (RBAC) & Object Authorization

### 2.1 Role Matrix

| Role | Quota & Orders | Production Line | Scale Weighbridge | Fleet Dispatch | Inventory Ledger | Security Logs |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: |
| `SUPER_ADMIN` | Full | Full | Full | Full | Full | Full |
| `ADMIN` | Full | Full | Full | Full | Full | Read |
| `MANAGER` | Full | Full | Full | Full | Reversal & Read | Read |
| `SCALE_OPERATOR` | Read | Read | Create & Read | Read | Read | None |
| `PRODUCTION_OP` | Read | Launch & Complete | None | Read | Read | None |
| `FARMER` | Own Only | None | None | None | None | None |
| `DRIVER` | None | None | None | Assigned Only | None | None |

### 2.2 IDOR Prevention (Object Ownership)
The `AuthorizationPolicy` domain service enforces row-level object ownership:
- A farmer requesting `GET /api/v1/orders` or `GET /api/v1/orders/:id` can only read records where `order.farmer_id == user.farmer_id`.
- Attempting to inspect or transition another farmer's order triggers `403 Forbidden` (`FORBIDDEN_RESOURCE`).
- A driver requesting `GET /api/v1/deliveries/my` only receives dispatches where `delivery.driver_id == user.driver_id`.

---

## 3. Cryptographic OTP Verification Architecture

```
+----------------+              +--------------------+              +----------------+
|     Farmer     |              |    Factory / DB    |              |     Driver     |
+-------+--------+              +---------+----------+              +--------+-------+
        |                                 |                                  |
        |                                 | [Truck Dispatched]               |
        |                                 | Generate 6-digit OTP (Crypto)    |
        |                                 | Hash: SHA-256(OTP + Salt)        |
        |                                 | Store ONLY Hash in DB            |
        | <--- SMS / In-App Plaintext OTP |                                  |
        |                                 |                                  |
        |                                 |                           [Arrive at Farm]
        |                                 |                           [Weigh & Unload]
        | --- Dictates OTP to Driver ---> |                                  |
        |                                 | <--- Submit Plaintext OTP -------+
        |                                 |      Hash input with salt        |
        |                                 |      Match hash == DB hash?      |
        |                                 |      Attempts < 3?               |
        |                                 |      Not Expired?                |
        |                                 |                                  |
        |                                 | [Valid]                          |
        |                                 | Transition Order: CONFIRMED      |
        |                                 | Decrement Finished Inventory     |
        |                                 | [Invalid]                        |
        |                                 | Increment Attempt Counter        |
        +                                 +                                  +
```

1. **Entropy**: Plaintext OTP is generated using cryptographic PRNG (`node:crypto` / `globalThis.crypto.getRandomValues`).
2. **Zero Plaintext Storage**: Plaintext OTP is never saved to the database. Only the SHA-256 hash is recorded in `delivery_otps`.
3. **TTL & Brute-Force Defense**: OTP tokens expire after 24 hours. A maximum of 3 failed verification attempts is strictly enforced before invalidation.

---

## 4. Middleware & HTTP Hardening

- **Helmet**: Disables `X-Powered-By`, sets `X-Content-Type-Options: nosniff`, and configures strict Content-Security-Policy headers.
- **CORS**: Strict origin whitelist configured via `CORS_ORIGIN` environment variable.
- **Rate Limiting**: `express-rate-limit` enforces rate bounds on authentication and mutation routes to mitigate denial-of-service and brute-force attempts.
- **Audit Logging**: Every mutation, login attempt, state change, and inventory adjustment records an append-only row in `audit_logs` containing user ID, IP address, timestamp, and JSON payloads.
