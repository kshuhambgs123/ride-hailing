# Before You Launch: Prerequisites and Government Benefits (Delhi NCR)

Everything to have in place before real riders and drivers use Volo in Delhi
NCR, in the order to do it, plus the government schemes you can use along the
way.

> **Read this first.** This is a planning checklist, not legal or tax advice.
> Government schemes, limits and rules change, often in every Union Budget.
> Before you act on any item, confirm it on the official portal linked, and
> run the licensing and tax sections past a transport lawyer and a chartered
> accountant (CA). Where a detail is especially likely to have changed, it's
> marked *(verify)*.

For the technical deployment steps, see
[PRODUCTION_DEPLOYMENT.md](PRODUCTION_DEPLOYMENT.md). For how each user moves
through the app, see [USER_FLOWS.md](USER_FLOWS.md).

---

## The order that matters

Some steps unlock others, so do them roughly in this sequence:

```
1. Register the company  →  2. Bank account, GST, Udyam  →  3. DPIIT Startup recognition
        →  4. Apply for grants / incubators (needs 3)
        →  5. Licence + driver/vehicle compliance  →  6. Finish the app  →  7. Pilot in one corridor
```

Registering the company early matters for two reasons. Investors and most
government schemes only deal with a registered company. And some schemes
(like the Seed Fund) have age limits counted from your incorporation date.

---

## Part A: Prerequisites before launch

### 1. Company and registrations

- [ ] **Register a Private Limited company.** Done online through the
      Ministry of Corporate Affairs (MCA) SPICe+ form at
      [mca.gov.in](https://www.mca.gov.in). It also issues your company PAN and TAN. A Pvt Ltd
      (not a sole proprietorship) is what investors and most startup schemes
      expect. A CA or an online filing service typically handles this.
- [ ] **Open a current bank account** in the company's name. Razorpay and
      every grant pay into it.
- [ ] **Register for GST** at [gst.gov.in](https://www.gst.gov.in). A ride platform needs this
      from the start (see Tax below), not only once you cross a turnover
      threshold.
- [ ] **Udyam (MSME) registration.** Free and online at
      [udyamregistration.gov.in](https://udyamregistration.gov.in). Unlocks MSME loan and payment protections
      (see Part B).
- [ ] **DPIIT Startup India recognition.** Free, at
      [startupindia.gov.in](https://www.startupindia.gov.in). Required for most startup benefits. See Part B for
      eligibility.
- [ ] **Brand name and trademark.** Before you spend on marketing, run a
      trademark search for "Volo" (or your final name) on the IP India
      portal and file an application. Ride and transport brand names are
      crowded, and rebranding after launch is expensive. DPIIT recognition
      gives a discount on trademark fees.

### 2. Licences for running a ride-hailing service

- [ ] **Aggregator licence.** Delhi, Uttar Pradesh (Noida, Ghaziabad) and
      Haryana (Gurugram, Faridabad) each license ride-hailing platforms
      separately. Delhi has its own aggregator scheme (2023), and the central
      Motor Vehicle Aggregator Guidelines set baseline rules (driver checks,
      insurance, fare and surge limits) that states apply. *(verify the
      current scheme, fees and security deposit with each state's transport
      department)*
- [ ] **Decide where you launch first.** Launching in one state's corridor
      (for example, all-Ghaziabad trips) is simpler than trips that cross
      state lines, which need the right permits on the vehicle.
- [ ] **Carpooling.** Paid rides in private (white-plate) cars are a legal
      grey area. Get a written opinion from your lawyer before offering
      carpooling for money.
- [ ] **Grievance officer.** India's consumer e-commerce rules and IT rules
      expect a named grievance officer and a complaint process for platforms.
      Publish contact details in the app and on your website.

### 3. Drivers and vehicles

The app checks driver applications through admin approval. These are the
real-world checks your admins approve against:

- [ ] **Commercial vehicle documents:** commercial (yellow-plate)
      registration, the right permit, valid fitness certificate, pollution
      certificate (PUC) and commercial insurance.
- [ ] **Driver documents:** valid commercial driving licence and, where
      required, a PSV badge. *(verify current requirements per state)*
- [ ] **Police verification** of every driver before their first ride.
- [ ] **Insurance for riders and drivers.** Aggregator rules generally expect
      insurance covering passengers and drivers. Talk to insurers who cover
      fleets and platforms.
- [ ] **Driver training:** safety, app use, and your SOS and complaint
      process.
- [ ] **EV plans.** Delhi's aggregator rules push platforms toward electric
      vehicles over time. Factor this into which drivers and vehicles you
      recruit.

### 4. Money: payments and tax

- [ ] **Razorpay business account** with completed KYC (company documents,
      bank account). UPI, cards and netbanking come through Razorpay. Cash is
      handled in the app with driver confirmation.
- [ ] **Hide or finish Stripe.** The app shows a Stripe card option, but
      there's no card form yet. Stripe also needs extra approval for Indian
      businesses. For NCR, Razorpay plus cash is enough.
- [ ] **GST on rides.** Under GST rules, a ride platform is generally
      responsible for collecting and paying GST on passenger rides booked
      through it, at a reduced rate for cab aggregators. *(verify the current
      rate and how invoices must show it, with your CA)*
- [ ] **Tax deduction on driver payouts.** As an e-commerce operator, you
      may need to deduct a small percentage of tax at source on payouts to
      drivers and file returns for it. *(verify the current rate with your CA)*
- [ ] **Set real prices.** The app's rates (₹20 base + ₹12/km) and fixed
      amounts (₹10 welcome credit, ₹1 priority deposit, ₹2 cancellation fee,
      ₹50 referral reward) are placeholders. Compare with local Uber, Ola and
      Rapido fares in your corridor and set them deliberately. They live in
      `backend/src/services/PricingService.ts` and a few constants in the
      backend controllers.

### 5. Data, privacy and legal documents

- [ ] **Fill in and publish the legal documents.** `legal/PRIVACY_POLICY.md`
      and `legal/TERMS_OF_SERVICE.md` are drafts full of `[BRACKETED]`
      placeholders. They need your company name, address, grievance officer
      and a lawyer's review, then a public URL. Both app stores require it.
- [ ] **Digital Personal Data Protection Act (DPDP).** The app handles phone
      numbers, live locations, ID documents and emergency contacts. You need
      clear consent, a stated purpose for each kind of data, and a way for a
      user to delete their account and data.
- [ ] **Aadhaar.** Don't store full Aadhaar numbers. The app currently saves
      whatever ID number a driver types (`User.governmentId`). Change it to
      store only a masked number, or verify through DigiLocker, before
      drivers start applying.

### 6. App readiness (from the current codebase)

These are gaps found in this repository that should be fixed before real
users:

- [ ] **Stay logged in.** The login session is only kept in memory
      (`frontend/src/api/session.ts`), so users are logged out every time
      they close the app. Store it securely (e.g. `expo-secure-store`).
- [ ] **Admins can't view uploaded ID photos** yet, only how many were
      uploaded. Add secure, short-lived links so approvals check real
      documents.
- [ ] **Rating screen.** The ratings API exists, but riders have no screen to
      rate drivers.
- [ ] **Applicants aren't notified** when they're approved or rejected.
- [ ] **Error monitoring** (e.g. Sentry) on both backend and app, so you hear
      about crashes before users complain.
- [ ] **Restrict CORS** in `backend/src/index.ts` to your real domains (it's
      currently open to all).
- [ ] **Real Firebase config** and phone login tested on actual Android and
      iPhone devices on Indian mobile networks.
- [ ] **Paid hosting.** Free tiers sleep or pause, which breaks live tracking
      for real riders. See the cost notes in
      [PRODUCTION_DEPLOYMENT.md](PRODUCTION_DEPLOYMENT.md).
- [ ] **Play Store background location.** The app requests background
      location, which Google Play reviews strictly. Prepare the declaration
      explaining it's used only during an active trip, or limit tracking to
      when the app is open.
- [ ] **Store listings:** privacy policy URL, Google Play data safety form,
      screenshots, and support contact.

### 7. Pilot launch

- [ ] **One corridor first,** for example Indirapuram, Vaishali and Raj Nagar
      Extension to Noida Sector 62 and East Delhi.
- [ ] **Drivers before riders:** onboard and approve 30–50 drivers there
      before promoting to riders, so the app never looks empty.
- [ ] **Support line** (a WhatsApp number is fine to start) staffed during
      operating hours, plus an incident plan for SOS alerts and accidents.
- [ ] **Track weekly:** rides, riders who return the next week, average wait
      time, active drivers per day, and earnings per ride after costs. These
      numbers are what investors and incubators ask for.

---

## Part B: Government benefits and how to get them

### Step 1: DPIIT Startup India recognition (do this first)

Most benefits below require it. It's free.

- **Where:** [startupindia.gov.in](https://www.startupindia.gov.in) → register → apply for DPIIT recognition.
- **Typical eligibility** *(verify)*: a Private Limited company, LLP or
  registered partnership; less than 10 years since incorporation; annual
  turnover below ₹100 crore in every year so far; and working on an
  innovative or scalable product. Explain what's new in Volo, such as the
  multi-operator platform, SOS and safety design, or the driver-fair model.
- **You'll need:** certificate of incorporation, company PAN, a short
  description of the product, and ideally a pitch deck or website.

**What recognition gives you** *(verify current terms)*:
- Access to the Startup India Seed Fund and many state startup schemes.
- Cheaper and faster patent and trademark filings.
- Easier selling to government buyers (relaxed prior-experience and
  turnover rules on the Government e-Marketplace, GeM).
- Self-certification under several labour and environmental laws for the
  first years.
- A separate route to an income-tax holiday on profits for a few years
  (Section 80-IAC), which needs its own application and approval.

### Step 2: Startup India Seed Fund Scheme

Early money through approved incubators, as grants or soft loans, without
selling a big share of the company.

- **Where:** [seedfund.startupindia.gov.in](https://seedfund.startupindia.gov.in). You apply to specific incubators
  listed on the portal.
- **What it offers** *(verify)*: a grant for proof of concept, prototype and
  trials, and a larger amount as convertible debentures or debt for market
  entry and scaling.
- **Typical eligibility** *(verify)*: DPIIT-recognized, incorporated fairly
  recently (an age limit applies), and not already funded beyond a limit by
  other government schemes.
- **Tip:** apply to incubators that know mobility or consumer apps, and lead
  with pilot numbers, even small ones.

### Step 3: Incubators

Incubators give mentoring, office space, investor introductions and access to
the Seed Fund. In and around Delhi NCR, look at incubators at IIT Delhi
(FITT), IIIT Delhi, and other university and state-supported incubators.
Nationally known programmes include IIM Ahmedabad's CIIE. Many list open
calls on the Seed Fund portal.

### Step 4: Loans without collateral

- **Udyam (MSME) registration** ([udyamregistration.gov.in](https://udyamregistration.gov.in)): makes the company eligible
  for collateral-free business loans guaranteed by the government's CGTMSE
  scheme, priority lending from banks, and legal protection when your
  business customers pay late.
- **Credit Guarantee Scheme for Startups (CGSS):** government-backed
  guarantees so DPIIT-recognized startups can borrow from banks without
  pledging property. *(verify the current limit, recently raised)*
- **Stand-Up India:** bank loans for new businesses started by women or
  SC/ST entrepreneurs. *(check eligibility)*

### Step 5: Your state's startup policy

Each state runs its own startup policy with its own grants, monthly
allowances, rent support and incubator networks. Because Delhi NCR spans
three states, check all three and register the company or office where the
benefits fit best:

- **Uttar Pradesh** (Noida, Ghaziabad): has an active startup policy and
  fund. Search for the UP government's startup portal.
- **Haryana** (Gurugram, Faridabad): has a state startup policy with
  incentives for registered startups.
- **Delhi:** check the Delhi government's current startup policy.

Search "[state] startup policy" on the official state government website and
confirm what's currently open.

### Step 6: Schemes that help your drivers (and your supply)

These help drivers buy vehicles and stay financially secure, which makes it
easier to recruit them:

- **Mudra loans (PMMY):** small collateral-free loans through banks that
  drivers can use to buy a vehicle or auto. You can help drivers apply as
  part of onboarding.
- **Electric vehicle subsidies:** the central PM E-DRIVE scheme supports
  electric two- and three-wheelers, and Delhi, UP and Haryana each have EV
  policies with their own incentives. Useful if you recruit EV autos or
  bikes, and relevant to Delhi's EV push for aggregators. *(verify which
  vehicle types currently qualify)*
- **e-Shram registration:** gig and platform workers can register on the
  e-Shram portal, which links them to social security and welfare schemes
  the government is extending to platform workers. *(verify current
  benefits)*

---

## Mistakes to avoid

- **Launching before you have enough drivers:** riders who open the app and
  find no cars rarely come back.
- **Skipping the licence:** a show-cause notice or app takedown after launch
  costs far more than getting licensed first.
- **Storing full Aadhaar numbers,** or collecting data without clear
  consent.
- **Branding before a trademark search.**
- **Waiting too long to register the company:** scheme age limits count
  from incorporation, but so do the schemes you can't apply for without it.
- **Treating free hosting as production:** it sleeps and drops live
  tracking.

## A rough first 90 days

| Weeks | Focus |
|---|---|
| 1–2 | Register the company, open the bank account, GST, Udyam. Book a transport lawyer and a CA. Trademark search. |
| 2–4 | Apply for DPIIT recognition. Start licence applications. Fix the app gaps in section 6. Fill in legal documents. |
| 4–6 | Apply to incubators and the Seed Fund. Set real prices. Razorpay KYC. Move to paid hosting. |
| 6–8 | Recruit and verify the first 30–50 drivers in one corridor. Soft launch to friends, family and one housing society. |
| 8–12 | Open the corridor to the public. Track weekly numbers. Use them for incubator interviews and investor conversations. |
