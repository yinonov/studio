❑ CONTEXT  

- [x] We’re building a contract-generation SaaS on Firebase Hosting + Firestore.  
- [x] Users complete a browser-based form and see a live HTML preview (supports LTR & RTL).  
- [x] Responses are stored as structured JSON (not raw HTML).  
- [x] When “Generate & Sign” is clicked the system must:  
  - [x] Send the HTML (plus embedded CSS) to **DocRaptor** and receive a pixel-perfect, immutable **PDF/A-2u** that embeds Hebrew fonts and mirrors RTL margins.  
  - [x] Produce a low-resolution JPEG/PNG of page 1, water-marked “DRAFT”, to prevent copy-and-paste before payment/signature.  
  - [x] Initiate an embedded Dropbox Sign flow; after signing, store the signed PDF and audit trail.

❑ TASKS FOR YOU

- [x] read <https://developers.hellosign.com/docs/embedded-signing/walkthrough> and <https://docraptor.com/documentation>

# To-Do List

## 1. Architecture and Setup

- [x] Project structure and Firebase configuration outlined.
- [x] Create `functions/src/services/docraptor.ts`.
- [x] Create `functions/src/services/dropbox-sign.ts`.
- [x] Create `functions/src/services/pdf.ts`.

## 2. Data Model and Security

- [x] Define the full contract data model in `src/types/schemas.ts`, including status, DocRaptor, and Dropbox Sign-related fields.
- [x] Update `storage.rules` to restrict access to contract assets (PDFs and thumbnails) to the owner and invited signers.

## 3. Backend (Cloud Functions)

- [x] Implement `generatePdfForSigning` Cloud Function:
  - [x] Call DocRaptor's REST API with the HTML payload.
  - [x] Poll for the asynchronous completion URL.
  - [x] Save the PDF to Cloud Storage.
- [x] Implement `generateDraftThumbnail` Cloud Function:
  - [x] Reuse `generatePdfForSigning` to ensure the PDF is present.
  - [x] Rasterise page 1 to JPEG using Poppler `pdftoppm` or `pdf.js`.
  - [x] Overlay a "DRAFT" watermark.
  - [x] Upload the thumbnail to Cloud Storage.
- [x] Implement `initiateDropboxSignSession` Cloud Function:
  - [x] Call Dropbox Sign's `/signature_request/create_embedded` endpoint.
  - [x] Use text tags for signature fields.
  - [ ] Handle callbacks from Dropbox Sign.
  - [x] Update the contract status in Firestore.

## 4. CI/CD

- [ ] Create a GitHub Actions pipeline (`.github/workflows/deploy.yml`) to:
  - [ ] Build and test the functions.
  - [ ] Run a Playwright visual test to verify Hebrew text rendering.
  - [ ] Deploy to Firebase Hosting and Functions.

## 5. Scalability and Performance

- [ ] Implement rate-limiting for DocRaptor calls.
- [ ] Implement caching for generated PDFs.
- [ ] Research and document cold-start mitigation strategies for Cloud Functions.
- [ ] Provide guidance on when to migrate thumbnail/PDF generation to Cloud Run.

## 6. Compliance and Accessibility

- [ ] Document the reasons for using PDF/A-2u.
- [ ] Document how audit trails are retained.
- [ ] Document WCAG considerations for RTL documents.

## 7. Documentation

- [ ] Document how to package Hebrew fonts into the DocRaptor HTML.
- [ ] Document how to bundle Poppler binaries in Cloud Functions/Run.

more info:
the app data models convention uses zod.
leverage text tags in dropbox sign.
there are .env files in the root and in functions to be used for firebase, dropbox sign (hellosign), docRaptor.

All code should run after `npm install && npm run build` both on root and functions.
