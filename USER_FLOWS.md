# User Flows

How each kind of user moves through Volo, drawn from what the code actually
does today, not what it is meant to do eventually. Each step is marked:

- **Plain box**: works end to end.
- **Red box**: the screen exists, but the step is broken or incomplete.
- **Grey dashed box**: not built at all.

The diagrams render on GitHub. Locally, use any Markdown viewer with
Mermaid support.

## Who's who

```mermaid
flowchart LR
    OP["Operator<br/>(tenant: a taxi company,<br/>co-op, or Volo itself)"]
    APP["Operator's branded app<br/>(one EAS build per operator)"]
    BE["Shared Volo backend<br/>(data separated per operator)"]
    R["Rider"]
    D["Driver"]
    A["Admin"]
    F["Fleet owner"]
    GW["Payment gateways<br/>Stripe · Razorpay · PayPal"]

    OP -->|"gets a Tenant row +<br/>own app build"| APP
    R --> APP
    D --> APP
    A --> APP
    F -.-> APP
    APP -->|"every request carries<br/>X-Tenant-Slug + login token"| BE
    BE <-->|"checkout links,<br/>webhooks confirm payment"| GW

    classDef missing fill:#f2f2f2,stroke:#999,stroke-dasharray:5 5,color:#666
    class F missing
```

Every rider, driver and admin account belongs to exactly one operator. The
same phone number can have separate accounts with different operators.
Everyone starts as a rider: drivers are riders whose application an admin
approved, and admins are set up directly in the database (see
[Admin](#admin)).

## Rider

```mermaid
flowchart TD
    START(["Open app"]) --> LOGIN["Login screen<br/>pick 'Rider', enter phone number"]
    LOGIN --> OTP["Invisible reCAPTCHA check,<br/>SMS code from Firebase"]
    OTP --> VERIFY["Enter code<br/>POST /auth/verify-otp"]
    VERIFY --> NEW{"First login?"}
    NEW -->|yes| BONUS["$10 welcome credit<br/>+ 4-step onboarding"]
    NEW -->|no| HOME
    BONUS --> HOME["Home: map with your location"]

    HOME --> DEST["Pick destination<br/>(search, suggestions, voice)"]
    DEST --> FARE["Fare estimate<br/>POST /rides/fare-estimate"]
    FARE --> CHOICE{"Ride now or later?"}
    CHOICE -->|later| SCHED["Schedule ride<br/>POST /rides/schedule<br/>(optional $1 priority deposit)"]
    CHOICE -->|now| REQ["Confirm Ride<br/>POST /rides/request"]

    REQ --> PAY["Payment screen:<br/>choose a method"]
    PAY --> M{"Method"}
    M -->|Wallet| W["Paid instantly<br/>from wallet balance"]
    M -->|Cash| C["Told to pay the driver;<br/>stays unpaid until<br/>driver confirms"]
    M -->|"Razorpay / PayPal"| H["Gateway's hosted page<br/>opens in browser;<br/>webhook confirms payment"]
    M -->|Stripe| S["Payment intent created,<br/>but no card form in the app"]

    W --> WAIT
    C --> WAIT
    H --> WAIT
    S --> WAIT
    WAIT["Waiting for a driver<br/>(listening on the ride's socket room)"]
    WAIT -->|"driver accepts"| ACC["Driver assigned:<br/>Track, Chat and SOS buttons appear"]
    ACC --> TRACK["Live Tracking:<br/>driver's car moves on the map"]
    ACC --> CHAT["Chat with driver"]
    TRACK -->|"driver ends trip"| DONE(["'Trip completed'"])
    DONE -.-> RATE["Rate the driver"]

    HOME --> SIDE["Side menu and tabs"]
    SIDE --> WALLET["Wallet: balance, top up,<br/>transaction history"]
    SIDE --> REF["Referral code"]
    SIDE --> SUP["Support ticket"]
    SIDE --> HIST["Trip history<br/>GET /rides/passenger"]
    SIDE --> PROF["Profile<br/>GET /auth/me"]
    SIDE --> SOS["Safety Center (SOS)<br/>see below"]
    SIDE --> BECOME["'Become a Driver'<br/>(see Driver onboarding)"]

    classDef broken fill:#fde2e2,stroke:#c62828,color:#7f0000
    classDef missing fill:#f2f2f2,stroke:#999,stroke-dasharray:5 5,color:#666
    class S broken
    class RATE missing
```

**Not working yet:**
- **Stripe (red):** the server creates the payment, but there's no card form in the app, so it can never complete.
- **Rating (grey):** the API exists (`POST /reviews`), but there's no screen for it.

### SOS

Reachable from the side menu, from the home screen once a ride is active,
from the live tracking screen, and from the driver's trip screen.

```mermaid
flowchart TD
    A(["Open SOS"]) --> B{"Emergency contacts<br/>saved?"}
    B -->|no| ADD["Add contacts on the same screen<br/>POST /platform/emergency-contacts"]
    ADD --> HOLD
    B -->|yes| HOLD["Hold the SOS button for 2 s"]
    HOLD --> GPS["Get current GPS position"]
    GPS --> LOG["Record the emergency on the server<br/>POST /platform/sos<br/>(location + ride; never blocks the alert)"]
    GPS --> SMS["Phone's SMS app opens, addressed<br/>to all contacts, with a map link"]
    SMS --> R{"User sent it?"}
    R -->|yes| OK(["'Alert sent to N contacts'"])
    R -->|no| RETRY(["'Alert was not sent' —<br/>hold again or call"])
    A --> CALL["'Call emergency services (112)'<br/>always visible"]
```

No SMS provider is configured, so the alert goes out through the phone's own
SMS app. The screen only says the alert was sent when the phone confirms it.

## Driver

### Onboarding: from rider account to driver

```mermaid
flowchart TD
    A(["Logged in as a rider"]) --> B["Side menu → 'Become a Driver'"]
    B --> C["Driver Verification screen:<br/>licence, vehicle, insurance"]
    C --> D["Upload ID photos<br/>POST /upload/id-proof<br/>(private S3 bucket)"]
    D --> E["Submit application<br/>POST /auth/driver-verification"]
    E --> F["Application 'pending';<br/>account is still a rider"]
    F --> REVIEW{"Admin reviews it"}
    REVIEW -->|reject, with a reason| REJ["Application 'rejected';<br/>rider can fix it and resubmit"]
    REJ --> C
    REVIEW -->|approve| APP["Application 'approved';<br/>account becomes a driver"]
    APP --> G["Log in again"]
    G --> H(["Lands on Driver Home"])
    REJ -.-> NOTIFY["Applicant is told the outcome"]
    APP -.-> NOTIFY

    classDef missing fill:#f2f2f2,stroke:#999,stroke-dasharray:5 5,color:#666
    class NOTIFY missing
```

**Grey step:** the applicant isn't notified of the decision. They find out by
logging in again (approved) or reopening the form (rejected).

### Taking a trip

```mermaid
flowchart TD
    A(["Driver Home"]) --> B["List of waiting ride requests<br/>GET /rides/pending<br/>refreshes every 10 s"]
    B --> C["Tap 'Accept'<br/>POST /rides/accept/:id"]
    C --> D{"Still available?"}
    D -->|"no: another driver<br/>got there first"| B
    D -->|yes| E["Allow location access"]
    E --> F["Trip in progress:<br/>GPS sent every ~4 s / 10 m<br/>to the rider's map<br/>(Chat with rider and SOS buttons)"]
    F --> G{"Did the rider<br/>choose cash?"}
    G -->|yes| H["'Confirm Cash Received ($X)'<br/>POST /rides/confirm-cash/:id<br/>→ ride marked paid"]
    G -->|no| I
    H --> I["'End Trip'<br/>(warns if cash not yet confirmed)"]
    I --> K["POST /rides/complete/:id<br/>→ ride 'completed', platform fee<br/>from the operator's commission rate"]
    K --> J(["Back to the request list"])
```

If completing the trip fails, the trip stays open with GPS still running so
the driver can retry.

## One ride, start to finish

The same trip seen across the rider's app, the backend, the driver's app and
the payment gateway, using Razorpay as the example.

```mermaid
sequenceDiagram
    autonumber
    participant R as Rider app
    participant B as Backend
    participant D as Driver app
    participant G as Razorpay

    R->>B: POST /rides/request
    B-->>R: ride created (pending)
    R->>B: join ride's socket room
    R->>B: POST /rides/pay (razorpay)
    B->>G: create payment link
    G-->>B: hosted checkout URL
    B-->>R: checkoutUrl
    R->>G: rider pays in browser
    G->>B: webhook: payment_link.paid (signed)
    Note over B: ride marked paid — only the<br/>webhook can do this, never the app

    loop every 10 seconds
        D->>B: GET /rides/pending
    end
    D->>B: POST /rides/accept/:id
    Note over B: atomic update: only one<br/>driver can win the ride
    B-->>R: socket: accepted + driver name
    D->>B: join ride's socket room

    loop during the trip
        D->>B: socket: updateLocation (lat, lng)
        B-->>R: socket: driver's new position
    end

    D->>B: POST /rides/complete/:id
    Note over B: status completed,<br/>platform fee recorded
    B-->>R: socket: completed
```

With **cash** instead of Razorpay, steps 4–9 become: the rider picks cash,
the driver's screen shows "Confirm Cash Received", and the ride is marked paid
only when the driver taps it.

## Admin

```mermaid
flowchart TD
    SETUP(["Account's role set to 'admin'<br/>in the database"]) --> A["Logs in as usual"]
    A --> B["'Admin' button and side-menu<br/>entry appear (admins only)"]
    B --> C["Admin dashboard:<br/>users, rides, earnings<br/>for this operator only"]
    C --> APPS["Driver applications queue<br/>GET /admin/driver-applications"]
    APPS --> DEC{"Decision"}
    DEC -->|approve| AP["POST .../approve<br/>→ account becomes a driver"]
    DEC -->|"reject + reason"| RJ["POST .../reject"]
    APPS -.-> VIEW["View the uploaded ID photos"]
    C -.-> E["Manage coupons and campaigns"]
    C -.-> F["Answer support tickets"]
    C -.-> G["Refunds and disputes"]
    C -.-> H["Suspend riders or drivers"]

    classDef missing fill:#f2f2f2,stroke:#999,stroke-dasharray:5 5,color:#666
    class VIEW,E,F,G,H missing
```

Every `/admin` endpoint checks the stored role on each request, not the one
in the login token, so removing someone's admin role takes effect right away.
An admin only sees and acts on their own operator's data.

**Grey steps:** the queue shows how many ID photos an applicant uploaded, but
there's no way to view them yet (the bucket is private, so this needs
short-lived signed links). The other admin tools aren't built.

## Fleet owner

```mermaid
flowchart TD
    A(["Fleet owner"]) -.-> B["Add drivers to my fleet"]
    B -.-> C["See my fleet's live locations"]
    C -.-> D["Fleet earnings and payouts"]

    classDef missing fill:#f2f2f2,stroke:#999,stroke-dasharray:5 5,color:#666
    class A,B,C,D missing
```

The `fleet_owner` role and a "managed by" link between accounts exist in the
database, but no screen or endpoint uses either yet.

## Operator (onboarding a new white-label tenant)

```mermaid
flowchart TD
    A(["New operator signs up"]) --> B["Insert a Tenant row:<br/>slug, name, logo, colour,<br/>commission rate<br/>(directly in the database, no admin UI yet)"]
    B --> C["New EAS build profile with<br/>EXPO_PUBLIC_TENANT_SLUG,<br/>own app name, icon, bundle ID"]
    C --> D["Build and submit to<br/>App Store / Play Store"]
    D --> E["App fetches branding at runtime<br/>GET /platform/tenant-config"]
    E --> F(["Operator's riders and drivers<br/>use their own app; their data never<br/>mixes with other operators'"])
    B -.-> G["Self-serve signup and<br/>operator dashboard"]
    B -.-> H["Payouts to the operator's<br/>own gateway accounts"]

    classDef missing fill:#f2f2f2,stroke:#999,stroke-dasharray:5 5,color:#666
    class G,H missing
```

Full steps are in
[PRODUCTION_DEPLOYMENT.md](PRODUCTION_DEPLOYMENT.md#7-onboarding-a-new-white-label-operator).

## What's still missing

| Area | Problem | Impact |
|---|---|---|
| Stripe | No card form in the app | Stripe can't be used to pay |
| ID review | Admins can't view uploaded ID photos | Approvals rely on the typed licence details only |
| Ratings | API only, no screen | Ratings never get collected |
| Notifications | Applicants aren't told when they're approved or rejected | They have to check by logging in again |
| Admin setup | Admins are created by editing the database | Fine for a handful of operators |
| Admin tools | No coupons, support inbox, refunds or suspensions | Those are handled outside the app |
| Fleet owner | Role exists, nothing built | — |
| Operator tools | Tenants added by hand in the database | Fine for a handful of operators |
