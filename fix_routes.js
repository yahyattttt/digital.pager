const fs = require('fs');
let content = fs.readFileSync('server/routes.ts', 'utf8');
const original = content;

// 1. Remove lines that just get the accessToken
content = content.replace(/\n[ \t]*const accessToken = await getFirestoreAccessToken\(\);[ \t]*/g, '');

// 2. Replace baseUrl from getFirestoreBaseUrl to getApiKeyBaseUrl (in routes)
content = content.replace(/const baseUrl = getFirestoreBaseUrl\(\)/g, 'const baseUrl = getApiKeyBaseUrl()');

// 3. Replace check conditions
content = content.replace(/if \(!accessToken \|\| !baseUrl\)/g, 'if (!baseUrl || !getApiKey())');
content = content.replace(/if \(!accessToken \|\| !projectId\)/g, 'if (!projectId || !getApiKey())');
content = content.replace(/if \(!projectId \|\| !accessToken\)/g, 'if (!projectId || !getApiKey())');

// 4. Remove Authorization headers with accessToken
// Pattern: ', Authorization: `Bearer ${accessToken}`'
content = content.replace(/,\s*Authorization:\s*`Bearer \$\{accessToken\}`/g, '');
// Pattern: 'Authorization: `Bearer ${accessToken}`, ' (at start)
content = content.replace(/Authorization:\s*`Bearer \$\{accessToken\}`,\s*/g, '');
// Pattern: '{ Authorization: `Bearer ${accessToken}` }' alone
content = content.replace(/\{\s*Authorization:\s*`Bearer \$\{accessToken\}`\s*\}/g, '{}');

// 5. Replace fetch calls with baseUrl to apikeyFetch
// Pattern: fetch(`${baseUrl}/...  or  fetch(`https://firestore...
// Use a safe regex with proper escaping
content = content.replace(/(\bawait\s+)fetch\((`\$\{baseUrl\})/g, '$1apikeyFetch($2');
content = content.replace(/(\bawait\s+)fetch\((`https:\/\/firestore\.googleapis\.com)/g, '$1apikeyFetch($2');

// Also replace non-await fetch calls that write to firestore (like the customer update)
content = content.replace(/\bfetch\((`\$\{baseUrl\})/g, 'apikeyFetch($1');
content = content.replace(/\bfetch\((`https:\/\/firestore\.googleapis\.com)/g, 'apikeyFetch($1');

const changed = content !== original;
console.log('Changed:', changed);
if (changed) {
  fs.writeFileSync('server/routes.ts', content, 'utf8');
  console.log('File written successfully');
} else {
  console.log('No changes made');
}

// Count remaining issues
const remaining = (content.match(/await getFirestoreAccessToken\(\)/g) || []).length;
const remainingAuth = (content.match(/Authorization.*accessToken/g) || []).length;
const remainingFetch = (content.match(/\bawait fetch\(`\$\{baseUrl\}/g) || []).length;
console.log('Remaining getFirestoreAccessToken calls:', remaining);
console.log('Remaining Authorization headers with accessToken:', remainingAuth);
console.log('Remaining plain fetch with baseUrl:', remainingFetch);
