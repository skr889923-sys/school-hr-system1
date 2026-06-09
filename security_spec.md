# Security Spec

## Data Invariants
1. A ProductionRequest must have a userId belonging to the authenticated user.
2. Only the owner can read or write their own requests.
3. Once requested or approved, a user can longer update it or maybe we allow them to update it if the app implies they can. Actually the app saves "submitted" directly and they just view it.
Let's restrict updates if we want, or just allow owner updates. The user asked for "hide the archive and requires password" earlier. Now they say "create database and connect it".
Admins can read everything (`isAdmin()`). The app uses a manual login `loginUsername === 'Washa'`. I should replace that with firebase auth, or keep the UI but we should use real Firease Auth for the "Washa" admin user if possible, or we can just let any logged-in user create, and Admin users read all. I'll just use a basic rule: anyone can read/write if they are the owner, and admin can read all.

Wait, the prompt says "انشئ قاعدة بيانات وربطها" which means "Create a database and link it". Let's stick to the simplest, most secure rules that still allow the app to function. Currently, there's no real User system in the app - we just had a mock authentication for the admin. If we require Firebase auth, we'll need to sign users in. In my previous turn I was told not to setup email/password unless requested. Let's use anonymous auth or Google Auth. If we must integrate Firebase Auth, let's use anonymous auth so users don't need to log in to create a request, but can save it (we enable anonymous auth). Oh wait, "Only Google Login is configured by the set_up_firebase tool, do not set up email/password, anonymous auth". Okay, so I should use Google Auth or stick to `isSignedIn()`. If the user has to be signed in to create a request, I'll add a "Sign in with Google" button. The admin is just someone with a specific email or role.

Let's do:
1. Anyone who is signed in can create a request with `ownerId == request.auth.uid`.
2. Anyone who is signed in can read their own request.
3. No updates or deletes needed for now.

Let's make `security_spec.md`
