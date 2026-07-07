# Edit Project: Rename + Domain Change — Design

> Date: 2026-07-07
> Status: Approved, pending implementation plan
> Source: `docs/architecture/PLAN.md` → 📦 Product Backlog → Project management → 🔴 "Edit project: rename + change domain"

## Problem

Projects support create / list / get / delete only — there is no `PATCH /projects/:id`. A customer who changes their website domain must delete the project and lose all its feedback, because `domain` is the only input to the public-endpoint origin whitelist (`FeedbackPublicController.createPublic`, `apps/api/src/modules/feedback/feedback.public.controller.ts:44-71`).

## Scope

Full stack: API endpoint + web UI. Renaming and changing domain are the only two mutable fields in scope — no multi-domain support (separate 🟠 backlog item), no API key rotation (separate 🔴 backlog item).

## API

### `UpdateProjectDto`

New file `apps/api/src/modules/projects/dto/update-project.dto.ts`:

```ts
import { IsOptional, IsString, IsNotEmpty, MaxLength, Matches } from 'class-validator';

const HOSTNAME_PATTERN =
  /^[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(\.[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;

export class UpdateProjectDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  name?: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  @Matches(HOSTNAME_PATTERN, {
    message: 'domain must be a valid hostname (no protocol or path)',
  })
  domain?: string;
}
```

Both fields optional (partial-update / PATCH semantics). `@IsNotEmpty` on each field means a field, if present, cannot be an empty string — this is how domain-clearing is blocked (see Decisions below). The hostname regex is intentionally basic (labels of letters/digits/hyphens separated by dots, no protocol/path) — it accepts single-label hosts like `localhost` since the Default Project seed and the public-endpoint's own localhost bypass both rely on that value being usable. It is not RFC 1035-complete; `POST /projects` and `POST /teams/:id/projects` have zero domain format validation today, and this work does not retrofit them.

### Controller

`apps/api/src/modules/projects/projects.controller.ts`: add

```ts
@Patch(':id')
async update(
  @Request() req: any,
  @Param('id') id: string,
  @Body() body: UpdateProjectDto,
) {
  return this.projectsService.update(id, req.user.id, body);
}
```

(`Patch` added to the `@nestjs/common` import list.)

### Service

`apps/api/src/modules/projects/projects.service.ts`: add

```ts
async update(
  id: string,
  userId: string,
  dto: UpdateProjectDto,
): Promise<Project> {
  const project = await this.findOne(id, userId); // 404 if not found / not a member
  const member = await this.memberRepo.findOne({
    where: { teamId: project.teamId, userId },
  });
  if (!member || !hasMinRole(member.role, TeamRole.ADMIN)) {
    throw new ForbiddenException('Requires admin role in this team');
  }

  if (dto.name === undefined && dto.domain === undefined) {
    throw new BadRequestException('At least one of name or domain must be provided');
  }

  if (dto.name !== undefined) project.name = dto.name;
  if (dto.domain !== undefined) project.domain = dto.domain;

  return this.projectsRepository.save(project);
}
```

This repeats the `findOne` + manual membership-fetch pattern already used by `remove()` (one redundant query) rather than refactoring it — consistency with existing code, not a new inefficiency.

## Decisions

- **Domain cannot be cleared to null/empty via PATCH.** `@IsNotEmpty` rejects an empty string, and `domain` being `undefined` in the DTO means "leave unchanged," not "clear." A cleared domain disables the origin whitelist entirely in `FeedbackPublicController.createPublic` (`if (project.domain) { ... }` — falsy domain skips the check), which would let any site holding the project's `apiKey` submit feedback. Closing that gate is out of scope for this change; if a customer needs to remove a domain restriction, that is a deliberate future decision, not a PATCH side effect.
- **Partial update semantics.** A request may include `name` only, `domain` only, or both. An empty body (`{}`) is rejected with 400 rather than silently succeeding as a no-op — an empty PATCH is almost always a client bug, and failing loud surfaces it immediately instead of masking it as a successful no-op.
- **Authorization: ADMIN role in the project's team**, identical to `create()`/`remove()`. No new authorization concept introduced.
- **No activity log entry.** `ActivityService.log` is not called for project `create`/`remove` today, so not calling it for `update` is consistent with the existing (unlogged) project-lifecycle behavior, not a new gap introduced by this change.
- **No format validation added to `POST /projects` or `POST /teams/:id/projects`.** Those endpoints accept any string as `domain` today with zero DTO validation. Retrofitting them is a separate, unrelated cleanup — flagged here for future reference, not fixed now.

## Frontend

### `EditProjectModal.tsx`

New file `apps/web/src/components/dashboard/EditProjectModal.tsx`, modeled on `CreateProjectModal.tsx` (same `Modal`/`Input`/`Button` primitives, same layout: Name field with `Type` icon, Domain field with `Globe` icon).

Props: `{ isOpen: boolean; onClose: () => void; project: { id: string; name: string; domain: string } | null }`.

- Local `name`/`domain` state initialized from `project` when the modal opens (reset via a `useEffect` keyed on `project?.id` + `isOpen`, mirroring how `CreateProjectModal` resets state in `onSuccess`).
- Submit button disabled when `!name.trim() || !domain.trim()` — same guard as create, since the API blocks empty domain too.
- `useMutation`: `api.patch(`/projects/${project.id}`, { name, domain })`, `onSuccess` invalidates `["projects"]` (matches the existing partial-key invalidation used by `CreateProjectModal`/`CreateTeamProjectModal`) and closes the modal. `onError` shows the server's `message` if present, else a generic "Failed to update project" alert — same pattern as `CreateTeamProjectModal`.

### `Sidebar.tsx`

- Add `Pencil` to the `lucide-react` import list.
- New `isEditProjectOpen` state alongside `isDeleteProjectOpen`.
- New `Dropdown.Item` "Edit project…" (icon `Pencil`) placed directly above the existing "Delete project…" item, inside the same `{activeProject && (isAdminOrOwner || !activeTeam) && (...)}` visibility guard (same permission surface as delete — renaming/domain-changing is an admin action just like deleting).
- Render `<EditProjectModal isOpen={isEditProjectOpen} onClose={() => setIsEditProjectOpen(false)} project={activeProject} />` next to the existing delete-confirmation block and `CreateTeamModal`/`CreateTeamProjectModal` renders.

No new reusable `ConfirmDialog`/form primitive extraction — out of scope (tracked separately in `PLAN.md`'s Component library consolidation backlog).

## Testing

New `apps/api/src/modules/projects/projects.service.spec.ts` (no existing spec file for this service). Cases:

1. Update `name` only — persists, `domain` untouched.
2. Update `domain` only — persists, `name` untouched.
3. Update both — persists both.
4. Non-member of the project's team — `NotFoundException` (via `findOne`'s existing behavior).
5. Member but role < ADMIN — `ForbiddenException`.
6. Empty body (`{}`) — `BadRequestException`.
7. (DTO-level, may be covered via a lightweight `class-validator` transform test rather than through the service) invalid hostname string — rejected before reaching the service.

No new Playwright e2e spec — consistent with `create`/`remove` on `ProjectsService`, which also have no e2e coverage; unit tests are the existing bar for this service.

## Out of scope

- Multiple domains per project (🟠 backlog item, separate).
- API key regenerate/rotate (🔴 backlog item, separate).
- Domain format validation on `POST /projects` / `POST /teams/:id/projects`.
- Activity log entries for project create/update/delete.
- Allowing `domain` to be cleared/nulled.
