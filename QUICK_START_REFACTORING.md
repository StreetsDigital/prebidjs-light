# Quick Start: Component Refactoring

**For developers who need to refactor large components**

This is a condensed guide. For detailed information, see:
- `COMPONENT_REFACTORING.md` - Complete refactoring guide
- `REFACTORING_EXAMPLE.md` - Step-by-step examples
- `CSS_PERFORMANCE_AUDIT.md` - CSS performance analysis

---

## When to Refactor

Refactor a component when it has:

- ❌ More than 500 lines
- ❌ More than 10 useState calls
- ❌ Inline arrow functions in JSX (renders)
- ❌ Multiple unrelated features in one file
- ❌ Difficult to understand or modify

---

## Quick Refactoring Checklist

### 1. Extract Types (5 minutes)

```tsx
// Before: In component file
interface User { id: string; name: string; }

// After: In types/ directory
// types/user.ts
export interface User { id: string; name: string; }
```

**Create**: `apps/admin/src/types/[feature].ts`

---

### 2. Extract Custom Hooks (15 minutes)

```tsx
// Before: In component
const [data, setData] = useState(null);
useEffect(() => { /* fetch data */ }, []);

// After: In hooks/ directory
// hooks/useData.ts
export function useData() {
  const [data, setData] = useState(null);
  // ... fetch logic
  return { data, loading, error };
}
```

**Create**: `apps/admin/src/[feature]/hooks/use[Hook].ts`

---

### 3. Extract UI Sections (10 minutes each)

```tsx
// Before: Inline JSX (50+ lines)
<div className="bg-white shadow rounded-lg p-6">
  {/* 50 lines of JSX */}
</div>

// After: Separate component
// components/UserCard.tsx
export default function UserCard({ user }: { user: User }) {
  return (
    <div className="bg-white shadow rounded-lg p-6">
      {/* 50 lines of JSX */}
    </div>
  );
}
```

**Create**: `apps/admin/src/[feature]/components/[Component].tsx`

---

### 4. Extract Modals (15 minutes each)

```tsx
// Before: Modal JSX inline
{isOpen && <div>{/* modal content */}</div>}

// After: Separate component
// components/EditModal.tsx
export default function EditModal({ isOpen, onClose, data }) {
  return (
    <Modal isOpen={isOpen} onClose={onClose}>
      {/* modal content */}
    </Modal>
  );
}
```

---

### 5. Update Main Component (10 minutes)

```tsx
// After all extractions
import { UserCard } from './components/UserCard';
import { EditModal } from './components/EditModal';
import { useUser } from './hooks/useUser';

export function UserPage() {
  const { user, loading } = useUser();

  if (loading) return <Loading />;

  return (
    <div>
      <UserCard user={user} />
      <EditModal />
    </div>
  );
}
```

---

## File Organization Pattern

```
apps/admin/src/
├── types/
│   └── [feature].ts           # Shared types
├── pages/[role]/
│   └── [feature]/
│       ├── [Feature]Page.tsx  # Main orchestrator
│       ├── components/        # UI components
│       │   ├── [Section].tsx
│       │   └── [Modal].tsx
│       ├── hooks/             # Custom hooks
│       │   └── use[Hook].ts
│       └── utils/             # Utility functions
│           └── [util].ts
```

---

## Size Guidelines

| Component Type | Max Lines | Purpose |
|----------------|-----------|---------|
| Page | 300 | Orchestrate child components |
| Feature Component | 400 | Business logic + UI |
| UI Component | 200 | Presentational only |
| Hook | 200 | Reusable logic |
| Utility | 100 | Pure functions |

---

## Example: 7782 Lines → 23 Files

**Before**: `PublisherDetailPage.tsx` (7,782 lines)

**After**:
- Main page: 200 lines
- 6 tab components: ~400 lines each
- 8 UI components: ~150 lines each
- 5 hooks: ~120 lines each
- 1 types file: 250 lines

**Total**: 23 files, average 283 lines each

---

## Common Patterns

### Extract Repeated JSX

```tsx
// Before
<button className="inline-flex items-center rounded-md bg-blue-600...">
  Save
</button>
<button className="inline-flex items-center rounded-md bg-blue-600...">
  Submit
</button>

// After: Extract to component
function PrimaryButton({ children, onClick }) {
  return (
    <button
      className="inline-flex items-center rounded-md bg-blue-600..."
      onClick={onClick}
    >
      {children}
    </button>
  );
}
```

### Extract Form Sections

```tsx
// Before: All in one component
<form>
  {/* 100 lines of form fields */}
</form>

// After: Extract sections
<form>
  <BasicInfoSection data={data} onChange={handleChange} />
  <AddressSection data={data} onChange={handleChange} />
  <PreferencesSection data={data} onChange={handleChange} />
</form>
```

### Extract API Calls

```tsx
// Before: In component
useEffect(() => {
  fetch('/api/users')
    .then(res => res.json())
    .then(setUsers);
}, []);

// After: In custom hook
function useUsers() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchUsers().then(setUsers).finally(() => setLoading(false));
  }, []);

  return { users, loading };
}
```

---

## Testing After Refactoring

### Quick Smoke Test

1. ✅ Does the page load?
2. ✅ Can you click all buttons?
3. ✅ Do modals open/close?
4. ✅ Do forms submit?
5. ✅ Are there console errors?

### Thorough Test

1. ✅ Test all user workflows
2. ✅ Test edge cases
3. ✅ Test error states
4. ✅ Test with different roles
5. ✅ Test browser compatibility

---

## Tools & Commands

### Find Large Files

```bash
find apps/admin/src -name "*.tsx" -exec wc -l {} \; | sort -rn | head -20
```

### Count Components in File

```bash
grep -n "const.*=.*\(.*\) =>" [file.tsx] | wc -l
```

### Check for Inline Functions

```bash
grep -n "onClick={() =>" [file.tsx]
```

---

## Quick Wins

These patterns are easy to extract:

1. **Status Badges**: Colored pills for status
2. **Loading Spinners**: Reusable loader components
3. **Empty States**: "No data" placeholders
4. **Confirmation Dialogs**: Delete/save confirmations
5. **Table Rows**: Repeated table row patterns

---

## Anti-Patterns to Avoid

❌ **Don't over-extract**:
```tsx
// Too granular
function ButtonIcon() { return <svg>...</svg>; }
```

❌ **Don't create tight coupling**:
```tsx
// Component reaches into global state
function Card() {
  const data = useGlobalStore(s => s.data); // Bad
}
```

❌ **Don't break prop drilling too early**:
```tsx
// Use props until you have >3 levels of nesting
// Then consider context or state management
```

✅ **Do extract at feature level**:
```tsx
// Extract logical sections
function UserProfile() { /* ... */ }
function UserSettings() { /* ... */ }
```

---

## Time Estimates

| Task | Time |
|------|------|
| Extract types | 5 min |
| Extract one hook | 15 min |
| Extract one component | 10-20 min |
| Extract one modal | 15 min |
| Update main file | 10-30 min |
| Test changes | 15-30 min |

**Example**: Refactor 1000-line file → 2-4 hours

---

## Resources

- [React Docs: Thinking in React](https://react.dev/learn/thinking-in-react)
- [Clean Code Principles](https://github.com/ryanmcdermott/clean-code-javascript)
- Internal Docs:
  - `COMPONENT_REFACTORING.md` - Full guide
  - `REFACTORING_EXAMPLE.md` - Step-by-step examples
  - `CLAUDE.md` - Project guidelines

---

## Need Help?

1. Check `REFACTORING_EXAMPLE.md` for detailed examples
2. Review `apps/admin/src/pages/admin/publisher-detail/` for real examples
3. Ask team for code review before merging large refactorings

---

**Updated**: 2026-02-01
**Status**: Active Guide
