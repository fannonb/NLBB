DROP TABLE IF EXISTS public.messages CASCADE;
DROP FUNCTION IF EXISTS public.notify_new_message() CASCADE;
DROP FUNCTION IF EXISTS public.user_can_access_booking(uuid) CASCADE;