-- 1) Backfill missing user_roles rows for existing profiles (prevents invisible data due to is_org_member() returning false)
insert into public.user_roles (user_id, organization_id, role)
select p.id, p.organization_id, 'user'::public.app_role
from public.profiles p
left join public.user_roles ur
  on ur.user_id = p.id
 and ur.organization_id = p.organization_id
where p.organization_id is not null
  and ur.id is null;

-- 2) Ensure future profiles always have at least a 'user' membership role for their org
create or replace function public.ensure_profile_has_user_role()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.organization_id is null then
    return new;
  end if;

  if not exists (
    select 1
    from public.user_roles
    where user_id = new.id
      and organization_id = new.organization_id
  ) then
    insert into public.user_roles (user_id, organization_id, role)
    values (new.id, new.organization_id, 'user'::public.app_role);
  end if;

  return new;
end;
$$;

drop trigger if exists ensure_profile_user_role on public.profiles;
create trigger ensure_profile_user_role
after insert on public.profiles
for each row
execute function public.ensure_profile_has_user_role();

-- 3) Enforce board visibility at the database level via RLS on tasks
-- Boards map to tasks.category: product / operational / strategic

drop policy if exists "Users can view tasks in their organization" on public.tasks;
drop policy if exists "Users can create tasks in their organization" on public.tasks;
drop policy if exists "Users can update tasks in their organization" on public.tasks;
drop policy if exists "Users can delete tasks in their organization" on public.tasks;

-- SELECT
create policy "Role-based task visibility"
on public.tasks
for select
using (
  is_super_admin(auth.uid())
  or (
    is_org_member(auth.uid(), organization_id)
    and (
      -- Admin: all boards
      exists (
        select 1
        from public.user_roles ur
        where ur.user_id = auth.uid()
          and ur.organization_id = tasks.organization_id
          and ur.role = 'admin'::public.app_role
      )

      -- Manager (moderator): Product board only
      or (
        exists (
          select 1
          from public.user_roles ur
          where ur.user_id = auth.uid()
            and ur.organization_id = tasks.organization_id
            and ur.role = 'moderator'::public.app_role
        )
        and tasks.category = 'product'
      )

      -- Viewer (user): Product board only + only their tasks
      or (
        tasks.category = 'product'
        and (
          tasks.assigned_user_id = auth.uid()
          or tasks.created_by_user_id = auth.uid()
          or tasks.user_id = auth.uid()
        )
      )
    )
  )
);

-- INSERT
create policy "Role-based task creation"
on public.tasks
for insert
with check (
  is_super_admin(auth.uid())
  or (
    is_org_member(auth.uid(), organization_id)
    and (
      -- Admin: can create tasks on any board
      exists (
        select 1
        from public.user_roles ur
        where ur.user_id = auth.uid()
          and ur.organization_id = tasks.organization_id
          and ur.role = 'admin'::public.app_role
      )
      -- Manager (moderator): can create tasks only on Product board
      or (
        exists (
          select 1
          from public.user_roles ur
          where ur.user_id = auth.uid()
            and ur.organization_id = tasks.organization_id
            and ur.role = 'moderator'::public.app_role
        )
        and tasks.category = 'product'
      )
    )
  )
);

-- UPDATE
create policy "Role-based task updates"
on public.tasks
for update
using (
  is_super_admin(auth.uid())
  or (
    is_org_member(auth.uid(), organization_id)
    and (
      -- Admin: full update access across all boards
      exists (
        select 1
        from public.user_roles ur
        where ur.user_id = auth.uid()
          and ur.organization_id = tasks.organization_id
          and ur.role = 'admin'::public.app_role
      )

      -- Manager (moderator): Product board only; can edit own created tasks; can accept/decline/reassign tasks assigned to them
      or (
        exists (
          select 1
          from public.user_roles ur
          where ur.user_id = auth.uid()
            and ur.organization_id = tasks.organization_id
            and ur.role = 'moderator'::public.app_role
        )
        and tasks.category = 'product'
        and (tasks.created_by_user_id = auth.uid() or tasks.assigned_user_id = auth.uid())
      )

      -- Viewer (user): Product board only; can accept/decline/reassign + move between todo/complete for tasks assigned to them
      or (
        tasks.category = 'product'
        and tasks.assigned_user_id = auth.uid()
      )
    )
  )
)
with check (
  is_super_admin(auth.uid())
  or (
    is_org_member(auth.uid(), organization_id)
    and (
      exists (
        select 1
        from public.user_roles ur
        where ur.user_id = auth.uid()
          and ur.organization_id = tasks.organization_id
          and ur.role = 'admin'::public.app_role
      )
      or (
        exists (
          select 1
          from public.user_roles ur
          where ur.user_id = auth.uid()
            and ur.organization_id = tasks.organization_id
            and ur.role = 'moderator'::public.app_role
        )
        and tasks.category = 'product'
      )
      or (tasks.category = 'product')
    )
  )
);

-- DELETE (Admin only)
create policy "Role-based task deletion"
on public.tasks
for delete
using (
  is_super_admin(auth.uid())
  or (
    is_org_member(auth.uid(), organization_id)
    and exists (
      select 1
      from public.user_roles ur
      where ur.user_id = auth.uid()
        and ur.organization_id = tasks.organization_id
        and ur.role = 'admin'::public.app_role
    )
  )
);

-- 4) Column-level enforcement (because RLS cannot restrict columns)
-- Viewer: may only change status/assignment fields
-- Manager: may only change status/assignment fields on tasks they did NOT create
create or replace function public.enforce_task_update_permissions()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  allowed_keys text[] := array[
    'status',
    'completed_at',
    'assignment_status',
    'assignment_responded_at',
    'decline_reason',
    'last_reminder_sent_at',
    'assigned_user_id',
    'updated_at'
  ];
  old_filtered jsonb;
  new_filtered jsonb;
  k text;
  is_admin boolean;
  is_moderator boolean;
  is_user boolean;
begin
  -- If there's no authenticated user context (e.g., service jobs), don't block.
  if auth.uid() is null then
    return new;
  end if;

  is_admin := is_super_admin(auth.uid())
    or exists (
      select 1
      from public.user_roles ur
      where ur.user_id = auth.uid()
        and ur.organization_id = new.organization_id
        and ur.role = 'admin'::public.app_role
    );

  if is_admin then
    return new;
  end if;

  is_moderator := exists (
    select 1
    from public.user_roles ur
    where ur.user_id = auth.uid()
      and ur.organization_id = new.organization_id
      and ur.role = 'moderator'::public.app_role
  );

  is_user := exists (
    select 1
    from public.user_roles ur
    where ur.user_id = auth.uid()
      and ur.organization_id = new.organization_id
      and ur.role = 'user'::public.app_role
  );

  old_filtered := to_jsonb(old);
  new_filtered := to_jsonb(new);

  foreach k in array allowed_keys loop
    old_filtered := old_filtered - k;
    new_filtered := new_filtered - k;
  end loop;

  if is_user then
    if new_filtered <> old_filtered then
      raise exception 'Team accounts can only update task status/assignment fields.';
    end if;
    return new;
  end if;

  if is_moderator and old.created_by_user_id is distinct from auth.uid() then
    if new_filtered <> old_filtered then
      raise exception 'Manager accounts can only update task status/assignment fields for tasks they did not create.';
    end if;
    return new;
  end if;

  return new;
end;
$$;

drop trigger if exists enforce_task_update_permissions on public.tasks;
create trigger enforce_task_update_permissions
before update on public.tasks
for each row
execute function public.enforce_task_update_permissions();