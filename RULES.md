# 📏 Engineering & Coding Standards (RULES.md)

This document establishes the official engineering guidelines, architectural constraints, and coding standards for the **CampusHome** codebase. All contributors and agentic systems must adhere strictly to these principles.

---

## 1. Core Engineering Principles

1. **Clarity Over Cleverness**: Code must be readable, self-documenting, and maintainable. Avoid obfuscated one-liners.
2. **Tenant Isolation First**: Every database operation affecting student, warden, room, attendance, or operational data **MUST** be explicitly scoped to `institutionId`.
3. **Fail Safely & Expressively**: Never fail silently. Use explicit status codes and informative error messages.
4. **Preserve Documentation**: Maintain docstrings, route annotations, and inline explanatory comments when modifying existing files.

---

## 2. Frontend Standards (React 19 + Vite)

### 2.1 Component Structure & Style
- **Functional Components Only**: Use modern functional components with React Hooks.
- **Component File Naming**: Use `PascalCase` for React components (e.g., `StatsCard.jsx`, `WardenDashboard.jsx`).
- **Hook Rules**: Follow React hook rules strictly. Place hooks at the top level of component functions; never nest inside conditionals or loops.
- **Controlled Inputs**: All form fields must be controlled components with unambiguous change handlers and validation feedback.

### 2.2 State Management & Network Calls
- **Axios Centralization**: Always use the configured Axios instance in `client/src/api/` rather than raw `fetch()`. This ensures automated Bearer token attachment and 401 interceptor handling.
- **Loading & Empty States**: Every asynchronously fetched view or data grid **must** render:
  1. A loading spinner or skeleton state
  2. An informative empty state with actionable suggestions when arrays are empty
  3. A descriptive error toast or banner on failure
- **Auth Context**: Never store raw auth tokens in volatile global variables; manage session data through `AuthContext` and secure browser `localStorage`.

### 2.3 Semantic HTML & Accessibility
- Use semantic HTML tags (`<main>`, `<header>`, `<nav>`, `<section>`, `<article>`) instead of nested `<div>` soup.
- All clickable interactive elements (buttons, badges, icons) must have descriptive `aria-label` or visible text.
- Interactive elements must maintain visible keyboard focus rings matching `--border-glow`.

---

## 3. Backend Standards (Node.js & Express)

### 3.1 ECMAScript Modules (ESM)
- All server files use native ES Modules (`import ... from '...'` and `export default ...`).
- Relative file imports **must** include the explicit `.js` extension (e.g., `import User from '../models/User.js';`).

### 3.2 Route & Controller Separation
- **Routes (`server/routes/`)**: Responsible solely for path definitions, HTTP method assignment, and middleware chaining.
- **Controllers (`server/controllers/`)**: Encapsulate all business logic, data sanitization, query assembly, and response formatting.
- **Middlewares (`server/middleware/`)**: Encapsulate cross-cutting concerns (Auth authentication, RBAC authorization, file upload limits, error handling).

### 3.3 HTTP Status Codes & Response Signatures
Controllers must adhere to standard REST HTTP response codes:
- `200 OK`: Successful read or update operations.
- `201 Created`: Successful entity creation (e.g., new student admitted, room created, complaint logged).
- `400 Bad Request`: Validation failure or missing required fields.
- `401 Unauthorized`: Missing or invalid authentication token.
- `403 Forbidden`: Authenticated user lacks authorization for the requested role or resource.
- `404 Not Found`: Target entity not found.
- `500 Internal Server Error`: Unhandled server exception.

Standard JSON response payload pattern:
```json
{
  "success": true,
  "message": "Action completed successfully",
  "data": { ... }
}
```

---

## 4. Multi-Tenant Database Rules (Mongoose & MongoDB)

### 4.1 Schema Design
- Every tenant-dependent schema must define:
  ```javascript
  institutionId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Institution',
    required: true,
    index: true,
  }
  ```
- Always enable `{ timestamps: true }` on schemas to track creation and update chronologies.
- Hash passwords inside Mongoose pre-save hooks with `bcrypt.genSalt(10)` and `bcrypt.hash()`; never store plaintext passwords.

### 4.2 Query Scoping Constraint
**CRITICAL**: When executing queries in controllers:
```javascript
// ✅ CORRECT: Multi-tenant scoped query
const complaints = await Complaint.find({
  institutionId: req.user.institutionId,
  status: 'Pending'
});

// ❌ FORBIDDEN: Unscoped query leaking cross-tenant records
const complaints = await Complaint.find({ status: 'Pending' });
```

---

## 5. Security Standards

1. **Environment Variables**: Never hardcode API keys, secrets, or MongoDB connection URIs in code. Reference them via `process.env`.
2. **Password Security**: Enforce minimum 6-character passwords with complexity requirements.
3. **Payload Sanitization**: Validate request bodies before persisting to MongoDB.
4. **File Upload Security**: Restrict uploads (`Multer`) to permitted MIME types (`image/jpeg`, `image/png`, `application/pdf`) and enforce reasonable file size caps (e.g., 5MB).
