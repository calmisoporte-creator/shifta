-- ============================================================
-- SHIFTA — Schema SQL completo
-- Ejecutar en el SQL Editor de Supabase
-- ============================================================

-- Extensiones necesarias
create extension if not exists "uuid-ossp";

-- ============================================================
-- TABLA: companies
-- ============================================================
create table if not exists public.companies (
  id          uuid primary key default uuid_generate_v4(),
  name        text not null,
  logo_url    text,
  invite_token text unique not null default encode(gen_random_bytes(16), 'hex'),
  owner_id    uuid references auth.users(id) on delete set null,
  created_at  timestamptz not null default now()
);

-- ============================================================
-- TABLA: profiles (extiende auth.users)
-- ============================================================
create table if not exists public.profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  name        text not null,
  role        text not null check (role in ('admin', 'employee')) default 'employee',
  company_id  uuid references public.companies(id) on delete cascade,
  is_active   boolean not null default true,
  created_at  timestamptz not null default now()
);

-- ============================================================
-- TABLA: work_areas
-- ============================================================
create table if not exists public.work_areas (
  id           uuid primary key default uuid_generate_v4(),
  name         text not null,
  access_type  text not null check (access_type in ('employees', 'admins_only')) default 'employees',
  company_id   uuid not null references public.companies(id) on delete cascade,
  order_index  integer not null default 0,
  created_at   timestamptz not null default now()
);

-- ============================================================
-- TABLA: shifts
-- ============================================================
create table if not exists public.shifts (
  id          uuid primary key default uuid_generate_v4(),
  name        text not null,
  start_time  time not null,
  area_id     uuid not null references public.work_areas(id) on delete cascade,
  created_at  timestamptz not null default now()
);

-- ============================================================
-- TABLA: tasks
-- ============================================================
create table if not exists public.tasks (
  id           uuid primary key default uuid_generate_v4(),
  title        text not null,
  description  text,
  area_id      uuid not null references public.work_areas(id) on delete cascade,
  priority     text not null check (priority in ('high', 'medium', 'low')) default 'medium',
  is_recurring boolean not null default true,
  specific_date date,
  order_index  integer not null default 0,
  created_at   timestamptz not null default now()
);

-- ============================================================
-- TABLA: task_completions
-- ============================================================
create table if not exists public.task_completions (
  id           uuid primary key default uuid_generate_v4(),
  task_id      uuid not null references public.tasks(id) on delete cascade,
  user_id      uuid not null references public.profiles(id) on delete cascade,
  shift_id     uuid references public.shifts(id) on delete set null,
  status       text not null check (status in ('pending', 'in_progress', 'completed')) default 'pending',
  completed_at timestamptz,
  date         date not null default current_date,
  created_at   timestamptz not null default now(),
  unique (task_id, user_id, shift_id, date)
);

-- ============================================================
-- TABLA: user_areas (área elegida por empleado)
-- ============================================================
create table if not exists public.user_areas (
  id         uuid primary key default uuid_generate_v4(),
  user_id    uuid not null references public.profiles(id) on delete cascade,
  area_id    uuid not null references public.work_areas(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (user_id)  -- cada empleado solo pertenece a un área
);

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================

alter table public.companies         enable row level security;
alter table public.profiles          enable row level security;
alter table public.work_areas        enable row level security;
alter table public.shifts            enable row level security;
alter table public.tasks             enable row level security;
alter table public.task_completions  enable row level security;
alter table public.user_areas        enable row level security;

-- ---- COMPANIES ----

-- Ver su propia empresa
create policy "users_view_own_company" on public.companies
  for select using (
    id in (select company_id from public.profiles where id = auth.uid())
  );

-- Crear empresa (onboarding)
create policy "users_create_company" on public.companies
  for insert with check (owner_id = auth.uid());

-- Solo admins pueden actualizar
create policy "admins_update_company" on public.companies
  for update using (
    exists (
      select 1 from public.profiles
      where id = auth.uid() and role = 'admin'
        and company_id = companies.id
    )
  );

-- ---- PROFILES ----

-- Ver perfiles de su empresa
create policy "view_company_profiles" on public.profiles
  for select using (
    company_id in (select company_id from public.profiles where id = auth.uid())
    or id = auth.uid()
  );

-- Crear propio perfil
create policy "create_own_profile" on public.profiles
  for insert with check (id = auth.uid());

-- Actualizar propio perfil o admin actualiza perfiles de su empresa
create policy "update_profile" on public.profiles
  for update using (
    id = auth.uid()
    or exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role = 'admin'
        and p.company_id = profiles.company_id
    )
  );

-- ---- WORK_AREAS ----

-- Ver áreas de su empresa (empleados solo ven las de tipo 'employees')
create policy "view_work_areas" on public.work_areas
  for select using (
    company_id in (select company_id from public.profiles where id = auth.uid())
    and (
      access_type = 'employees'
      or exists (
        select 1 from public.profiles
        where id = auth.uid() and role = 'admin'
      )
    )
  );

-- Solo admins crean/editan/eliminan áreas
create policy "admins_manage_areas" on public.work_areas
  for all using (
    exists (
      select 1 from public.profiles
      where id = auth.uid() and role = 'admin'
        and company_id = work_areas.company_id
    )
  );

-- ---- SHIFTS ----

create policy "view_shifts" on public.shifts
  for select using (
    area_id in (
      select id from public.work_areas wa
      where wa.company_id in (
        select company_id from public.profiles where id = auth.uid()
      )
    )
  );

create policy "admins_manage_shifts" on public.shifts
  for all using (
    exists (
      select 1 from public.profiles p
      join public.work_areas wa on wa.id = shifts.area_id
      where p.id = auth.uid() and p.role = 'admin'
        and p.company_id = wa.company_id
    )
  );

-- ---- TASKS ----

create policy "view_tasks" on public.tasks
  for select using (
    area_id in (
      select id from public.work_areas wa
      where wa.company_id in (
        select company_id from public.profiles where id = auth.uid()
      )
    )
  );

create policy "admins_manage_tasks" on public.tasks
  for all using (
    exists (
      select 1 from public.profiles p
      join public.work_areas wa on wa.id = tasks.area_id
      where p.id = auth.uid() and p.role = 'admin'
        and p.company_id = wa.company_id
    )
  );

-- ---- TASK_COMPLETIONS ----

create policy "view_completions" on public.task_completions
  for select using (
    user_id = auth.uid()
    or exists (
      select 1 from public.profiles
      where id = auth.uid() and role = 'admin'
    )
  );

create policy "employees_manage_own_completions" on public.task_completions
  for all using (user_id = auth.uid());

create policy "admins_view_all_completions" on public.task_completions
  for select using (
    exists (
      select 1 from public.profiles p
      join public.tasks t on t.id = task_completions.task_id
      join public.work_areas wa on wa.id = t.area_id
      where p.id = auth.uid() and p.role = 'admin'
        and p.company_id = wa.company_id
    )
  );

-- ---- USER_AREAS ----

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
      select 1 from public.profiles p
      join public.work_areas wa on wa.id = user_areas.area_id
      where p.id = auth.uid() and p.role = 'admin'
        and p.company_id = wa.company_id
    )
  );

-- ============================================================
-- FUNCIÓN: auto-crear perfil al registrarse
-- ============================================================
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  -- Solo crea el perfil si viene metadata
  if new.raw_user_meta_data->>'name' is not null then
    insert into public.profiles (id, name, role, company_id)
    values (
      new.id,
      new.raw_user_meta_data->>'name',
      coalesce(new.raw_user_meta_data->>'role', 'employee'),
      (new.raw_user_meta_data->>'company_id')::uuid
    )
    on conflict (id) do nothing;
  end if;
  return new;
end;
$$;

create or replace trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ============================================================
-- FUNCIÓN: obtener turno activo de un área
-- ============================================================
create or replace function public.get_active_shift(p_area_id uuid)
returns uuid
language sql
stable
as $$
  select id from public.shifts
  where area_id = p_area_id
    and start_time <= current_time
  order by start_time desc
  limit 1;
$$;

-- ============================================================
-- ÍNDICES
-- ============================================================
create index if not exists idx_profiles_company    on public.profiles(company_id);
create index if not exists idx_work_areas_company  on public.work_areas(company_id);
create index if not exists idx_tasks_area          on public.tasks(area_id);
create index if not exists idx_shifts_area         on public.shifts(area_id);
create index if not exists idx_completions_task    on public.task_completions(task_id);
create index if not exists idx_completions_user    on public.task_completions(user_id);
create index if not exists idx_completions_date    on public.task_completions(date);
create index if not exists idx_user_areas_user     on public.user_areas(user_id);
