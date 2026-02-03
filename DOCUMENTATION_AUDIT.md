# Documentation Audit & Cleanup Plan
**Date:** 2026-02-02

## Current State: 56 markdown files in root directory

---

## 📋 Categorization

### ✅ KEEP - Essential Documentation (10 files)

**Core Documentation:**
1. **README.md** (5.3K) - Project overview, setup instructions
2. **CLAUDE.md** (20K) - Development guidelines, critical for AI/developer workflow
3. **ARCHITECTURE_NOTES.md** (1.8K) - Architecture decisions
4. **PHASE2_FEATURES.md** (13K) - Feature specifications

**User Guides:**
5. **QUICK_START.md** (5.3K) - Getting started guide
6. **QUICK_REFERENCE.md** (4.3K) - Common operations cheatsheet
7. **MANUAL_UI_TESTING_GUIDE.md** (9.5K) - UI testing procedures

**Current Status:**
8. **COMPREHENSIVE_SECURITY_AUDIT.md** (13K) - Security findings (reference)
9. **REFACTORING_VERIFICATION.md** (5.2K) - Latest verification report
10. **NAMING_CONVENTIONS.md** (15K) - Code standards

---

### 🗂️ CONSOLIDATE - Merge into Single Files (28 files → 6 files)

#### Security Documentation (6 files → 1 file: SECURITY.md)
- SECURITY_FIXES_HIGH_SEVERITY.md (8.3K)
- SECURITY_FIXES_SUMMARY.md (6.0K)
- COMPREHENSIVE_SECURITY_AUDIT.md (keep, make primary)
- LOW_SEVERITY_FIXES.md (9.6K)
- LOW_SEVERITY_FIXES_SUMMARY.md (10K)
- MEDIUM_SEVERITY_FIXES.md (6.5K)

**Action:** Merge all into comprehensive SECURITY.md

#### Refactoring Documentation (8 files → 1 file: keep REFACTORING_COMPLETE.md)
- REFACTORING_COMPLETE.md (6.3K) ← PRIMARY, keep this
- REFACTORING_VERIFICATION.md (5.2K) ← merge in
- REFACTORING_SUMMARY.md (9.2K) ← merge in
- REFACTORING_EXAMPLE.md (15K) ← extract examples to separate doc
- COMPONENT_REFACTORING.md (11K)
- PUBLISHERS_PAGE_REFACTORING.md (4.3K)
- NOTIFICATION_REFACTORING.md (5.9K)
- REFACTOR_CUSTOM_REPORTS.md (7.6K)

**Action:** Keep REFACTORING_COMPLETE.md as master, delete others

#### Phase 2 Documentation (5 files → 1 file: PHASE2_FEATURES.md)
- PHASE2_FEATURES.md (13K) ← PRIMARY, keep this
- PHASE2_FINAL_STATUS.md (12K) ← merge status in
- PHASE2_IMPLEMENTATION_SUMMARY.md (12K) ← delete
- PHASE2_TEST_RESULTS.md (8.7K) ← delete
- PHASE2_COMPREHENSIVE_TEST_RESULTS.md (17K) ← delete

**Action:** Update PHASE2_FEATURES.md with final status, delete others

#### Code Quality Documentation (9 files → 1 file: CODE_QUALITY.md)
- CODE_QUALITY_IMPROVEMENTS.md (9.1K)
- CLEANUP_CHANGES.md (3.5K)
- CLEANUP_SUMMARY.md (6.8K)
- DEBUG_CLEANUP.md (8.3K)
- CONSTANTS_REFACTORING.md (11K)
- CSS_PERFORMANCE_AUDIT.md (9.1K)
- TYPESCRIPT_STRICT_MODE_SUMMARY.md (5.7K)
- PERFORMANCE_FIXES_MEDIUM_SEVERITY.md (10K)
- UX_IMPROVEMENTS_MEDIUM.md (12K)

**Action:** Merge into single CODE_QUALITY.md

---

### 🗑️ DELETE - Redundant/Obsolete (10 files)

**Duplicate Implementation Notes:**
- IMPLEMENTATION_SUMMARY.md (1.7K) - superseded by feature docs
- FRONTEND_UPDATE_STATUS.md (4.9K) - outdated status file
- UI_BUG_FIXES.md (14K) - fixes already applied
- DEPLOYMENT_VERIFICATION.md (7.2K) - superseded by newer docs

**Feature-Specific (Already in Main Docs):**
- AB_TESTING_IMPLEMENTATION.md (8.5K) - covered in PHASE2_FEATURES.md
- CUSTOM_BIDDERS_FEATURE.md (13K) - covered in PHASE2_FEATURES.md
- CUSTOM_BIDDERS_TEST_RESULTS.md (7.7K) - test results, no longer needed
- SITES_FEATURE_IMPLEMENTATION.md (12K) - covered in main docs
- SITES_FEATURE_COMPLETE.md (10K) - duplicate of above

**Intermediate Work:**
- BUG_HUNT_REPORT.md (5.6K) - findings incorporated into fixes

---

### 📦 ARCHIVE - Move to docs/archive/ (8 files)

**Historical Implementation Details:**
- TAXONOMY_MIGRATION_COMPLETE.md (8.2K)
- REAL_PREBID_BUILDS.md (13K)
- CHARTS_ADDED.md (5.9K)
- ADVANCED_CHARTS_ADDED.md (14K)
- CHAT_SETUP.md (6.1K)
- CHAT_INTERFACE.md (23K)
- UUID_VALIDATION_IMPLEMENTATION.md (9.9K)
- UUID_VALIDATION_MIGRATION.md (3.1K)
- UUID_VALIDATION_SUMMARY.md (4.4K)

**Reason:** Historical value but not needed for daily development

---

### 🔧 SPECIAL HANDLING

**Quick Start Files (consolidate 3 → 1):**
- QUICK_START.md (5.3K) ← PRIMARY
- QUICK_START_REFACTORING.md (7.3K) ← merge in
- QUICK_START_SITES.md (4.2K) ← merge in

**Production Deployment:**
- PRODUCTION_DEPLOYMENT.md (12K) - move to docs/deployment/

---

## 📊 Summary

| Category | Files | Action |
|----------|-------|--------|
| Keep as-is | 10 | No changes |
| Consolidate | 28 → 6 | Merge & delete |
| Delete | 10 | Remove completely |
| Archive | 9 | Move to docs/archive/ |
| **Total** | **57** | **Reduce to ~16** |

---

## 🎯 Proposed Final Structure

```
/Users/andrewstreets/prebidjs-light/
├── README.md                           # Project overview
├── CLAUDE.md                           # Development guidelines
├── ARCHITECTURE_NOTES.md               # Architecture decisions
├── QUICK_START.md                      # Getting started (consolidated)
├── QUICK_REFERENCE.md                  # Commands cheatsheet
├── NAMING_CONVENTIONS.md               # Code standards
├── MANUAL_UI_TESTING_GUIDE.md          # Testing procedures
├── SECURITY.md                         # Security audit & fixes (consolidated)
├── CODE_QUALITY.md                     # Quality improvements (consolidated)
├── REFACTORING_COMPLETE.md             # Refactoring report (consolidated)
├── PHASE2_FEATURES.md                  # Phase 2 features (consolidated)
├── PREBID_INTEGRATION_GUIDE.md         # NEW: Prebid.js integration guide
│
├── docs/
│   ├── deployment/
│   │   └── PRODUCTION_DEPLOYMENT.md    # Moved from root
│   ├── features/
│   │   ├── ab-testing.md              # Feature-specific guides
│   │   ├── custom-bidders.md
│   │   └── sites-management.md
│   └── archive/                        # Historical docs
│       ├── TAXONOMY_MIGRATION_COMPLETE.md
│       ├── REAL_PREBID_BUILDS.md
│       ├── CHARTS_ADDED.md
│       └── ... (8 more files)
│
└── prompts/                            # Keep as-is
    ├── coding_prompt.md
    ├── coding_prompt_yolo.md
    └── initializer_prompt.md
```

---

## ✅ Cleanup Benefits

1. **Reduced clutter**: 57 → 16 files in root (72% reduction)
2. **Easier navigation**: Clear, consolidated documentation
3. **No duplication**: Single source of truth for each topic
4. **Better organization**: Logical grouping in docs/ subdirectories
5. **Preserved history**: Important details archived, not deleted

---

## 🚀 Next Steps

1. Create consolidated files (SECURITY.md, CODE_QUALITY.md, etc.)
2. Create NEW: PREBID_INTEGRATION_GUIDE.md
3. Move files to appropriate locations
4. Delete redundant files
5. Update README.md with new doc structure
6. Commit changes

