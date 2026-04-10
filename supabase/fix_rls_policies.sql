-- ============================================================
-- Simplificar políticas RLS para mejor performance
-- Ejecutar en SQL Editor de Supabase
-- ============================================================

-- ---- WORK_AREAS ----
drop policy if exists "view_work_areas" on public.work_areas;
drop policy if exists "admins_manage_areas" on public.work_areas;

create policy "view_work_areas" on public.work_areas
  for select using (
    company_id = public.get_my_company_id()
    and (
      access_type = 'employees'
      or exists (
        select 1 from public.profiles
        where id = auth.uid() and role = 'admin'
      )
    )
  );

create policy "admins_manage_areas" on public.work_areas
  for all using (
    company_id = public.get_my_company_id()
    and exists (
      select 1 from public.profiles
      where id = auth.uid() and role = 'admin'
    )
  ) with check (
    company_id = public.get_my_company_id()
    and exists (
      select 1 from public.profiles
      where id = auth.uid() and role = 'admin'
    )
  );

-- ---- SHIFTS ----
drop policy if exists "view_shifts" on public.shifts;
drop policy if exists "admins_manage_shifts" on public.shifts;

create policy "view_shifts" on public.shifts
  for select using (
    exists (
      select 1 from public.work_areas
      where id = shifts.area_id
        and company_id = public.get_my_company_id()
    )
  );

create policy "admins_manage_shifts" on public.shifts
  for all using (
    exists (
      select 1 from public.work_areas
      where id = shifts.area_id
        and company_id = public.get_my_company_id()
    )
  ) with check (
    exists (
      select 1 from public.work_areas
      where id = shifts.area_id
        and company_id = public.get_my_company_id()
    )
  );

-- ---- TASKS ----
drop policy if exists "view_tasks" on public.tasks;
drop policy if exists "admins_manage_tasks" on public.tasks;

create policy "view_tasks" on public.tasks
  for select using (
    exists (
      select 1 from public.work_areas
      where id = tasks.area_id
        and company_id = public.get_my_company_id()
    )
  );

create policy "admins_manage_tasks" on public.tasks
  for all using (
    exists (
      select 1 from public.work_areas
      where id = tasks.area_id
        and company_id = public.get_my_company_id()
    )
  ) with check (
    exists (
      select 1 from public.work_areas
      where id = tasks.area_id
        and company_id = public.get_my_company_id()
    )
  );

-- ---- TASK_COMPLETIONS ----
drop policy if exists "view_completions" on public.task_completions;
drop policy if exists "employees_manage_own_completions" on public.task_completions;
drop policy if exists "admins_view_all_completions" on public.task_completions;

create policy "view_completions" on public.task_completions
  for select using (
    user_id = auth.uid()
    or exists (
      select 1 from public.profiles
      where id = auth.uid() and role = 'admin'
        and company_id = public.get_my_company_id()
    )
  );

create policy "employees_manage_own_completions" on public.task_completions
  for all using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- ---- USER_AREAS ----
drop policy if exists "view_user_areas" on public.user_areas;
drop policy if exists "employees_set_own_area" on public.user_areas;
drop policy if exists "admins_manage_user_areas" on public.user_areas;

create policy "view_user_areas" on public.user_areas
  for select using (
    user_id = auth.uid()
    or exists (
      select 1 from public.profiles
      where id = auth.uid() and role = 'admin'
    )
  );

create policy "employees_set_own_area" on public.user_areas
  for insert with check (user_id = auth.uid());

create policy "admins_manage_user_areas" on public.user_areas
  for all using (
    exists (
      select 1 from public.profiles
      where id = auth.uid() and role = 'admin'
    )
  ) with check (
    exists (
      select 1 from public.profiles
      where id = auth.uid() and role = 'admin'
    )
  );
