<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->


## SME Break Tracker rules
- Break start/end and admin actions go through security-definer database functions (start_break, end_break, admin_*), so capacity, one-active-break-per-SME and server timestamps are enforced in one place with a per-floor lock.
- Regular users are anonymous; only admins sign in. The first account to sign up becomes admin via a trigger on new users.
- Daily reset is done lazily by daily_rollover() (called before reads and starts), avoiding a recurring scheduled job.
- Break duration thresholds live in src/lib/breaks.ts and are covered by src/lib/breaks.test.ts.
