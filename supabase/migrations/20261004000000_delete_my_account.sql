-- Self-service account deletion (Migration Guide Phase 5).
--
-- Deletes every row the calling user owns in the public schema (any base
-- table with a user_id column), their profile, and finally the auth user.
-- SECURITY DEFINER so it can remove auth.users; it only ever acts on
-- auth.uid(), so a caller can delete nobody but themselves.

create or replace function public.delete_my_account()
returns void
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  uid uuid := auth.uid();
  tname text;
  pending text[];
  remaining text[];
  pass int := 0;
begin
  if uid is null then
    raise exception 'not authenticated' using errcode = '28000';
  end if;

  select coalesce(array_agg(format('%I.%I', c.table_schema, c.table_name)), '{}')
    into pending
    from information_schema.columns c
    join information_schema.tables t
      on t.table_schema = c.table_schema
     and t.table_name = c.table_name
     and t.table_type = 'BASE TABLE'
   where c.table_schema = 'public'
     and c.column_name = 'user_id';

  -- Tables can reference each other without ON DELETE CASCADE, so retry the
  -- ones blocked by a foreign key until everything clears.
  while coalesce(array_length(pending, 1), 0) > 0 and pass < 10 loop
    remaining := '{}';
    foreach tname in array pending loop
      begin
        execute format('delete from %s where user_id::text = $1', tname) using uid::text;
      exception when foreign_key_violation then
        remaining := remaining || tname;
      end;
    end loop;
    pending := remaining;
    pass := pass + 1;
  end loop;

  if coalesce(array_length(pending, 1), 0) > 0 then
    raise exception 'could not delete rows in: %', array_to_string(pending, ', ');
  end if;

  if to_regclass('public.profiles') is not null then
    delete from public.profiles where id = uid;
  end if;

  delete from auth.users where id = uid;
end;
$$;

revoke all on function public.delete_my_account() from public, anon;
grant execute on function public.delete_my_account() to authenticated;
