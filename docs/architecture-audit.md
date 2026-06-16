# School HR System Architecture Audit

## Current Stack

- Frontend: React 19, TypeScript, Vite, Tailwind CSS v4.
- Backend/Data: Supabase Auth, Postgres tables, Supabase Storage.
- Documents: `pdf-lib`, `react-pdf`, `jspdf`, `html2canvas`, `mammoth`, `react-quill-new`.
- UI direction: Arabic RTL.

## What Already Worked

- Login and role lookup from `employees` with legacy fallback to `users`.
- Admin and employee dashboards.
- Creating HR requests and assigning them by employee email.
- Text templates, DOCX import, PDF template upload, and basic PDF field mapping.
- Employee response form with attachments and canvas signature.
- Embedded request-level audit trail.

## Main Risks Found

- Role logic was scattered in screens and allowed unsafe default admin inference from email text.
- `/request/:id` was reachable by link without checking the authenticated owner.
- Request transitions were UI-driven and allowed non-principal roles to approve.
- Deletes were destructive for requests and templates.
- File upload validation was not centralized.
- PDF field metadata did not include required/filled-by/font-size/options.
- Audit log and notifications did not exist as central database entities.
- README was the generated AI Studio boilerplate, not project documentation.

## Phase 1 Improvements Applied

- Added centralized RBAC service.
- Added centralized workflow transition service.
- Added audit log service with request-level fallback.
- Added notification service with migration-backed table.
- Added centralized file validation.
- Hardened app role fallback to default employee only.
- Protected request access by authenticated owner or administrative role.
- Converted request deletion to archival.
- Converted template deletion to archival.
- Added employee active/inactive handling.
- Expanded PDF fields with required, filled-by, font size, select, checkbox, and system fields.
- Switched PDF workers from external CDN to local bundled worker.
- Removed runtime `console` logging from source files.

## Remaining Recommended Work

- Move workflow enforcement to Supabase RPC or Edge Functions for stronger backend guarantees.
- Replace public employee lookup in sign-up with a dedicated invite or verification RPC.
- Add a real notifications center in the top bar.
- Add pagination UI for requests and employees.
- Add automated browser smoke tests for role flows.
- Generate final text-template PDFs server-side for stronger archival reliability.
