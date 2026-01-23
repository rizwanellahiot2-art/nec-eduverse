-- Realtime enablement for support chat
alter publication supabase_realtime add table public.support_messages;
alter publication supabase_realtime add table public.support_conversations;

-- Helper RPC to list directory users with their profile ids (for student linking)
create or replace function public.list_school_user_profiles(_school_id uuid)
returns table(user_id uuid, profile_id uuid, email text, display_name text)
language sql
stable
security definer
set search_path = public
as $$
  select d.user_id,
         p.id as profile_id,
         d.email,
         coalesce(d.display_name, p.display_name) as display_name
  from public.school_user_directory d
  left join public.profiles p on p.user_id = d.user_id
  where d.school_id = _school_id
    and public.can_manage_students(_school_id);
$$;
