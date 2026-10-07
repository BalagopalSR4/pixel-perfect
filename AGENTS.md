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

# Project guidance

- Keep the prototype on TanStack Start with file-based routes and a shared React state provider, because the workflow spans multiple refreshable screens without a live backend.
- Keep sample records in one seed-data module and route-independent business rules in small tested helpers, because the prototype must stay consistent across its screens.