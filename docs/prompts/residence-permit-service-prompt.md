# Prompt: Residence Permit Appointment Booking Service

```
ROLE
You are a senior software architect working on the Yıldırım platform
(Next.js + NestJS + PostgreSQL/Prisma) — an educational services platform
for students planning to study in Turkey, built on a configurable field
engine (profile_sections + field_definitions + service_requirements) that
is shared between the student profile and the services catalog.

TASK: Add a complete new service called "Residence Permit Appointment
Booking" (حجز موعد إقامة), modeled on Turkey's official student residence
permit application (e-ikamet). I verified the field list against the
official process before writing this spec.

CONTEXT: My project is modular, and every service pulls its requirements
from a shared field catalog that is reused in the student profile. This
service is different: part of its data is permanent (reusable across future
services) and part is specific to the moment of application only and must
NEVER be stored in the reusable student profile — this distinction is
detailed precisely below.

────────────────────────────────────────────────────────────────
1) NEW FIELDS TO ADD TO THE PERMANENT STUDENT PROFILE (reusable)
────────────────────────────────────────────────────────────────
These are genuine student attributes needed by any future residence-related
service too — add them to the existing field engine under new/extended
profile_sections:

  a) Extend the existing "Personal Information" section (personal_info —
     do NOT duplicate the existing nationality / gender / birth_date
     fields):
     - Place of birth (text)
     - Country of birth (SELECT from the existing countries list)
     - Marital status (SELECT: single/married/divorced/widowed — add as a
       new admin-manageable list)
     - Given name as in passport (Latin text)
     - Surname as in passport (Latin text)
     - Father's name (text)
     - Mother's name (text)

  b) New section "Passport Information" (passport_info):
     - Passport number (text)
     - Passport type (SELECT: ordinary / special / service / diplomatic)
     - Passport issue date (date)
     - Passport expiry date (date)
     - Passport issuing country (SELECT from the countries list)

  c) New section "Address in Turkey" (residence_contact):
     - Current address in Turkey (long text)
     Note: phone number and email already exist as core account fields
     (users.phoneE164, users.email) — do not create duplicate fields; reuse
     the existing values when building the request snapshot.

  d) New section "University in Turkey" (turkey_university_info) —
     separate from the existing academic_info section (which is about
     university-placement admission, not residence):
     - University type (SELECT: state / foundation)
     - Enrollment date (date)
     - Expected graduation date (date)
     - University name (text)
     - University address (text)
     - Student number (text)
     - Faculty (text)
     - Major/department (text)
     - Class/year level (text or number)
     - Health insurance available (BOOLEAN)
     - Insurance type (text, shown only when "available" = true —
       conditional field display in the UI)

────────────────────────────────────────────────────────────────
2) SERVICE-ONLY FIELDS (one-time — asked exclusively on this service's
   apply page, never stored in the reusable profile, never exposed as a
   normal service_requirements entry)
────────────────────────────────────────────────────────────────
This requires an architectural extension: the existing UNIVERSITY_PLACEMENT
/GENERAL services derive all their requirements from the reusable field
catalog. This service needs an additional layer of "service-specific extra
questions," defined at the service level (not the shared catalog), answered
once at application time, and persisted only inside the request's own data
(the same way answers_snapshot already freezes profile answers today) —
propose the design of this layer (e.g. a service_extra_fields table, or a
JSON schema on the service) before implementing, and check in with me if
there's more than one reasonable option.

Fields:
  - Registration type (SELECT: first-time application / extension) —
    required
  - Requested duration in months (number) — required
  - Requested residence start date (date) — required
  - Target immigration office / branch (SELECT from an admin-manageable
    list, or free text if no official branch list is available) —
    required
  - Requested date and time for document submission (date + time) —
    required

────────────────────────────────────────────────────────────────
3) PROFILE PHOTO VALIDATION (biometric, white background only)
────────────────────────────────────────────────────────────────
This is a genuine government requirement (verified: a recent biometric
photo taken within the last 6 months with a white background) — implement
it as an automatic check in the existing profile-photo upload pipeline
(ProfileService.storeProfilePhoto via sharp):
  - After the existing signature check (JPEG/PNG/WebP), add a background
    check: sample pixels from the four corners/edges and confirm they are
    near-white (high brightness + low channel variance — a tunable
    threshold).
  - On failure: reject the upload with a clear Arabic message ("Photo
    background must be fully white") instead of silently accepting it.
  - This check is fully automatic, with no human review, and applies to
    every profile-photo upload account-wide — not just for this service,
    since it's a general requirement for any future residence-related
    service too.

────────────────────────────────────────────────────────────────
4) STUDENT FLOW
────────────────────────────────────────────────────────────────
  1. The student opens the service from the "Services" page (same
     eligibility pattern already in place via GET /catalog/my-services): if
     any section-(1) fields are missing from their profile, the card shows
     locked with the exact list of missing fields (reuse the existing
     eligibility mechanism — don't reinvent it).
  2. If the profile is complete, the service detail page opens, and only
     there do the section-(2) service-specific fields appear (registration
     type, duration, date, office branch, submission appointment) as an
     extra form before the "Apply Now" button.
  3. On submit, the request is created with a snapshot combining the
     required profile data + the service-specific answers together.

────────────────────────────────────────────────────────────────
5) STAFF FLOW (supervisor/admin)
────────────────────────────────────────────────────────────────
  - The request appears in this service's existing request queue, and the
    detail view shows all the student's pulled data (personal + passport +
    address + university) plus the service-specific answers (registration
    type, duration, etc.).
  - The supervisor/admin actually books the real appointment on the
    government system outside our platform, then records the booking
    outcome in our system: the confirmed office/branch + confirmed
    appointment date and time (which may differ from what the student
    requested) + an optional note.
  - Propose how this integrates with the existing state machine
    (REQUEST_STATUSES in packages/shared): should the "confirmed
    appointment" be new structured fields on Request (similar to
    acceptedChoiceId/acceptanceLetterFileId for UNIVERSITY_PLACEMENT
    services), or is a generic outcome field + a note in
    request_status_history sufficient? Discuss the best design with me
    before implementing — this is a new precedent (the first GENERAL
    service that needs a structured "outcome" beyond simple
    accept/reject).

────────────────────────────────────────────────────────────────
WHAT I NEED FROM YOU RIGHT NOW
────────────────────────────────────────────────────────────────
Do not implement yet. First present:
  1. The detailed technical design of the "service-specific questions"
     layer (section 2).
  2. The design of this service's "outcome" (section 5) and how it
     integrates with the state machine.
  3. Any conflict or overlap you notice between these new fields and
     fields that already exist in the catalog.
Once I approve these three points, proceed with full implementation:
migration, seed data, API, and both student and staff UI, with the same
thorough live testing we've done at every previous stage of this project.
```
