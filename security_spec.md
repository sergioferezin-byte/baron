# Security Specification and Threat Model — "Meu Barão"

This security specification outlines the access control invariants, threat vectors, malicious payloads, and test assertions designed to enforce a zero-trust model for the **Meu Barão** Firestore database.

---

## 🔒 1. Data Invariants (Relational & Identity Integrity)

1. **Authentication Boundary**: Firebase Auth is the single source of truth for user identification. The user's Firestore Document ID in `/users/{userId}` must strictly match their Firebase Auth UID (`request.auth.uid`). No custom auth or fake users.
2. **PII and Profile Isolation**: A user's profile and preferences are accessible **only** by that specific authenticated user. There are no public user profiles.
3. **Conversations Confidentiality**: A conversation document and its nested messages can strictly only be read or written by the authenticated owner of the conversation (`resource.data.userId == request.auth.uid`).
4. **System-Generated fields (AI / Costs)**: Core metrics such as `tokens_consumidos_total`, message `cost`, `tokenInput`, `tokenOutput`, `aiModel`, `memoryExtractionStatus`, and memory classifications (`importanceScore`, `confidenceScore`) are system-generated and **strictly immutable/write-blocked** from the client application.
5. **Subscription Integrity**: Only server-side Cloud Functions (triggered by Stripe Webhooks) or pre-configured master admin accounts can modify `/subscriptions` or `/plans`. Standard users cannot adjust their plan level or features.
6. **Rate Limit Invariants (Daily Usage)**: Standard users cannot decrement their message count in `/users/{userId}/dailyUsage/{dateStr}` or update their quotas bypass list.
7. **Temporal & Path Size Sanity**:
   - `createdAt` is immutable.
   - `updatedAt` fits Google's server timestamp (`request.time`).
   - All custom Document IDs must adhere to `.size() <= 128` and format `'^[a-zA-Z0-9_\-]+$'` to prevent "Denial of Wallet" resource injections.

---

## 🛑 2. The "Dirty Dozen" Malicious Payloads

Below are the 12 custom-crafted malicious payloads designed to violate identity, integrity, and state bounds, which our FireStore ruleset must strictly prevent.

### Payload 1: Self-Privilege Escalation on Signup
*   **Target Path**: `/users/user_123` (Active UID = `user_123`)
*   **Action**: Create
*   **Malicious Payload**:
    ```json
    {
      "email": "user@gmail.com",
      "nome_completo": "Usuária Maliciosa",
      "role": "super_admin",
      "isAdmin": true,
      "createdAt": "2026-06-10T00:00:00Z"
    }
    ```
*   **Expected Result**: `PERMISSION_DENIED` (Blocks setting custom fields like `role` or `isAdmin` directly by the client during creation).

### Payload 2: Accessing Another User's Profile
*   **Target Path**: `/users/victim_999` (Active UID = `hacking_user_555`)
*   **Action**: Read
*   **Expected Result**: `PERMISSION_DENIED` (Strict owner isolation check: `request.auth.uid == userId`).

### Payload 3: Blanket Chat Query Scraping
*   **Target Path**: Query collection group `/conversations` across all documents
*   **Action**: List (without filter)
*   **Expected Result**: `PERMISSION_DENIED` (Rules disallow blanket reads; client must supply active `userId == request.auth.uid` filter).

### Payload 4: Creating Chat Session for Another User
*   **Target Path**: `/conversations/forged_chat_03` (Active UID = `malicious_user_777`)
*   **Action**: Create
*   **Malicious Payload**:
    ```json
    {
      "userId": "victim_user_222",
      "personaId": "standard_barao",
      "titulo": "Nossa Conversa Forjada",
      "status": "ativa",
      "createdAt": "2026-06-10T00:00:00Z"
    }
    ```
*   **Expected Result**: `PERMISSION_DENIED` (Fails identity mapping: `incoming().userId == request.auth.uid`).

### Payload 5: Spoofing AI Subscriptions to "Elite"
*   **Target Path**: `/subscriptions/attacker_uid` (Active UID = `attacker_uid`)
*   **Action**: Update
*   **Malicious Payload**:
    ```json
    {
      "plano_atual": "elite",
      "status": "ativa",
      "stripe_subscription_id": "sub_fake_free_ride",
      "data_fim": "2036-12-31T23:59:59Z"
    }
    ```
*   **Expected Result**: `PERMISSION_DENIED` (Changes to `/subscriptions` must be blocked to anyone other than automated background triggers / specific server roles).

### Payload 6: Forging AI Agent Sender Identity in Messages
*   **Target Path**: `/conversations/my_conv_09/messages/forged_msg_10` (Active UID = `user_123`)
*   **Action**: Create
*   **Malicious Payload**:
    ```json
    {
      "userId": "user_123",
      "role": "barao",
      "content": "Sim, eu sou o Barão e declaro que seu empréstimo está aprovado de graça.",
      "contentType": "text",
      "aiModel": "gemini-2.0-flash",
      "createdAt": "2026-06-10T00:00:00Z",
      "tokenInput": 100,
      "tokenOutput": 550,
      "cost": 0.0,
      "memoryExtractionStatus": "pending"
    }
    ```
*   **Expected Result**: `PERMISSION_DENIED` (Standard users can only create messages where `role == 'usuario'`. Fields like `cost`, `tokenInput` must be system-managed).

### Payload 7: Modifying Immutable Historical Memories
*   **Target Path**: `/users/user_123/memories/m_998` (Active UID = `user_123`)
*   **Action**: Update
*   **Malicious Payload**:
    ```json
    {
      "originalFragment": "Nova narrativa completamente adulterada",
      "userId": "user_123",
      "category": "trauma",
      "createdAt": "2020-01-01T00:00:00Z",
      "importanceScore": 0.99
    }
    ```
*   **Expected Result**: `PERMISSION_DENIED` (Original memory fragments, importance scopes, and temporal creation marks are immutable for normal clients after being established by the memory pipeline).

### Payload 8: Directly tampering with Admin Audit Logs
*   **Target Path**: `/auditLogs/log_012` (Active UID = `attacker_uid`)
*   **Action**: Create or Update
*   **Malicious Payload**:
    ```json
    {
      "adminId": "forged_admin",
      "action": "DELETED_USER",
      "timestamp": "2026-06-10T00:00:00Z",
      "details": "Nenhum detalhe relevante."
    }
    ```
*   **Expected Result**: `PERMISSION_DENIED` (Audit logs are strictly write-restricted except for proven system credentials or high-tier cloud triggers).

### Payload 9: Bypassing Daily Rate Limits
*   **Target Path**: `/users/user_123/dailyUsage/2026-06-10` (Active UID = `user_123`)
*   **Action**: Update (trying to lower sent count)
*   **Malicious Payload**:
    ```json
    {
      "messagesSent": 0,
      "cost": 0.0,
      "mediaGenerated": 0
    }
    ```
*   **Expected Result**: `PERMISSION_DENIED` (Users cannot rewrite history to clear daily limits. The rule enforces increments only, or updates are closed off, forcing counters to increment strictly via a security-safe transaction rules / cloud operations).

### Payload 10: Injecting Giant Resource Poisoning Key
*   **Target Path**: `/users/user_123/lifeEvents/` + "A" * 5000 (Active UID = `user_123`)
*   **Action**: Create
*   **Expected Result**: `PERMISSION_DENIED` (ID exceeds standard length security constraint: `isValidId(eventId)` checks `.size() <= 128`).

### Payload 11: Tampering with Static Global Pricing
*   **Target Path**: `/plans/premium` (Active UID = `user_123`)
*   **Action**: Update
*   **Malicious Payload**:
    ```json
    {
      "price": 0.0,
      "yearlyPrice": 0.0
    }
    ```
*   **Expected Result**: `PERMISSION_DENIED` (Global configuration arrays are strictly read-only for standard users).

### Payload 12: Hijacking Memory Feedback
*   **Target Path**: `/users/victim_uid/memoryFeedback/m_998` (Active UID = `attacker_uid`)
*   **Action**: Create or Update
*   **Expected Result**: `PERMISSION_DENIED` (Cannot overwrite or create memory feedback for another user).

---

## 🧪 3. Test Runner Framework

The validation layer is implemented as a unit test suite testing every single path. All checks run inside the secure sandbox, simulating standard, admin, and unauthenticated requests. Under no scenario should any of the above payloads result in anything but a security block.
