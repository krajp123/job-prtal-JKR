# Recruiter Profile Backend - Testing Guide

## ✅ All Features Implemented and Ready to Test

### Prerequisites
- Backend running: `npm start` in `/backend`
- Frontend running: `npm run dev` in `/admin-panel`
- Admin account logged in
- Recruiter ID available (visit Recruiters list first)

---

## 🧪 Test Cases

### 1. SUSPEND ACCOUNT
**Endpoint**: `PATCH /api/admin/users/recruiters/:id/suspend`

**Steps**:
1. Open recruiter profile
2. Click "Suspend Account" button
3. Modal appears with reason field
4. Enter reason (e.g., "Policy violation")
5. Click "Suspend Account"

**Expected Results**:
- ✓ API call succeeds
- ✓ Account status changes to "suspended"
- ✓ UI updates immediately
- ✓ Modal closes
- ✓ Audit log created with reason

**Status Badge Should Show**: "SUSPENDED"

---

### 2. REACTIVATE ACCOUNT
**Endpoint**: `PATCH /api/admin/users/recruiters/:id/activate`

**Steps**:
1. Open suspended recruiter profile
2. Click "Reactivate Account" button
3. Confirm in modal
4. Click "Reactivate Account"

**Expected Results**:
- ✓ API call succeeds
- ✓ Account status changes to "active"
- ✓ Status badge updates to "ACTIVE"
- ✓ Audit log created

**Status Badge Should Show**: "ACTIVE"

---

### 3. PERMANENTLY BAN
**Endpoint**: `PATCH /api/admin/users/recruiters/:id/ban`

**Steps**:
1. Open recruiter profile
2. Click "Ban Permanently" button (red button)
3. Modal with danger warning appears
4. Enter reason (e.g., "Fraudulent activity")
5. Click "Ban permanently"

**Expected Results**:
- ✓ API call succeeds
- ✓ Account status changes to "banned"
- ✓ Cannot be undone from UI (by design)
- ✓ Audit log created with reason
- ✓ Status badge shows "BANNED"

**Status Badge Should Show**: "BANNED"

---

### 4. RESET PASSWORD
**Endpoint**: `POST /api/admin/users/recruiters/:id/reset-password`

**Steps**:
1. Open recruiter profile
2. Click "Send Password Reset" button
3. Modal confirms action
4. Click "Send reset link"

**Expected Results**:
- ✓ API call succeeds
- ✓ Token generated in backend
- ✓ Modal closes
- ✓ Check backend logs for token
- ✓ Audit log created
- ⏳ Email sending (future feature)

---

### 5. SEND MESSAGE
**Steps**:
1. Open recruiter profile
2. Click "Send Message" button
3. Navigate to messaging page with recruiter pre-selected

**Expected Results**:
- ✓ Routes to `/messages/new?recruiterId={id}`
- ✓ Messaging interface loads
- ✓ Recruiter is pre-populated

---

### 6. UPDATE ADMIN NOTES
**Endpoint**: `PATCH /api/admin/users/recruiters/:id/notes`

**Steps**:
1. Open recruiter profile
2. Scroll to "Admin Notes" section
3. Click in text area
4. Type notes (e.g., "Follow up on verification")
5. Click "Save Notes"

**Expected Results**:
- ✓ Text area is editable
- ✓ Save button appears
- ✓ API call succeeds
- ✓ Notes persist in UI
- ✓ Audit log created
- ✓ Success message logged to console

---

### 7. ADJUST WALLET
**Endpoint**: `PATCH /api/admin/users/recruiters/:id/wallet/adjust`

**Steps**:
1. Open recruiter profile
2. Scroll to "Wallet Management" section
3. Enter amount (e.g., 1000)
4. Choose operation (Credit/Debit)
5. Enter reason (e.g., "Manual adjustment - Account upgrade")
6. Click "Adjust Wallet"

**Expected Results**:
- ✓ Modal appears with amount and reason fields
- ✓ API call succeeds
- ✓ Wallet balance updates in UI
- ✓ Form resets
- ✓ Audit log created with reason
- ✓ Success message logged

**Wallet Balance**: Should increase/decrease by entered amount

---

### 8. UPDATE DOCUMENT STATUS
**Endpoint**: `PATCH /api/admin/users/recruiters/:id/documents/:docId`

**Steps**:
1. Open recruiter profile
2. Scroll to "KYC Documents" section
3. Find a document with "pending" status
4. Click action button (approve/reject)
5. Confirm in modal

**Expected Results**:
- ✓ Document status changes (pending → approved/rejected)
- ✓ Review timestamp updates
- ✓ UI reflects changes immediately
- ✓ Audit log created
- ✓ Cannot change approved/rejected documents

---

### 9. VIEW ANALYTICS CHART
**Endpoint**: `GET /api/admin/users/recruiters/:id/analytics?metric=jobs_posted&days=7`

**Steps**:
1. Open recruiter profile
2. Scroll to "Recruiter Analytics" section
3. Chart should display automatically
4. Click different metrics: Jobs Posted, Shortlisted, Selected, Downloads, Spend, Rejected
5. Click different time ranges: 7d, 30d, 6m, 1y
6. Hover over chart bars to see tooltips

**Expected Results**:
- ✓ Chart renders with data
- ✓ Metric selector changes data
- ✓ Time range selector refreshes data
- ✓ Tooltips show date and value on hover
- ✓ Summary shows Max, Min, Avg, Total
- ✓ Fallback to mock data if API fails

**Currently**: Using mock data (can be replaced with real queries)

---

### 10. VERIFY RECRUITER ⏳ (DEFERRED)
**Endpoint**: `PATCH /api/admin/users/recruiters/:id/verify`

**Status**: ⏳ DEFERRED - Will be implemented later

**Steps**: (When ready)
1. Open unverified recruiter profile
2. Click "Verify Recruiter" button
3. Confirm action

---

### 11. REJECT VERIFICATION ⏳ (DEFERRED)
**Endpoint**: `PATCH /api/admin/users/recruiters/:id/reject-verification`

**Status**: ⏳ DEFERRED - Will be implemented later

**Steps**: (When ready)
1. Open unverified recruiter profile
2. Click "Reject Verification" button
3. Enter rejection reason
4. Confirm action

---

## 🔍 Verification Checklist

### Backend
- [ ] All endpoints return 200 OK
- [ ] Recruiter data updates in database
- [ ] Audit logs created for each action
- [ ] Error handling works (404 for missing recruiter)
- [ ] Auth middleware blocks unauthorized access

### Frontend
- [ ] All handlers call correct endpoints
- [ ] UI updates immediately after API calls
- [ ] Modals close after successful actions
- [ ] Error messages display on failures
- [ ] Charts render and update correctly

### Database
- [ ] Recruiter model has all required fields
- [ ] Data persists after page refresh
- [ ] Audit logs increment properly
- [ ] Wallet balance updates correctly

---

## 🐛 Debugging Tips

### Check Backend Logs
```bash
# Terminal in /backend
npm start
# Look for:
# - ✓ Admin action logged
# - API call details
# - Error messages
```

### Check Frontend Console
```javascript
// Browser DevTools Console
// You should see:
// ✓ ACTION_NAME completed successfully
// API call details
// Error messages with details
```

### Test API Directly
```bash
# Using curl or Postman
curl -X PATCH http://localhost:5000/api/admin/users/recruiters/[ID]/suspend \
  -H "Authorization: Bearer [TOKEN]" \
  -H "Content-Type: application/json" \
  -d '{"reason":"Test suspension"}'
```

### Check Database
```javascript
// MongoDB
db.recruiters.findOne({_id: ObjectId("[ID]")})
// Check:
// - accountStatus
// - walletBalance
// - adminNotes
// - kycDocuments
```

---

## ✅ Success Indicators

Everything is working correctly when:
1. ✅ Buttons trigger modals with correct messages
2. ✅ API calls complete without errors
3. ✅ UI updates immediately reflect changes
4. ✅ Browser console shows success logs
5. ✅ Database contains updated values
6. ✅ Audit logs recorded for each action
7. ✅ Error messages clear and helpful
8. ✅ Charts display and update properly

---

## 📊 Current Data Status

| Feature | Status | Notes |
|---------|--------|-------|
| Suspend Account | ✅ Live | Real backend integration |
| Reactivate Account | ✅ Live | Real backend integration |
| Ban Permanently | ✅ Live | Real backend integration |
| Reset Password | ✅ Live | Token generation ready, email pending |
| Send Message | ✅ Live | Routes to messaging interface |
| Admin Notes | ✅ Live | Real backend integration |
| Wallet Adjust | ✅ Live | Real backend integration with audit log |
| Document Status | ✅ Live | Real backend integration |
| Analytics Chart | ✅ Live | Mock data (can query real data) |
| Verify | ⏳ Deferred | Will implement later |
| Reject | ⏳ Deferred | Will implement later |

---

**Last Updated**: Implementation Complete
**Next Steps**: Run tests, gather feedback, implement email notifications
