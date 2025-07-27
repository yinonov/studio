# Admin Template Management

This system provides an admin interface for managing contract templates in the application.

## Features

- **Template CRUD Operations**: Create, read, update, and delete contract templates
- **Field Management**: Define form fields for each template with different types (text, email, number, date, textarea)
- **Base Clauses**: Set up template clauses with variable interpolation
- **Admin Access Control**: Restricted access to authorized admin users

## Admin Access

Admin access is controlled through Firebase custom claims using a role-based system. The `isUserAdmin` function in `/src/lib/admin.ts` checks if the user has a `role` of `'admin'` in their custom claims.

**Role Hierarchy:**

- `admin` - Full administrative access
- `manager` - Elevated permissions (future use)
- `member` - Standard user permissions (future use)
- `viewer` - Read-only permissions (future use)

**To grant admin access:**

1. Use the Firebase Admin SDK or admin panel to set custom claims
2. Set the user's role to `'admin'`: `{ role: 'admin' }`
3. The user will have admin access upon next login/token refresh

## Admin Routes

- `/admin/templates` - Main template management page
- `/admin/templates/create` - Create new template
- `/admin/templates/edit/[templateId]` - Edit existing template

## Admin Features

### Template List View

- View all templates with metadata
- See template title, category, description, field count
- Last updated timestamp
- Edit and delete actions

### Template Creation

- Basic template information (title, category, description)
- Dynamic field creation with different types
- Base clauses with variable interpolation support
- Form validation

### Template Editing

- Modify existing template properties
- Add/remove/edit fields
- Update base clauses
- Preserve template structure

## Template Structure

Templates consist of:

1. **Basic Information**
   - Title: Display name of the template
   - Category: Grouping for templates (Real Estate, Services, Business, etc.)
   - Description: Brief explanation of template usage

2. **Fields**
   - ID: Unique identifier for the field
   - Label: Display name shown to users
   - Type: Input type (text, email, number, date, textarea)
   - Placeholder: Helper text for users
   - Required: Whether field is mandatory

3. **Base Clauses**
   - Template text with variable placeholders
   - Variables use `{{fieldId}}` syntax
   - Support for default values: `{{fieldId||default value}}`

## Variable Interpolation

In base clauses, you can use:

- `{{fieldId}}` - Insert field value
- `{{fieldId||default}}` - Insert field value or default if empty
- `{{day}}`, `{{month}}`, `{{year}}` - Auto-populated date values
- `{{city||Tel Aviv}}` - Field with default city

## Navigation

Admin users will see an "אדמין" (Admin) button in the header navigation when signed in with an admin email.

## Security

- Admin routes check user permissions on each page load
- Non-admin users are redirected to the dashboard
- Template operations are protected by admin-only functions
- Firestore security rules should be configured to protect template modifications

## Firestore Structure

Templates are stored in the `templates` collection with the following structure:

```javascript
{
  id: "auto-generated-id",
  title: "Template Title",
  category: "Category Name",
  description: "Template description",
  fields: [
    {
      id: "fieldId",
      label: "Field Label",
      type: "text|email|number|date|textarea",
      placeholder: "Helper text",
      required: true|false
    }
  ],
  baseClauses: [
    "Template clause with {{variables}}",
    "Another clause..."
  ],
  createdAt: "Firestore timestamp",
  lastUpdatedAt: "Firestore timestamp"
}
```

## Future Enhancements

- Role-based permissions (super admin, template admin, etc.)
- Template versioning
- Template approval workflow
- Bulk operations
- Template import/export
- Usage analytics
- Template categorization improvements
