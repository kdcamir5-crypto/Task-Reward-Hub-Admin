# Task-Reward-Hub-Admin

Firebase project: `reward-hub-bd`. Sign in with an account whose `users/{uid}.role` is `admin`.

- App Settings → Deposit Payment Settings: save the bKash Personal number, instructions and active flag in `appSettings/paymentSettings`.
- Bot Purchases: inspect sender, TRX, amount, receiving number and referrer. Verify the actual bKash payment, then Approve to atomically unlock the bot, create its mining record and credit 5% referral commission once. Direct payments do not also credit the buyer wallet.
- Deposits: verify payment then Approve to credit the user wallet once, or Reject with a reason.
- Refresh reloads payment records. Requests already reviewed cannot be approved again, including from concurrent admin sessions. Other review workflows retain their existing behavior.

Before testing, publish the full current `firebase.rules` from the Task-Reward-Hub user repository in Firebase Console → Firestore Database → Rules. GitHub Pages publishing does not deploy these rules.

`bot-purchase-core.js` is mirrored from the user repository; keep both copies in sync. Package prices and return targets follow the user repository README.


## Daily Tasks

- The active admin site is https://task-reward-hub-admin.pages.dev/ .
- Daily Tasks → Add task publishes an HTTPS link, text instructions and BDT reward until the next Bangladesh midnight. Tasks are stored in Firestore, not hardcoded.
- Delete removes a task for all users while retaining submitted proof and financial history. Expired definitions are removed by the user repository's scheduled cleanup worker.
- Review shows written proof. Approve atomically credits the main balance once; Reject requires a reason and pays nothing. Proof can be reviewed after deletion or expiry.
- Publish the latest user-repository `firebase.rules` before using this flow. The Node checks in `.github/workflows/verify-daily-tasks.yml` test the admin interface; Firestore transaction tests live in Task-Reward-Hub.
