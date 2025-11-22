# Firebase Indexes Configuration

This document describes the required Firestore indexes for the Leads CRM system.

## Required Composite Indexes

### 1. Lead Activities Collection

**Collection Path:** `users/{userId}/leadActivities`

**Index 1: Activities by Lead (Descending by Date)**
- Fields to index:
  - `leadId` (Ascending)
  - `createdAt` (Descending)
- Query example: Get all activities for a specific lead, sorted by most recent first

**Firebase Console Command:**
```
Collection: users/{userId}/leadActivities
Field: leadId (Ascending)
Field: createdAt (Descending)
```

### 2. Lead Tasks Collection

**Collection Path:** `users/{userId}/leadTasks`

**Index 1: Tasks by Lead (Ascending by Due Date)**
- Fields to index:
  - `leadId` (Ascending)
  - `dueDate` (Ascending)
- Query example: Get all tasks for a specific lead, sorted by due date

**Index 2: Incomplete Tasks by Lead**
- Fields to index:
  - `leadId` (Ascending)
  - `completed` (Ascending)
  - `dueDate` (Ascending)
- Query example: Get incomplete tasks for a lead, sorted by due date

**Firebase Console Command for Index 1:**
```
Collection: users/{userId}/leadTasks
Field: leadId (Ascending)
Field: dueDate (Ascending)
```

**Firebase Console Command for Index 2:**
```
Collection: users/{userId}/leadTasks
Field: leadId (Ascending)
Field: completed (Ascending)
Field: dueDate (Ascending)
```

### 3. Leads Collection (Existing)

**Collection Path:** `users/{userId}/leads`

**Index 1: Leads by Status and Date**
- Fields to index:
  - `status` (Ascending)
  - `createdAt` (Descending)
- Query example: Get all leads in a specific status, sorted by most recent

**Firebase Console Command:**
```
Collection: users/{userId}/leads
Field: status (Ascending)
Field: createdAt (Descending)
```

## How to Add These Indexes

### Method 1: Firebase Console (Recommended)

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project
3. Navigate to **Firestore Database** → **Indexes** tab
4. Click **Create Index**
5. Enter the collection path and field configurations as described above
6. Click **Create**

### Method 2: Automatic Creation

When you run queries that require these indexes for the first time, Firestore will throw an error with a direct link to create the required index. Simply click the link to automatically create it.

### Method 3: Firebase CLI

You can also define these indexes in a `firestore.indexes.json` file:

```json
{
  "indexes": [
    {
      "collectionGroup": "leadActivities",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "leadId", "order": "ASCENDING" },
        { "fieldPath": "createdAt", "order": "DESCENDING" }
      ]
    },
    {
      "collectionGroup": "leadTasks",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "leadId", "order": "ASCENDING" },
        { "fieldPath": "dueDate", "order": "ASCENDING" }
      ]
    },
    {
      "collectionGroup": "leadTasks",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "leadId", "order": "ASCENDING" },
        { "fieldPath": "completed", "order": "ASCENDING" },
        { "fieldPath": "dueDate", "order": "ASCENDING" }
      ]
    },
    {
      "collectionGroup": "leads",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "status", "order": "ASCENDING" },
        { "fieldPath": "createdAt", "order": "DESCENDING" }
      ]
    }
  ],
  "fieldOverrides": []
}
```

Then deploy with:
```bash
firebase deploy --only firestore:indexes
```

## Performance Considerations

- **Single Field Indexes**: Firestore automatically creates single-field indexes for all fields, so no manual configuration is needed for queries on single fields.

- **Composite Indexes**: The indexes above are composite indexes required for queries that filter or sort on multiple fields.

- **Query Limitations**: Each composite index supports queries in one direction. If you need to query in reverse order, you may need to create additional indexes.

## Testing Indexes

After creating indexes:

1. Wait for index build to complete (can take a few minutes for existing data)
2. Test queries in the application
3. Monitor Firestore logs for any missing index errors
4. Add additional indexes as needed

## Maintenance

- Review index usage periodically in Firebase Console
- Remove unused indexes to reduce storage costs
- Update indexes when query patterns change

