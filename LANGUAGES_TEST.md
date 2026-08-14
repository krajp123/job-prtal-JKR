# Languages Field Debug Guide

## Frontend Console Test

अपने browser के console में (F12 दबाकर) यह code paste करो:

```javascript
// Test 1: Check current recruiter data
console.log('🔍 Test 1: Fetching recruiter profile...');
fetch('/api/recruiter/me/profile', {
  headers: {
    'Authorization': 'Bearer ' + localStorage.getItem('token')
  }
})
.then(r => r.json())
.then(data => {
  console.log('📥 Current recruiter:', {
    languages: data.languages,
    isArray: Array.isArray(data.languages),
    length: data.languages?.length || 0,
  });
});

// Test 2: Try to set languages directly
setTimeout(() => {
  console.log('🔍 Test 2: Setting languages directly...');
  fetch('/api/recruiter/me/test-set-languages', {
    method: 'POST',
    headers: {
      'Authorization': 'Bearer ' + localStorage.getItem('token'),
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ languages: ['English', 'Hindi'] })
  })
  .then(r => r.json())
  .then(data => {
    console.log('📤 Set languages response:', data);
  })
  .catch(e => console.error('Error:', e));
}, 1000);

// Test 3: Check debug endpoint
setTimeout(() => {
  console.log('🔍 Test 3: Debug endpoint...');
  fetch('/api/recruiter/me/debug-languages', {
    headers: {
      'Authorization': 'Bearer ' + localStorage.getItem('token')
    }
  })
  .then(r => r.json())
  .then(data => {
    console.log('📥 Debug languages:', data);
  })
  .catch(e => console.error('Error:', e));
}, 2000);

// Test 4: Try full profile update with languages
setTimeout(() => {
  console.log('🔍 Test 4: Full profile update...');
  fetch('/api/recruiter/me/profile', {
    method: 'PUT',
    headers: {
      'Authorization': 'Bearer ' + localStorage.getItem('token'),
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      fullName: 'Test Name',
      companyName: 'Test Company',
      languages: ['English', 'Hindi'],
      expertiseTags: [],
      experienceTimeline: []
    })
  })
  .then(r => r.json())
  .then(data => {
    console.log('📤 Profile update response - languages:', data.languages);
  })
  .catch(e => console.error('Error:', e));
}, 3000);
```

## क्या Check करना है:

1. **Test 1 Output**: अगर `languages` empty है तो database में नहीं है
2. **Test 2 Output**: अगर error आता है तो endpoint problem है
3. **Test 3 Output**: Debug endpoint check करेगा अगर फील्ड exist करता है
4. **Test 4 Output**: PUT request से भेजे गए languages को backend receive करता है या नहीं

## Browser Console में Backend Logs देखो:

Backend console में ये logs दिखने चाहिए:
- `🔍 getMyProfile - languages from DB`
- `🔍 Backend received in updateMyProfile`
- `💾 Backend update object has languages`
- `✅ After save, recruiter.languages in DB`
- `📤 Sending response with languages`

## अगर कोई specific error दिखे तो बताना।
